-- === CREATIVE LOOP SCHEMA ===
-- Background content creation during sleep cycles
-- Supports quick content + slow burn multi-cycle projects

-- ============================================
-- SPARK QUEUE: Raw ideas captured by Scout
-- ============================================
CREATE TABLE IF NOT EXISTS spark_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- The spark
  spark_type TEXT NOT NULL,              -- 'observation', 'question', 'connection', 'websearch', 'rabbit_hole'
  content TEXT NOT NULL,
  source TEXT,                            -- tweet_id, search query, etc.

  -- Context
  related_topics TEXT[],
  emotional_resonance TEXT,               -- what emotion this sparks

  -- Processing
  status TEXT DEFAULT 'fresh',            -- 'fresh', 'claimed', 'used', 'archived'
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,

  -- Quality
  curiosity_score FLOAT,                  -- 0.0-1.0
  depth_potential TEXT,                   -- 'quick', 'medium', 'deep'

  -- Outcome
  became_draft_id UUID,
  became_project_id UUID
);

-- ============================================
-- DRAFT QUEUE: Work in progress content
-- ============================================
CREATE TABLE IF NOT EXISTS draft_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Content
  draft_type TEXT NOT NULL,               -- 'tweet', 'thread', 'reply_template', 'question'
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,

  -- Origin
  spark_id UUID REFERENCES spark_queue(id),
  project_id UUID,

  -- Builder notes
  builder_notes TEXT,
  emotional_angle TEXT,

  -- Quality gates (from Brick the Wise)
  passed_truth_gate BOOLEAN DEFAULT FALSE,
  passed_value_gate BOOLEAN DEFAULT FALSE,
  passed_mirror_gate BOOLEAN DEFAULT FALSE,
  passed_wonder_gate BOOLEAN DEFAULT FALSE,
  gate_feedback TEXT,

  -- Status
  status TEXT DEFAULT 'drafting',         -- 'drafting', 'refining', 'ready', 'approved', 'posted', 'rejected'
  rejection_reason TEXT,

  -- Timing
  best_timing TEXT,                       -- 'morning', 'afternoon', 'evening', 'any'
  target_community TEXT,

  -- Outcome
  posted_tweet_id TEXT,
  posted_at TIMESTAMPTZ
);

-- ============================================
-- POST QUEUE: Approved content ready to post
-- ============================================
CREATE TABLE IF NOT EXISTS post_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Content
  draft_id UUID REFERENCES draft_queue(id),
  content TEXT NOT NULL,
  post_type TEXT NOT NULL,                -- 'tweet', 'thread', 'reply'

  -- Scheduling
  priority INTEGER DEFAULT 5,             -- 1-10
  best_timing TEXT,
  not_before TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Context
  target_community TEXT,
  emotional_approach TEXT,

  -- Status
  status TEXT DEFAULT 'queued',           -- 'queued', 'posted', 'expired', 'cancelled'
  posted_at TIMESTAMPTZ,
  posted_tweet_id TEXT,

  -- If reply
  reply_to_tweet_id TEXT,
  reply_to_user TEXT
);

-- ============================================
-- SLOW BURN PROJECTS: Multi-cycle deep dives
-- ============================================
CREATE TABLE IF NOT EXISTS slow_burn_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identity
  title TEXT NOT NULL,
  description TEXT,
  core_question TEXT NOT NULL,            -- the curiosity driving this

  -- Accumulation (JSONB for flexibility)
  research_notes JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  draft_attempts JSONB DEFAULT '[]',

  -- Builder scratchpad
  scratchpad TEXT,
  current_angle TEXT,

  -- Progress
  cycles_active INTEGER DEFAULT 0,
  last_worked_at TIMESTAMPTZ,
  depth_reached TEXT DEFAULT 'surface',   -- 'surface', 'exploring', 'deep', 'profound'
  confidence FLOAT DEFAULT 0.0,

  -- Status
  status TEXT DEFAULT 'incubating',       -- 'incubating', 'active', 'ready', 'published', 'abandoned'

  -- Origin & outcome
  original_spark_id UUID REFERENCES spark_queue(id),
  final_draft_id UUID REFERENCES draft_queue(id),
  published_tweet_id TEXT
);

-- ============================================
-- PROJECT SESSIONS: Work done each cycle
-- ============================================
CREATE TABLE IF NOT EXISTS project_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  project_id UUID REFERENCES slow_burn_projects(id) NOT NULL,
  cycle_number INTEGER,

  -- What happened
  focus TEXT,
  discoveries TEXT[],
  new_questions TEXT[],

  -- Reflection
  progress_made TEXT,
  next_steps TEXT,
  duration_minutes INTEGER
);

