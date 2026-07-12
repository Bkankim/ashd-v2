import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCachedClaims } from "@/lib/supabase/cached-user";
import { TopHeader } from "@/components/TopHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  // W3: gate on local-verified claims (no Auth network round-trip on warm path).
  const claims = await getCachedClaims();

  if (!claims) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <TopHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
