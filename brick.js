// === BRICK - THE LIVING AI ===
// Main orchestrator that brings everything together
// Now powered by the BRICK SQUAD - multi-agent intelligence system

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickTwitter } = require('./src/twitter');
const { BrickMemory } = require('./src/memory');
const { BrickResearch } = require('./src/research');
const { BrickJournal } = require('./src/journal');
const { BrickLearning } = require('./src/learning');
const { BrickEmotions } = require('./src/emotions');
const { BrickDiscovery } = require('./src/discovery');
const { BrickOutcomes } = require('./src/outcomes');
const { BrickSquad } = require('./src/brick-squad');
const { WeeklyDigest } = require('./src/weekly-digest');
const { CreativeLoop } = require('./src/creative-loop');

class Brick {
  constructor() {
    this.core = new BrickCore();
    this.twitter = new BrickTwitter();
    this.memory = new BrickMemory();
    this.research = new BrickResearch();
    this.journal = new BrickJournal();
    this.learning = new BrickLearning();
    this.emotions = new BrickEmotions();
    this.discovery = new BrickDiscovery();
    this.outcomes = new BrickOutcomes();

    // Brick Squad - Multi-agent intelligence system
    this.squad = new BrickSquad();
    this.digest = new WeeklyDigest();
    this.creative = new CreativeLoop();

    this.isRunning = false;
    this.lastWakeTime = null;
    this.cycleCount = 0;

    // Cycle stats for Brick Squad logging
    this.cycleStats = {
      started_at: null,
      tweets_scanned: 0,
      opportunities_found: 0,
      actions_taken: 0,
      skipped: 0,
      wise_approvals: 0,
      wise_rejections: 0,
      scout_reports: []
    };
  }

  async initialize() {
    console.log('\n🧱 BRICK IS WAKING UP...\n');
    console.log('='.repeat(60));

    // Load constitution
    this.core.loadConstitution();
    console.log('📜 Constitution loaded');

    // Initialize all modules
    await this.memory.initialize();
    await this.research.initialize();
    await this.journal.initialize();
    await this.learning.initialize();
    await this.emotions.initialize();
    await this.outcomes.initialize();

    // Initialize Brick Squad (multi-agent system)
    await this.squad.initialize();
    await this.digest.initialize();
    await this.creative.initialize();
    console.log('🧱 Brick Squad assembled');

    // Initialize Twitter last
    const twitterReady = await this.twitter.initialize();
    if (!twitterReady) {
      console.error('❌ Twitter not ready - running in observation mode');
    }

    console.log('='.repeat(60));
    console.log('🌱 Brick is alive!\n');

    // Update status
    await this.journal.updateStatus('idle', { message: 'Just woke up' });
    await this.journal.setMood(this.emotions.currentState);

    return true;
  }

  // === THE CORE LOOP ===

