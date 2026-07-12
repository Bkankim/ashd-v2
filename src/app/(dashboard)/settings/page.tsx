import { redirect } from "next/navigation";
import { User, Mail } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCachedUser } from "@/lib/supabase/cached-user";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { NotificationSettingsForm } from "./NotificationSettingsForm";
import { TelegramSection } from "./TelegramSection";
import { AccountDeletion } from "./AccountDeletion";

export default async function SettingsPage() {
  const [user, supabase] = await Promise.all([
    getCachedUser(),
    createServerSupabaseClient(),
  ]);

  if (!user) {
    redirect("/login");
  }

  const [
    { data: settings, error: settingsError },
    { data: telegram, error: telegramError },
  ] = await Promise.all([
    supabase
      .from("notification_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("telegram_account")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (settingsError) throw settingsError;
  if (telegramError) throw telegramError;

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">설정</h1>

      <Card className="card-shadow border-border/50">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">계정</p>
            <p className="flex items-center gap-1.5 font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              {user?.email}
            </p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">알림 설정</h2>
        <NotificationSettingsForm settings={settings} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">텔레그램 연동</h2>
        <TelegramSection telegram={telegram} />
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-destructive">계정 삭제</h2>
        <AccountDeletion />
      </section>
    </div>
  );
}
