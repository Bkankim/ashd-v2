import Link from "next/link";
import { Shield } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <Shield className="h-12 w-12 text-muted-foreground" />
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted-foreground">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-2.5 h-8 text-sm font-medium hover:bg-primary/80 transition-all"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
