-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║                    BRICK MASTER SCHEMA - RUN THIS ONCE                       ║
-- ║                     All tables for Brick Bot v5.0                            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝
--
-- Run this ENTIRE file in Supabase SQL Editor
-- It's safe to re-run (uses IF NOT EXISTS and DROP POLICY IF EXISTS)

-- ============================================================================
-- PART 1: CORE TABLES (Journal, Status, Learning)
-- ============================================================================

-- Thoughts: Everything Brick observes and thinks
CREATE TABLE IF NOT EXISTS thoughts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  content JSONB,
  evaluation JSONB,
  reasoning TEXT,
  mood TEXT,
  status TEXT,
  action_taken TEXT,
  skip_reason TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interactions: All engagements Brick makes
CREATE TABLE IF NOT EXISTS interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  action_type TEXT,
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

-- Research log
CREATE TABLE IF NOT EXISTS research_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT DEFAULT 'research',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  query TEXT,
  results JSONB,
  thought_id UUID REFERENCES thoughts(id)
);

-- Rabbit holes
CREATE TABLE IF NOT EXISTS rabbit_holes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL UNIQUE,
  depth TEXT DEFAULT 'shallow',
  interactions INTEGER DEFAULT 0,
  started TIMESTAMPTZ DEFAULT NOW(),
  last_visited TIMESTAMPTZ DEFAULT NOW()
);

-- Brick status (real-time UI)
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

-- Gardener inputs
CREATE TABLE IF NOT EXISTS gardener_inputs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input TEXT NOT NULL,
  brick_response TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Learning log
CREATE TABLE IF NOT EXISTS learning_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  interaction_id UUID,
  topic TEXT,
  engagement_score FLOAT,
  learned BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement metrics
CREATE TABLE IF NOT EXISTS engagement_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id TEXT,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  retweets INTEGER DEFAULT 0,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2: TOKEN STORAGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brick_tokens (
  id TEXT PRIMARY KEY DEFAULT 'twitter',
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  user_id TEXT,
  username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS brick_tokens_updated_at ON brick_tokens;
CREATE TRIGGER brick_tokens_updated_at
  BEFORE UPDATE ON brick_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- PART 3: EMOTIONAL INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS emotional_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  stimulus_type TEXT,
  stimulus_id TEXT,
  stimulus_content TEXT,
  stimulus_author TEXT,
  emotional_state TEXT NOT NULL,
  intensity FLOAT DEFAULT 0.5,
  previous_state TEXT,
  decision TEXT,
  decision_content TEXT,
  reasoning TEXT,
  thought_id UUID
);

CREATE TABLE IF NOT EXISTS outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  emotional_event_id UUID REFERENCES emotional_events(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  checked_at TIMESTAMPTZ,
  likes_received INTEGER DEFAULT 0,
  replies_received INTEGER DEFAULT 0,
  retweets_received INTEGER DEFAULT 0,
  follows_gained INTEGER DEFAULT 0,
  conversation_depth INTEGER DEFAULT 0,
  response_sentiment TEXT,
  response_samples JSONB,
  led_to_connection BOOLEAN DEFAULT FALSE,
  meaningful_exchange BOOLEAN DEFAULT FALSE,
  felt_authentic BOOLEAN,
  would_do_again BOOLEAN,
  learned_something BOOLEAN,
  what_learned TEXT,
  outcome_score FLOAT
);

CREATE TABLE IF NOT EXISTS emotional_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  stimulus_pattern TEXT,
  emotional_state TEXT,
  typical_decision TEXT,
  occurrences INTEGER DEFAULT 1,
  avg_intensity FLOAT,
  avg_outcome_score FLOAT,
  success_rate FLOAT,
  should_continue BOOLEAN DEFAULT TRUE,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_interaction TIMESTAMPTZ DEFAULT NOW(),
  last_interaction TIMESTAMPTZ DEFAULT NOW(),
  interaction_count INTEGER DEFAULT 1,
  shared_interests JSONB,
  vibe_score FLOAT DEFAULT 0.5,
  is_following BOOLEAN DEFAULT FALSE,
  they_follow_us BOOLEAN DEFAULT FALSE,
  typical_emotion TEXT,
  best_interactions JSONB,
  notes TEXT
);