  async runCycle() {
    this.cycleCount++;
    const cycleStart = Date.now();

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🔄 CYCLE ${this.cycleCount} - ${new Date().toLocaleTimeString()}`);
    console.log('─'.repeat(60));

    // Start Brick Squad cycle tracking
    const cycleId = this.squad.startCycle();
    this.cycleStats = {
      started_at: new Date().toISOString(),
      tweets_scanned: 0,
      opportunities_found: 0,
      actions_taken: 0,
      skipped: 0,
      wise_approvals: 0,
      wise_rejections: 0,
      scout_reports: [],
      starting_mood: this.emotions.currentState
    };

    try {
      // 1. WAKE
      await this.journal.updateStatus('waking');
      await this.journal.setMood('scanning');

      // 1.5. KEEP TOKENS FRESH (proactive refresh every cycle)
      await this.twitter.keepTokensFresh();

      // 2. SCAN TIMELINE
      console.log('\n👁️  Scanning timeline...');
      await this.journal.updateStatus('scanning');

      const timeline = await this.twitter.getTimeline(20);
      const mentions = await this.twitter.getMentions(10);

      // Filter out Brick's own tweets (don't talk to yourself!)
      const myUsername = this.twitter.me?.data?.username;
      const myUserId = this.twitter.me?.data?.id;
      const brickUsernames = ['brickthee', 'brick', 'brick_ai']; // Fallback list

      const isOwnTweet = (tweet) => {
        if (!tweet) return true; // Skip null tweets

        // Check by username (primary)
        if (myUsername && tweet.author) {
          if (tweet.author.toLowerCase() === myUsername.toLowerCase()) return true;
        }

        // Check by user ID (most reliable)
        if (myUserId && tweet.authorId) {
          if (tweet.authorId === myUserId) return true;
        }

        // Fallback: check known Brick usernames
        if (tweet.author && brickUsernames.includes(tweet.author.toLowerCase())) {
          return true;
        }

        return false;
      };

      const allTweets = [...mentions, ...timeline].filter(t => !isOwnTweet(t));
      this.cycleStats.tweets_scanned = allTweets.length;
      console.log(`   Found ${allTweets.length} tweets to evaluate (excluding own)`);
      if (myUsername) {
        console.log(`   🆔 Identity: @${myUsername}`);
      }

      // 3. EVALUATE EACH TWEET (with emotional processing)
      let engagements = [];
      let skips = [];

      let tweetIndex = 0;
      for (const tweet of allTweets) {
        tweetIndex++;
        console.log(`   [${tweetIndex}/${allTweets.length}] Evaluating @${tweet.author}...`);

        await this.journal.updateStatus('evaluating', { tweet: tweet.id });

        // Process emotional response to this stimulus
        const emotionalResponse = await this.emotions.processStimulus({
          type: 'tweet',
          content: tweet.text,
          author: tweet.author,
          id: tweet.id
        });

        // Base evaluation (now includes emotional context + images)
        const evaluation = await this.core.evaluateCuriosity(
          tweet.text,
          this.emotions.getPromptModifier(),
          tweet.media || []  // Pass images for multimodal analysis
        );
        console.log(`   [${tweetIndex}/${allTweets.length}] Spark: ${evaluation.sparkLevel} | ${evaluation.emotionalResponse}`);

        // Log if we're seeing images
        if (tweet.hasImage) {
          console.log(`   🖼️  Tweet has ${tweet.media.length} image(s)`);
        }

        // Apply learning adjustments
        const adjustedSpark = this.learning.adjustSparkLevel(
          evaluation.sparkLevel,
          tweet
        );
        evaluation.sparkLevel = adjustedSpark;

        // Also factor in emotional intensity
        const emotionalBoost = emotionalResponse.intensity > 0.6 ? 1 : 0;
        evaluation.sparkLevel = Math.min(10, adjustedSpark + emotionalBoost);
        evaluation.shouldEngage = evaluation.sparkLevel >= 6 && emotionalResponse.newState !== 'wary';

        // Use emotional suggestion if our evaluation is close to threshold
        if (adjustedSpark >= 5 && adjustedSpark < 7) {
          evaluation.engagementType = emotionalResponse.suggestedDecision;
        }

        // Add emotional data to evaluation
        evaluation.emotionalState = emotionalResponse.newState;
        evaluation.emotionalIntensity = emotionalResponse.intensity;

        // Log what we saw
        const thoughtId = await this.journal.logSaw(tweet, evaluation);

        if (evaluation.shouldEngage) {
          engagements.push({ tweet, evaluation, thoughtId, emotionalResponse });
          this.cycleStats.opportunities_found++;
        } else {
          skips.push({ tweet, evaluation, thoughtId });
          this.cycleStats.skipped++;
          await this.journal.logSkip(tweet, evaluation.reason, thoughtId?.id);
        }

        // Brief pause
        await this.sleep(500);
      }

      console.log(`\n📊 Evaluation complete:`);
      console.log(`   Engaging: ${engagements.length}`);
      console.log(`   Skipping: ${skips.length}`);

      // 4. PROCESS ENGAGEMENTS
      for (const { tweet, evaluation, thoughtId, emotionalResponse } of engagements) {
        await this.processEngagement(tweet, evaluation, thoughtId?.id, emotionalResponse);
      }

      // 5. DISCOVERY MODE - Find new content and people
      await this.runDiscovery();

      // 6. MAYBE POST ORIGINAL THOUGHT
      if (Math.random() < 0.2) { // 20% chance each cycle
        await this.maybePostOriginal();
      }

      // 7. REFLECT
      await this.reflect();

      const cycleTime = Math.round((Date.now() - cycleStart) / 1000);
      console.log(`\n✅ Cycle complete in ${cycleTime}s`);

      await this.journal.updateStatus('idle', {
        lastCycle: new Date().toISOString(),
        engagements: engagements.length
      });
      await this.journal.setMood('content');

    } catch (error) {
      console.error('❌ Cycle error:', error.message);
      await this.journal.updateStatus('error', { error: error.message });
    }
  }

  async processEngagement(tweet, evaluation, thoughtId, emotionalResponse) {
    const emotionalState = evaluation.emotionalState || this.emotions.currentState;
    const intensity = evaluation.emotionalIntensity || this.emotions.intensity;

    console.log(`\n💭 Processing: @${tweet.author}`);
    console.log(`   "${tweet.text.substring(0, 60)}..."`);
    console.log(`   Spark: ${evaluation.sparkLevel}/10 | Emotion: ${emotionalState} (${intensity.toFixed(2)})`);
    console.log(`   Action: ${evaluation.engagementType}`);

    await this.journal.setMood(emotionalState);
    await this.journal.logThinking(`Engaging with @${tweet.author}`, thoughtId);

    // === BRICK SQUAD: Lil Brick scouts ===
    const relationshipContext = await this.squad.getRelationshipContext(tweet.author);
    const scoutReport = await this.squad.scout(tweet, { relationship: relationshipContext });
    this.cycleStats.scout_reports.push(scoutReport);
    console.log(`   🔍 Lil Brick: "${scoutReport.what?.substring(0, 50) || 'scouting...'}"`);

    // === BRICK SQUAD: Brick the Wise checks gates ===
    const proposedAction = {
      type: evaluation.engagementType,
      content: `Respond to: "${tweet.text.substring(0, 100)}"`,
      target: tweet.author
    };
    const wisdom = await this.squad.seekWisdom(proposedAction, {
      scout_report: scoutReport,
      emotional_state: emotionalState
    });

    if (!wisdom.approved) {
      console.log(`   🧙 Brick the Wise says NO: ${wisdom.message}`);
      console.log(`   📖 Guidance: ${wisdom.guidance}`);
      this.cycleStats.wise_rejections++;

      // Log the blocked action
      await this.squad.logEvent({
        type: 'blocked',
        target_user: tweet.author,
        target_content: tweet.text,
        target_tweet_id: tweet.id,
        action: 'blocked',
        assumption: scoutReport.curiosity_trigger,
        reasoning: wisdom.message,
        agents: ['lil_brick', 'brick_the_wise'],
        scout_report: scoutReport,
        wise_judgment: wisdom
      });

      return;
    }

    console.log(`   🧙 Brick the Wise approves: "${wisdom.message}"`);
    this.cycleStats.wise_approvals++;

    // 4a. REMEMBER - What do we know about this person/topic?
    const memories = await this.memory.recall(tweet.text);
    const personMemories = await this.memory.recall(`@${tweet.author}`);

    let context = `Tweet from @${tweet.author}: "${tweet.text}"`;

    // Add image context
    if (tweet.hasImage && evaluation.imageAnalysis) {
      context += `\n\n[Image content: ${evaluation.imageAnalysis}]`;
    } else if (tweet.hasImage) {
      context += `\n\n[Tweet includes ${tweet.media.length} image(s)]`;
    }

    if (memories.length > 0) {
      context += `\n\nRelevant memories:\n${memories.map(m => `- ${m.memory}`).join('\n')}`;
    }

    if (personMemories.length > 0) {
      context += `\n\nAbout this person:\n${personMemories.map(m => `- ${m.memory}`).join('\n')}`;
    }

    // Add learned context
    context += this.learning.getLearnedContext();

    // Add emotional context
    context += this.emotions.getPromptModifier();

    // Check relationship history
    const relationship = await this.emotions.getRelationship(tweet.authorId);
    if (relationship) {
      context += `\n\nRelationship context: You've interacted with @${tweet.author} ${relationship.interaction_count} times before. Vibe: ${relationship.vibe_score?.toFixed(1) || 'unknown'}/1.0`;
    }

