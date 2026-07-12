import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware handles auth-based redirect for "/".
  // Fallback redirects to /login (not /dashboard) to prevent redirect chain:
  // if this page is somehow reached without middleware, going to /dashboard
  // would trigger middleware redirect to /login — a wasteful double redirect.
  redirect("/login");
}
