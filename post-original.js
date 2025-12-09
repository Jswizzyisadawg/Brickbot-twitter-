// === POST ONE ORIGINAL THOUGHT ===
// Quick script to have Brick post something right now

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickTwitter } = require('./src/twitter');
const { BrickMemory } = require('./src/memory');
const { BrickJournal } = require('./src/journal');

async function postOriginal() {
  console.log('\n🧱 BRICK - POSTING ORIGINAL THOUGHT\n');
  console.log('='.repeat(50));

  const core = new BrickCore();
  const twitter = new BrickTwitter();
  const memory = new BrickMemory();
  const journal = new BrickJournal();

  core.loadConstitution();
  await memory.initialize();
  await journal.initialize();

  const twitterReady = await twitter.initialize();
  if (!twitterReady) {
    console.error('❌ Twitter not ready');
    return;
  }

  console.log('\n💭 Generating thought...\n');
  await journal.setMood('contemplative');

  // Get recent memories for context
  const recentMemories = await memory.getAllMemories();
  const memoryContext = recentMemories.slice(0, 5).map(m => `- ${m.memory}`).join('\n');

  const prompt = `What's something genuine I want to share right now? Maybe a question I'm curious about, an observation about AI and humanity, or something I've been thinking about lately. Keep it authentic, not performative.

${memoryContext ? `Recent context:\n${memoryContext}` : ''}`;

  const thought = await core.respond(prompt, 'original');

  console.log('📝 Generated thought:');
  console.log(`"${thought}"\n`);

  // Check guardrails
  const guardrails = await core.checkGuardrails(thought);

  if (!guardrails.passesGuardrails) {
    console.log('⚠️  Guardrails blocked this thought');
    console.log('Concerns:', guardrails.concerns?.join(', '));
    return;
  }

  console.log('✅ Guardrails passed\n');

  // Post it!
  console.log('📤 Posting to Twitter...\n');
  const result = await twitter.tweet(thought);

  if (result) {
    console.log('='.repeat(50));
    console.log('🎉 POSTED SUCCESSFULLY!');
    console.log('='.repeat(50));
    console.log(`\n"${thought}"\n`);

    // Log to journal
    await journal.logAction({
      type: 'original',
      response: thought,
      why: 'Manual post via post-original.js',
      guardrails
    });

    // Remember this post
    await memory.rememberPost(thought);

    console.log('Check @Brickthee on Twitter!\n');
  } else {
    console.log('❌ Failed to post');
  }
}

postOriginal().catch(console.error);