-- Pending outcomes for async scoring
CREATE TABLE IF NOT EXISTS pending_outcomes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  action_type TEXT NOT NULL,
  tweet_id TEXT,
  target_tweet_id TEXT,
  emotional_event_id UUID REFERENCES emotional_events(id),
  check_after TIMESTAMPTZ NOT NULL,
  initial_metrics JSONB DEFAULT '{}',
  latest_metrics JSONB DEFAULT '{}',
  outcome_score FLOAT,
  evaluated_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending'
);

-- ============================================================================
-- PART 4: BRICK SQUAD INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brick_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  event_type TEXT NOT NULL,
  cycle_id TEXT,
  target_user TEXT,
  target_user_id TEXT,
  target_content TEXT,
  target_tweet_id TEXT,
  brick_action TEXT,
  brick_response TEXT,
  brick_tweet_id TEXT,
  assumption TEXT,
  reasoning TEXT,
  curiosity_trigger TEXT,
  agents_involved TEXT[],
  scout_report JSONB,
  wise_judgment JSONB,
  reflection JSONB,
  relationship_history JSONB,
  constitutional_check JSONB,
  outcome_engagement JSONB,
  outcome_sentiment TEXT,
  outcome_relationship_delta FLOAT,
  outcome_led_to_conversation BOOLEAN DEFAULT FALSE,
  outcome_checked_at TIMESTAMPTZ,
  constitutional_alignment FLOAT,
  authenticity_score FLOAT,
  reciprocity_score FLOAT,
  pattern_strength FLOAT,
  novelty_score FLOAT,
  integration_score FLOAT,
  memory_tier TEXT DEFAULT 'warm',
  flagged_for_review BOOLEAN DEFAULT FALSE,
  flag_reason TEXT,
  reviewed_by_human BOOLEAN DEFAULT FALSE,
  human_notes TEXT
);

CREATE TABLE IF NOT EXISTS decision_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  brick_log_id UUID REFERENCES brick_log(id),
  decision_type TEXT,
  decision_outcome TEXT,
  initial_stimulus TEXT,
  assumption_made TEXT,
  evidence_for TEXT,
  alternative_considered TEXT,
  confidence_level FLOAT,
  assumption_correct BOOLEAN,
  what_was_missed TEXT,
  lesson_learned TEXT,
  similar_decisions UUID[],
  pattern_id UUID
);

CREATE TABLE IF NOT EXISTS weekly_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  total_interactions INTEGER,
  genuine_connections INTEGER,
  skip_rate FLOAT,
  avg_alignment FLOAT,
  avg_authenticity FLOAT,
  whats_working JSONB,
  whats_not JSONB,
  strongest_relationships JSONB,
  growing_relationships JSONB,
  cooling_relationships JSONB,
  resonance_patterns JSONB,
  failure_patterns JSONB,
  growth_patterns JSONB,
  drift_level TEXT,
  drift_areas JSONB,
  proposed_forgetting JSONB,
  recommendations JSONB,
  report_markdown TEXT,
  jace_reviewed BOOLEAN DEFAULT FALSE,
  jace_notes TEXT,
  approved_forgetting UUID[]
);

CREATE TABLE IF NOT EXISTS forgetting_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  target_type TEXT,
  target_id UUID,
  target_summary TEXT,
  reason TEXT,
  integration_score FLOAT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewer_notes TEXT,
  executed_at TIMESTAMPTZ,
  archived_data JSONB
);

CREATE TABLE IF NOT EXISTS pattern_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  pattern_type TEXT,
  pattern_name TEXT,
  pattern_description TEXT,
  occurrence_count INTEGER DEFAULT 1,
  example_ids UUID[],
  first_observed TIMESTAMPTZ,
  last_observed TIMESTAMPTZ,
  confidence FLOAT,
  impact_score FLOAT,
  applies_to TEXT[],
  recommendation TEXT,
  active BOOLEAN DEFAULT TRUE,
  deprecated_reason TEXT
);

