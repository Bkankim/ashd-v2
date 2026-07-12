"use client";

import { useActionState, useTransition } from "react";
import {
  linkTelegram,
  unlinkTelegram,
  type SettingsActionState,
} from "@/app/actions/settings";
import type { Database } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TelegramAccountRow =
  Database["public"]["Tables"]["telegram_account"]["Row"];

const initialState: SettingsActionState = { message: "" };

export function TelegramSection({
  telegram,
}: {
  telegram: TelegramAccountRow | null;
}) {
  const [linkState, linkAction, linkPending] = useActionState(
    linkTelegram,
    initialState,
  );
  const [unlinkPending, startUnlinkTransition] = useTransition();

  function handleUnlink() {
    if (!confirm("텔레그램 연동을 해제하시겠습니까?")) return;
    startUnlinkTransition(async () => {
      await unlinkTelegram();
    });
  }

  if (telegram) {
    return (
      <Card className="border-border/50">
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="text-xs text-muted-foreground">Chat ID</p>
            <p className="font-medium">{telegram.chat_id}</p>
          </div>
          {telegram.username && (
            <div>
              <p className="text-xs text-muted-foreground">Username</p>
              <p className="font-medium">@{telegram.username}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground">연동일</p>
            <p className="text-sm">
              {new Date(telegram.linked_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
          <Button
            onClick={handleUnlink}
            disabled={unlinkPending}
            variant="destructive"
            size="sm"
          >
            {unlinkPending ? "해제 중..." : "연동 해제"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <form action={linkAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            텔레그램 봇(@ashd_alert_bot)에서 /start 명령 후 Chat ID를 입력하세요.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="chat_id">
              Chat ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="chat_id"
              name="chat_id"
              type="text"
              required
              placeholder="예: 123456789"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="username">Username (선택)</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="@username"
            />
          </div>

          {linkState.message && (
            <p
              className={`rounded-lg p-3 text-sm ${
                linkState.success
                  ? "bg-accent text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {linkState.message}
            </p>
          )}

          <Button type="submit" disabled={linkPending}>
            {linkPending ? "연동 중..." : "텔레그램 연동"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
