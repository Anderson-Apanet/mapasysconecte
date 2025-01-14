-- Add serial column to materiais table
ALTER TABLE materiais
ADD COLUMN IF NOT EXISTS serial VARCHAR(100);
