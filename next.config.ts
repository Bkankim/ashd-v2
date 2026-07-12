import type { NextConfig } from "next";

// W10: removed the stale Supabase Storage image remotePattern. Storage moved to Cloudflare R2
// (migration 005_remove_storage_rls) and no next/image renders remote images, so the pattern
// was dead config. Re-add an R2 (or custom-domain) remotePattern here if remote <Image>
// rendering is introduced later.
const nextConfig: NextConfig = {};

export default nextConfig;
