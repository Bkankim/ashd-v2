"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteAccount } from "@/app/actions/settings";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AccountDeletion() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    const confirmed = confirm(
      "정말 계정을 삭제하시겠습니까?\n\n모든 제품, 문서, 알림 설정, 텔레그램 연동 정보가 영구 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.",
    );
    if (!confirmed) return;

    const doubleConfirm = confirm(
      "마지막 확인: 계정 삭제를 진행합니다. 정말로 동의하십니까?",
    );
    if (!doubleConfirm) return;

    startTransition(async () => {
      const result = await deleteAccount();
      if (result.success) {
        router.push("/login");
        router.refresh();
      } else {
        alert(result.message);
      }
    });
  }

  return (
    <Card className="border-destructive/30">
      <CardContent className="space-y-3 p-5">
        <p className="text-sm text-muted-foreground">
          계정을 삭제하면 모든 데이터(제품, 문서, 처리 작업, 알림 설정, 텔레그램
          연동, Storage 파일)가 영구적으로 삭제됩니다.
        </p>
        <Button
          onClick={handleDelete}
          disabled={isPending}
          variant="destructive"
        >
          {isPending ? "삭제 중..." : "계정 탈퇴"}
        </Button>
      </CardContent>
    </Card>
  );
}
