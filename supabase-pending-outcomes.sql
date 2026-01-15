-- === PENDING OUTCOMES TABLE ===
-- Tracks engagements that need outcome scoring
-- Run this in Supabase SQL Editor

-- Pending outcomes for async scoring
CREATE TABLE IF NOT EXISTS pending_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- What action was taken
  action_type TEXT NOT NULL,           -- 'reply', 'quote', 'original', 'like'
  tweet_id TEXT,                       -- The tweet Brick created (for reply/quote/original)
  target_tweet_id TEXT,                -- The tweet Brick responded to (for reply/quote/like)

  -- Link to emotional event
  emotional_event_id UUID REFERENCES emotional_events(id),

  -- When to check
  check_after TIMESTAMPTZ NOT NULL,    -- Don't check until this time (24hrs after post)

  -- Metrics snapshots (for calculating delta)
  initial_metrics JSONB DEFAULT '{}',
  latest_metrics JSONB DEFAULT '{}',

  -- Final score
  outcome_score FLOAT,                 -- 0.0 to 1.0 final score
  evaluated_at TIMESTAMPTZ,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'evaluating', 'completed', 'failed'))
);

-- Index for finding pending outcomes to check
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_status ON pending_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_check_after ON pending_outcomes(check_after);
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_tweet ON pending_outcomes(tweet_id);

-- Enable RLS
ALTER TABLE pending_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON pending_outcomes FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE pending_outcomes;
