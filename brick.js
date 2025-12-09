// === BRICK - THE LIVING AI ===
// Main orchestrator that brings everything together

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickTwitter } = require('./src/twitter');
const { BrickMemory } = require('./src/memory');
const { BrickResearch } = require('./src/research');
const { BrickJournal } = require('./src/journal');
const { BrickLearning } = require('./src/learning');
const { BrickEmotions } = require('./src/emotions');

class Brick {
  constructor() {
    this.core = new BrickCore();
    this.twitter = new BrickTwitter();
    this.memory = new BrickMemory();
    this.research = new BrickResearch();
    this.journal = new BrickJournal();
    this.learning = new BrickLearning();
    this.emotions = new BrickEmotions();

    this.isRunning = false;
    this.lastWakeTime = null;
    this.cycleCount = 0;
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

    try {
      // 1. WAKE
      await this.journal.updateStatus('waking');
      await this.journal.setMood('scanning');

      // 2. SCAN TIMELINE
      console.log('\n👁️  Scanning timeline...');
      await this.journal.updateStatus('scanning');

      const timeline = await this.twitter.getTimeline(20);
      const mentions = await this.twitter.getMentions(10);

      const allTweets = [...mentions, ...timeline];
      console.log(`   Found ${allTweets.length} tweets to evaluate`);

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
        } else {
          skips.push({ tweet, evaluation, thoughtId });
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

      // 5. MAYBE POST ORIGINAL THOUGHT
      if (Math.random() < 0.2) { // 20% chance each cycle
        await this.maybePostOriginal();
      }

      // 6. REFLECT
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
    const emotionalEventId = await this.emotions.recordEmotionalEvent({
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

    // 4h. UPDATE RELATIONSHIP
    await this.emotions.updateRelationship({
      id: tweet.authorId,
      username: tweet.author
    });

    await this.journal.setMood('connected');

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
      await this.emotions.recordEmotionalEvent({
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
    }
  }

  async reflect() {
    // Quick reflection at end of cycle
    const reflection = await this.learning.dailyReflection();

    if (reflection && reflection.stats) {
      console.log('\n🪞 Quick reflection:');
      console.log(`   Total interactions today: ${reflection.stats.total_interactions}`);
    }

    // Learn from emotional outcomes periodically
    if (this.cycleCount % 5 === 0) {
      console.log('   📊 Analyzing emotional patterns...');
      await this.emotions.learnFromOutcomes();
    }

    // Log current emotional state
    const emotionalState = this.emotions.getState();
    console.log(`   💭 Current mood: ${emotionalState.state} (${emotionalState.intensity.toFixed(2)})`);
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
        // Add some randomness (±5 minutes)
        const jitter = (Math.random() - 0.5) * 10 * 60 * 1000;
        await this.sleep(jitter);

        await this.runCycle();
        console.log(`\n⏰ Next cycle in ~${intervalMinutes} minutes...`);
      }
    }, intervalMs);
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
