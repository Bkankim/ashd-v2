import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveSafeNext } from "@/lib/auth/safe-next";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  // Open-redirect defense: only same-origin relative paths survive.
  const next = resolveSafeNext(searchParams.get("next"), request.url);

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