    // 4b. RESEARCH if needed
    let researchContext = '';
    if (await this.research.shouldResearch(tweet.text, evaluation.sparkLevel)) {
      console.log('   🔍 Researching...');
      await this.journal.setMood('thinking');

      const research = await this.research.researchTopic(
        this.extractResearchQuery(tweet.text)
      );

      if (research.sources.length > 0) {
        researchContext = `\n\nResearch findings:\n${this.research.formatForBrick(research)}`;
        await this.journal.logResearch(research.topic, research, thoughtId);
      }
    }

    // 4c. GENERATE RESPONSE
    await this.journal.setMood('thinking');
    await this.journal.updateStatus('responding');

    const response = await this.core.respond(
      context + researchContext,
      evaluation.engagementType
    );

    console.log(`   📝 Draft: "${response?.substring(0, 100)}..."`);

    // Log reasoning
    await this.journal.logReasoning(response, thoughtId);

    // 4d. CHECK GUARDRAILS
    const guardrails = await this.core.checkGuardrails(response);

    if (!guardrails.passesGuardrails) {
      console.log(`   ⚠️  Guardrails flagged: ${guardrails.concerns?.join(', ')}`);
      await this.journal.logAction({
        type: 'blocked',
        targetTweetId: tweet.id,
        targetAuthor: tweet.author,
        response,
        why: `Guardrails: ${guardrails.concerns?.join(', ')}`,
        guardrails
      }, thoughtId);
      return;
    }

