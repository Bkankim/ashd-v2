import type { ReactNode } from "react";
import { Shield } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex items-center gap-2 text-primary">
        <Shield className="h-8 w-8" />
        <span className="text-2xl font-bold">ASHD</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
