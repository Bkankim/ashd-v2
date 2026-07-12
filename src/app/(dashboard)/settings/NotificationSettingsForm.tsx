"use client";

import { useActionState } from "react";
import {
  updateNotificationSettings,
  type SettingsActionState,
} from "@/app/actions/settings";
import type { Database } from "@/types/database";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type NotificationSettingsRow =
  Database["public"]["Tables"]["notification_settings"]["Row"];

const initialState: SettingsActionState = { message: "" };

export function NotificationSettingsForm({
  settings,
}: {
  settings: NotificationSettingsRow | null;
}) {
  const [state, formAction, pending] = useActionState(
    updateNotificationSettings,
    initialState,
  );

  return (
    <Card className="border-border/50">
      <CardContent className="p-5">
        <form action={formAction} className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email_enabled">이메일 알림</Label>
            <Switch
              id="email_enabled"
              name="email_enabled"
              defaultChecked={settings?.email_enabled ?? true}
              value="true"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="telegram_enabled">텔레그램 알림</Label>
            <Switch
              id="telegram_enabled"
              name="telegram_enabled"
              defaultChecked={settings?.telegram_enabled ?? false}
              value="true"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="warranty_days_before">
              보증 만료 알림 (일수, 쉼표 구분)
            </Label>
            <Input
              id="warranty_days_before"
              name="warranty_days_before"
              type="text"
              defaultValue={
                settings?.warranty_days_before?.join(", ") ?? "30, 7, 3"
              }
              placeholder="30, 7, 3"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="refund_days_before">
              환불 마감 알림 (일수, 쉼표 구분)
            </Label>
            <Input
              id="refund_days_before"
              name="refund_days_before"
              type="text"
              defaultValue={settings?.refund_days_before?.join(", ") ?? "3"}
              placeholder="3"
            />
          </div>

          {state.message && (
            <p
              className={`rounded-lg p-3 text-sm ${
                state.success
                  ? "bg-accent text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending}>
            {pending ? "저장 중..." : "설정 저장"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
