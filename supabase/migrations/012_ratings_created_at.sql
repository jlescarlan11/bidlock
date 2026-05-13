-- Add created_at column to ratings table
ALTER TABLE ratings ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