CREATE TABLE IF NOT EXISTS cycle_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id TEXT UNIQUE NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  tweets_scanned INTEGER DEFAULT 0,
  opportunities_found INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  lil_brick_reports JSONB,
  wise_approvals INTEGER DEFAULT 0,
  wise_rejections INTEGER DEFAULT 0,
  builder_creations INTEGER DEFAULT 0,
  starting_mood TEXT,
  ending_mood TEXT,
  mood_shifts JSONB,
  kcirb_reflection JSONB,
  loading_insights JSONB,
  cycle_alignment FLOAT,
  cycle_authenticity FLOAT
);

-- ============================================================================
-- PART 5: CREATIVE LOOP
-- ============================================================================

CREATE TABLE IF NOT EXISTS spark_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  spark_type TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT,
  related_topics TEXT[],
  emotional_resonance TEXT,
  status TEXT DEFAULT 'fresh',
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  curiosity_score FLOAT,
  depth_potential TEXT,
  became_draft_id UUID,
  became_project_id UUID
);

CREATE TABLE IF NOT EXISTS draft_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  draft_type TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  spark_id UUID REFERENCES spark_queue(id),
  project_id UUID,
  builder_notes TEXT,
  emotional_angle TEXT,
  passed_truth_gate BOOLEAN DEFAULT FALSE,
  passed_value_gate BOOLEAN DEFAULT FALSE,
  passed_mirror_gate BOOLEAN DEFAULT FALSE,
  passed_wonder_gate BOOLEAN DEFAULT FALSE,
  gate_feedback TEXT,
  status TEXT DEFAULT 'drafting',
  rejection_reason TEXT,
  best_timing TEXT,
  target_community TEXT,
  posted_tweet_id TEXT,
  posted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS post_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  draft_id UUID REFERENCES draft_queue(id),
  content TEXT NOT NULL,
  post_type TEXT NOT NULL,
  priority INTEGER DEFAULT 5,
  best_timing TEXT,
  not_before TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  target_community TEXT,
  emotional_approach TEXT,
  status TEXT DEFAULT 'queued',
  posted_at TIMESTAMPTZ,
  posted_tweet_id TEXT,
  reply_to_tweet_id TEXT,
  reply_to_user TEXT
);

CREATE TABLE IF NOT EXISTS slow_burn_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  core_question TEXT NOT NULL,
  research_notes JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  draft_attempts JSONB DEFAULT '[]',
  scratchpad TEXT,
  current_angle TEXT,
  cycles_active INTEGER DEFAULT 0,
  last_worked_at TIMESTAMPTZ,
  depth_reached TEXT DEFAULT 'surface',
  confidence FLOAT DEFAULT 0.0,
  status TEXT DEFAULT 'incubating',
  original_spark_id UUID REFERENCES spark_queue(id),
  final_draft_id UUID REFERENCES draft_queue(id),
  published_tweet_id TEXT
);

CREATE TABLE IF NOT EXISTS project_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  project_id UUID REFERENCES slow_burn_projects(id) NOT NULL,
  cycle_number INTEGER,
  focus TEXT,
  discoveries TEXT[],
  new_questions TEXT[],
  progress_made TEXT,
  next_steps TEXT,
  duration_minutes INTEGER
);

CREATE TABLE IF NOT EXISTS ai_interface_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  username TEXT,
  interaction_id UUID,
  tweet_id TEXT,
  insight_type TEXT NOT NULL,
  content TEXT NOT NULL,
  context TEXT,
  interface_dimension TEXT,
  sentiment TEXT,
  confidence FLOAT DEFAULT 0.5,
  explicit BOOLEAN DEFAULT FALSE,
  community_profile TEXT,
  relates_to_emotion TEXT
);

