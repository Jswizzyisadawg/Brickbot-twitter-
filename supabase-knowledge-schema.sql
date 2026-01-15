-- === BRICK'S KNOWLEDGE BASE SCHEMA ===
-- Run this in your Supabase SQL editor

-- Knowledge table for storing learned content
CREATE TABLE IF NOT EXISTS brick_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  author TEXT,
  source TEXT NOT NULL DEFAULT 'scraped', -- 'scraped', 'discovered', 'conversation', 'manual'
  domain TEXT, -- 'ai_consciousness', 'emergence', 'mycelium', etc.
  keywords TEXT[] DEFAULT '{}',
  quality_score INTEGER DEFAULT 50,
  metadata JSONB DEFAULT '{}',
  times_retrieved INTEGER DEFAULT 0,
  last_retrieved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_knowledge_domain ON brick_knowledge(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_quality ON brick_knowledge(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON brick_knowledge(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON brick_knowledge USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON brick_knowledge(created_at DESC);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts ON brick_knowledge
  USING GIN(to_tsvector('english', content));

-- Function to search knowledge with full-text
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

-- Personality examples table (for RAG on Brick's voice)
CREATE TABLE IF NOT EXISTS brick_personality (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT NOT NULL, -- 'tweet', 'reply', 'quote', 'thought'
  emotional_state TEXT,
  context TEXT,
  is_approved BOOLEAN DEFAULT true,
  quality_score INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_personality_category ON brick_personality(category);
CREATE INDEX IF NOT EXISTS idx_personality_emotion ON brick_personality(emotional_state);

-- Comments
COMMENT ON TABLE brick_knowledge IS 'Brick''s learned knowledge from X and other sources';
COMMENT ON TABLE brick_personality IS 'Example tweets/responses that define Brick''s voice';
