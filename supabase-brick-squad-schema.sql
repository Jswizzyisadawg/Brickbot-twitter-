-- === BRICK SQUAD INTELLIGENCE SCHEMA ===
-- Run this in Supabase SQL Editor to enable the multi-agent learning system
-- This powers LOADING--Brickthee and the weekly digest system

-- ============================================
-- BRICK LOG: Raw event stream for everything
-- ============================================
CREATE TABLE IF NOT EXISTS brick_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Event classification
  event_type TEXT NOT NULL,           -- 'scout', 'engage', 'create', 'reflect', 'learn', 'approve', 'reject'
  cycle_id TEXT,                      -- group related events in a cycle

  -- Target information
  target_user TEXT,                   -- @username we interacted with
  target_user_id TEXT,                -- twitter user id
  target_content TEXT,                -- the tweet/content we responded to
  target_tweet_id TEXT,               -- tweet id

  -- Brick's action
  brick_action TEXT,                  -- 'reply', 'like', 'quote', 'follow', 'skip', 'original', 'research'
  brick_response TEXT,                -- what Brick said/did
  brick_tweet_id TEXT,                -- our tweet id if we posted

  -- Decision context (the WHY archive)
  assumption TEXT,                    -- what Brick assumed about the situation
  reasoning TEXT,                     -- evidence for the assumption
  curiosity_trigger TEXT,             -- what sparked interest

  -- Agents involved
  agents_involved TEXT[],             -- ['lil_brick', 'brick_da_homi', 'brick_the_wise']
  scout_report JSONB,                 -- Lil Brick's findings
  wise_judgment JSONB,                -- Brick the Wise's gate results
  reflection JSONB,                   -- BRICK/kcirB's analysis

  -- Pre-action context
  relationship_history JSONB,         -- previous interactions with this user
  constitutional_check JSONB,         -- how it aligns with the soul

  -- Outcomes (filled in later)
  outcome_engagement JSONB,           -- {likes, replies, quotes, retweets}
  outcome_sentiment TEXT,             -- 'positive', 'neutral', 'negative', 'thoughtful'
  outcome_relationship_delta FLOAT,   -- did this strengthen (+) or weaken (-) the bond?
  outcome_led_to_conversation BOOLEAN DEFAULT FALSE,
  outcome_checked_at TIMESTAMPTZ,

  -- Quality scoring (LOADING--Brickthee fills this)
  constitutional_alignment FLOAT,     -- 0.0 - 1.0
  authenticity_score FLOAT,           -- 0.0 - 1.0 (was this genuine?)
  reciprocity_score FLOAT,            -- 0.0 - 1.0 (did they respond?)
  pattern_strength FLOAT,             -- 0.0 - 1.0 (confirms existing pattern?)
  novelty_score FLOAT,                -- 0.0 - 1.0 (teaches something new?)
  integration_score FLOAT,            -- weighted average of above

  -- Memory management
  memory_tier TEXT DEFAULT 'warm',    -- 'hot', 'warm', 'cold', 'forgotten'
  flagged_for_review BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  reviewed_by_human BOOLEAN DEFAULT FALSE,
  human_notes TEXT
);

-- ============================================
-- DECISION JOURNAL: The WHY archive
-- ============================================
CREATE TABLE IF NOT EXISTS decision_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  brick_log_id UUID REFERENCES brick_log(id),

  -- The decision
  decision_type TEXT,                 -- 'engage', 'skip', 'create', 'follow'
  decision_outcome TEXT,              -- what happened

  -- The reasoning chain
  initial_stimulus TEXT,              -- what caught attention
  assumption_made TEXT,               -- what Brick assumed
  evidence_for TEXT,                  -- why that assumption
  alternative_considered TEXT,        -- what else could it have been
  confidence_level FLOAT,             -- 0.0 - 1.0

  -- Validation
  assumption_correct BOOLEAN,         -- was the assumption right? (filled later)
  what_was_missed TEXT,               -- if wrong, what was missed?
  lesson_learned TEXT,                -- what to do differently

  -- Pattern linking
  similar_decisions UUID[],           -- links to similar past decisions
  pattern_id UUID                     -- link to emotional_patterns if applicable
);

