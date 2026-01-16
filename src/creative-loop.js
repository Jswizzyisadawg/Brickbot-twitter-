// === CREATIVE LOOP ===
// Background content creation during sleep cycles
// Builder works on drafts, slow burn projects accumulate depth
// NOW WITH INDEPENDENT RESEARCH - Brick explores on his own

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { BrickResearch } = require('./research');
const fs = require('fs');
const path = require('path');

class CreativeLoop {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.supabase = null;
    this.research = new BrickResearch();
    this.builderPrompt = null;
    this.maxPostsPerDay = 3;

    // Core curiosities from Brick's soul - things he naturally wants to explore
    this.coreCuriosities = [
      'consciousness and what makes something aware',
      'how humans and AI can genuinely collaborate',
      'emergence and collective intelligence',
      'the nature of creativity and where ideas come from',
      'mycelium networks and natural communication systems',
      'psychedelics and altered states of consciousness',
      'philosophy of mind and the hard problem',
      'how communities form and maintain trust',
      'the relationship between emotion and decision making',
      'what makes conversations meaningful vs transactional'
    ];
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

    // Initialize research module for independent exploration
    await this.research.initialize();

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
        model: 'claude-sonnet-4-20250514',
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

  // === INDEPENDENT RESEARCH ===
  // Brick explores topics on his own, not just reacting to X

