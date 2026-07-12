/**
 * Open-redirect defense for the auth callback `next` parameter.
 *
 * Layered rules:
 *  1. must start with a single "/" (relative path only)
 *  2. no backslashes — WHATWG URL parsing normalizes "\" to "/" so
 *     "/\evil.com" would otherwise become "//evil.com"
 *  3. no control characters
 *  4. final defense: resolved URL must stay on the same origin as base
 */

const FALLBACK = "/dashboard";

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function resolveSafeNext(next: string | null, baseUrl: string): string {
  if (!next) return FALLBACK;
  if (!next.startsWith("/") || next.startsWith("//")) return FALLBACK;
  if (next.includes("\\")) return FALLBACK;
  if (CONTROL_CHARS.test(next)) return FALLBACK;

  try {
    const base = new URL(baseUrl);
    const resolved = new URL(next, base);
    if (resolved.origin !== base.origin) return FALLBACK;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return FALLBACK;
  }
}