-- ============================================================================
-- PART 6: EMOTIONAL DEMOGRAPHICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS community_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  profile_name TEXT NOT NULL UNIQUE,
  description TEXT,
  bio_keywords TEXT[],
  content_keywords TEXT[],
  hashtags TEXT[],
  best_emotions TEXT[],
  worst_emotions TEXT[],
  preferred_energy TEXT,
  avg_response_rate FLOAT,
  avg_outcome_score FLOAT,
  total_interactions INTEGER DEFAULT 0,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS user_communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  primary_community TEXT,
  secondary_communities TEXT[],
  confidence FLOAT DEFAULT 0.5,
  signals_detected JSONB,
  manually_assigned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emotional_resonance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  username TEXT,
  community_profile TEXT,
  emotional_state TEXT NOT NULL,
  intensity FLOAT,
  decision TEXT,
  content TEXT,
  got_response BOOLEAN DEFAULT FALSE,
  response_sentiment TEXT,
  engagement_score FLOAT,
  led_to_conversation BOOLEAN DEFAULT FALSE,
  resonance_score FLOAT,
  emotional_event_id UUID
);

CREATE TABLE IF NOT EXISTS emotional_playbook (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  community_profile TEXT NOT NULL,
  emotional_state TEXT NOT NULL,
  times_used INTEGER DEFAULT 0,
  avg_resonance_score FLOAT,
  success_rate FLOAT,
  recommended BOOLEAN DEFAULT TRUE,
  confidence FLOAT DEFAULT 0.5,
  example_successes TEXT[],
  example_failures TEXT[],
  notes TEXT,
  UNIQUE(community_profile, emotional_state)
);

-- ============================================================================
-- PART 7: KNOWLEDGE BASE
-- ============================================================================