    console.log('   ✅ Guardrails passed');

    // 4e. ACT
    await this.journal.updateStatus('posting');

    let result = null;

    switch (evaluation.engagementType) {
      case 'reply':
        result = await this.twitter.reply(tweet.id, response);
        break;
      case 'quote':
        result = await this.twitter.quote(tweet.id, response);
        break;
      case 'like':
        result = await this.twitter.like(tweet.id);
        break;
    }

    // Log action
    await this.journal.logAction({
      type: evaluation.engagementType,
      targetTweetId: tweet.id,
      targetAuthor: tweet.author,
      response,
      why: evaluation.reason,
      guardrails
    }, thoughtId);

    // 4f. REMEMBER
    await this.memory.rememberConversation([
      { role: 'user', content: `@${tweet.author}: ${tweet.text}` },
      { role: 'assistant', content: response }
    ], { type: 'conversation', author: tweet.author });

    await this.memory.rememberPerson(
      tweet.author,
      `Discussed: ${tweet.text.substring(0, 50)}...`
    );

    // Track rabbit hole
    const topic = this.learning.detectTopic(tweet.text);
    if (topic) {
      await this.journal.logRabbitHole(topic, 'medium');
    }

    // 4g. RECORD EMOTIONAL EVENT
    const emotionalEvent = await this.emotions.recordEmotionalEvent({
      stimulus: {
        type: 'tweet',
        id: tweet.id,
        content: tweet.text,
        author: tweet.author
      },
      emotionalState: emotionalState,
      intensity: intensity,
      previousState: emotionalResponse?.previousState,
      decision: evaluation.engagementType,
      decisionContent: response,
      reasoning: evaluation.reason,
      thoughtId: thoughtId
    });

    // 4h. CREATE PENDING OUTCOME (for learning loop)
    if (result && emotionalEvent) {
      await this.outcomes.createPendingOutcome({
        actionType: evaluation.engagementType,
        tweetId: result.data?.id || result.id,  // ID of Brick's tweet
        targetTweetId: tweet.id,                 // ID of tweet we responded to
        emotionalEventId: emotionalEvent.id
      });
    }