-- ============================================
-- AI INTERFACE INSIGHTS: How people want AI
-- (This feeds the new learning dimension)
-- ============================================
CREATE TABLE IF NOT EXISTS ai_interface_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Source
  user_id TEXT,
  username TEXT,
  interaction_id UUID,
  tweet_id TEXT,

  -- The insight
  insight_type TEXT NOT NULL,             -- 'preference', 'friction', 'delight', 'boundary', 'openness'
  content TEXT NOT NULL,                  -- what we observed
  context TEXT,                           -- surrounding context

  -- Classification
  interface_dimension TEXT,               -- 'companion', 'tool', 'invisible', 'collaborator', 'augmentation'
  sentiment TEXT,                         -- 'positive', 'negative', 'neutral', 'curious', 'skeptical'

  -- Confidence
  confidence FLOAT DEFAULT 0.5,
  explicit BOOLEAN DEFAULT FALSE,         -- did they say it directly or inferred?

  -- Patterns
  community_profile TEXT,
  relates_to_emotion TEXT
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_spark_status ON spark_queue(status);
CREATE INDEX IF NOT EXISTS idx_spark_type ON spark_queue(spark_type);
CREATE INDEX IF NOT EXISTS idx_spark_depth ON spark_queue(depth_potential);

CREATE INDEX IF NOT EXISTS idx_draft_status ON draft_queue(status);
CREATE INDEX IF NOT EXISTS idx_draft_project ON draft_queue(project_id);

CREATE INDEX IF NOT EXISTS idx_post_status ON post_queue(status);
CREATE INDEX IF NOT EXISTS idx_post_priority ON post_queue(priority DESC);

CREATE INDEX IF NOT EXISTS idx_project_status ON slow_burn_projects(status);
CREATE INDEX IF NOT EXISTS idx_project_updated ON slow_burn_projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_project ON project_sessions(project_id);

CREATE INDEX IF NOT EXISTS idx_ai_insights_type ON ai_interface_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_ai_insights_dimension ON ai_interface_insights(interface_dimension);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE spark_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE slow_burn_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interface_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all" ON spark_queue;
DROP POLICY IF EXISTS "Allow all" ON draft_queue;
DROP POLICY IF EXISTS "Allow all" ON post_queue;
DROP POLICY IF EXISTS "Allow all" ON slow_burn_projects;
DROP POLICY IF EXISTS "Allow all" ON project_sessions;
DROP POLICY IF EXISTS "Allow all" ON ai_interface_insights;

CREATE POLICY "Allow all" ON spark_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON draft_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON post_queue FOR ALL USING (true);
CREATE POLICY "Allow all" ON slow_burn_projects FOR ALL USING (true);
CREATE POLICY "Allow all" ON project_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON ai_interface_insights FOR ALL USING (true);

-- ============================================
-- VIEWS
-- ============================================

-- Fresh sparks ready for claiming
CREATE OR REPLACE VIEW available_sparks AS
SELECT * FROM spark_queue
WHERE status = 'fresh'
ORDER BY curiosity_score DESC, created_at DESC;

-- Active slow burn projects
CREATE OR REPLACE VIEW active_projects AS
SELECT
  p.*,
  COUNT(s.id) as session_count,
  MAX(s.created_at) as last_session
FROM slow_burn_projects p
LEFT JOIN project_sessions s ON p.id = s.project_id
WHERE p.status IN ('incubating', 'active')
GROUP BY p.id
ORDER BY p.updated_at DESC;

-- Content ready to post
CREATE OR REPLACE VIEW ready_to_post AS
SELECT * FROM post_queue
WHERE status = 'queued'
  AND (not_before IS NULL OR not_before <= NOW())
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY priority DESC, created_at ASC;

-- AI interface patterns summary
CREATE OR REPLACE VIEW ai_interface_patterns AS
SELECT
  interface_dimension,
  insight_type,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  array_agg(DISTINCT community_profile) FILTER (WHERE community_profile IS NOT NULL) as communities
FROM ai_interface_insights
GROUP BY interface_dimension, insight_type
ORDER BY count DESC;

-- Creative dashboard
CREATE OR REPLACE VIEW creative_dashboard AS
SELECT
  (SELECT COUNT(*) FROM spark_queue WHERE status = 'fresh') as pending_sparks,
  (SELECT COUNT(*) FROM draft_queue WHERE status IN ('drafting', 'refining')) as wip_drafts,
  (SELECT COUNT(*) FROM draft_queue WHERE status = 'ready') as ready_drafts,
  (SELECT COUNT(*) FROM post_queue WHERE status = 'queued') as queued_posts,
  (SELECT COUNT(*) FROM slow_burn_projects WHERE status = 'active') as active_projects,
  (SELECT COUNT(*) FROM slow_burn_projects WHERE status = 'incubating') as incubating_projects;
