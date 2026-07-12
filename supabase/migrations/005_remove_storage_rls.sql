-- R2 마이그레이션 완료: Supabase Storage RLS 정책 제거
-- 이 마이그레이션은 2026-03-04에 MCP apply_migration으로 이미 실행됨
-- 로컬 히스토리 동기화를 위해 코드화
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
