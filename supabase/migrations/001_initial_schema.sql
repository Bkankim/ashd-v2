-- ASHD v2 초기 스키마
-- Supabase Auth의 auth.users(id uuid) 사용, 별도 user 테이블 불필요

-- ===========================
-- 1. product (제품/영수증 정보)
-- ===========================
CREATE TABLE IF NOT EXISTS product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  product_category text,
  purchase_date date,
  amount numeric(12, 2),
  store text,
  order_id text,
  refund_deadline date,
  warranty_end_date date,
  as_contact text,
  image_path text,
  raw_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_user_id ON product (user_id);
CREATE INDEX IF NOT EXISTS idx_product_refund_deadline ON product (refund_deadline) WHERE refund_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_product_warranty_end ON product (warranty_end_date) WHERE warranty_end_date IS NOT NULL;

-- ===========================
-- 2. document (업로드 문서 원문)
-- ===========================
CREATE TABLE IF NOT EXISTS document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  title text,
  image_path text,
  raw_text text NOT NULL DEFAULT '',
  parsed_fields jsonb NOT NULL DEFAULT '{}',
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_user_id ON document (user_id);
CREATE INDEX IF NOT EXISTS idx_document_product_id ON document (product_id);

-- ===========================
-- 3. document_processing_job (OCR/LLM 처리 작업)
-- ===========================
CREATE TABLE IF NOT EXISTS document_processing_job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES document(id) ON DELETE SET NULL,
  product_id uuid REFERENCES product(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_user_id ON document_processing_job (user_id);
CREATE INDEX IF NOT EXISTS idx_job_status ON document_processing_job (status) WHERE status IN ('pending', 'processing');

-- ===========================
-- 4. notification_settings (알림 설정)
-- ===========================
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled boolean NOT NULL DEFAULT true,
  telegram_enabled boolean NOT NULL DEFAULT false,
  warranty_days_before int[] NOT NULL DEFAULT '{30, 7, 3}',
  refund_days_before int[] NOT NULL DEFAULT '{3}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================
-- 5. telegram_account (텔레그램 연동)
-- ===========================
CREATE TABLE IF NOT EXISTS telegram_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id text NOT NULL,
  username text,
  linked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telegram_user_id ON telegram_account (user_id);

-- ===========================
-- 6. updated_at 자동 갱신 트리거
-- ===========================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_product_updated_at
  BEFORE UPDATE ON product
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_document_updated_at
  BEFORE UPDATE ON document
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_job_updated_at
  BEFORE UPDATE ON document_processing_job
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===========================
-- 7. RLS 정책
-- ===========================
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE document ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_processing_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_account ENABLE ROW LEVEL SECURITY;

-- product RLS
CREATE POLICY "Users can view own products" ON product FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own products" ON product FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own products" ON product FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own products" ON product FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- document RLS
CREATE POLICY "Users can view own documents" ON document FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own documents" ON document FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own documents" ON document FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own documents" ON document FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- document_processing_job RLS
CREATE POLICY "Users can view own jobs" ON document_processing_job FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own jobs" ON document_processing_job FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- notification_settings RLS
CREATE POLICY "Users can view own settings" ON notification_settings FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own settings" ON notification_settings FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own settings" ON notification_settings FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- telegram_account RLS
CREATE POLICY "Users can view own telegram" ON telegram_account FOR SELECT
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can insert own telegram" ON telegram_account FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own telegram" ON telegram_account FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can delete own telegram" ON telegram_account FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- ===========================
-- 8. Storage 버킷 + 정책
-- ===========================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: 사용자별 폴더 격리
CREATE POLICY "Users can upload to own folder" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can view own files" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
