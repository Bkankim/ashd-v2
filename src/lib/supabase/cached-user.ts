import { cache } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * getClaims vs getUser boundary (W9):
 * - Redirect GATING (presence-only) -> getCachedClaims(): local ES256 verification,
 *   no Supabase Auth network round-trip on the warm path.
 * - AUTHORIZATION-critical reads/mutations (e.g. api/documents/process, api/storage/presign)
 *   -> getCachedUser()/getUser(): server-verified identity so revocation is enforced.
 *
 * Request-scoped cached getUser. Calling this multiple times within the same
 * server request (layout + page + nested components) results in only ONE
 * round-trip to Supabase Auth.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Request-scoped cached claims for redirect GATING only (W3). Uses no-arg getClaims()
 * for local ES256 verification (no network on warm path); the no-arg path still refreshes
 * the session. Do NOT use for authorization-critical decisions — use getCachedUser there.
 */
export const getCachedClaims = cache(async () => {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});
