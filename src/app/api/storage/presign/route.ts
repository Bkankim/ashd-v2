import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPresignedUploadUrl } from "@/lib/r2/storage";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/storage/presign");

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { fileName, contentType, contentLength } = body as {
    fileName: unknown;
    contentType: unknown;
    contentLength: unknown;
  };

  if (typeof fileName !== "string" || fileName.length === 0) {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }
  if (typeof contentType !== "string" || contentType.length === 0) {
    return NextResponse.json(
      { error: "contentType is required" },
      { status: 400 },
    );
  }
  if (typeof contentLength !== "number" || contentLength <= 0) {
    return NextResponse.json(
      { error: "contentLength is required (positive number)" },
      { status: 400 },
    );
  }

  const dotIndex = fileName.lastIndexOf(".");
  const rawExt = dotIndex > 0 ? fileName.slice(dotIndex + 1) : "bin";
  // Whitelist the extension: the key stays a clean literal even with hostile fileName
  const ext = /^[A-Za-z0-9]{1,8}$/.test(rawExt) ? rawExt.toLowerCase() : "bin";
  const key = `${user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const presignedUrl = await createPresignedUploadUrl(
      key,
      contentType,
      contentLength,
    );
    log.info(
      { userId: user.id, key, contentType, contentLength },
      "Presigned URL generated",
    );
    return NextResponse.json({ presignedUrl, key });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to generate upload URL";
    log.warn({ userId: user.id, err }, "Presign request rejected");
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