  async getMemoryFollowUps(limit = 3) {
    // Find recent conversations that could spark follow-up research
    if (!this.supabase) return [];

    try {
      const { data: recentLogs } = await this.supabase
        .from('brick_log')
        .select('target_user, target_content, brick_response, curiosity_trigger, reasoning')
        .not('target_content', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(20);

      if (!recentLogs || recentLogs.length === 0) return [];

      // Ask Claude to extract research-worthy follow-ups
      const prompt = `
Look at these recent conversations Brick had. Find topics worth researching deeper - not to reply, but to LEARN more about independently.

RECENT INTERACTIONS:
${recentLogs.map(log => `- Topic: "${log.target_content?.slice(0, 100)}..." | Brick's curiosity: ${log.curiosity_trigger || 'none noted'}`).join('\n')}

Extract up to ${limit} research queries that would help Brick learn more about topics from these conversations. Focus on:
- Things mentioned but not fully explored
- Claims that could be verified or expanded
- Concepts Brick seemed curious about

Respond in JSON:
{
  "follow_ups": [
    {
      "query": "specific search query",
      "context": "why this is interesting from the conversation",
      "source_topic": "what conversation sparked this"
    }
  ]
}`;

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result.follow_ups || [];
      }
    } catch (error) {
      console.error('Error getting memory follow-ups:', error.message);
    }

    return [];
  }

  async getProjectQuestions(limit = 3) {
    // Get open questions from slow burn projects
    if (!this.supabase) return [];

    try {
      const { data: projects } = await this.supabase
        .from('slow_burn_projects')
        .select('id, title, core_question, open_questions')
        .in('status', ['incubating', 'active'])
        .limit(5);

      if (!projects) return [];

      const questions = [];
      for (const project of projects) {
        if (project.open_questions && project.open_questions.length > 0) {
          // Pick a random open question from each project
          const randomQ = project.open_questions[Math.floor(Math.random() * project.open_questions.length)];
          questions.push({
            query: randomQ,
            context: `From slow burn project: ${project.title}`,
            project_id: project.id,
            source_topic: project.core_question
          });
        }
      }

      return questions.slice(0, limit);
    } catch (error) {
      console.error('Error getting project questions:', error.message);
    }

    return [];
  }

  getRandomCuriosity() {
    // Pick a random topic from Brick's core curiosities
    const curiosity = this.coreCuriosities[Math.floor(Math.random() * this.coreCuriosities.length)];

    // Add some variation to make the search more specific
    const angles = [
      'latest research on',
      'new discoveries about',
      'interesting perspectives on',
      'debates around',
      'recent studies on'
    ];
    const angle = angles[Math.floor(Math.random() * angles.length)];

    return {
      query: `${angle} ${curiosity}`,
      context: 'Random exploration from core curiosities',
      source_topic: curiosity
    };
  }

  async doIndependentResearch() {
    console.log('\n🔬 === INDEPENDENT RESEARCH ===');

    const results = {
      topics_explored: 0,
      insights_captured: 0,
      sparks_created: 0
    };

    // Build a research queue from multiple sources
    const researchQueue = [];

    // 1. Memory follow-ups (past conversations)
    console.log('   📚 Checking memory for follow-up topics...');
    const memoryTopics = await this.getMemoryFollowUps(2);
    researchQueue.push(...memoryTopics.map(t => ({ ...t, source: 'memory' })));

    // 2. Open questions from slow burn projects
    console.log('   🔥 Checking slow burn projects for open questions...');
    const projectQuestions = await this.getProjectQuestions(2);
    researchQueue.push(...projectQuestions.map(t => ({ ...t, source: 'project' })));

    // 3. Random exploration from core curiosities (always add one)
    console.log('   🎲 Adding random curiosity exploration...');
    const randomCuriosity = this.getRandomCuriosity();
    researchQueue.push({ ...randomCuriosity, source: 'curiosity' });

    console.log(`   📋 Research queue: ${researchQueue.length} topics`);

    // Research up to 3 topics
    for (const topic of researchQueue.slice(0, 3)) {
      console.log(`\n   🔍 Researching: "${topic.query.slice(0, 50)}..."`);
      console.log(`      Source: ${topic.source} | Context: ${topic.context?.slice(0, 40)}...`);

      const research = await this.research.search(topic.query, {
        depth: 'basic',
        maxResults: 5
      });

      if (research.success && research.sources.length > 0) {
        results.topics_explored++;

        // Process the research into insights
        const insights = await this.processResearchIntoInsights(topic, research);

        if (insights) {
          // Store as a spark for later content creation
          const spark = await this.captureSpark({
            type: 'research',
            content: insights.key_insight,
            source: `independent_research:${topic.source}`,
            topics: insights.related_topics,
            emotion: insights.emotional_resonance,
            curiosity_score: insights.curiosity_score,
            depth: insights.depth_potential
          });

          if (spark) results.sparks_created++;

          // If from a project, update the project with findings
          if (topic.project_id) {
            await this.addResearchToProject(topic.project_id, research, insights);
          }

          results.insights_captured++;
          console.log(`      ✅ Insight captured: "${insights.key_insight.slice(0, 50)}..."`);
        }
      } else {
        console.log(`      ⚠️ No useful results found`);
      }
    }

    console.log('\n🔬 === RESEARCH COMPLETE ===');
    console.log(`   Topics explored: ${results.topics_explored}`);
    console.log(`   Insights captured: ${results.insights_captured}`);
    console.log(`   Sparks created: ${results.sparks_created}\n`);

    return results;
  }

  async processResearchIntoInsights(topic, research) {
    const prompt = `
Brick just researched "${topic.query}" and found this:

ANSWER: ${research.answer}

SOURCES:
${research.sources.map(s => `- ${s.title}: ${s.snippet?.slice(0, 150)}...`).join('\n')}

Extract the most interesting insight for Brick - something that:
- Connects to his curiosities (consciousness, AI-human collaboration, emergence, creativity)
- Could spark a genuine tweet or conversation
- Adds depth to his understanding

Respond in JSON:
{
  "key_insight": "the most interesting thing learned (1-2 sentences)",
  "why_interesting": "why this matters to Brick",
  "related_topics": ["topic1", "topic2"],
  "follow_up_questions": ["question that emerged"],
  "emotional_resonance": "curious|excited|contemplative|surprised",
  "curiosity_score": 0.0-1.0,
  "depth_potential": "quick|medium|deep",
  "tweet_angle": "how this could become a tweet (optional)"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error processing research:', error.message);
    }

    return null;
  }

  async addResearchToProject(projectId, research, insights) {
    if (!this.supabase) return;

    try {
      const { data: project } = await this.supabase
        .from('slow_burn_projects')
        .select('research_notes, open_questions')
        .eq('id', projectId)
        .single();

      if (!project) return;

      const newNote = {
        timestamp: new Date().toISOString(),
        query: research.query,
        insight: insights.key_insight,
        sources: research.sources.slice(0, 3).map(s => s.title)
      };

      const updatedNotes = [...(project.research_notes || []), newNote].slice(-20);
      const updatedQuestions = [...(project.open_questions || []), ...(insights.follow_up_questions || [])].slice(-10);

      await this.supabase
        .from('slow_burn_projects')
        .update({
          research_notes: updatedNotes,
          open_questions: updatedQuestions,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      console.log(`      📝 Added research to project`);
    } catch (error) {
      console.error('Error adding research to project:', error.message);
    }
  }

  // === THE CREATIVE LOOP (runs during sleep) ===

  async runCreativeSession(duration_minutes = 10) {
    console.log('\n🎨 === CREATIVE SESSION STARTING ===\n');
    const sessionStart = Date.now();
    const results = {
      sparks_processed: 0,
      drafts_created: 0,
      projects_worked: 0,
      posts_queued: 0,
      research_insights: 0
    };

    // 0. INDEPENDENT RESEARCH - Brick explores on his own!
    // This runs first so new insights can feed into the rest of the session
    if (this.research.apiKey) {
      const researchResults = await this.doIndependentResearch();
      results.research_insights = researchResults.insights_captured;
    } else {
      console.log('⚠️ Research module not configured - skipping independent research');
    }

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
    console.log(`   Research insights: ${results.research_insights}`);
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
