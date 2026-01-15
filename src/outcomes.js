// === BRICK'S OUTCOME SCORING ===
// Closes the learning loop: Action → Wait → Check → Score → Learn

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class BrickOutcomes {
  constructor() {
    this.supabase = null;
    this.checkDelayHours = 24; // Wait 24hrs before checking outcomes
  }

  async initialize() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }
    console.log('📊 Outcome scoring initialized');
    return true;
  }

  // === CREATE PENDING OUTCOME ===
  // Called after Brick engages with something

  async createPendingOutcome(engagement) {
    if (!this.supabase) return null;

    const {
      actionType,       // 'reply', 'quote', 'original', 'like'
      tweetId,          // The tweet Brick posted (if applicable)
      targetTweetId,    // The tweet Brick responded to (if applicable)
      emotionalEventId, // Link to emotional_events table
      initialMetrics    // Initial engagement counts (if we can get them)
    } = engagement;

    // Calculate when to check (24 hours from now)
    const checkAfter = new Date();
    checkAfter.setHours(checkAfter.getHours() + this.checkDelayHours);

    try {
      const { data, error } = await this.supabase
        .from('pending_outcomes')
        .insert({
          action_type: actionType,
          tweet_id: tweetId,
          target_tweet_id: targetTweetId,
          emotional_event_id: emotionalEventId,
          check_after: checkAfter.toISOString(),
          initial_metrics: initialMetrics || {},
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`   📊 Created pending outcome for ${actionType} (check after ${this.checkDelayHours}h)`);
      return data;
    } catch (err) {
      console.error('Error creating pending outcome:', err.message);
      return null;
    }
  }

  // === CHECK PENDING OUTCOMES ===
  // Called periodically to evaluate outcomes that are ready

  async checkPendingOutcomes(twitter) {
    if (!this.supabase) return { checked: 0, scored: 0 };

    try {
      // Get outcomes ready to be checked
      const { data: pending, error } = await this.supabase
        .from('pending_outcomes')
        .select('*')
        .eq('status', 'pending')
        .lte('check_after', new Date().toISOString())
        .limit(10); // Process 10 at a time

      if (error) throw error;
      if (!pending || pending.length === 0) {
        return { checked: 0, scored: 0 };
      }

      console.log(`\n📊 Checking ${pending.length} pending outcomes...`);

      let scored = 0;
      for (const outcome of pending) {
        const score = await this.evaluateOutcome(outcome, twitter);
        if (score !== null) {
          scored++;
        }
      }

      return { checked: pending.length, scored };
    } catch (err) {
      console.error('Error checking pending outcomes:', err.message);
      return { checked: 0, scored: 0 };
    }
  }

  // === EVALUATE A SINGLE OUTCOME ===

  async evaluateOutcome(outcome, twitter) {
    if (!this.supabase) return null;

    try {
      // Mark as evaluating
      await this.supabase
        .from('pending_outcomes')
        .update({ status: 'evaluating' })
        .eq('id', outcome.id);

      // Get current metrics from Twitter
      let metrics = null;
      if (outcome.tweet_id && twitter) {
        metrics = await this.fetchTweetMetrics(outcome.tweet_id, twitter);
      }

      // Calculate score
      const score = this.calculateOutcomeScore(outcome, metrics);

      // Update the pending outcome
      const { error } = await this.supabase
        .from('pending_outcomes')
        .update({
          status: 'completed',
          latest_metrics: metrics || {},
          outcome_score: score,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', outcome.id);

      if (error) throw error;

      // Also update the linked outcomes table (for learning)
      if (outcome.emotional_event_id) {
        await this.supabase
          .from('outcomes')
          .insert({
            emotional_event_id: outcome.emotional_event_id,
            checked_at: new Date().toISOString(),
            likes_received: metrics?.likes || 0,
            replies_received: metrics?.replies || 0,
            retweets_received: metrics?.retweets || 0,
            outcome_score: score
          });
      }

      console.log(`   ✅ Outcome scored: ${score.toFixed(2)} (${outcome.action_type})`);
      return score;
    } catch (err) {
      console.error('Error evaluating outcome:', err.message);

      // Mark as failed
      await this.supabase
        .from('pending_outcomes')
        .update({ status: 'failed' })
        .eq('id', outcome.id);

      return null;
    }
  }

  // === FETCH TWEET METRICS ===

  async fetchTweetMetrics(tweetId, twitter) {
    try {
      // Use Twitter client to get tweet metrics
      if (twitter && twitter.client) {
        const tweet = await twitter.client.v2.singleTweet(tweetId, {
          'tweet.fields': ['public_metrics']
        });

        if (tweet.data?.public_metrics) {
          return {
            likes: tweet.data.public_metrics.like_count || 0,
            replies: tweet.data.public_metrics.reply_count || 0,
            retweets: tweet.data.public_metrics.retweet_count || 0,
            impressions: tweet.data.public_metrics.impression_count || 0,
            quotes: tweet.data.public_metrics.quote_count || 0
          };
        }
      }
      return null;
    } catch (err) {
      console.warn('Could not fetch tweet metrics:', err.message);
      return null;
    }
  }

  // === CALCULATE OUTCOME SCORE ===
  // Returns 0.0 to 1.0 based on engagement quality

  calculateOutcomeScore(outcome, metrics) {
    // Base score starts at 0.3 (neutral)
    let score = 0.3;

    if (!metrics) {
      // No metrics available, return neutral with slight bump for completing action
      return 0.35;
    }

    // Weight different engagement types
    const weights = {
      reply: {
        likes: 0.1,
        replies: 0.4,     // Replies to replies = conversation = good
        retweets: 0.15,
        impressions: 0.01
      },
      quote: {
        likes: 0.15,
        replies: 0.3,
        retweets: 0.2,
        impressions: 0.02
      },
      original: {
        likes: 0.2,
        replies: 0.35,
        retweets: 0.25,
        impressions: 0.02
      },
      like: {
        // For likes, we can't measure outcome directly
        base: 0.4
      }
    };

    const actionWeights = weights[outcome.action_type] || weights.reply;

    if (outcome.action_type === 'like') {
      return actionWeights.base;
    }

    // Calculate weighted score from metrics
    score += (metrics.likes || 0) * actionWeights.likes;
    score += (metrics.replies || 0) * actionWeights.replies;
    score += (metrics.retweets || 0) * actionWeights.retweets;
    score += Math.min((metrics.impressions || 0) / 1000, 0.1) * (actionWeights.impressions || 0);

    // Bonus for conversation (replies > 0 means someone talked back)
    if (metrics.replies > 0) {
      score += 0.1;
    }

    // Cap at 1.0
    return Math.min(1.0, Math.max(0.0, score));
  }

  // === GET OUTCOME PATTERNS ===
  // Used before making decisions to see what's worked

  async getOutcomePatterns() {
    if (!this.supabase) return null;

    try {
      // Get recent successful patterns
      const { data: patterns } = await this.supabase
        .from('pending_outcomes')
        .select(`
          action_type,
          outcome_score,
          emotional_events (
            emotional_state,
            stimulus_type
          )
        `)
        .eq('status', 'completed')
        .order('evaluated_at', { ascending: false })
        .limit(50);

      if (!patterns || patterns.length < 5) {
        return null; // Not enough data yet
      }

      // Aggregate by action type and emotional state
      const aggregate = {};
      for (const p of patterns) {
        const state = p.emotional_events?.emotional_state || 'unknown';
        const key = `${state}-${p.action_type}`;

        if (!aggregate[key]) {
          aggregate[key] = {
            emotional_state: state,
            action_type: p.action_type,
            scores: [],
            count: 0
          };
        }

        aggregate[key].scores.push(p.outcome_score);
        aggregate[key].count++;
      }

      // Calculate averages
      const results = [];
      for (const data of Object.values(aggregate)) {
        if (data.count >= 2) {
          const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
          results.push({
            ...data,
            avgScore,
            successRate: data.scores.filter(s => s > 0.5).length / data.count
          });
        }
      }

      return results.sort((a, b) => b.avgScore - a.avgScore);
    } catch (err) {
      console.error('Error getting outcome patterns:', err.message);
      return null;
    }
  }

  // === FORMAT PATTERNS FOR CONTEXT ===
  // Adds learned patterns to prompt context

  async getLearnedPatternContext() {
    const patterns = await this.getOutcomePatterns();

    if (!patterns || patterns.length === 0) {
      return '';
    }

    let context = '\n---\nWHAT HAS WORKED (learned from outcomes):\n';

    // Top 3 performing patterns
    const top = patterns.slice(0, 3);
    for (const p of top) {
      const pct = Math.round(p.successRate * 100);
      context += `- When ${p.emotional_state}, ${p.action_type} works ${pct}% of the time\n`;
    }

    // Bottom patterns (what to avoid)
    const bottom = patterns.filter(p => p.successRate < 0.3);
    if (bottom.length > 0) {
      context += '\nWhat to be careful with:\n';
      for (const p of bottom.slice(0, 2)) {
        context += `- ${p.action_type} when ${p.emotional_state} (only ${Math.round(p.successRate * 100)}% success)\n`;
      }
    }

    return context;
  }

  // === STATS FOR DASHBOARD ===

  async getStats() {
    if (!this.supabase) return null;

    try {
      const { data: pending } = await this.supabase
        .from('pending_outcomes')
        .select('status')
        .eq('status', 'pending');

      const { data: completed } = await this.supabase
        .from('pending_outcomes')
        .select('outcome_score')
        .eq('status', 'completed')
        .order('evaluated_at', { ascending: false })
        .limit(20);

      const avgScore = completed && completed.length > 0
        ? completed.reduce((a, b) => a + b.outcome_score, 0) / completed.length
        : null;

      return {
        pendingCount: pending?.length || 0,
        completedRecent: completed?.length || 0,
        averageScore: avgScore,
        lastChecked: new Date().toISOString()
      };
    } catch (err) {
      return null;
    }
  }
}

module.exports = { BrickOutcomes };
