-- Add tags column to logs table
ALTER TABLE logs ADD COLUMN IF NOT EXISTS tags text[];
