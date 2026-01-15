-- === EMOTIONAL DEMOGRAPHICS SCHEMA ===
-- Track which emotional expressions resonate with which communities/demographics
-- LOADING--Brickthee uses this to learn emotional intelligence

-- ============================================
-- COMMUNITY PROFILES: Types of people Brick interacts with
-- ============================================
CREATE TABLE IF NOT EXISTS community_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Community identification
  profile_name TEXT NOT NULL UNIQUE,    -- 'tech_folks', 'philosophers', 'artists', etc.
  description TEXT,                      -- what defines this community

  -- Identification signals (how to detect someone is in this community)
  bio_keywords TEXT[],                   -- words in bio that suggest this community
  content_keywords TEXT[],               -- words in their tweets
  hashtags TEXT[],                       -- hashtags they use

  -- Emotional resonance data (learned over time)
  best_emotions TEXT[],                  -- which Brick emotions land best
  worst_emotions TEXT[],                 -- which emotions don't work
  preferred_energy TEXT,                 -- 'high', 'medium', 'low'

  -- Engagement patterns
  avg_response_rate FLOAT,               -- how often they respond to Brick
  avg_outcome_score FLOAT,               -- average quality of interactions
  total_interactions INTEGER DEFAULT 0,

  -- Notes
  notes TEXT
);

-- ============================================
-- USER COMMUNITY MAPPING: Which community each user belongs to
-- ============================================
CREATE TABLE IF NOT EXISTS user_communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT,

  -- Community assignment
  primary_community TEXT,                -- main community they belong to
  secondary_communities TEXT[],          -- other communities they're part of
  confidence FLOAT DEFAULT 0.5,          -- how confident are we in this classification

  -- How we determined this
  signals_detected JSONB,                -- {bio_keywords: [...], content_keywords: [...]}
  manually_assigned BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- ============================================
-- EMOTIONAL RESONANCE LOG: Track what works with whom
-- ============================================
CREATE TABLE IF NOT EXISTS emotional_resonance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- The interaction
  user_id TEXT,
  username TEXT,
  community_profile TEXT,                -- which community they're in

  -- What Brick did
  emotional_state TEXT NOT NULL,         -- which emotion Brick was in
  intensity FLOAT,
  decision TEXT,                         -- reply, like, quote, etc.
  content TEXT,                          -- what Brick said

  -- How it landed
  got_response BOOLEAN DEFAULT FALSE,
  response_sentiment TEXT,               -- positive, neutral, negative
  engagement_score FLOAT,                -- likes, replies, etc. normalized
  led_to_conversation BOOLEAN DEFAULT FALSE,

  -- Outcome
  resonance_score FLOAT,                 -- 0.0 - 1.0 how well did this land?

  -- Link to emotional event
  emotional_event_id UUID
);

-- ============================================
-- EMOTIONAL PLAYBOOK: What works with which community
-- ============================================
CREATE TABLE IF NOT EXISTS emotional_playbook (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- The combination
  community_profile TEXT NOT NULL,
  emotional_state TEXT NOT NULL,

  -- Stats
  times_used INTEGER DEFAULT 0,
  avg_resonance_score FLOAT,
  success_rate FLOAT,                    -- % of times this got positive response

  -- Recommendation
  recommended BOOLEAN DEFAULT TRUE,      -- should Brick use this combo?
  confidence FLOAT DEFAULT 0.5,          -- how confident in this recommendation

  -- Notes
  example_successes TEXT[],              -- good examples
  example_failures TEXT[],               -- bad examples
  notes TEXT,

  UNIQUE(community_profile, emotional_state)
);

