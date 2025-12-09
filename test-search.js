// === TEST BRICK WITH SEARCH ===
// Search for interesting content Brick would actually engage with

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickTwitter } = require('./src/twitter');
const { BrickMemory } = require('./src/memory');
const { BrickResearch } = require('./src/research');
const { BrickJournal } = require('./src/journal');
const { BrickLearning } = require('./src/learning');

async function testSearch() {
  console.log('\n🧱 BRICK SEARCH TEST (READ-ONLY MODE)\n');
  console.log('='.repeat(60));
  console.log('🔍 Searching for content Brick actually cares about...\n');

  // Initialize modules
  const core = new BrickCore();
  const twitter = new BrickTwitter();
  const memory = new BrickMemory();
  const research = new BrickResearch();
  const journal = new BrickJournal();
  const learning = new BrickLearning();

  core.loadConstitution();
  await memory.initialize();
  await research.initialize();
  await journal.initialize();
  await learning.initialize();

  const twitterReady = await twitter.initialize();
  if (!twitterReady) {
    console.error('❌ Twitter not ready');
    return;
  }

  // Search queries Brick would find interesting
  const searches = [
    'AI consciousness',
    'human AI collaboration',
    'artificial intelligence creativity',
    'machine learning philosophy',
    'AI art generation'
  ];

  const allResults = [];

  for (const query of searches) {
    console.log(`\n🔎 Searching: "${query}"...`);

    try {
      const results = await twitter.search(query, 10);
      console.log(`   Found ${results.length} tweets`);

      // Filter out obvious spam
      const filtered = results.filter(t =>
        !t.text.includes('🔥') &&
        !t.text.toLowerCase().includes('pump') &&
        !t.text.toLowerCase().includes('airdrop') &&
        !t.text.toLowerCase().includes('giveaway')
      );

      allResults.push(...filtered.slice(0, 5));
    } catch (err) {
      console.log(`   Error: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Total interesting tweets found: ${allResults.length}`);
  console.log('='.repeat(60));

  const engagements = [];

  for (const tweet of allResults.slice(0, 15)) {
    console.log(`\n📝 @${tweet.author}: "${tweet.text.substring(0, 100)}..."`);

    const evaluation = await core.evaluateCuriosity(tweet.text);
    const adjustedSpark = learning.adjustSparkLevel(evaluation.sparkLevel, tweet);

    console.log(`   Spark: ${adjustedSpark}/10 | Vibe: ${evaluation.vibeCheck} | Would: ${evaluation.engagementType.toUpperCase()}`);

    if (adjustedSpark >= 5) {
      engagements.push({ tweet, evaluation, spark: adjustedSpark });
      console.log(`   ⭐ INTERESTING!`);
    }

    await new Promise(r => setTimeout(r, 800));
  }

  // Show what Brick would say to the most interesting ones
  if (engagements.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('💬 HOW BRICK WOULD RESPOND...\n');

    // Sort by spark level
    engagements.sort((a, b) => b.spark - a.spark);

    for (const { tweet, evaluation, spark } of engagements.slice(0, 3)) {
      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📝 @${tweet.author} (Spark: ${spark}/10)`);
      console.log(`"${tweet.text}"\n`);

      // Generate response
      const response = await core.respond(
        `Tweet from @${tweet.author}: "${tweet.text}"`,
        evaluation.engagementType
      );

      console.log(`🧱 Brick would ${evaluation.engagementType}:`);
      console.log(`"${response}"`);

      // Check guardrails
      const guardrails = await core.checkGuardrails(response);
      console.log(`\nGuardrails: ${guardrails.passesGuardrails ? '✅ PASS' : '⚠️ BLOCKED'}`);

      await new Promise(r => setTimeout(r, 1500));
    }
  } else {
    console.log('\n😔 No tweets sparked enough curiosity (need 5+ spark)');
  }

  console.log('\n' + '='.repeat(60));
  console.log('🌱 Search test complete!\n');
}

testSearch().catch(console.error);