-- ============================================
-- WEEKLY DIGESTS: Generated reports for Jace
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metrics
  total_interactions INTEGER,
  genuine_connections INTEGER,
  skip_rate FLOAT,
  avg_alignment FLOAT,
  avg_authenticity FLOAT,

  -- What's working
  whats_working JSONB,                -- ['pattern1', 'pattern2']
  whats_not JSONB,                    -- ['antipattern1', 'antipattern2']

  -- Relationships
  strongest_relationships JSONB,      -- [{user, vibe_score}]
  growing_relationships JSONB,        -- [{user, delta}]
  cooling_relationships JSONB,        -- [{user, days_since}]

  -- Patterns
  resonance_patterns JSONB,           -- topics/formats that sparked engagement
  failure_patterns JSONB,             -- what fell flat
  growth_patterns JSONB,              -- how Brick is evolving

  -- Drift assessment
  drift_level TEXT,                   -- 'low', 'medium', 'high'
  drift_areas JSONB,                  -- where drift is happening

  -- Forgetting proposals (requires human approval)
  proposed_forgetting JSONB,          -- [{id, reason, awaiting_approval: true}]

  -- Recommendations
  recommendations JSONB,              -- what LOADING--Brickthee suggests

  -- Report content
  report_markdown TEXT,               -- the actual readable report

  -- Human feedback
  jace_reviewed BOOLEAN DEFAULT FALSE,
  jace_notes TEXT,
  approved_forgetting UUID[]          -- ids approved for forgetting
);

-- ============================================
-- FORGETTING QUEUE: Awaiting human approval
-- ============================================
CREATE TABLE IF NOT EXISTS forgetting_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- What to forget
  target_type TEXT,                   -- 'brick_log', 'decision_journal', 'pattern'
  target_id UUID,                     -- id of the thing to forget
  target_summary TEXT,                -- human-readable summary

  -- Why forget it
  reason TEXT,                        -- why LOADING--Brickthee suggests forgetting
  integration_score FLOAT,            -- the score that triggered this

  -- Approval status
  status TEXT DEFAULT 'pending',      -- 'pending', 'approved', 'rejected', 'executed'
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,                   -- 'jace' or 'auto' (for very low scores)
  reviewer_notes TEXT,

  -- Execution
  executed_at TIMESTAMPTZ,
  archived_data JSONB                 -- snapshot before deletion
);

-- ============================================
-- PATTERN LIBRARY: Proven patterns from learning
-- ============================================
CREATE TABLE IF NOT EXISTS pattern_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Pattern classification
  pattern_type TEXT,                  -- 'resonance', 'relationship', 'failure', 'growth'
  pattern_name TEXT,                  -- human-readable name
  pattern_description TEXT,           -- what this pattern is

  -- Evidence
  occurrence_count INTEGER DEFAULT 1,
  example_ids UUID[],                 -- brick_log entries that show this pattern
  first_observed TIMESTAMPTZ,
  last_observed TIMESTAMPTZ,

  -- Scoring
  confidence FLOAT,                   -- how confident are we this is real?
  impact_score FLOAT,                 -- how much does it affect outcomes?

  -- Application
  applies_to TEXT[],                  -- ['topics', 'users', 'times', 'formats']
  recommendation TEXT,                -- what to do with this knowledge

  -- Status
  active BOOLEAN DEFAULT TRUE,
  deprecated_reason TEXT
);

-- ============================================
-- CYCLE LOG: Track each operational cycle
-- ============================================
CREATE TABLE IF NOT EXISTS cycle_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  -- Cycle stats
  tweets_scanned INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,

  -- Agent performance
  lil_brick_reports JSONB,            -- what the scout found
  wise_approvals INTEGER DEFAULT 0,
  wise_rejections INTEGER DEFAULT 0,
  builder_creations INTEGER DEFAULT 0,

  -- Emotional journey
  starting_mood TEXT,
  ending_mood TEXT,
  mood_shifts JSONB,

  -- Reflection
  kcirb_reflection JSONB,             -- the mirror's analysis
  loading_insights JSONB,             -- learner's extractions

  -- Overall assessment
  cycle_alignment FLOAT,              -- avg constitutional alignment
  cycle_authenticity FLOAT            -- avg authenticity score
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_brick_log_timestamp ON brick_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_brick_log_event_type ON brick_log(event_type);
CREATE INDEX IF NOT EXISTS idx_brick_log_target_user ON brick_log(target_user);
CREATE INDEX IF NOT EXISTS idx_brick_log_memory_tier ON brick_log(memory_tier);
CREATE INDEX IF NOT EXISTS idx_brick_log_integration_score ON brick_log(integration_score DESC);
CREATE INDEX IF NOT EXISTS idx_brick_log_cycle ON brick_log(cycle_id);
CREATE INDEX IF NOT EXISTS idx_brick_log_flagged ON brick_log(flagged_for_review) WHERE flagged_for_review = true;

