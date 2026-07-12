-- 동의 기록 테이블 (개인정보보호법 동의 입증 의무)
-- signUp 시 raw_user_meta_data에 저장된 동의 정보를 트리거로 자동 기록

CREATE TABLE IF NOT EXISTS consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN ('privacy', 'cross_border')),
  policy_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user_id ON consent_log (user_id);

ALTER TABLE consent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent" ON consent_log FOR SELECT
  USING (user_id = (SELECT auth.uid()));

-- 신규 가입 시 raw_user_meta_data에서 동의 기록 자동 추출
CREATE OR REPLACE FUNCTION log_user_consent()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.raw_user_meta_data->>'privacy_consent' = 'true' THEN
    INSERT INTO public.consent_log (user_id, consent_type, policy_version, consented_at)
    VALUES (
      NEW.id,
      'privacy',
      COALESCE(NEW.raw_user_meta_data->>'policy_version', 'unknown'),
      COALESCE((NEW.raw_user_meta_data->>'consent_at')::timestamptz, NOW())
    );
  END IF;

  IF NEW.raw_user_meta_data->>'cross_border_consent' = 'true' THEN
    INSERT INTO public.consent_log (user_id, consent_type, policy_version, consented_at)
    VALUES (
      NEW.id,
      'cross_border',
      COALESCE(NEW.raw_user_meta_data->>'policy_version', 'unknown'),
      COALESCE((NEW.raw_user_meta_data->>'consent_at')::timestamptz, NOW())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_consent
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION log_user_consent();
