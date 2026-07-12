-- Add source field to support multi-source data collection
-- Valid values: manual, screenshot, kakao_share, email

-- 1. Add source column to product table
ALTER TABLE product
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('manual', 'screenshot', 'kakao_share', 'email'));

-- 2. Add source column to document table
ALTER TABLE document
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'screenshot'
  CHECK (source IN ('manual', 'screenshot', 'kakao_share', 'email'));

-- 3. Backfill existing product rows that have image_path (were created via OCR upload)
UPDATE product SET source = 'screenshot' WHERE image_path IS NOT NULL AND source = 'manual';
