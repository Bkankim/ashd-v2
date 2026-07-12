"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { notificationSettingsSchema, telegramAccountSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("actions/settings");

export interface SettingsActionState {
  message: string;
  errors?: Record<string, string[]>;
  success?: boolean;
}

export async function updateNotificationSettings(
  prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  const warrantyDaysStr = formData.get("warranty_days_before") as string;
  const refundDaysStr = formData.get("refund_days_before") as string;

  const raw = {
    email_enabled: formData.get("email_enabled") === "on",
    telegram_enabled: formData.get("telegram_enabled") === "on",
    warranty_days_before: warrantyDaysStr
      ? warrantyDaysStr.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      : [30, 7, 3],
    refund_days_before: refundDaysStr
      ? refundDaysStr.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
      : [3],
  };

  const parsed = notificationSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "입력값을 확인해주세요",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("notification_settings")
    .upsert(
      {
        user_id: user.id,
        ...parsed.data,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { message: `저장 실패: ${error.message}` };
  }

  revalidatePath("/settings");
  return { message: "알림 설정이 저장되었습니다", success: true };
}

export async function linkTelegram(
  prevState: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  const raw = {
    chat_id: formData.get("chat_id"),
    username: formData.get("username") || null,
  };

  const parsed = telegramAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      message: "입력값을 확인해주세요",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { error } = await supabase
    .from("telegram_account")
    .upsert(
      {
        user_id: user.id,
        chat_id: parsed.data.chat_id,
        username: parsed.data.username ?? null,
      },
      { onConflict: "user_id" },
    );

  if (error) {
    return { message: `연동 실패: ${error.message}` };
  }

  revalidatePath("/settings");
  return { message: "텔레그램이 연동되었습니다", success: true };
}

export async function unlinkTelegram(): Promise<SettingsActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  const { error } = await supabase
    .from("telegram_account")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return { message: `해제 실패: ${error.message}` };
  }

  revalidatePath("/settings");
  return { message: "텔레그램 연동이 해제되었습니다", success: true };
}

export async function deleteAccount(): Promise<SettingsActionState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "로그인이 필요합니다" };
  }

  // Use service role client to delete user data and auth account
  const { createClient } = await import("@supabase/supabase-js");
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  log.warn({ userId: user.id }, "Account deletion requested");

  // Delete Storage files from R2
  const { listFiles, deleteFiles } = await import("@/lib/r2/storage");
  const fileKeys = await listFiles(`${user.id}/`);

  if (fileKeys.length > 0) {
    const failedKeys = await deleteFiles(fileKeys);
    if (failedKeys.length > 0) {
      log.warn({ userId: user.id, failedKeys }, "Some R2 files failed to delete during account removal");
    }
    log.info({ userId: user.id, fileCount: fileKeys.length, failed: failedKeys.length }, "R2 files deleted");
  }

  // DB records are cascade-deleted via FK on auth.users
  const { error } = await adminSupabase.auth.admin.deleteUser(user.id);

  if (error) {
    log.error({ err: error, userId: user.id }, "Account deletion failed");
    return { message: `탈퇴 실패: ${error.message}` };
  }

  log.info({ userId: user.id }, "Account deleted successfully");
  return { message: "계정이 삭제되었습니다", success: true };
}
