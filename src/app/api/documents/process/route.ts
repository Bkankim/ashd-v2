import { NextResponse, after, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createModuleLogger } from "@/lib/logger";
import { kstDayStartUtc } from "@/lib/kst";
import { exceedsDailyQuota, DAILY_JOB_QUOTA } from "@/lib/job-policies";

const log = createModuleLogger("documents/process");

export const runtime = "nodejs";
export const maxDuration = 60; // Hobby default limit is 60s (300s with fluid compute) — verified 2026-07

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filePath } = await request.json();
  if (typeof filePath !== "string") {
    return NextResponse.json({ error: "filePath required" }, { status: 400 });
  }
  if (!filePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Daily quota (KST day): retries also consume quota by design (ralplan DR-4)
  const { count: todayJobs, error: countError } = await supabase
    .from("document_processing_job")
    .select("id", { count: "exact", head: true })
    .gte("created_at", kstDayStartUtc().toISOString());

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if (exceedsDailyQuota(todayJobs ?? 0)) {
    return NextResponse.json(
      { error: `일일 처리 한도(${DAILY_JOB_QUOTA}건)를 초과했습니다. 내일 다시 시도해 주세요.` },
      { status: 429 },
    );
  }

  // Server-side truth check: presigned PUT does not enforce declared size,
  // so verify the object actually exists within limits before spending OCR/LLM.
  const { headFile, isAllowedUpload } = await import("@/lib/r2/storage");
  try {
    const head = await headFile(filePath);
    if (!isAllowedUpload(head)) {
      log.warn({ filePath, head }, "Uploaded object rejected by server-side verification");
      return NextResponse.json(
        { error: "업로드된 파일이 허용된 형식/크기(10MB)를 벗어났습니다." },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "업로드된 파일을 찾을 수 없습니다. 다시 업로드해 주세요." },
      { status: 400 },
    );
  }

  // 1. Create document record
  const { data: doc, error: docError } = await supabase
    .from("document")
    .insert({
      user_id: user.id,
      image_path: filePath,
      source: "screenshot",
    })
    .select()
    .single();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  // 2. Create job record
  const { data: job, error: jobError } = await supabase
    .from("document_processing_job")
    .insert({
      user_id: user.id,
      document_id: doc.id,
      status: "pending",
    })
    .select()
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 500 });
  }

  log.info({ jobId: job.id, documentId: doc.id, filePath }, "Job created, starting async processing");

  // 3. Use after() to keep function alive after response (Vercel waitUntil)
  after(async () => {
    try {
      await processDocumentAsync(user.id, doc.id, job.id, filePath);
    } catch (err) {
      log.error({ err, jobId: job.id }, "Background processing error");
    }
  });

  return NextResponse.json({
    jobId: job.id,
    documentId: doc.id,
    status: "pending",
  });
}

async function processDocumentAsync(
  userId: string,
  documentId: string,
  jobId: string,
  filePath: string,
): Promise<void> {
  // Use service role client to bypass RLS for background processing
  const adminSupabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    log.info({ jobId }, "Status → processing");
    await adminSupabase
      .from("document_processing_job")
      .update({ status: "processing" })
      .eq("id", jobId);

    // 1. Download file from R2
    const { downloadFile } = await import("@/lib/r2/storage");
    const buffer = await downloadFile(filePath);
    const base64 = buffer.toString("base64");

    // 3. OCR
    log.info({ jobId, bytes: buffer.length }, "Starting OCR");
    const { performOcr } = await import("@/lib/ocr");
    const rawText = await performOcr(base64);
    log.info({ jobId, textLength: rawText.length }, "OCR complete");

    // 4. Update document with raw text
    await adminSupabase
      .from("document")
      .update({ raw_text: rawText })
      .eq("id", documentId);

    // 5. Rule-based extraction
    log.info({ jobId }, "Starting rule-based extraction");
    const { extractFieldsWithRules } = await import("@/lib/extractors/rule");
    const ruleFields = extractFieldsWithRules(rawText);
    const ruleFieldCount = Object.values(ruleFields).filter(Boolean).length;
    log.info({ jobId, ruleFieldCount }, "Rule extraction complete");

    // 6. LLM supplementary extraction
    log.info({ jobId }, "Starting LLM extraction");
    const { extractFieldsWithLlm } = await import("@/lib/extractors/llm");
    const llmFields = await extractFieldsWithLlm(rawText, ruleFields);
    const llmFieldCount = Object.values(llmFields).filter(Boolean).length;
    log.info({ jobId, llmFieldCount }, "LLM extraction complete");

    // Merge: rule-based fields take priority, LLM fills gaps.
    // Sanitize afterwards: LLM output is only type-checked, so invalid
    // dates/amounts must be dropped before they hit Postgres columns.
    const { sanitizeExtractedFields } = await import("@/lib/extractors/validate");
    const mergedFields = sanitizeExtractedFields({ ...llmFields, ...ruleFields });
    log.info({ jobId, mergedFields }, "Fields merged and sanitized");

    // 7. Update document with parsed fields
    await adminSupabase
      .from("document")
      .update({
        parsed_fields: mergedFields as unknown as import("@/types/database").Json,
        title: mergedFields.title ?? "Untitled Document",
      })
      .eq("id", documentId);

    // 8. Create product from extracted fields
    const { data: product, error: productError } = await adminSupabase
      .from("product")
      .insert({
        user_id: userId,
        title: mergedFields.title ?? "OCR 추출 제품",
        product_category: mergedFields.product_category ?? null,
        purchase_date: mergedFields.purchase_date ?? null,
        amount: mergedFields.amount ?? null,
        store: mergedFields.store ?? null,
        order_id: mergedFields.order_id ?? null,
        refund_deadline: mergedFields.refund_deadline ?? null,
        warranty_end_date: mergedFields.warranty_end_date ?? null,
        as_contact: mergedFields.as_contact ?? null,
        source: "screenshot",
        image_path: filePath,
        raw_text: rawText,
      })
      .select()
      .single();

    // 9. Link document and job to product. A failed product insert must
    // surface as a failed job — never a silent "completed with no product".
    if (productError || !product) {
      const message = productError?.message ?? "Product insert returned no row";
      log.error({ jobId, productError }, "Product creation failed");
      await adminSupabase
        .from("document_processing_job")
        .update({ status: "failed", error: `제품 생성 실패: ${message}` })
        .eq("id", jobId);
      return;
    }

    log.info({ jobId, productId: product.id }, "Product created");
    await adminSupabase
      .from("document")
      .update({ product_id: product.id })
      .eq("id", documentId);

    await adminSupabase
      .from("document_processing_job")
      .update({
        status: "completed",
        product_id: product.id,
      })
      .eq("id", jobId);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    log.error({ err: error, jobId }, "Document processing failed");

    await adminSupabase
      .from("document_processing_job")
      .update({
        status: "failed",
        error: errorMessage,
      })
      .eq("id", jobId);
  }
}
