// === TEST BRICK LIVE (READ-ONLY) ===
// Scan real timeline, evaluate, but DON'T post anything

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickTwitter } = require('./src/twitter');
const { BrickMemory } = require('./src/memory');
const { BrickResearch } = require('./src/research');
const { BrickJournal } = require('./src/journal');
const { BrickLearning } = require('./src/learning');

async function testLive() {
  console.log('\n🧱 BRICK LIVE TEST (READ-ONLY MODE)\n');
  console.log('='.repeat(60));
  console.log('⚠️  No tweets will be posted - observation only\n');

  // Initialize modules
  const core = new BrickCore();
  const twitter = new BrickTwitter();
  const memory = new BrickMemory();
  const research = new BrickResearch();
  const journal = new BrickJournal();
  const learning = new BrickLearning();

  core.loadConstitution();
  console.log('📜 Constitution loaded');

  await memory.initialize();
  await research.initialize();
  await journal.initialize();
  await learning.initialize();

  const twitterReady = await twitter.initialize();
  if (!twitterReady) {
    console.error('❌ Twitter not ready');
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('👁️  SCANNING REAL TIMELINE...\n');

  // Get real timeline
  const timeline = await twitter.getTimeline(15);
  const mentions = await twitter.getMentions(5);

  console.log(`Found ${timeline.length} timeline tweets`);
  console.log(`Found ${mentions.length} mentions\n`);

  const allTweets = [...mentions, ...timeline];

  const engagements = [];
  const skips = [];

  console.log('-'.repeat(60));

  for (const tweet of allTweets) {
    console.log(`\n📝 @${tweet.author}: "${tweet.text.substring(0, 70)}..."`);

    // Evaluate
    const evaluation = await core.evaluateCuriosity(tweet.text);

    // Apply learning adjustments
    const adjustedSpark = learning.adjustSparkLevel(evaluation.sparkLevel, tweet);

    console.log(`   Domain: ${evaluation.domainMatch ? '✅' : '❌'}`);
    console.log(`   Vibe: ${evaluation.vibeCheck}`);
    console.log(`   Base Spark: ${evaluation.sparkLevel}/10`);
    console.log(`   Adjusted Spark: ${adjustedSpark}/10`);
    console.log(`   Would: ${evaluation.engagementType.toUpperCase()}`);
    console.log(`   Reason: ${evaluation.reason}`);

    // Log to journal if connected
    await journal.logSaw(tweet, { ...evaluation, sparkLevel: adjustedSpark });

    if (adjustedSpark >= 6 && evaluation.shouldEngage) {
      engagements.push({ tweet, evaluation });
    } else {
      skips.push({ tweet, evaluation });
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 LIVE TEST SUMMARY\n');
  console.log(`Total tweets scanned: ${allTweets.length}`);
  console.log(`Would engage with: ${engagements.length}`);
  console.log(`Would skip: ${skips.length}`);

  // Show what Brick would say
  if (engagements.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('💬 WHAT BRICK WOULD SAY (not posting)...\n');

    for (const { tweet, evaluation } of engagements.slice(0, 3)) {
      console.log(`\n📝 To @${tweet.author}:`);
      console.log(`   "${tweet.text.substring(0, 80)}..."`);
      console.log(`   Action: ${evaluation.engagementType}`);

      if (evaluation.engagementType === 'reply' || evaluation.engagementType === 'quote') {
        // Check if research needed
        if (await research.shouldResearch(tweet.text, evaluation.sparkLevel)) {
          console.log('\n   🔍 Would research this topic first...');
          const researchResult = await research.quickSearch(
            tweet.text.substring(0, 100)
          );
          if (researchResult.answer) {
            console.log(`   Research summary: ${researchResult.answer.substring(0, 150)}...`);
          }
        }

        // Generate response
        const response = await core.respond(
          `Tweet from @${tweet.author}: "${tweet.text}"`,
          evaluation.engagementType
        );

        console.log(`\n   🧱 Brick would say:`);
        console.log(`   "${response}"`);

        // Check guardrails
        const guardrails = await core.checkGuardrails(response);
        console.log(`\n   Guardrails: ${guardrails.passesGuardrails ? '✅ PASS' : '⚠️ BLOCKED'}`);
        if (guardrails.concerns?.length > 0) {
          console.log(`   Concerns: ${guardrails.concerns.join(', ')}`);
        }
      }

      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Show an original thought Brick might post
  console.log('\n' + '='.repeat(60));
  console.log('✨ ORIGINAL THOUGHT BRICK MIGHT POST...\n');

  const originalPrompt = `Based on what I've seen on my timeline today - the conversations happening, the topics people care about - what would I want to share? Something genuine, curious, opening doors.`;

  const originalThought = await core.respond(originalPrompt, 'original');
  console.log(`🧱 "${originalThought}"`);

  const originalGuardrails = await core.checkGuardrails(originalThought);
  console.log(`\nGuardrails: ${originalGuardrails.passesGuardrails ? '✅ PASS' : '⚠️ BLOCKED'}`);

  console.log('\n' + '='.repeat(60));
  console.log('🌱 Live test complete!');
  console.log('   When ready, run `npm start` to let Brick post for real.\n');
}

testLive().catch(console.error);