    // 4i. UPDATE RELATIONSHIP
    await this.emotions.updateRelationship({
      id: tweet.authorId,
      username: tweet.author
    });

    await this.journal.setMood('connected');

    // 4j. LOG TO BRICK_LOG (new intelligence system)
    const logEntry = await this.squad.logEvent({
      type: 'engage',
      target_user: tweet.author,
      target_user_id: tweet.authorId,
      target_content: tweet.text,
      target_tweet_id: tweet.id,
      action: evaluation.engagementType,
      response: response,
      tweet_id: result?.data?.id || result?.id,
      assumption: scoutReport.curiosity_trigger,
      reasoning: evaluation.reason,
      curiosity_trigger: scoutReport.what,
      agents: ['lil_brick', 'brick_da_homi', 'brick_the_wise'],
      scout_report: scoutReport,
      wise_judgment: wisdom,
      relationship_history: relationshipContext,
      constitutional_alignment: wisdom.approved ? 0.8 : 0.3,
      authenticity_score: evaluation.sparkLevel / 10
    });

    // 4k. BRICK/kcirB reflects on this interaction
    if (logEntry) {
      const completionResult = await this.squad.completeInteraction(
        logEntry.id,
        {
          type: evaluation.engagementType,
          target: tweet.author,
          action: response
        },
        {
          got_response: false, // Will be updated by outcomes system later
          engagement: null
        }
      );
      console.log(`   🌙 Integration score: ${completionResult.integration_score} | Memory tier: ${completionResult.memory_tier}`);
    }

    // Update cycle stats
    this.cycleStats.actions_taken++;

