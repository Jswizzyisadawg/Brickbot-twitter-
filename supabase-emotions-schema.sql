-- === BRICK EMOTIONAL INTELLIGENCE SCHEMA ===
-- Run this in Supabase SQL Editor to add emotional tracking tables
-- This is an addendum to the main schema

-- Emotional events: every state change and decision
CREATE TABLE IF NOT EXISTS emotional_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- The stimulus that triggered this
  stimulus_type TEXT,              -- 'tweet', 'mention', 'research', 'reflection', 'connection'
  stimulus_id TEXT,                -- tweet_id, user_id, etc.
  stimulus_content TEXT,           -- the actual content
  stimulus_author TEXT,            -- who created it

  -- The emotional response
  emotional_state TEXT NOT NULL,   -- 'curious', 'delighted', 'confused', 'excited', 'playful', 'contemplative', 'appreciative', 'wary'
  intensity FLOAT DEFAULT 0.5,     -- 0.0 to 1.0
  previous_state TEXT,             -- what state did we transition from?

  -- The decision made
  decision TEXT,                   -- 'reply', 'like', 'follow', 'quote', 'skip', 'research', 'original'
  decision_content TEXT,           -- what Brick said/did

  -- Brick's reasoning
  reasoning TEXT,                  -- why this emotional response? why this decision?

  -- Link to thought if applicable
  thought_id UUID
);

-- Outcomes: what happened after each decision
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emotional_event_id UUID REFERENCES emotional_events(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  checked_at TIMESTAMPTZ,          -- when we last checked outcomes

  -- External metrics (from Twitter)
  likes_received INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  retweets_received INTEGER DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  conversation_depth INTEGER DEFAULT 0,   -- how many back-and-forths

  -- Quality signals
  response_sentiment TEXT,         -- 'positive', 'neutral', 'negative', 'thoughtful', 'dismissive'
  response_samples JSONB,          -- actual responses received
  led_to_connection BOOLEAN DEFAULT FALSE,
  meaningful_exchange BOOLEAN DEFAULT FALSE,

  -- Internal assessment (Brick's reflection)
  felt_authentic BOOLEAN,
  would_do_again BOOLEAN,
  learned_something BOOLEAN,
  what_learned TEXT,

  -- Composite score (calculated)
  outcome_score FLOAT              -- 0.0 to 1.0, weighted combination
);

-- Emotional patterns: learned associations over time
CREATE TABLE IF NOT EXISTS emotional_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- The pattern
  stimulus_pattern TEXT,           -- what kind of stimulus
  emotional_state TEXT,            -- what emotion it triggers
  typical_decision TEXT,           -- what Brick usually does

  -- Statistics
  occurrences INTEGER DEFAULT 1,
  avg_intensity FLOAT,
  avg_outcome_score FLOAT,
  success_rate FLOAT,              -- how often this leads to good outcomes

  -- Learning
  should_continue BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Unique constraint for upserts
  UNIQUE(emotional_state, typical_decision)
);

-- Relationships: people Brick has connected with
CREATE TABLE IF NOT EXISTS relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,

  -- Relationship status
  first_interaction TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 1,

  -- Quality signals
  shared_interests JSONB,          -- topics we've discussed
  vibe_score FLOAT DEFAULT 0.5,    -- how good are interactions? 0-1
  is_following BOOLEAN DEFAULT FALSE,
  they_follow_us BOOLEAN DEFAULT FALSE,

  -- Emotional history with this person
  typical_emotion TEXT,            -- how do they make Brick feel?
  best_interactions JSONB,         -- highlights

  -- Notes
  notes TEXT
);

-- Indexes for emotional tables
CREATE INDEX IF NOT EXISTS idx_emotional_events_timestamp ON emotional_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_events_state ON emotional_events(emotional_state);
CREATE INDEX IF NOT EXISTS idx_emotional_events_decision ON emotional_events(decision);
CREATE INDEX IF NOT EXISTS idx_outcomes_event ON outcomes(emotional_event_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_score ON outcomes(outcome_score DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_username ON relationships(username);
CREATE INDEX IF NOT EXISTS idx_relationships_vibe ON relationships(vibe_score DESC);

-- Enable real-time for new tables (run these separately if they fail)
-- ALTER PUBLICATION supabase_realtime ADD TABLE emotional_events;
-- ALTER PUBLICATION supabase_realtime ADD TABLE outcomes;
-- ALTER PUBLICATION supabase_realtime ADD TABLE relationships;

-- RLS for new tables
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (so this can be run multiple times)
DROP POLICY IF EXISTS "Allow all" ON emotional_events;
DROP POLICY IF EXISTS "Allow all" ON outcomes;
DROP POLICY IF EXISTS "Allow all" ON emotional_patterns;
DROP POLICY IF EXISTS "Allow all" ON relationships;

-- Create policies
CREATE POLICY "Allow all" ON emotional_events FOR ALL USING (true);
CREATE POLICY "Allow all" ON outcomes FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_patterns FOR ALL USING (true);
CREATE POLICY "Allow all" ON relationships FOR ALL USING (true);

-- Done! Emotional intelligence layer is ready
