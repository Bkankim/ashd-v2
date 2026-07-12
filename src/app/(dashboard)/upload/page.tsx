"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Upload, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";

type JobStatus = "idle" | "uploading" | "pending" | "processing" | "completed" | "failed";

const STALL_TIMEOUT_MS = 90_000; // W7: serverless (after()+Hobby 10s) can stall a job; fail + offer retry past this.

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<JobStatus>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [productId, setProductId] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [error, setError] = useState("");
  const jobStartRef = useRef<number | null>(null);
  const supabase = createClient();

  const pollJobStatus = useCallback(
    async (id: string) => {
      const { data: job } = await supabase
        .from("document_processing_job")
        .select("status, error, product_id")
        .eq("id", id)
        .single();

      if (!job) return;

      if (job.status === "completed") {
        setStatus("completed");
        if (job.product_id) {
          setProductId(job.product_id);
        }
      } else if (job.status === "failed") {
        setStatus("failed");
        setError(job.error ?? "처리에 실패했습니다");
      } else {
        setStatus(job.status as JobStatus);
      }
    },
    [supabase],
  );

  useEffect(() => {
    if (!jobId) {
      jobStartRef.current = null;
      return;
    }
    if (status === "completed" || status === "failed") return;

    // W7: stall guard — serverless background processing can still stall
    // (external OCR/LLM failures, function cutoff). Past STALL_TIMEOUT_MS,
    // surface a failure + the manual-retry path instead of an infinite
    // spinner. Client-only; the daily cron reaper is the server-side sweep.
    if (jobStartRef.current === null) {
      jobStartRef.current = Date.now();
    }

    const interval = setInterval(() => {
      if (
        jobStartRef.current !== null &&
        Date.now() - jobStartRef.current > STALL_TIMEOUT_MS
      ) {
        clearInterval(interval);
        setStatus("failed");
        setError("처리가 지연되어 중단되었습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      pollJobStatus(jobId).catch(console.error);
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, status, pollJobStatus]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("uploading");
    setError("");
    setProductId(null);

    try {
      // 1. Get presigned upload URL from server
      const presignRes = await fetch("/api/storage/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          contentLength: file.size,
        }),
      });

      if (!presignRes.ok) {
        const presignData = await presignRes.json();
        throw new Error(presignData.error ?? "업로드 URL 생성 실패");
      }

      const { presignedUrl, key: filePath } = await presignRes.json();

      // 2. Upload file directly to R2 via presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`파일 업로드 실패 (${uploadRes.status})`);
      }

      // File is durably in R2 now — remember the key so a processing
      // failure can be retried without re-uploading (ralplan DR-4).
      setUploadedPath(filePath as string);

      // 3. Trigger document processing
      await startProcessing(filePath as string);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "업로드 실패");
    }
  }

  async function startProcessing(filePath: string) {
    setStatus("pending");
    const res = await fetch("/api/documents/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePath }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "처리 요청 실패");
    }

    const data = await res.json();
    jobStartRef.current = null; // restart the stall clock for the new job
    setJobId(data.jobId as string);
  }

  /** Re-process the already-uploaded R2 object without re-uploading. */
  async function handleRetrySameFile() {
    if (!uploadedPath) return;
    setError("");
    setProductId(null);
    setJobId(null);
    try {
      await startProcessing(uploadedPath);
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "재시도 실패");
    }
  }

  async function handleRetry() {
    setStatus("idle");
    setError("");
    setJobId(null);
    setProductId(null);
    setFile(null);
    setUploadedPath(null);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">문서 업로드</h1>
        <p className="text-sm text-muted-foreground">
          영수증, 보증서, 택배라벨 이미지를 업로드하면 자동으로 정보를 추출합니다.
        </p>
      </div>

      {status === "idle" || status === "failed" ? (
        <Card className="card-shadow border-border/50">
          <CardContent className="p-5">
            <form onSubmit={handleUpload} className="space-y-4">
              <div
                onClick={() =>
                  document.getElementById("file-input")?.click()
                }
                className="cursor-pointer rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
              >
                <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      사진 또는 PDF를 선택하세요
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      JPG, PNG, WebP, PDF (최대 10MB)
                    </p>
                  </>
                )}
                <input
                  id="file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />
              </div>

              <Button type="submit" disabled={!file} className="w-full">
                업로드 및 분석
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Job Status Display */}
      {status !== "idle" && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">처리 상태</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status={status} />
              <span className="text-sm">{getStatusMessage(status)}</span>
            </div>

            {status === "failed" && error && (
              <div className="space-y-3">
                <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </p>
                <div className="flex gap-2">
                  {uploadedPath && (
                    <Button onClick={handleRetrySameFile}>
                      같은 파일로 재시도
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleRetry}>
                    새 파일 선택
                  </Button>
                </div>
              </div>
            )}

            {status === "completed" && productId && (
              <div className="space-y-3">
                <p className="rounded-lg bg-accent p-3 text-sm text-primary">
                  제품이 성공적으로 등록되었습니다.
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/products/${productId}`}
                    className={buttonVariants()}
                  >
                    제품 확인하기
                  </Link>
                  <Button variant="outline" onClick={handleRetry}>
                    새로운 문서 업로드
                  </Button>
                </div>
              </div>
            )}

            {status === "completed" && !productId && (
              <div className="space-y-3">
                <p className="rounded-lg bg-accent p-3 text-sm text-primary">
                  처리가 완료되었습니다.
                </p>
                <Button variant="outline" onClick={handleRetry}>
                  새로운 문서 업로드
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusIndicator({ status }: { status: JobStatus }) {
  switch (status) {
    case "uploading":
    case "pending":
    case "processing":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case "completed":
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <div className="h-4 w-4 rounded-full bg-muted" />;
  }
}

function getStatusMessage(status: JobStatus): string {
  const messages: Record<JobStatus, string> = {
    idle: "",
    uploading: "파일 업로드 중...",
    pending: "처리 대기 중...",
    processing: "OCR 및 정보 추출 중...",
    completed: "처리 완료",
    failed: "처리 실패",
  };
  return messages[status];
}
