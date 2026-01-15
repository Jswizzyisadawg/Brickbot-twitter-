// === CREATIVE LOOP ===
// Background content creation during sleep cycles
// Builder works on drafts, slow burn projects accumulate depth

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class CreativeLoop {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.supabase = null;
    this.builderPrompt = null;
    this.maxPostsPerDay = 3;
  }

  async initialize() {
    // Load Builder agent prompt
    const builderPath = path.join(__dirname, '../agents/brick-the-builder.md');
    if (fs.existsSync(builderPath)) {
      this.builderPrompt = fs.readFileSync(builderPath, 'utf-8');
    }

    // Connect to Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    console.log('🎨 Creative Loop initialized');
    return true;
  }

  // === SPARK MANAGEMENT ===

  async captureSpark(spark) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('spark_queue')
        .insert({
          spark_type: spark.type,
          content: spark.content,
          source: spark.source,
          related_topics: spark.topics || [],
          emotional_resonance: spark.emotion,
          curiosity_score: spark.curiosity_score || 0.5,
          depth_potential: spark.depth || 'quick'
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`✨ Spark captured: ${spark.type}`);
      return data;
    } catch (error) {
      console.error('Error capturing spark:', error.message);
      return null;
    }
  }

  async getAvailableSparks(limit = 5) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('spark_queue')
        .select('*')
        .eq('status', 'fresh')
        .order('curiosity_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sparks:', error.message);
      return [];
    }
  }

  async claimSpark(sparkId, claimedBy = 'builder') {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('spark_queue')
        .update({
          status: 'claimed',
          claimed_by: claimedBy,
          claimed_at: new Date().toISOString()
        })
        .eq('id', sparkId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error claiming spark:', error.message);
      return null;
    }
  }

  // === BUILDER OPERATIONS ===

  async builderCreateDraft(spark, context = {}) {
    const systemPrompt = this.builderPrompt || 'You are Brick the Builder. Create thoughtful content.';

    const prompt = `
SPARK TO WORK WITH:
Type: ${spark.spark_type}
Content: "${spark.content}"
Depth Potential: ${spark.depth_potential}
Emotional Resonance: ${spark.emotional_resonance || 'curious'}
Related Topics: ${(spark.related_topics || []).join(', ')}

${context.project ? `
SLOW BURN PROJECT CONTEXT:
Title: ${context.project.title}
Core Question: ${context.project.core_question}
Research Notes: ${JSON.stringify(context.project.research_notes || [])}
Previous Angles: ${context.project.current_angle || 'none yet'}
Depth Reached: ${context.project.depth_reached}
` : ''}

Create content that:
1. Opens doors, doesn't close them
2. Shows genuine curiosity
3. Invites conversation, not just reaction
4. Feels like Brick, not like performing

Respond in JSON:
{
  "draft_type": "tweet|thread|question",
  "content": "the actual content",
  "emotional_angle": "which emotion this comes from",
  "builder_notes": "why this direction",
  "best_timing": "morning|afternoon|evening|any",
  "target_community": "who this might resonate with",
  "confidence": 0.0-1.0,
  "needs_more_thought": true/false,
  "follow_up_questions": ["questions to explore if slow burn"]
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
      console.error('Builder draft error:', error.message);
    }

    return null;
  }

  async saveDraft(draft, sparkId = null, projectId = null) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('draft_queue')
        .insert({
          draft_type: draft.draft_type,
          content: draft.content,
          spark_id: sparkId,
          project_id: projectId,
          builder_notes: draft.builder_notes,
          emotional_angle: draft.emotional_angle,
          best_timing: draft.best_timing,
          target_community: draft.target_community,
          status: draft.needs_more_thought ? 'drafting' : 'ready'
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`📝 Draft saved: ${draft.draft_type}`);
      return data;
    } catch (error) {
      console.error('Error saving draft:', error.message);
      return null;
    }
  }

  // === SLOW BURN PROJECTS ===

  async createProject(spark, initialThoughts) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('slow_burn_projects')
        .insert({
          title: initialThoughts.title || spark.content.slice(0, 50),
          description: initialThoughts.description,
          core_question: initialThoughts.core_question || spark.content,
          original_spark_id: spark.id,
          research_notes: initialThoughts.research_notes || [],
          open_questions: initialThoughts.follow_up_questions || [],
          scratchpad: initialThoughts.scratchpad || '',
          current_angle: initialThoughts.current_angle || ''
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`🔥 Slow burn project created: ${data.title}`);
      return data;
    } catch (error) {
      console.error('Error creating project:', error.message);
      return null;
    }
  }

  async getActiveProjects(limit = 3) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('slow_burn_projects')
        .select('*')
        .in('status', ['incubating', 'active'])
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching projects:', error.message);
      return [];
    }
  }

  async workOnProject(project) {
    const systemPrompt = this.builderPrompt || 'You are Brick the Builder. Go deeper.';

    const prompt = `
SLOW BURN PROJECT SESSION:

Title: ${project.title}
Core Question: ${project.core_question}
Cycles Active: ${project.cycles_active}
Depth Reached: ${project.depth_reached}

ACCUMULATED CONTEXT:
Research Notes: ${JSON.stringify(project.research_notes || [])}
Connections Found: ${JSON.stringify(project.connections || [])}
Open Questions: ${JSON.stringify(project.open_questions || [])}
Previous Drafts: ${JSON.stringify(project.draft_attempts || [])}

Current Angle: ${project.current_angle || 'none set'}
Scratchpad: ${project.scratchpad || 'empty'}

This is a THINKING session. Don't force output.
- What new angles are emerging?
- What connections haven't been made yet?
- What would make this deeper, not just longer?
- Is there a genuine insight forming?

Respond in JSON:
{
  "session_focus": "what you worked on",
  "new_discoveries": ["insights found"],
  "new_questions": ["questions that emerged"],
  "connections_made": ["links to other ideas"],
  "scratchpad_additions": "new thinking to add",
  "new_angle": "updated direction if any",
  "depth_assessment": "surface|exploring|deep|profound",
  "ready_to_draft": true/false,
  "draft_if_ready": "content if ready",
  "confidence": 0.0-1.0,
  "next_steps": "what to explore next session"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Project session error:', error.message);
    }

    return null;
  }

  async updateProject(projectId, session) {
    if (!this.supabase) return null;

    try {
      // Get current project
      const { data: project } = await this.supabase
        .from('slow_burn_projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) return null;

      // Merge new data
      const updatedResearch = [...(project.research_notes || []), ...(session.new_discoveries || [])];
      const updatedQuestions = [...(project.open_questions || []), ...(session.new_questions || [])];
      const updatedConnections = [...(project.connections || []), ...(session.connections_made || [])];
      const updatedDrafts = session.draft_if_ready
        ? [...(project.draft_attempts || []), session.draft_if_ready]
        : project.draft_attempts;

      const { data, error } = await this.supabase
        .from('slow_burn_projects')
        .update({
          research_notes: updatedResearch.slice(-20), // Keep last 20
          open_questions: updatedQuestions.slice(-10),
          connections: updatedConnections.slice(-15),
          draft_attempts: updatedDrafts?.slice(-5),
          scratchpad: (project.scratchpad || '') + '\n\n---\n' + (session.scratchpad_additions || ''),
          current_angle: session.new_angle || project.current_angle,
          depth_reached: session.depth_assessment || project.depth_reached,
          cycles_active: (project.cycles_active || 0) + 1,
          last_worked_at: new Date().toISOString(),
          confidence: session.confidence || project.confidence,
          status: session.ready_to_draft ? 'ready' : project.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;

      // Log the session
      await this.logProjectSession(projectId, session);

      return data;
    } catch (error) {
      console.error('Error updating project:', error.message);
      return null;
    }
  }

  async logProjectSession(projectId, session) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('project_sessions')
        .insert({
          project_id: projectId,
          focus: session.session_focus,
          discoveries: session.new_discoveries,
          new_questions: session.new_questions,
          progress_made: session.depth_assessment,
          next_steps: session.next_steps
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging session:', error.message);
      return null;
    }
  }

  // === POST QUEUE ===

  async queueForPosting(draft, priority = 5) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('post_queue')
        .insert({
          draft_id: draft.id,
          content: draft.content,
          post_type: draft.draft_type,
          priority: priority,
          best_timing: draft.best_timing,
          target_community: draft.target_community,
          emotional_approach: draft.emotional_angle
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`📮 Queued for posting: ${draft.draft_type}`);
      return data;
    } catch (error) {
      console.error('Error queueing post:', error.message);
      return null;
    }
  }

  async getReadyToPost(limit = 1) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('post_queue')
        .select('*')
        .eq('status', 'queued')
        .or(`not_before.is.null,not_before.lte.${new Date().toISOString()}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching ready posts:', error.message);
      return [];
    }
  }

  async markPosted(queueId, tweetId) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('post_queue')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString(),
          posted_tweet_id: tweetId
        })
        .eq('id', queueId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking posted:', error.message);
      return null;
    }
  }

  // === AI INTERFACE INSIGHTS ===

  async captureAIInsight(insight) {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('ai_interface_insights')
        .insert({
          user_id: insight.user_id,
          username: insight.username,
          interaction_id: insight.interaction_id,
          tweet_id: insight.tweet_id,
          insight_type: insight.type,
          content: insight.content,
          context: insight.context,
          interface_dimension: insight.dimension,
          sentiment: insight.sentiment,
          confidence: insight.confidence || 0.5,
          explicit: insight.explicit || false,
          community_profile: insight.community,
          relates_to_emotion: insight.emotion
        })
        .select()
        .single();

      if (error) throw error;
      console.log(`🔮 AI insight captured: ${insight.type}`);
      return data;
    } catch (error) {
      console.error('Error capturing AI insight:', error.message);
      return null;
    }
  }

  async analyzeForAIInsights(interaction, response) {
    const prompt = `
INTERACTION TO ANALYZE FOR AI INTERFACE INSIGHTS:

What Brick said: "${interaction.brick_response}"
How they responded: "${response.text || 'no text response'}"
Engagement: ${response.liked ? 'liked' : ''} ${response.replied ? 'replied' : ''} ${response.followed ? 'followed' : ''}

Look for signals about how this person wants to interface with AI:
- Do they treat AI as a tool, companion, or collaborator?
- What made them engage or disengage?
- Any explicit preferences stated?
- Any friction or delight signals?

Only return insights if you're reasonably confident. Don't force it.

Respond in JSON:
{
  "has_insight": true/false,
  "insights": [
    {
      "type": "preference|friction|delight|boundary|openness",
      "content": "what you observed",
      "dimension": "companion|tool|invisible|collaborator|augmentation",
      "sentiment": "positive|negative|neutral|curious|skeptical",
      "confidence": 0.0-1.0,
      "explicit": true/false
    }
  ]
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI insight analysis error:', error.message);
    }

    return { has_insight: false, insights: [] };
  }

  // === THE CREATIVE LOOP (runs during sleep) ===

  async runCreativeSession(duration_minutes = 10) {
    console.log('\n🎨 === CREATIVE SESSION STARTING ===\n');
    const sessionStart = Date.now();
    const results = {
      sparks_processed: 0,
      drafts_created: 0,
      projects_worked: 0,
      posts_queued: 0
    };

    // 1. Work on slow burn projects first (they need continuity)
    console.log('🔥 Checking slow burn projects...');
    const activeProjects = await this.getActiveProjects(2);

    for (const project of activeProjects) {
      if (Date.now() - sessionStart > duration_minutes * 60 * 1000 * 0.6) break;

      console.log(`   Working on: ${project.title}`);
      const session = await this.workOnProject(project);

      if (session) {
        await this.updateProject(project.id, session);
        results.projects_worked++;

        // If ready to draft, create it
        if (session.ready_to_draft && session.draft_if_ready) {
          const draft = await this.saveDraft({
            draft_type: 'tweet',
            content: session.draft_if_ready,
            builder_notes: `From slow burn: ${project.title}`,
            emotional_angle: 'contemplative',
            best_timing: 'any',
            needs_more_thought: false
          }, null, project.id);

          if (draft) results.drafts_created++;
        }
      }
    }

    // 2. Process fresh sparks
    console.log('✨ Processing fresh sparks...');
    const sparks = await this.getAvailableSparks(3);

    for (const spark of sparks) {
      if (Date.now() - sessionStart > duration_minutes * 60 * 1000 * 0.9) break;

      await this.claimSpark(spark.id, 'builder');
      results.sparks_processed++;

      // Decide: quick content or slow burn?
      if (spark.depth_potential === 'deep') {
        // Create a slow burn project
        console.log(`   Creating slow burn for: ${spark.content.slice(0, 40)}...`);
        const initialThoughts = await this.builderCreateDraft(spark);

        if (initialThoughts && initialThoughts.needs_more_thought) {
          await this.createProject(spark, {
            title: spark.content.slice(0, 50),
            core_question: spark.content,
            follow_up_questions: initialThoughts.follow_up_questions
          });
        }
      } else {
        // Quick content
        console.log(`   Drafting quick content for: ${spark.content.slice(0, 40)}...`);
        const draft = await this.builderCreateDraft(spark);

        if (draft && !draft.needs_more_thought) {
          const saved = await this.saveDraft(draft, spark.id);
          if (saved) results.drafts_created++;
        }
      }
    }

    // 3. Check what's ready to queue
    console.log('📮 Checking drafts ready for posting...');
    const { data: readyDrafts } = await this.supabase
      ?.from('draft_queue')
      .select('*')
      .eq('status', 'ready')
      .limit(2) || { data: [] };

    for (const draft of readyDrafts || []) {
      // Note: In production, this would go through Brick the Wise first
      await this.queueForPosting(draft, 5);
      results.posts_queued++;

      // Mark draft as approved
      await this.supabase
        ?.from('draft_queue')
        .update({ status: 'approved' })
        .eq('id', draft.id);
    }

    console.log('\n🎨 === CREATIVE SESSION COMPLETE ===');
    console.log(`   Sparks processed: ${results.sparks_processed}`);
    console.log(`   Drafts created: ${results.drafts_created}`);
    console.log(`   Projects worked: ${results.projects_worked}`);
    console.log(`   Posts queued: ${results.posts_queued}`);
    console.log('');

    return results;
  }

  // === STATS ===

  async getCreativeDashboard() {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('creative_dashboard')
        .select('*')
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching dashboard:', error.message);
      return null;
    }
  }
}

module.exports = { CreativeLoop };
