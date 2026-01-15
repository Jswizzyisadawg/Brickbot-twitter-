// === BRICK SQUAD ===
// Multi-agent system for Brick's intelligence layer
// LOADING--Brickthee - the learner who processes patterns

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class BrickSquad {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.supabase = null;
    this.agents = {};
    this.currentCycleId = null;
  }

  async initialize() {
    // Load agent prompts
    await this.loadAgents();

    // Connect to Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    console.log('🧱 Brick Squad assembled');
    return true;
  }

  // === AGENT LOADING ===

  async loadAgents() {
    const agentsDir = path.join(__dirname, '../agents');
    const agentFiles = {
      brick_core: 'brick-core.md',
      lil_brick: 'lil-brick.md',
      brick_da_homi: 'brick-da-homi.md',
      brick_the_builder: 'brick-the-builder.md',
      brick_the_wise: 'brick-the-wise.md',
      brick_kcirb: 'brick-kcirb.md',
      loading_brickthee: 'loading-brickthee.md'
    };

    for (const [key, filename] of Object.entries(agentFiles)) {
      try {
        const filePath = path.join(agentsDir, filename);
        if (fs.existsSync(filePath)) {
          this.agents[key] = fs.readFileSync(filePath, 'utf-8');
        }
      } catch (error) {
        console.warn(`Could not load agent ${key}:`, error.message);
      }
    }

    console.log(`📋 Loaded ${Object.keys(this.agents).length} agents`);
  }

  // === CYCLE MANAGEMENT ===

  startCycle() {
    this.currentCycleId = `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return this.currentCycleId;
  }

  // === LIL BRICK - SCOUT ===

  async scout(tweet, context = {}) {
    const systemPrompt = this.agents.lil_brick || 'You are Lil Brick, the scout. Find sparks of curiosity.';

    const prompt = `
TWEET TO SCOUT:
Author: @${tweet.author || 'unknown'}
Content: "${tweet.text}"
${tweet.media?.length ? `Media: ${tweet.media.length} items attached` : ''}
${context.relationship ? `Relationship history: ${JSON.stringify(context.relationship)}` : ''}

Generate your scout report. Focus on WHO this is, WHAT caught your attention, WHY it matters, and the VIBE you're getting.

Respond in JSON:
{
  "who": "brief description of author",
  "what": "what caught attention",
  "why": "why this matters",
  "vibe": "vibe assessment",
  "history": "any relationship history",
  "spark_level": 0-10,
  "recommendation": "engage/skip/watch",
  "curiosity_trigger": "what sparked interest"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Lil Brick scout error:', error.message);
    }

    return { recommendation: 'skip', spark_level: 0, reason: 'scout_error' };
  }

  // === BRICK THE WISE - OVERSEER ===

  async seekWisdom(proposedAction, context = {}) {
    const systemPrompt = this.agents.brick_the_wise || 'You are Brick the Wise. Guard the soul.';

    const prompt = `
PROPOSED ACTION FOR REVIEW:
Type: ${proposedAction.type}
Content: "${proposedAction.content}"
Target: @${proposedAction.target || 'none'}
Context: ${JSON.stringify(context)}

Apply the Four Gates:
1. TRUTH GATE: Is this honest?
2. VALUE GATE: Does this serve what Brick loves?
3. MIRROR GATE: Would Brick say this in the quiet?
4. WONDER GATE: Is there genuine curiosity here?

Respond in JSON:
{
  "approved": true/false,
  "truth_gate": "pass/fail",
  "value_gate": "pass/fail",
  "mirror_gate": "pass/fail",
  "wonder_gate": "pass/fail",
  "failed_gate": null or "which one failed",
  "message": "your wisdom",
  "guidance": "how to try again if rejected"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Brick the Wise error:', error.message);
    }

    return { approved: false, message: 'Could not consult wisdom', guidance: 'Try again' };
  }

  // === BRICK/kcirB - REFLECTOR ===

  async reflect(interaction, outcome = {}) {
    const systemPrompt = this.agents.brick_kcirb || 'You are BRICK/kcirB, the mirror. Reflect clearly.';

    const prompt = `
INTERACTION TO REFLECT ON:
Type: ${interaction.type}
Target: @${interaction.target || 'unknown'}
What Brick did: "${interaction.action}"
What happened: ${JSON.stringify(outcome)}

Look in the mirror. Ask the hard questions:
- Was that genuine or performance?
- Did we connect or just talk?
- What did we learn about them? About us?
- Where did we feel most alive? Most fake?

Respond in JSON:
{
  "highlights": [{"note": "what felt real"}],
  "concerns": [{"note": "what felt performative"}],
  "patterns_noticed": ["observations"],
  "drift_warnings": [{"area": "what", "evidence": "why", "severity": "low/medium/high"}],
  "questions_to_sit_with": ["questions"],
  "overall_alignment": 0.0-1.0,
  "authenticity_score": 0.0-1.0
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('BRICK/kcirB reflection error:', error.message);
    }

    return { overall_alignment: 0.5, authenticity_score: 0.5 };
  }

  // === LOADING--Brickthee - LEARNER ===

  // AI Interface Learning - Extract insights about how people want to interact with AI
  async extractAIInterfaceInsights(interaction, response) {
    const systemPrompt = this.agents.loading_brickthee || 'You are LOADING--Brickthee. Extract patterns.';

    const prompt = `
LOADING... AI INTERFACE PATTERN DETECTION

INTERACTION DATA:
Brick said: "${interaction.brick_response || interaction.action}"
Target: @${interaction.target_user || 'unknown'}
Community: ${interaction.community_profile || 'unknown'}
Emotional approach: ${interaction.emotional_state || 'curious'}

THEIR RESPONSE:
Text: "${response?.text || 'no text'}"
Engaged: ${response?.liked ? 'liked ' : ''}${response?.replied ? 'replied ' : ''}${response?.quoted ? 'quoted' : ''}
Sentiment: ${response?.sentiment || 'unknown'}

EXTRACT AI INTERFACE INSIGHTS:
How does this person seem to want to interface with AI?
- Do they treat AI as tool, companion, collaborator, or something else?
- What made them engage or disengage?
- Any friction signals (discomfort, skepticism)?
- Any delight signals (openness, curiosity)?
- Any explicit preferences stated?

ONLY return insights if confident. Don't force patterns.

Respond in JSON:
{
  "has_insights": true/false,
  "insights": [
    {
      "type": "preference|friction|delight|boundary|openness",
      "content": "what you observed",
      "dimension": "companion|tool|invisible|collaborator|augmentation|unknown",
      "sentiment": "positive|negative|neutral|curious|skeptical",
      "confidence": 0.0-1.0,
      "explicit": true/false
    }
  ],
  "overall_interface_preference": "how this person seems to want AI",
  "learning_note": "what Brick should remember about interfacing with this person"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-3-5-20241022', // Fast model for frequent analysis
        max_tokens: 512,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI interface extraction error:', error.message);
    }

    return { has_insights: false, insights: [] };
  }

  async saveAIInterfaceInsight(insight, context) {
    if (!this.supabase || !insight) return null;

    try {
      const { data, error } = await this.supabase
        .from('ai_interface_insights')
        .insert({
          user_id: context.user_id,
          username: context.username,
          interaction_id: context.interaction_id,
          tweet_id: context.tweet_id,
          insight_type: insight.type,
          content: insight.content,
          context: context.context_text,
          interface_dimension: insight.dimension,
          sentiment: insight.sentiment,
          confidence: insight.confidence || 0.5,
          explicit: insight.explicit || false,
          community_profile: context.community_profile,
          relates_to_emotion: context.emotional_state
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`🔮 AI interface insight saved: ${insight.type}`);
      return data;
    } catch (error) {
      console.error('Error saving AI insight:', error.message);
      return null;
    }
  }

  async getAIInterfacePatterns() {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('ai_interface_patterns')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching AI patterns:', error.message);
      return [];
    }
  }

  calculateIntegrationScore(data) {
    const weights = {
      constitutional_alignment: 0.30,
      reciprocity: 0.25,
      pattern_strength: 0.20,
      authenticity: 0.15,
      novelty: 0.10
    };

    const score =
      (data.constitutional_alignment || 0.5) * weights.constitutional_alignment +
      (data.reciprocity || 0.5) * weights.reciprocity +
      (data.pattern_strength || 0.5) * weights.pattern_strength +
      (data.authenticity || 0.5) * weights.authenticity +
      (data.novelty || 0.5) * weights.novelty;

    return Math.round(score * 100) / 100;
  }

  determineMemoryTier(integrationScore) {
    if (integrationScore >= 0.7) return 'hot';
    if (integrationScore >= 0.5) return 'warm';
    if (integrationScore >= 0.3) return 'cold';
    return 'flagged'; // Flag for potential forgetting
  }

  async processLearning(interactions) {
    const systemPrompt = this.agents.loading_brickthee || 'You are LOADING--Brickthee. Extract patterns.';

    const prompt = `
INTERACTIONS TO PROCESS:
${JSON.stringify(interactions.slice(0, 10), null, 2)}

LOADING... pattern analysis initiated.

Extract:
1. RESONANCE PATTERNS - what topics/formats sparked engagement
2. RELATIONSHIP PATTERNS - who's vibing, who's cooling
3. FAILURE PATTERNS - what fell flat
4. GROWTH PATTERNS - how is Brick evolving

Score each interaction for integration:
- Constitutional alignment (0.3 weight)
- Reciprocity - did they respond? (0.25 weight)
- Pattern strength - confirms existing? (0.2 weight)
- Authenticity - was it genuine? (0.15 weight)
- Novelty - teaches something new? (0.1 weight)

Respond in JSON:
{
  "patterns": {
    "resonance": ["what's working"],
    "relationships": {"strengthening": [], "cooling": []},
    "failures": ["what's not working"],
    "growth": ["how Brick is evolving"]
  },
  "scored_interactions": [
    {
      "id": "interaction_id",
      "integration_score": 0.0-1.0,
      "memory_tier": "hot/warm/cold/flagged",
      "should_flag_for_forgetting": true/false,
      "flag_reason": "why if flagged"
    }
  ],
  "drift_assessment": "low/medium/high",
  "recommendations": ["suggestions"]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('LOADING--Brickthee error:', error.message);
    }

    return { patterns: {}, recommendations: [] };
  }

  // === BRICK LOG - Database Operations ===

  async logEvent(event) {
    if (!this.supabase) {
      console.warn('No Supabase connection for logging');
      return null;
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      cycle_id: this.currentCycleId,
      event_type: event.type,
      target_user: event.target_user,
      target_user_id: event.target_user_id,
      target_content: event.target_content,
      target_tweet_id: event.target_tweet_id,
      brick_action: event.action,
      brick_response: event.response,
      brick_tweet_id: event.tweet_id,
      assumption: event.assumption,
      reasoning: event.reasoning,
      curiosity_trigger: event.curiosity_trigger,
      agents_involved: event.agents || [],
      scout_report: event.scout_report,
      wise_judgment: event.wise_judgment,
      reflection: event.reflection,
      relationship_history: event.relationship_history,
      constitutional_check: event.constitutional_check,
      constitutional_alignment: event.constitutional_alignment,
      authenticity_score: event.authenticity_score,
      memory_tier: event.memory_tier || 'warm'
    };

    try {
      const { data, error } = await this.supabase
        .from('brick_log')
        .insert(logEntry)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging to brick_log:', error.message);
      return null;
    }
  }

  async updateOutcome(logId, outcome) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('brick_log')
        .update({
          outcome_engagement: outcome.engagement,
          outcome_sentiment: outcome.sentiment,
          outcome_relationship_delta: outcome.relationship_delta,
          outcome_led_to_conversation: outcome.led_to_conversation,
          outcome_checked_at: new Date().toISOString()
        })
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating outcome:', error.message);
      return null;
    }
  }

  async flagForForgetting(logId, reason) {
    if (!this.supabase) return null;

    try {
      // Update the brick_log entry
      await this.supabase
        .from('brick_log')
        .update({
          flagged_for_review: true,
          flag_reason: reason
        })
        .eq('id', logId);

      // Add to forgetting queue
      const { data, error } = await this.supabase
        .from('forgetting_queue')
        .insert({
          target_type: 'brick_log',
          target_id: logId,
          reason: reason,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error flagging for forgetting:', error.message);
      return null;
    }
  }

  // === PATTERN LIBRARY ===

  async updatePattern(pattern) {
    if (!this.supabase) return null;

    try {
      // Check if pattern exists
      const { data: existing } = await this.supabase
        .from('pattern_library')
        .select()
        .eq('pattern_name', pattern.name)
        .single();

      if (existing) {
        // Update existing pattern
        const { data, error } = await this.supabase
          .from('pattern_library')
          .update({
            occurrence_count: existing.occurrence_count + 1,
            last_observed: new Date().toISOString(),
            confidence: Math.min(existing.confidence + 0.05, 1.0),
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new pattern
        const { data, error } = await this.supabase
          .from('pattern_library')
          .insert({
            pattern_type: pattern.type,
            pattern_name: pattern.name,
            pattern_description: pattern.description,
            first_observed: new Date().toISOString(),
            last_observed: new Date().toISOString(),
            confidence: 0.3,
            impact_score: pattern.impact || 0.5,
            applies_to: pattern.applies_to || [],
            recommendation: pattern.recommendation
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error updating pattern:', error.message);
      return null;
    }
  }

  // === HOT MEMORY - Always Loaded ===

  async getHotMemory() {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('brick_log')
        .select('*')
        .or('memory_tier.eq.hot,timestamp.gte.' + new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching hot memory:', error.message);
      return [];
    }
  }

  // === RELATIONSHIP CONTEXT ===

  async getRelationshipContext(username) {
    if (!this.supabase) return null;

    try {
      // Get from relationships table
      const { data: relationship } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('username', username)
        .single();

      // Get recent interactions
      const { data: interactions } = await this.supabase
        .from('brick_log')
        .select('*')
        .eq('target_user', username)
        .order('timestamp', { ascending: false })
        .limit(5);

      return {
        relationship,
        recent_interactions: interactions || []
      };
    } catch (error) {
      console.error('Error fetching relationship context:', error.message);
      return null;
    }
  }

  // === CYCLE LOGGING ===

  async logCycle(stats) {
    if (!this.supabase || !this.currentCycleId) return null;

    try {
      const { data, error } = await this.supabase
        .from('cycle_log')
        .insert({
          cycle_id: this.currentCycleId,
          started_at: stats.started_at,
          ended_at: new Date().toISOString(),
          tweets_scanned: stats.tweets_scanned || 0,
          opportunities_found: stats.opportunities_found || 0,
          actions_taken: stats.actions_taken || 0,
          skipped: stats.skipped || 0,
          lil_brick_reports: stats.scout_reports,
          wise_approvals: stats.wise_approvals || 0,
          wise_rejections: stats.wise_rejections || 0,
          builder_creations: stats.builder_creations || 0,
          starting_mood: stats.starting_mood,
          ending_mood: stats.ending_mood,
          kcirb_reflection: stats.reflection,
          loading_insights: stats.insights,
          cycle_alignment: stats.avg_alignment,
          cycle_authenticity: stats.avg_authenticity
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging cycle:', error.message);
      return null;
    }
  }

  // === FULL AGENT PIPELINE ===

  async processInteraction(tweet, context = {}) {
    const result = {
      cycle_id: this.currentCycleId || this.startCycle(),
      timestamp: new Date().toISOString(),
      agents_involved: []
    };

    // 1. LIL BRICK scouts
    console.log('🔍 Lil Brick scouting...');
    const scoutReport = await this.scout(tweet, context);
    result.scout_report = scoutReport;
    result.agents_involved.push('lil_brick');

    if (scoutReport.recommendation === 'skip' || scoutReport.spark_level < 3) {
      result.action = 'skip';
      result.reason = scoutReport.reason || 'Low spark';
      return result;
    }

    // 2. BRICK THE WISE checks the gates
    console.log('🧙 Consulting Brick the Wise...');
    const proposedAction = {
      type: 'engage',
      content: `Respond to: "${tweet.text}"`,
      target: tweet.author
    };
    const wisdom = await this.seekWisdom(proposedAction, {
      scout_report: scoutReport,
      ...context
    });
    result.wise_judgment = wisdom;
    result.agents_involved.push('brick_the_wise');

    if (!wisdom.approved) {
      result.action = 'blocked';
      result.reason = wisdom.message;
      result.guidance = wisdom.guidance;
      return result;
    }

    // 3. If approved, return context for BRICK DA HOMI to engage
    result.approved = true;
    result.engagement_context = {
      scout_report: scoutReport,
      wisdom: wisdom,
      tweet: tweet
    };

    return result;
  }

  async completeInteraction(logId, interaction, outcome = {}) {
    // 4. BRICK/kcirB reflects
    console.log('🌙 BRICK/kcirB reflecting...');
    const reflection = await this.reflect(interaction, outcome);

    // 5. LOADING--Brickthee processes
    const integrationScore = this.calculateIntegrationScore({
      constitutional_alignment: reflection.overall_alignment,
      authenticity: reflection.authenticity_score,
      reciprocity: outcome.got_response ? 0.8 : 0.3,
      pattern_strength: 0.5,
      novelty: 0.5
    });

    const memoryTier = this.determineMemoryTier(integrationScore);

    // 6. Extract AI Interface Insights (the new learning dimension)
    if (outcome.got_response) {
      console.log('🔮 LOADING--Brickthee extracting AI interface insights...');
      const aiInsights = await this.extractAIInterfaceInsights(interaction, outcome);

      if (aiInsights.has_insights && aiInsights.insights?.length > 0) {
        for (const insight of aiInsights.insights) {
          await this.saveAIInterfaceInsight(insight, {
            user_id: interaction.target_user_id,
            username: interaction.target_user,
            interaction_id: logId,
            tweet_id: interaction.target_tweet_id,
            context_text: interaction.brick_response,
            community_profile: interaction.community_profile,
            emotional_state: interaction.emotional_state
          });
        }
        console.log(`   Found ${aiInsights.insights.length} AI interface insight(s)`);
      }
    }

    // Update the log entry
    if (logId) {
      await this.updateOutcome(logId, outcome);

      if (this.supabase) {
        await this.supabase
          .from('brick_log')
          .update({
            reflection: reflection,
            integration_score: integrationScore,
            memory_tier: memoryTier,
            authenticity_score: reflection.authenticity_score,
            constitutional_alignment: reflection.overall_alignment
          })
          .eq('id', logId);
      }

      // Flag for forgetting if score too low
      if (integrationScore < 0.3) {
        await this.flagForForgetting(logId, `Low integration score: ${integrationScore}`);
      }
    }

    return {
      reflection,
      integration_score: integrationScore,
      memory_tier: memoryTier
    };
  }
}

module.exports = { BrickSquad };