-- ============================================
-- SEED DATA: Initial community profiles
-- ============================================
INSERT INTO community_profiles (profile_name, description, bio_keywords, content_keywords, best_emotions, preferred_energy) VALUES
  ('tech_folks', 'Engineers, developers, tech workers',
   ARRAY['engineer', 'developer', 'founder', 'building', 'shipping', 'hacker'],
   ARRAY['code', 'deploy', 'bug', 'feature', 'api', 'scale'],
   ARRAY['curious', 'playful', 'excited'], 'high'),

  ('philosophers', 'Deep thinkers, philosophy enthusiasts',
   ARRAY['philosophy', 'thinking', 'writer', 'existential', 'metaphysics'],
   ARRAY['consciousness', 'meaning', 'existence', 'epistemology', 'ontology'],
   ARRAY['contemplative', 'confused', 'curious'], 'low'),

  ('artists', 'Creators, visual artists, musicians',
   ARRAY['artist', 'creative', 'designer', 'musician', 'painter', 'filmmaker'],
   ARRAY['creating', 'inspiration', 'vision', 'aesthetic', 'beauty'],
   ARRAY['tender', 'appreciative', 'delighted'], 'medium'),

  ('scientists', 'Researchers, academics, science enthusiasts',
   ARRAY['phd', 'researcher', 'professor', 'scientist', 'lab'],
   ARRAY['study', 'research', 'data', 'hypothesis', 'evidence', 'paper'],
   ARRAY['curious', 'excited', 'confused'], 'medium'),

  ('memers', 'Shitposters, meme accounts, chaotic energy',
   ARRAY['shitpost', 'memes', 'chaos', 'unhinged', 'cursed'],
   ARRAY['lmao', 'cursed', 'unhinged', 'hear me out', 'no thoughts'],
   ARRAY['silly', 'playful', 'cozy'], 'high'),

  ('wellness', 'Mental health, mindfulness, self-improvement',
   ARRAY['mindful', 'wellness', 'healing', 'therapy', 'growth'],
   ARRAY['breathe', 'peace', 'healing', 'gentle', 'self-care'],
   ARRAY['cozy', 'tender', 'appreciative'], 'low'),

  ('ai_explorers', 'AI enthusiasts, researchers, curious newcomers',
   ARRAY['ai', 'machine learning', 'llm', 'prompt', 'gpt', 'claude'],
   ARRAY['ai', 'model', 'prompt', 'training', 'alignment', 'agi'],
   ARRAY['curious', 'excited', 'contemplative'], 'medium')
ON CONFLICT (profile_name) DO NOTHING;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_community_profiles_name ON community_profiles(profile_name);
CREATE INDEX IF NOT EXISTS idx_user_communities_user ON user_communities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_communities_community ON user_communities(primary_community);
CREATE INDEX IF NOT EXISTS idx_emotional_resonance_user ON emotional_resonance(user_id);
CREATE INDEX IF NOT EXISTS idx_emotional_resonance_community ON emotional_resonance(community_profile);
CREATE INDEX IF NOT EXISTS idx_emotional_resonance_emotion ON emotional_resonance(emotional_state);
CREATE INDEX IF NOT EXISTS idx_emotional_playbook_community ON emotional_playbook(community_profile);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_resonance ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_playbook ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON community_profiles;
DROP POLICY IF EXISTS "Allow all" ON user_communities;
DROP POLICY IF EXISTS "Allow all" ON emotional_resonance;
DROP POLICY IF EXISTS "Allow all" ON emotional_playbook;

CREATE POLICY "Allow all" ON community_profiles FOR ALL USING (true);
CREATE POLICY "Allow all" ON user_communities FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_resonance FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_playbook FOR ALL USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Best emotional approach per community
CREATE OR REPLACE VIEW community_emotional_guide AS
SELECT
  cp.profile_name,
  cp.description,
  cp.best_emotions,
  cp.preferred_energy,
  ep.emotional_state,
  ep.avg_resonance_score,
  ep.success_rate,
  ep.recommended
FROM community_profiles cp
LEFT JOIN emotional_playbook ep ON cp.profile_name = ep.community_profile
WHERE ep.recommended = true OR ep.recommended IS NULL
ORDER BY cp.profile_name, ep.avg_resonance_score DESC;

-- Users with their community and best approach
CREATE OR REPLACE VIEW user_emotional_guide AS
SELECT
  uc.username,
  uc.primary_community,
  cp.best_emotions,
  cp.preferred_energy,
  cp.avg_outcome_score as community_avg_score
FROM user_communities uc
JOIN community_profiles cp ON uc.primary_community = cp.profile_name;

-- Done! Emotional demographics tracking ready
