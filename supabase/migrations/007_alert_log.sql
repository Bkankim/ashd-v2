-- 알림 발송 이력 (dedup + catch-up 재설계의 근간)
-- 발송 판정: daysLeft <= 임계값 AND (product, type, threshold, channel) 미기록
-- UNIQUE 제약이 "임계값당 정확히 1회"의 멱등성 보증 장치다.
-- 적용: 사용자가 Supabase SQL Editor/MCP로 수동 실행 (hardening 브랜치 merge 전 선행)

CREATE TABLE IF NOT EXISTS alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES product(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('warranty', 'refund')),
  threshold_days int NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'telegram')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, type, threshold_days, channel)
);

CREATE INDEX IF NOT EXISTS idx_alert_log_user_id ON alert_log (user_id);
CREATE INDEX IF NOT EXISTS idx_alert_log_product_id ON alert_log (product_id);

ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

-- cron(service role)이 insert하므로 사용자 정책은 SELECT만 (consent_log 선례와 동일)
CREATE POLICY "Users can view own alert log" ON alert_log FOR SELECT
  USING (user_id = (SELECT auth.uid()));
