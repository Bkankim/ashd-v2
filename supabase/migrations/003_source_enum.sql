-- Convert source column from text+CHECK to Postgres ENUM
-- Ensures type-safety at the database level

BEGIN;

-- 1. Create ENUM type
CREATE TYPE source_type AS ENUM ('manual', 'screenshot', 'kakao_share', 'email');

-- 2. Drop existing CHECK constraints (added in 002_add_source_field.sql)
ALTER TABLE product DROP CONSTRAINT IF EXISTS product_source_check;
ALTER TABLE document DROP CONSTRAINT IF EXISTS document_source_check;

-- 3. Convert product.source from text to source_type
ALTER TABLE product
  ALTER COLUMN source DROP DEFAULT,
  ALTER COLUMN source TYPE source_type USING source::source_type,
  ALTER COLUMN source SET DEFAULT 'manual';

-- 4. Convert document.source from text to source_type
ALTER TABLE document
  ALTER COLUMN source DROP DEFAULT,
  ALTER COLUMN source TYPE source_type USING source::source_type,
  ALTER COLUMN source SET DEFAULT 'screenshot';

COMMIT;
