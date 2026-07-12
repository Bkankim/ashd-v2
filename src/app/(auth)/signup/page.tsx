"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [crossBorderConsent, setCrossBorderConsent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!privacyConsent || !crossBorderConsent) {
      setError("필수 동의 항목에 모두 동의해야 가입이 가능합니다.");
      setLoading(false);
      return;
    }

    const consentAt = new Date().toISOString();
    const policyVersion = "2026-03-13";

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          privacy_consent: true,
          cross_border_consent: true,
          consent_at: consentAt,
          policy_version: policyVersion,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card className="card-shadow-lg border-border/50">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">회원가입</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">비밀번호</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">약관 동의</p>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={privacyConsent}
                onChange={(e) => setPrivacyConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="text-destructive">[필수]</span>{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  className="text-primary underline"
                >
                  개인정보 수집/이용
                </a>
                에 동의합니다
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={crossBorderConsent}
                onChange={(e) => setCrossBorderConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <span>
                <span className="text-destructive">[필수]</span>{" "}
                <a
                  href="/privacy#international-transfer"
                  target="_blank"
                  className="text-primary underline"
                >
                  개인정보 국외 이전
                </a>
                에 동의합니다
                <br />
                <span className="text-xs text-muted-foreground">
                  (Google, OpenAI/Anthropic, Supabase로의 데이터 전송)
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input type="checkbox" disabled className="mt-0.5 h-4 w-4" />
              <span>
                <a
                  href="/terms"
                  target="_blank"
                  className="text-primary underline"
                >
                  이용약관
                </a>
                에 동의합니다 (자동 동의)
              </span>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !privacyConsent || !crossBorderConsent}
            className="w-full"
          >
            {loading ? "가입 중..." : "회원가입"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              로그인
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
