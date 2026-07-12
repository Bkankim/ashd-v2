import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendEmail } from "@/lib/notifications/email";
import { sendTelegramMessage } from "@/lib/notifications/telegram";
import {
  formatEmailHtml,
  formatTelegramMessage,
  type AlertItem,
} from "@/lib/notifications/formatter";
import {
  selectAlerts,
  type AlertAction,
  type AlertChannel,
  type SentRecord,
} from "@/lib/notifications/select-alerts";
import { kstToday, kstDatePlusDays, daysLeftKst } from "@/lib/kst";
import { STALL_THRESHOLD_MS } from "@/lib/job-policies";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("cron/daily-alerts");

export const runtime = "nodejs";
export const maxDuration = 60;

type Settings = Database["public"]["Tables"]["notification_settings"]["Row"];
type ProductRow = Pick<
  Database["public"]["Tables"]["product"]["Row"],
  "id" | "user_id" | "title" | "warranty_end_date" | "refund_deadline"
>;

export async function GET(request: NextRequest) {
  // Fail closed: a missing secret must never mean "no auth".
  if (!process.env.CRON_SECRET) {
    log.error("CRON_SECRET is not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    log.warn("Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  log.info("Daily alerts cron started");

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // 0. Reaper: sweep jobs stuck in pending/processing past the stall threshold.
  // Hobby allows only daily crons, so this is the (slow) server-side recovery
  // lane; the live-session UX is covered by the client stall guard.
  const stallCutoff = new Date(Date.now() - STALL_THRESHOLD_MS).toISOString();
  const { data: reapedRows, error: reapError } = await supabase
    .from("document_processing_job")
    .update({ status: "failed", error: "stalled" })
    .in("status", ["pending", "processing"])
    .lt("created_at", stallCutoff)
    .select("id");
  if (reapError) {
    log.error({ err: reapError }, "Job reaper failed");
  }
  const reaped = reapedRows?.length ?? 0;

  const today = kstToday();

  // 1. Load notification settings
  const { data: settingsList, error: settingsError } = await supabase
    .from("notification_settings")
    .select("*");
  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }
  const allSettings = settingsList ?? [];

  let emailsSent = 0;
  let telegramsSent = 0;
  let skippedDuplicates = 0;
  const errors: string[] = [];

  // 2. Window query: only products whose deadline can possibly be due,
  // bounded by the largest configured threshold across all users.
  const maxWarranty = maxThreshold(allSettings.map((s) => s.warranty_days_before));
  const maxRefund = maxThreshold(allSettings.map((s) => s.refund_days_before));
  const warrantyMax = kstDatePlusDays(maxWarranty);
  const refundMax = kstDatePlusDays(maxRefund);

  const { data: productRows, error: productsError } = await supabase
    .from("product")
    .select("id, user_id, title, warranty_end_date, refund_deadline")
    .or(
      `and(warranty_end_date.gte.${today},warranty_end_date.lte.${warrantyMax}),` +
        `and(refund_deadline.gte.${today},refund_deadline.lte.${refundMax})`,
    );
  if (productsError) {
    return NextResponse.json({ error: productsError.message }, { status: 500 });
  }
  const candidateProducts = (productRows ?? []) as ProductRow[];

  if (candidateProducts.length === 0) {
    log.info({ reaped }, "Daily alerts cron completed (no candidates)");
    return NextResponse.json({
      date: today,
      reaped,
      processed: allSettings.length,
      emailsSent: 0,
      telegramsSent: 0,
      skippedDuplicates: 0,
      errors,
    });
  }

  // 3. Load prior sends for candidates once (dedup source of truth)
  const { data: sentRows, error: sentError } = await supabase
    .from("alert_log")
    .select("product_id, type, threshold_days, channel")
    .in(
      "product_id",
      candidateProducts.map((p) => p.id),
    );
  if (sentError) {
    return NextResponse.json({ error: sentError.message }, { status: 500 });
  }
  const sent = (sentRows ?? []) as SentRecord[];

  const productsByUser = new Map<string, ProductRow[]>();
  for (const p of candidateProducts) {
    const list = productsByUser.get(p.user_id) ?? [];
    list.push(p);
    productsByUser.set(p.user_id, list);
  }

  let processed = 0;
  for (const settings of allSettings) {
    const userProducts = productsByUser.get(settings.user_id);
    processed++;
    if (!userProducts || userProducts.length === 0) continue;

    try {
      const channels: AlertChannel[] = [];
      if (settings.email_enabled) channels.push("email");
      if (settings.telegram_enabled) channels.push("telegram");

      for (const channel of channels) {
        const actions = selectAlerts({
          products: userProducts,
          warrantyDaysBefore: settings.warranty_days_before,
          refundDaysBefore: settings.refund_days_before,
          sent,
          channel,
          daysLeftOf: (deadline) => daysLeftKst(deadline),
        });
        if (actions.length === 0) continue;

        const delivered =
          channel === "email"
            ? await deliverEmail(supabase, settings, actions, errors)
            : await deliverTelegram(supabase, settings, actions, errors);
        if (!delivered) continue;

        if (channel === "email") emailsSent++;
        else telegramsSent++;

        // 4. Log every folded threshold; unique conflicts are idempotent skips.
        const logRows = actions.flatMap((a) =>
          a.thresholds.map((t) => ({
            user_id: settings.user_id,
            product_id: a.productId,
            type: a.type,
            threshold_days: t,
            channel,
          })),
        );
        const { error: logError, data: inserted } = await supabase
          .from("alert_log")
          .upsert(logRows, {
            onConflict: "product_id,type,threshold_days,channel",
            ignoreDuplicates: true,
          })
          .select("id");
        if (logError) {
          errors.push(`alert_log_${settings.user_id}: ${logError.message}`);
        } else {
          skippedDuplicates += logRows.length - (inserted?.length ?? 0);
        }
      }
    } catch (err) {
      errors.push(
        `user_${settings.user_id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  log.info(
    { reaped, processed, emailsSent, telegramsSent, skippedDuplicates, errorCount: errors.length },
    "Daily alerts cron completed",
  );

  return NextResponse.json({
    date: today,
    reaped,
    processed,
    emailsSent,
    telegramsSent,
    skippedDuplicates,
    errors,
  });
}

function maxThreshold(lists: number[][]): number {
  let max = 0;
  for (const list of lists) {
    for (const n of list) {
      if (n > max) max = n;
    }
  }
  return max;
}

function toAlertItems(actions: AlertAction[]): AlertItem[] {
  return actions.map((a) => ({
    productTitle: a.productTitle,
    type: a.type,
    deadline: a.deadline,
    daysLeft: a.daysLeft,
  }));
}

async function deliverEmail(
  supabase: ReturnType<typeof createClient<Database>>,
  settings: Settings,
  actions: AlertAction[],
  errors: string[],
): Promise<boolean> {
  // auth lookup only for users who actually receive an alert (ralplan DR-1)
  const {
    data: { user },
  } = await supabase.auth.admin.getUserById(settings.user_id);
  if (!user?.email) return false;

  try {
    const items = toAlertItems(actions);
    await sendEmail({
      to: user.email,
      subject: `[ASHD] ${items.length}건의 기한 알림`,
      html: formatEmailHtml(items, user.email),
    });
    return true;
  } catch (err) {
    errors.push(
      `email_${settings.user_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}

async function deliverTelegram(
  supabase: ReturnType<typeof createClient<Database>>,
  settings: Settings,
  actions: AlertAction[],
  errors: string[],
): Promise<boolean> {
  const { data: telegram } = await supabase
    .from("telegram_account")
    .select("chat_id")
    .eq("user_id", settings.user_id)
    .single();
  if (!telegram) return false;

  try {
    await sendTelegramMessage(telegram.chat_id, formatTelegramMessage(toAlertItems(actions)));
    return true;
  } catch (err) {
    errors.push(
      `telegram_${settings.user_id}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return false;
  }
}
