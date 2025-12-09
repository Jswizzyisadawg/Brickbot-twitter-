-- === BRICK DATABASE SCHEMA ===
-- Run this in Supabase SQL Editor to set up all tables

-- Thoughts: Everything Brick observes and thinks
CREATE TABLE IF NOT EXISTS thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'saw', 'thinking', 'action'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  content JSONB,
  evaluation JSONB,
  reasoning TEXT,
  mood TEXT,
  status TEXT, -- 'observed', 'thinking', 'reasoned', 'completed', 'skipped'
  action_taken TEXT,
  skip_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions: All engagements Brick makes
CREATE TABLE IF NOT EXISTS interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'action'
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT, -- 'reply', 'like', 'quote', 'follow', 'skip', 'original', 'blocked'
  content JSONB,
  guardrails JSONB,
  mood TEXT,
  status TEXT,
  thought_id UUID REFERENCES thoughts(id)
);

-- Mood log: Track Brick's emotional states
CREATE TABLE IF NOT EXISTS mood_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  mood TEXT NOT NULL,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Research log: All research Brick does
CREATE TABLE IF NOT EXISTS research_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT DEFAULT 'research',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  query TEXT,
  results JSONB,
  thought_id UUID REFERENCES thoughts(id)
);

-- Rabbit holes: Topics Brick is exploring deeply
CREATE TABLE IF NOT EXISTS rabbit_holes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL UNIQUE,
  depth TEXT DEFAULT 'shallow', -- 'shallow', 'medium', 'deep'
  interactions INTEGER DEFAULT 0,
  started TIMESTAMPTZ DEFAULT NOW(),
  last_visited TIMESTAMPTZ DEFAULT NOW()
);

-- Brick status: Current state for real-time UI
CREATE TABLE IF NOT EXISTS brick_status (
  id TEXT PRIMARY KEY DEFAULT 'current',
  status TEXT NOT NULL,
  details JSONB,
  mood TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Daily reflections
CREATE TABLE IF NOT EXISTS reflections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE UNIQUE,
  summary TEXT,
  highlights JSONB,
  learnings JSONB,
  mood_summary TEXT,
  stats JSONB
);

-- Gardener inputs: Your interactions with Brick
CREATE TABLE IF NOT EXISTS gardener_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input TEXT NOT NULL,
  brick_response TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Learning log: Track what Brick learns
CREATE TABLE IF NOT EXISTS learning_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_id UUID,
  topic TEXT,
  engagement_score FLOAT,
  learned BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement metrics: Track how Brick's posts perform
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id TEXT,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- === INDEXES for performance ===
CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp ON thoughts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_type ON thoughts(type);
CREATE INDEX IF NOT EXISTS idx_thoughts_status ON thoughts(status);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_action_type ON interactions(action_type);
CREATE INDEX IF NOT EXISTS idx_mood_log_timestamp ON mood_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rabbit_holes_topic ON rabbit_holes(topic);

-- === ENABLE REAL-TIME ===
-- Run these to enable real-time subscriptions

ALTER PUBLICATION supabase_realtime ADD TABLE thoughts;
ALTER PUBLICATION supabase_realtime ADD TABLE interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE mood_log;
ALTER PUBLICATION supabase_realtime ADD TABLE brick_status;
ALTER PUBLICATION supabase_realtime ADD TABLE rabbit_holes;

-- === ROW LEVEL SECURITY (optional but recommended) ===
-- For now, allow all access (you can tighten this later)

ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rabbit_holes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brick_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE reflections ENABLE ROW LEVEL SECURITY;
ALTER TABLE gardener_inputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Policies: Allow all for now (using anon key)
CREATE POLICY "Allow all" ON thoughts FOR ALL USING (true);
CREATE POLICY "Allow all" ON interactions FOR ALL USING (true);
CREATE POLICY "Allow all" ON mood_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON research_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON rabbit_holes FOR ALL USING (true);
CREATE POLICY "Allow all" ON brick_status FOR ALL USING (true);
CREATE POLICY "Allow all" ON reflections FOR ALL USING (true);
CREATE POLICY "Allow all" ON gardener_inputs FOR ALL USING (true);
CREATE POLICY "Allow all" ON learning_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON engagement_metrics FOR ALL USING (true);

-- === EMOTIONAL INTELLIGENCE LAYER ===
-- Track stimulus → emotion → decision → outcome for learning

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
  thought_id UUID REFERENCES thoughts(id)
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
  notes TEXT
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

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE emotional_events;
ALTER PUBLICATION supabase_realtime ADD TABLE outcomes;
ALTER PUBLICATION supabase_realtime ADD TABLE relationships;

-- RLS for new tables
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON emotional_events FOR ALL USING (true);
CREATE POLICY "Allow all" ON outcomes FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_patterns FOR ALL USING (true);
CREATE POLICY "Allow all" ON relationships FOR ALL USING (true);

-- Done! Your database is ready for Brick 🧱
