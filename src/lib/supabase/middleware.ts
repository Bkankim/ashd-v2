import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { CookieMethodsServer } from "@supabase/ssr";
import { perfLog } from "@/lib/perf-log";

// W1 instrumentation: tag the first auth call on a fresh edge isolate as "cold"
// (one-time JWKS fetch for ES256), subsequent calls as "warm" (local verify).
let authPhaseSeen = false;
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: Parameters<
            NonNullable<CookieMethodsServer["setAll"]>
          >[0],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // W1: measure auth latency (cold vs warm). W2: getClaims() with NO argument does a
  // local ES256 verification for redirect gating; the no-arg path still refreshes the
  // session via getSession, and the createServerClient setAll above keeps rotating the
  // session cookie. Authorization-critical reads stay on getUser() (see cached-user.ts).
  const authStart = performance.now();
  const { data: claimsData } = await supabase.auth.getClaims();
  const authMs = Math.round((performance.now() - authStart) * 100) / 100;
  const phase = authPhaseSeen ? "warm" : "cold";
  authPhaseSeen = true;
  const hasSession = Boolean(claimsData?.claims?.sub);
  perfLog("mw-auth", { ms: authMs, phase, path: request.nextUrl.pathname, session: hasSession });

  // Copy supabaseResponse cookies onto a redirect response so auth-refresh
  // tokens set by Supabase SSR are not lost when we redirect.
  const redirectWithCookies = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  };

  // Root path: redirect based on auth state (avoids extra getUser in app/page.tsx)
  if (request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = hasSession ? "/dashboard" : "/login";
    return redirectWithCookies(url);
  }

  const protectedPaths = ["/dashboard", "/upload", "/products", "/settings"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!hasSession && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url);
  }

  const authPaths = ["/login", "/signup"];
  const isAuthPage = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return redirectWithCookies(url);
  }

  return supabaseResponse;
}