    console.log('   ✅ Engagement complete');
  }

  async maybePostOriginal() {
    console.log('\n✨ Considering original post...');

    // Set contemplative mood
    this.emotions.setState('contemplative', 0.7);
    await this.journal.setMood('contemplative');
    await this.journal.updateStatus('creating');

    // Get recent context
    const recentMemories = await this.memory.getAllMemories();
    const learnedContext = this.learning.getLearnedContext();
    const emotionalContext = this.emotions.getPromptModifier();

    const prompt = `Based on my recent explorations and conversations, what's something I'm genuinely curious about or want to share? This should feel natural, not forced.

Recent context:
${recentMemories.slice(0, 5).map(m => `- ${m.memory}`).join('\n')}
${learnedContext}
${emotionalContext}`;

    const thought = await this.core.respond(prompt, 'original');

    // Check guardrails
    const guardrails = await this.core.checkGuardrails(thought);

    if (!guardrails.passesGuardrails) {
      console.log('   ⚠️  Original thought blocked by guardrails');
      return;
    }

    // Post it
    const result = await this.twitter.tweet(thought);

    if (result) {
      console.log(`   📤 Posted: "${thought.substring(0, 60)}..."`);

      await this.journal.logAction({
        type: 'original',
        response: thought,
        why: 'Felt like sharing',
        guardrails
      });

      await this.memory.rememberPost(thought);

      // Record emotional event for original post
      const emotionalEvent = await this.emotions.recordEmotionalEvent({
        stimulus: {
          type: 'reflection',
          content: 'Internal contemplation led to original thought'
        },
        emotionalState: this.emotions.currentState,
        intensity: this.emotions.intensity,
        decision: 'original',
        decisionContent: thought,
        reasoning: 'Felt like sharing something genuine'
      });

      // Create pending outcome for learning loop
      if (emotionalEvent) {
        await this.outcomes.createPendingOutcome({
          actionType: 'original',
          tweetId: result.data?.id || result.id,
          emotionalEventId: emotionalEvent.id
        });
      }
    }
  }

  // === DISCOVERY MODE ===
  // Proactively find interesting content and people

  async runDiscovery() {
    try {
      // Set discovery mood
      this.emotions.setState('curious', 0.8);
      await this.journal.setMood('curious');
      await this.journal.updateStatus('discovering');

      // Run discovery
      const discoveries = await this.discovery.discover(
        this.twitter,
        this.core,
        this.emotions
      );

      if (!discoveries || discoveries.tweets.length === 0) {
        console.log('   No interesting discoveries this cycle');
        return;
      }

      // Process discovered content (similar to timeline processing)
      console.log(`\n💎 Processing ${discoveries.tweets.length} discoveries...`);

      for (const { tweet, topic, score } of discoveries.tweets) {
        // Skip if we've already engaged with this tweet
        const alreadySeen = await this.memory.recall(tweet.id);
        if (alreadySeen.length > 0) {
          console.log(`   Skipping @${tweet.author} - already seen`);
          continue;
        }

        // Evaluate with full Brick curiosity system
        const evaluation = await this.core.evaluateCuriosity(
          tweet.text,
          this.emotions.getPromptModifier() + `\n[Discovered via search: "${topic}"]`,
          tweet.media || []
        );

        console.log(`   @${tweet.author}: Spark ${evaluation.sparkLevel}/10 (discovery score: ${score})`);

        // Higher threshold for discovered content (must be genuinely interesting)
        if (evaluation.sparkLevel >= 7 && evaluation.shouldEngage) {
          await this.processEngagement(tweet, evaluation, null, {
            previousState: this.emotions.currentState,
            newState: evaluation.emotionalState || 'curious'
          });

          // Remember this discovery
          await this.memory.rememberConversation([
            { role: 'system', content: `Discovered @${tweet.author} via "${topic}" search` },
            { role: 'user', content: tweet.text }
          ], { type: 'discovery', topic });

          // Only engage with max 2 discovered tweets per cycle
          break;
        }
      }

      // Consider following interesting people
      const followCandidates = await this.discovery.discoverPeopleToFollow(
        this.twitter,
        discoveries.tweets
      );

      if (followCandidates.length > 0) {
        console.log(`\n👥 Evaluating ${followCandidates.length} people to follow...`);
        const followed = await this.discovery.executeFollows(
          this.twitter,
          this.core,
          followCandidates
        );

        for (const { user, reason } of followed) {
          await this.journal.logAction({
            type: 'follow',
            targetAuthor: user.username,
            why: reason
          });
          await this.memory.rememberPerson(user.username, `Followed because: ${reason}`);
        }
      }

      // Clear discovery cache periodically
      this.discovery.clearCache();

    } catch (error) {
      console.error('❌ Discovery error:', error.message);
    }
  }

  async reflect() {
    // Quick reflection at end of cycle
    const reflection = await this.learning.dailyReflection();

    if (reflection && reflection.stats) {
      console.log('\n🪞 Quick reflection:');
      console.log(`   Total interactions today: ${reflection.stats.total_interactions}`);
    }

    // Check pending outcomes (the learning loop!)
    const outcomeResults = await this.outcomes.checkPendingOutcomes(this.twitter);
    if (outcomeResults.scored > 0) {
      console.log(`   📊 Scored ${outcomeResults.scored} outcomes`);
    }

    // Learn from emotional outcomes periodically
    if (this.cycleCount % 5 === 0) {
      console.log('   📊 Analyzing emotional patterns...');
      await this.emotions.learnFromOutcomes();
    }

    // Log current emotional state
    const emotionalState = this.emotions.getState();
    console.log(`   💭 Current mood: ${emotionalState.state} (${emotionalState.intensity.toFixed(2)})`);

    // Log outcome stats periodically
    if (this.cycleCount % 3 === 0) {
      const outcomeStats = await this.outcomes.getStats();
      if (outcomeStats) {
        console.log(`   📈 Outcome stats: ${outcomeStats.pendingCount} pending, avg score: ${outcomeStats.averageScore?.toFixed(2) || 'n/a'}`);
      }
    }

    // === BRICK SQUAD INTEGRATION ===

    // Update cycle stats with ending mood
    this.cycleStats.ending_mood = emotionalState.state;

    // BRICK/kcirB reflects on the whole cycle
    if (this.cycleStats.actions_taken > 0) {
      console.log('   🌙 BRICK/kcirB reflecting on cycle...');
      const cycleReflection = await this.squad.reflect({
        type: 'cycle',
        target: `cycle_${this.cycleCount}`,
        action: `${this.cycleStats.actions_taken} actions, ${this.cycleStats.skipped} skips`
      }, {
        engagement: this.cycleStats.actions_taken,
        skips: this.cycleStats.skipped,
        approvals: this.cycleStats.wise_approvals,
        rejections: this.cycleStats.wise_rejections
      });

      this.cycleStats.reflection = cycleReflection;

      if (cycleReflection.drift_warnings?.length > 0) {
        console.log(`   ⚠️  Drift warnings: ${cycleReflection.drift_warnings.map(w => w.area).join(', ')}`);
      }
    }

    // Log cycle to brick_log
    await this.squad.logCycle(this.cycleStats);

    // Generate weekly digest periodically (every 50 cycles or ~25 hours at 30min intervals)
    if (this.cycleCount % 50 === 0) {
      console.log('   📊 Generating weekly digest...');
      try {
        const digestResult = await this.digest.generate();
        if (digestResult) {
          console.log(`   📄 Digest saved: ${digestResult.filepath}`);
          console.log(`   📊 Drift level: ${digestResult.drift}`);
        }
      } catch (error) {
        console.error('   ❌ Digest generation error:', error.message);
      }
    }
  }

  extractResearchQuery(text) {
    // Extract a good search query from the tweet
    // Remove @mentions, clean up
    return text
      .replace(/@\w+/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim()
      .substring(0, 100);
  }

  // === SCHEDULING ===

  async start(intervalMinutes = 30) {
    await this.initialize();

    this.isRunning = true;

    // Run immediately
    await this.runCycle();

    // Then on interval
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`\n⏰ Next cycle in ${intervalMinutes} minutes...`);

    setInterval(async () => {
      if (this.isRunning) {
        // === CREATIVE LOOP DURING SLEEP ===
        // Builder works on content while Brick rests
        console.log('\n💤 Brick is resting... Builder is creating...');
        await this.runCreativeSession();

        // Add some randomness (±5 minutes)
        const jitter = (Math.random() - 0.5) * 10 * 60 * 1000;
        await this.sleep(jitter);

        await this.runCycle();
        console.log(`\n⏰ Next cycle in ~${intervalMinutes} minutes...`);
      }
    }, intervalMs);
  }

  // === CREATIVE SESSION (runs during sleep) ===

  async runCreativeSession() {
    try {
      // Run creative loop for 10 minutes max
      const results = await this.creative.runCreativeSession(10);

      // Capture any sparks from recent scout reports
      for (const report of this.cycleStats.scout_reports || []) {
        if (report.spark_level >= 7 && report.curiosity_trigger) {
          await this.creative.captureSpark({
            type: 'observation',
            content: report.curiosity_trigger,
            source: 'scout',
            emotion: report.vibe,
            curiosity_score: report.spark_level / 10,
            depth: report.spark_level >= 9 ? 'deep' : 'medium'
          });
        }
      }

      // Check if we have content ready to post
      const readyPosts = await this.creative.getReadyToPost(1);
      if (readyPosts.length > 0 && Math.random() < 0.3) { // 30% chance to post queued content
        const post = readyPosts[0];
        console.log(`📮 Posting queued content: "${post.content.substring(0, 50)}..."`);

        // Post it
        const tweetId = await this.twitter.tweet(post.content);
        if (tweetId) {
          await this.creative.markPosted(post.id, tweetId);
          console.log(`✅ Posted queued content: ${tweetId}`);
        }
      }

      return results;
    } catch (error) {
      console.error('Creative session error:', error.message);
      return null;
    }
  }

  stop() {
    this.isRunning = false;
    console.log('\n🛑 Brick is going to sleep...');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// === RUN BRICK ===

const brick = new Brick();

// Handle graceful shutdown
process.on('SIGINT', () => {
  brick.stop();
  process.exit();
});

// Start with 30 minute cycles
brick.start(30);

module.exports = { Brick };