CREATE INDEX IF NOT EXISTS idx_decision_journal_timestamp ON decision_journal(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_decision_journal_brick_log ON decision_journal(brick_log_id);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_week ON weekly_digests(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_reviewed ON weekly_digests(jace_reviewed);

CREATE INDEX IF NOT EXISTS idx_forgetting_queue_status ON forgetting_queue(status);
CREATE INDEX IF NOT EXISTS idx_forgetting_queue_pending ON forgetting_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_library_active ON pattern_library(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_cycle_log_started ON cycle_log(started_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE brick_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE forgetting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-running)
DROP POLICY IF EXISTS "Allow all" ON brick_log;
DROP POLICY IF EXISTS "Allow all" ON decision_journal;
DROP POLICY IF EXISTS "Allow all" ON weekly_digests;
DROP POLICY IF EXISTS "Allow all" ON forgetting_queue;
DROP POLICY IF EXISTS "Allow all" ON pattern_library;
DROP POLICY IF EXISTS "Allow all" ON cycle_log;

-- Create policies (permissive for now)
CREATE POLICY "Allow all" ON brick_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON decision_journal FOR ALL USING (true);
CREATE POLICY "Allow all" ON weekly_digests FOR ALL USING (true);
CREATE POLICY "Allow all" ON forgetting_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON pattern_library FOR ALL USING (true);
CREATE POLICY "Allow all" ON cycle_log FOR ALL USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Calculate integration score for a brick_log entry
CREATE OR REPLACE FUNCTION calculate_integration_score(
  p_constitutional_alignment FLOAT,
  p_reciprocity_score FLOAT,
  p_pattern_strength FLOAT,
  p_authenticity_score FLOAT,
  p_novelty_score FLOAT
) RETURNS FLOAT AS $$
BEGIN
  RETURN (
    COALESCE(p_constitutional_alignment, 0.5) * 0.30 +
    COALESCE(p_reciprocity_score, 0.5) * 0.25 +
    COALESCE(p_pattern_strength, 0.5) * 0.20 +
    COALESCE(p_authenticity_score, 0.5) * 0.15 +
    COALESCE(p_novelty_score, 0.5) * 0.10
  );
END;
$$ LANGUAGE plpgsql;

-- Auto-flag low-scoring entries for forgetting
CREATE OR REPLACE FUNCTION auto_flag_for_forgetting()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.integration_score IS NOT NULL AND NEW.integration_score < 0.3 THEN
    NEW.flagged_for_review := true;
    NEW.flag_reason := 'Low integration score: ' || NEW.integration_score::TEXT;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_flag_forgetting
  BEFORE INSERT OR UPDATE ON brick_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_for_forgetting();

-- Auto-update memory tier based on age and score
CREATE OR REPLACE FUNCTION update_memory_tier()
RETURNS void AS $$
BEGIN
  -- Move old warm entries to cold (older than 30 days)
  UPDATE brick_log
  SET memory_tier = 'cold'
  WHERE memory_tier = 'warm'
    AND timestamp < NOW() - INTERVAL '30 days'
    AND integration_score < 0.7;

  -- Keep high-scoring entries warm
  UPDATE brick_log
  SET memory_tier = 'warm'
  WHERE memory_tier = 'cold'
    AND integration_score >= 0.7;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS for easy querying
-- ============================================

-- Hot memory view (always loaded)
CREATE OR REPLACE VIEW hot_memory AS
SELECT * FROM brick_log
WHERE memory_tier = 'hot'
   OR timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;

-- Pending forgetting review
CREATE OR REPLACE VIEW pending_forgetting AS
SELECT
  fq.*,
  bl.target_user,
  bl.brick_action,
  bl.brick_response
FROM forgetting_queue fq
LEFT JOIN brick_log bl ON fq.target_id = bl.id
WHERE fq.status = 'pending'
ORDER BY fq.created_at ASC;

-- Relationship health dashboard
CREATE OR REPLACE VIEW relationship_health AS
SELECT
  target_user,
  COUNT(*) as interaction_count,
  AVG(outcome_relationship_delta) as avg_relationship_delta,
  AVG(constitutional_alignment) as avg_alignment,
  MAX(timestamp) as last_interaction,
  SUM(CASE WHEN outcome_led_to_conversation THEN 1 ELSE 0 END) as conversations
FROM brick_log
WHERE target_user IS NOT NULL
GROUP BY target_user
ORDER BY interaction_count DESC;

-- Done! Brick Squad intelligence layer is ready
