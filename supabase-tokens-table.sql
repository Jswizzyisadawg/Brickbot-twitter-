-- === BRICK TOKENS TABLE ===
-- Run this in Supabase SQL Editor
-- Secure storage for Twitter OAuth tokens

-- Create tokens table
CREATE TABLE IF NOT EXISTS brick_tokens (
  id TEXT PRIMARY KEY DEFAULT 'twitter',  -- Single row for Twitter tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  user_id TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS brick_tokens_updated_at ON brick_tokens;
CREATE TRIGGER brick_tokens_updated_at
  BEFORE UPDATE ON brick_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Note: For production, you might want to enable RLS
-- But for a single-user bot, the anon key + table is fine
-- The anon key should NOT be exposed in client-side code

-- Verify it worked
SELECT 'brick_tokens table created successfully' as status;
