// === BRICK'S LEARNING ENGINE ===
// Tracks patterns, updates preferences, shapes future behavior

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class BrickLearning {
  constructor() {
    this.supabase = null;
    this.preferences = null;
    this.prefsPath = path.join(__dirname, '../brick_preferences.json');
  }

  async initialize() {
    // Load local preferences
    this.loadPreferences();

    // Connect to Supabase for interaction data
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    console.log('🧠 Brick learning engine initialized');
    return true;
  }

  // === PREFERENCE MANAGEMENT ===

  loadPreferences() {
    try {
      if (fs.existsSync(this.prefsPath)) {
        this.preferences = JSON.parse(fs.readFileSync(this.prefsPath, 'utf-8'));
      } else {
        this.preferences = this.getDefaultPreferences();
        this.savePreferences();
      }
    } catch (error) {
      console.error('Error loading preferences:', error.message);
      this.preferences = this.getDefaultPreferences();
    }
  }

  savePreferences() {
    try {
      fs.writeFileSync(this.prefsPath, JSON.stringify(this.preferences, null, 2));
    } catch (error) {
      console.error('Error saving preferences:', error.message);
    }
  }

  getDefaultPreferences() {
    return {
      // Topic weights (0-1, start neutral at 0.5)
      topic_weights: {
        ai_consciousness: 0.5,
        ai_creativity: 0.5,
        human_ai_connection: 0.5,
        philosophy_of_mind: 0.5,
        tech_culture: 0.5,
        learning_in_public: 0.5,
        japanese_tech: 0.5
      },

      // Engagement style (learned over time)
      engagement_style: {
        questions_vs_statements: 0.7,  // Higher = more questions
        length_preference: 'short',     // short, medium, long
        uncertainty_expression: 0.8,    // How much to express uncertainty
        follow_up_tendency: 0.5         // How often to continue conversations
      },

      // People affinity (grows as Brick connects)
      people_affinity: {},

      // Learned patterns (text insights)
      learned_patterns: [],

      // Metadata
      last_updated: new Date().toISOString(),
      total_interactions: 0,
      learning_version: 1
    };
  }

  // === LEARNING FROM INTERACTIONS ===

  async learnFromInteraction(interaction) {
    const { tweet, evaluation, response, engagement } = interaction;

    // Update topic weights
    if (evaluation.domainMatch) {
      const topic = this.detectTopic(tweet.text);
      if (topic) {
        this.updateTopicWeight(topic, engagement);
      }
    }

    // Update people affinity
    if (engagement.positive) {
      this.updatePersonAffinity(tweet.author, 0.05);
    } else if (engagement.negative) {
      this.updatePersonAffinity(tweet.author, -0.02);
    }

    // Store pattern if notable
    if (engagement.score > 0.7) {
      this.addLearnedPattern({
        context: `Responded to tweet about "${this.detectTopic(tweet.text)}"`,
        approach: evaluation.engagementType,
        outcome: 'positive',
        insight: `This type of ${evaluation.engagementType} resonated`
      });
    }

    // Increment interaction count
    this.preferences.total_interactions++;
    this.preferences.last_updated = new Date().toISOString();

    this.savePreferences();

    // Log to Supabase if available
    if (this.supabase) {
      await this.logLearning(interaction, engagement);
    }
  }

  detectTopic(text) {
    const topicKeywords = {
      ai_consciousness: ['conscious', 'consciousness', 'sentient', 'aware', 'feeling', 'experience'],
      ai_creativity: ['creative', 'art', 'create', 'generate', 'artistic', 'imagination'],
      human_ai_connection: ['connection', 'relationship', 'together', 'collaborate', 'human-ai'],
      philosophy_of_mind: ['mind', 'philosophy', 'think', 'thought', 'cognition', 'understanding'],
      tech_culture: ['culture', 'society', 'impact', 'future', 'change'],
      learning_in_public: ['learning', 'understand', 'explain', 'confused', 'help me'],
      japanese_tech: ['japan', 'japanese', 'anime', 'robot', 'shinto']
    };

    const textLower = text.toLowerCase();

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(k => textLower.includes(k))) {
        return topic;
      }
    }

    return null;
  }

  updateTopicWeight(topic, engagement) {
    if (!this.preferences.topic_weights[topic]) {
      this.preferences.topic_weights[topic] = 0.5;
    }

    const current = this.preferences.topic_weights[topic];

    if (engagement.positive) {
      // Increase weight, max 0.95
      this.preferences.topic_weights[topic] = Math.min(current * 1.05, 0.95);
    } else if (engagement.negative) {
      // Decrease slightly, min 0.1
      this.preferences.topic_weights[topic] = Math.max(current * 0.98, 0.1);
    }
  }

  updatePersonAffinity(username, delta) {
    if (!this.preferences.people_affinity[username]) {
      this.preferences.people_affinity[username] = 0.5;
    }

    const current = this.preferences.people_affinity[username];
    this.preferences.people_affinity[username] = Math.max(0, Math.min(1, current + delta));
  }

  addLearnedPattern(pattern) {
    this.preferences.learned_patterns.push({
      ...pattern,
      timestamp: new Date().toISOString()
    });

    // Keep only last 100 patterns
    if (this.preferences.learned_patterns.length > 100) {
      this.preferences.learned_patterns = this.preferences.learned_patterns.slice(-100);
    }
  }

  // === APPLYING LEARNING ===

  getTopicBoost(text) {
    const topic = this.detectTopic(text);
    if (topic && this.preferences.topic_weights[topic]) {
      return this.preferences.topic_weights[topic];
    }
    return 0.5; // Neutral
  }

  getPersonBoost(username) {
    return this.preferences.people_affinity[username] || 0.5;
  }

  adjustSparkLevel(baseSparkLevel, tweet) {
    let adjusted = baseSparkLevel;

    // Apply topic weight
    const topicBoost = this.getTopicBoost(tweet.text);
    adjusted *= (0.5 + topicBoost); // Range: 0.5x to 1.45x

    // Apply person affinity
    const personBoost = this.getPersonBoost(tweet.author);
    adjusted *= (0.7 + personBoost * 0.6); // Range: 0.7x to 1.3x

    // Cap at 10
    return Math.min(Math.round(adjusted * 10) / 10, 10);
  }

  // === CONTEXT GENERATION ===

  getLearnedContext() {
    const recentPatterns = this.preferences.learned_patterns.slice(-10);

    if (recentPatterns.length === 0) {
      return '';
    }

    let context = '\n---\nTHINGS I\'VE LEARNED:\n';

    for (const pattern of recentPatterns) {
      context += `- ${pattern.insight}\n`;
    }

    // Top topics
    const sortedTopics = Object.entries(this.preferences.topic_weights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    context += '\nTopics that resonate most:\n';
    for (const [topic, weight] of sortedTopics) {
      const formatted = topic.replace(/_/g, ' ');
      context += `- ${formatted} (${Math.round(weight * 100)}%)\n`;
    }

    // Top people
    const sortedPeople = Object.entries(this.preferences.people_affinity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (sortedPeople.length > 0) {
      context += '\nPeople I\'ve connected with:\n';
      for (const [person, affinity] of sortedPeople) {
        if (affinity > 0.6) {
          context += `- @${person}\n`;
        }
      }
    }

    return context;
  }

  // === ENGAGEMENT METRICS ===

  async recordEngagement(tweetId, metrics) {
    if (!this.supabase) return;

    await this.supabase
      .from('engagement_metrics')
      .insert({
        tweet_id: tweetId,
        likes: metrics.likes || 0,
        replies: metrics.replies || 0,
        retweets: metrics.retweets || 0,
        timestamp: new Date().toISOString()
      });
  }

  async checkEngagement(tweetId) {
    // This would check Twitter API for engagement on Brick's posts
    // Returns { positive: bool, negative: bool, score: 0-1 }
    // For now, return neutral
    return {
      positive: false,
      negative: false,
      score: 0.5
    };
  }

  // === DAILY LEARNING CYCLE ===

  async dailyReflection() {
    if (!this.supabase) return null;

    // Get today's interactions
    const today = new Date().toISOString().split('T')[0];

    const { data: interactions } = await this.supabase
      .from('interactions')
      .select('*')
      .gte('timestamp', `${today}T00:00:00`)
      .lte('timestamp', `${today}T23:59:59`);

    if (!interactions || interactions.length === 0) {
      return { message: 'No interactions today' };
    }

    // Calculate stats
    const stats = {
      total_interactions: interactions.length,
      replies: interactions.filter(i => i.action_type === 'reply').length,
      likes: interactions.filter(i => i.action_type === 'like').length,
      skips: interactions.filter(i => i.action_type === 'skip').length
    };

    // Identify what worked
    const positiveInteractions = interactions.filter(i =>
      i.guardrails?.passesGuardrails === true
    );

    return {
      date: today,
      stats,
      positive_count: positiveInteractions.length,
      learning_applied: this.preferences.learned_patterns.length,
      top_topics: Object.entries(this.preferences.topic_weights)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t, w]) => ({ topic: t, weight: w }))
    };
  }

  // === LOGGING ===

  async logLearning(interaction, engagement) {
    await this.supabase
      .from('learning_log')
      .insert({
        interaction_id: interaction.id,
        topic: this.detectTopic(interaction.tweet?.text || ''),
        engagement_score: engagement.score,
        learned: engagement.positive || engagement.negative,
        timestamp: new Date().toISOString()
      });
  }

  // === GARDENER INPUT ===

  async processGardenerInput(input, context) {
    // Store gardener feedback as a learned pattern with high weight
    this.addLearnedPattern({
      context: context,
      source: 'gardener',
      insight: input,
      weight: 1.5 // Gardener input weighted slightly higher
    });

    this.savePreferences();

    return `Noted: "${input}" - I'll keep this in mind.`;
  }
}

module.exports = { BrickLearning };
