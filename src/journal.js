// === BRICK'S JOURNAL ===
// Logs thoughts, actions, mood to Supabase for real-time UI

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class BrickJournal {
  constructor() {
    this.supabase = null;
    this.currentMood = 'idle';
  }

  async initialize() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      console.warn('Supabase not configured - journal disabled');
      return false;
    }

    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    console.log('📓 Brick journal initialized');
    return true;
  }

  // === THOUGHT LOGGING ===

  // Log when Brick sees something
  async logSaw(tweet, evaluation) {
    if (!this.supabase) return null;

    const entry = {
      type: 'saw',
      timestamp: new Date().toISOString(),
      content: {
        tweet_id: tweet.id,
        author: tweet.author,
        text: tweet.text,
        metrics: tweet.metrics
      },
      evaluation: {
        spark_level: evaluation.sparkLevel,
        domain_match: evaluation.domainMatch,
        vibe_check: evaluation.vibeCheck,
        should_engage: evaluation.shouldEngage,
        engagement_type: evaluation.engagementType,
        reason: evaluation.reason
      },
      mood: this.currentMood,
      status: 'observed'
    };

    const { data, error } = await this.supabase
      .from('thoughts')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Error logging saw:', error.message);
      return null;
    }

    return data;
  }

  // Log when Brick is thinking
  async logThinking(context, thoughtId = null) {
    if (!this.supabase) return null;

    this.currentMood = 'thinking';

    if (thoughtId) {
      // Update existing thought
      const { data, error } = await this.supabase
        .from('thoughts')
        .update({
          status: 'thinking',
          mood: 'thinking'
        })
        .eq('id', thoughtId)
        .select()
        .single();

      return data;
    }

    // New thought entry
    const entry = {
      type: 'thinking',
      timestamp: new Date().toISOString(),
      content: { context },
      mood: 'thinking',
      status: 'thinking'
    };

    const { data, error } = await this.supabase
      .from('thoughts')
      .insert(entry)
      .select()
      .single();

    return data;
  }

  // Log Brick's internal reasoning
  async logReasoning(reasoning, thoughtId = null) {
    if (!this.supabase) return null;

    const update = {
      reasoning,
      status: 'reasoned',
      updated_at: new Date().toISOString()
    };

    if (thoughtId) {
      const { data, error } = await this.supabase
        .from('thoughts')
        .update(update)
        .eq('id', thoughtId)
        .select()
        .single();

      return data;
    }

    return null;
  }

  // Log when Brick takes action
  async logAction(action, thoughtId = null) {
    if (!this.supabase) return null;

    const entry = {
      type: 'action',
      timestamp: new Date().toISOString(),
      action_type: action.type, // 'reply', 'like', 'quote', 'follow', 'skip'
      content: {
        target_tweet_id: action.targetTweetId,
        target_author: action.targetAuthor,
        my_response: action.response,
        why: action.why
      },
      guardrails: action.guardrails,
      mood: this.currentMood,
      status: 'acted',
      thought_id: thoughtId
    };

    const { data, error } = await this.supabase
      .from('interactions')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error('Error logging action:', error.message);
      return null;
    }

    // Update the thought status
    if (thoughtId) {
      await this.supabase
        .from('thoughts')
        .update({
          status: 'completed',
          action_taken: action.type,
          updated_at: new Date().toISOString()
        })
        .eq('id', thoughtId);
    }

    return data;
  }

  // Log when Brick skips something
  async logSkip(tweet, reason, thoughtId = null) {
    if (!this.supabase) return null;

    if (thoughtId) {
      await this.supabase
        .from('thoughts')
        .update({
          status: 'skipped',
          action_taken: 'skip',
          skip_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', thoughtId);
    }

    return true;
  }

  // === MOOD TRACKING ===

  async setMood(mood, reason = null) {
    this.currentMood = mood;

    if (!this.supabase) return;

    await this.supabase
      .from('mood_log')
      .insert({
        mood,
        reason,
        timestamp: new Date().toISOString()
      });
  }

  // Mood types: idle, scanning, curious, thinking, excited,
  // contemplative, connected, uncertain, content

  // === RESEARCH LOGGING ===

  async logResearch(query, results, thoughtId = null) {
    if (!this.supabase) return null;

    const entry = {
      type: 'research',
      timestamp: new Date().toISOString(),
      query,
      results: {
        sources_found: results.sources?.length || 0,
        sources: results.sources,
        confidence: results.confidence,
        summary: results.summary
      },
      thought_id: thoughtId
    };

    const { data, error } = await this.supabase
      .from('research_log')
      .insert(entry)
      .select()
      .single();

    return data;
  }

  // === RABBIT HOLES ===

  async logRabbitHole(topic, depth = 'shallow') {
    if (!this.supabase) return null;

    // Check if rabbit hole exists
    const { data: existing } = await this.supabase
      .from('rabbit_holes')
      .select()
      .eq('topic', topic)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await this.supabase
        .from('rabbit_holes')
        .update({
          depth,
          interactions: existing.interactions + 1,
          last_visited: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      return data;
    }

    // Create new rabbit hole
    const { data, error } = await this.supabase
      .from('rabbit_holes')
      .insert({
        topic,
        depth,
        interactions: 1,
        started: new Date().toISOString(),
        last_visited: new Date().toISOString()
      })
      .select()
      .single();

    return data;
  }

  // === STATUS UPDATES (for real-time UI) ===

  async updateStatus(status, details = {}) {
    if (!this.supabase) return;

    await this.supabase
      .from('brick_status')
      .upsert({
        id: 'current',
        status,
        details,
        mood: this.currentMood,
        timestamp: new Date().toISOString()
      });
  }

  // Status types: idle, waking, scanning, evaluating, thinking,
  // researching, responding, posting, reflecting

  // === DAILY REFLECTION ===

  async logDailyReflection(reflection) {
    if (!this.supabase) return null;

    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await this.supabase
      .from('reflections')
      .insert({
        date: today,
        summary: reflection.summary,
        highlights: reflection.highlights,
        learnings: reflection.learnings,
        mood_summary: reflection.moodSummary,
        stats: reflection.stats
      })
      .select()
      .single();

    return data;
  }

  // === GARDENER INPUT ===

  async logGardenerInput(input, response) {
    if (!this.supabase) return null;

    const { data, error } = await this.supabase
      .from('gardener_inputs')
      .insert({
        input,
        brick_response: response,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    return data;
  }
}

module.exports = { BrickJournal };
