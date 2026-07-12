import { Shield, LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TopHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-primary"
        >
          <Shield className="h-6 w-6" />
          <span className="text-lg font-bold">ASHD</span>
        </Link>

        <form action="/auth/signout" method="post">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </header>
  );
}