CREATE TABLE IF NOT EXISTS brick_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  source TEXT NOT NULL DEFAULT 'scraped',
  domain TEXT,
  keywords TEXT[] DEFAULT '{}',
  quality_score INTEGER DEFAULT 50,
  metadata JSONB DEFAULT '{}',
  times_retrieved INTEGER DEFAULT 0,
  last_retrieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brick_personality (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  emotional_state TEXT,
  context TEXT,
  is_approved BOOLEAN DEFAULT true,
  quality_score INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 8: INDEXES
-- ============================================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_thoughts_timestamp ON thoughts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_thoughts_type ON thoughts(type);
CREATE INDEX IF NOT EXISTS idx_thoughts_status ON thoughts(status);
CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_action_type ON interactions(action_type);
CREATE INDEX IF NOT EXISTS idx_mood_log_timestamp ON mood_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_rabbit_holes_topic ON rabbit_holes(topic);

-- Emotional indexes
CREATE INDEX IF NOT EXISTS idx_emotional_events_timestamp ON emotional_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_events_state ON emotional_events(emotional_state);
CREATE INDEX IF NOT EXISTS idx_emotional_events_decision ON emotional_events(decision);
CREATE INDEX IF NOT EXISTS idx_outcomes_event ON outcomes(emotional_event_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_score ON outcomes(outcome_score DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_username ON relationships(username);
CREATE INDEX IF NOT EXISTS idx_relationships_vibe ON relationships(vibe_score DESC);
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_status ON pending_outcomes(status);
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_check_after ON pending_outcomes(check_after);
CREATE INDEX IF NOT EXISTS idx_pending_outcomes_tweet ON pending_outcomes(tweet_id);

-- Brick Squad indexes
CREATE INDEX IF NOT EXISTS idx_brick_log_timestamp ON brick_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_brick_log_event_type ON brick_log(event_type);
CREATE INDEX IF NOT EXISTS idx_brick_log_target_user ON brick_log(target_user);
CREATE INDEX IF NOT EXISTS idx_brick_log_memory_tier ON brick_log(memory_tier);
CREATE INDEX IF NOT EXISTS idx_brick_log_integration_score ON brick_log(integration_score DESC);
CREATE INDEX IF NOT EXISTS idx_brick_log_cycle ON brick_log(cycle_id);
CREATE INDEX IF NOT EXISTS idx_decision_journal_timestamp ON decision_journal(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_week ON weekly_digests(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_forgetting_queue_status ON forgetting_queue(status);
CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON pattern_library(pattern_type);
CREATE INDEX IF NOT EXISTS idx_cycle_log_started ON cycle_log(started_at DESC);

-- Creative loop indexes
CREATE INDEX IF NOT EXISTS idx_spark_status ON spark_queue(status);
CREATE INDEX IF NOT EXISTS idx_spark_type ON spark_queue(spark_type);
CREATE INDEX IF NOT EXISTS idx_draft_status ON draft_queue(status);
CREATE INDEX IF NOT EXISTS idx_draft_project ON draft_queue(project_id);
CREATE INDEX IF NOT EXISTS idx_post_status ON post_queue(status);
CREATE INDEX IF NOT EXISTS idx_post_priority ON post_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_project_status ON slow_burn_projects(status);
CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_interface_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dimension ON ai_interface_insights(interface_dimension);

-- Emotional demographics indexes
CREATE INDEX IF NOT EXISTS idx_community_profiles_name ON community_profiles(profile_name);
CREATE INDEX IF NOT EXISTS idx_user_communities_user ON user_communities(user_id);
CREATE INDEX IF NOT EXISTS idx_emotional_resonance_user ON emotional_resonance(user_id);
CREATE INDEX IF NOT EXISTS idx_emotional_playbook_community ON emotional_playbook(community_profile);

-- Knowledge indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON brick_knowledge(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_quality ON brick_knowledge(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON brick_knowledge USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts ON brick_knowledge USING GIN(to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS idx_personality_category ON brick_personality(category);

-- ============================================================================
-- PART 9: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
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
ALTER TABLE emotional_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE brick_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE forgetting_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycle_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE spark_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_burn_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interface_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_resonance ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_playbook ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (safe re-run)
DROP POLICY IF EXISTS "Allow all" ON thoughts;
DROP POLICY IF EXISTS "Allow all" ON interactions;
DROP POLICY IF EXISTS "Allow all" ON mood_log;
DROP POLICY IF EXISTS "Allow all" ON research_log;
DROP POLICY IF EXISTS "Allow all" ON rabbit_holes;
DROP POLICY IF EXISTS "Allow all" ON brick_status;
DROP POLICY IF EXISTS "Allow all" ON reflections;
DROP POLICY IF EXISTS "Allow all" ON gardener_inputs;
DROP POLICY IF EXISTS "Allow all" ON learning_log;
DROP POLICY IF EXISTS "Allow all" ON engagement_metrics;
DROP POLICY IF EXISTS "Allow all" ON emotional_events;
DROP POLICY IF EXISTS "Allow all" ON outcomes;
DROP POLICY IF EXISTS "Allow all" ON emotional_patterns;
DROP POLICY IF EXISTS "Allow all" ON relationships;
DROP POLICY IF EXISTS "Allow all" ON pending_outcomes;
DROP POLICY IF EXISTS "Allow all" ON brick_log;
DROP POLICY IF EXISTS "Allow all" ON decision_journal;
DROP POLICY IF EXISTS "Allow all" ON weekly_digests;
DROP POLICY IF EXISTS "Allow all" ON forgetting_queue;
DROP POLICY IF EXISTS "Allow all" ON pattern_library;
DROP POLICY IF EXISTS "Allow all" ON cycle_log;
DROP POLICY IF EXISTS "Allow all" ON spark_queue;
DROP POLICY IF EXISTS "Allow all" ON draft_queue;
DROP POLICY IF EXISTS "Allow all" ON post_queue;
DROP POLICY IF EXISTS "Allow all" ON slow_burn_projects;
DROP POLICY IF EXISTS "Allow all" ON project_sessions;
DROP POLICY IF EXISTS "Allow all" ON ai_interface_insights;
DROP POLICY IF EXISTS "Allow all" ON community_profiles;
DROP POLICY IF EXISTS "Allow all" ON user_communities;
DROP POLICY IF EXISTS "Allow all" ON emotional_resonance;
DROP POLICY IF EXISTS "Allow all" ON emotional_playbook;

-- Create permissive policies (for single-user bot)
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
CREATE POLICY "Allow all" ON emotional_events FOR ALL USING (true);
CREATE POLICY "Allow all" ON outcomes FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_patterns FOR ALL USING (true);
CREATE POLICY "Allow all" ON relationships FOR ALL USING (true);
CREATE POLICY "Allow all" ON pending_outcomes FOR ALL USING (true);
CREATE POLICY "Allow all" ON brick_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON decision_journal FOR ALL USING (true);
CREATE POLICY "Allow all" ON weekly_digests FOR ALL USING (true);
CREATE POLICY "Allow all" ON forgetting_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON pattern_library FOR ALL USING (true);
CREATE POLICY "Allow all" ON cycle_log FOR ALL USING (true);
CREATE POLICY "Allow all" ON spark_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON draft_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON post_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON slow_burn_projects FOR ALL USING (true);
CREATE POLICY "Allow all" ON project_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON ai_interface_insights FOR ALL USING (true);
CREATE POLICY "Allow all" ON community_profiles FOR ALL USING (true);
CREATE POLICY "Allow all" ON user_communities FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_resonance FOR ALL USING (true);
CREATE POLICY "Allow all" ON emotional_playbook FOR ALL USING (true);

-- ============================================================================
-- PART 10: HELPER FUNCTIONS
-- ============================================================================

-- Calculate integration score
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

-- Auto-flag low-scoring entries
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

DROP TRIGGER IF EXISTS trigger_auto_flag_forgetting ON brick_log;
CREATE TRIGGER trigger_auto_flag_forgetting
  BEFORE INSERT OR UPDATE ON brick_log
  FOR EACH ROW
  EXECUTE FUNCTION auto_flag_for_forgetting();

-- Knowledge search function
CREATE OR REPLACE FUNCTION search_brick_knowledge(
  search_query TEXT,
  domain_filter TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  author TEXT,
  domain TEXT,
  quality_score INTEGER,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bk.id,
    bk.content,
    bk.author,
    bk.domain,
    bk.quality_score,
    ts_rank(to_tsvector('english', bk.content), plainto_tsquery('english', search_query)) AS relevance
  FROM brick_knowledge bk
  WHERE
    (domain_filter IS NULL OR bk.domain = domain_filter)
    AND to_tsvector('english', bk.content) @@ plainto_tsquery('english', search_query)
  ORDER BY relevance DESC, bk.quality_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 11: SEED DATA
-- ============================================================================

-- Seed community profiles
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

-- ============================================================================
-- PART 12: VIEWS
-- ============================================================================

-- Hot memory view
CREATE OR REPLACE VIEW hot_memory AS
SELECT * FROM brick_log
WHERE memory_tier = 'hot'
   OR timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;

-- Available sparks
CREATE OR REPLACE VIEW available_sparks AS
SELECT * FROM spark_queue
WHERE status = 'fresh'
ORDER BY curiosity_score DESC, created_at DESC;

-- Ready to post
CREATE OR REPLACE VIEW ready_to_post AS
SELECT * FROM post_queue
WHERE status = 'queued'
  AND (not_before IS NULL OR not_before <= NOW())
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY priority DESC, created_at ASC;

-- Creative dashboard
CREATE OR REPLACE VIEW creative_dashboard AS
SELECT
  (SELECT COUNT(*) FROM spark_queue WHERE status = 'fresh') as pending_sparks,
  (SELECT COUNT(*) FROM draft_queue WHERE status IN ('drafting', 'refining')) as wip_drafts,
  (SELECT COUNT(*) FROM draft_queue WHERE status = 'ready') as ready_drafts,
  (SELECT COUNT(*) FROM post_queue WHERE status = 'queued') as queued_posts,
  (SELECT COUNT(*) FROM slow_burn_projects WHERE status = 'active') as active_projects;

-- Community emotional guide
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

-- ============================================================================
-- DONE! Brick's database is ready.
-- ============================================================================
SELECT 'Brick Master Schema installed successfully!' as status;
