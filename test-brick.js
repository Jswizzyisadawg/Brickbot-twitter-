// === TEST BRICK ===
// Run Brick against fake timeline data to see how it behaves

require('dotenv').config();
const { BrickCore } = require('./src/core');
const { BrickMemory } = require('./src/memory');
const { fakeTimeline } = require('./src/test-data');

async function testBrick() {
  console.log('\n🧱 BRICK TEST SIMULATION\n');
  console.log('=' .repeat(60));
  console.log('Testing Brick against simulated timeline data...\n');

  // Initialize Brick's core
  const brick = new BrickCore();
  brick.loadConstitution();

  console.log('📜 Constitution loaded\n');

  // Process each tweet in the fake timeline
  console.log('🔍 SCANNING TIMELINE...\n');
  console.log('-'.repeat(60));

  const engagements = [];
  const skips = [];

  for (const tweet of fakeTimeline) {
    console.log(`\n📝 @${tweet.author}: "${tweet.text.substring(0, 80)}..."`);

    // Evaluate curiosity
    const evaluation = await brick.evaluateCuriosity(tweet.text);

    console.log(`   Domain: ${evaluation.domainMatch ? '✅' : '❌'}`);
    console.log(`   Vibe: ${evaluation.vibeCheck}`);
    console.log(`   Spark: ${evaluation.sparkLevel}/10`);
    console.log(`   Action: ${evaluation.engagementType.toUpperCase()}`);
    console.log(`   Reason: ${evaluation.reason}`);

    if (evaluation.shouldEngage) {
      engagements.push({ tweet, evaluation });
    } else {
      skips.push({ tweet, evaluation });
    }

    // Small delay to avoid rate limiting Claude
    await new Promise(r => setTimeout(r, 1000));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY\n');
  console.log(`Total tweets: ${fakeTimeline.length}`);
  console.log(`Would engage: ${engagements.length}`);
  console.log(`Would skip: ${skips.length}`);

  // Show what Brick would actually say
  if (engagements.length > 0) {
    console.log('\n' + '='.repeat(60));
    console.log('💬 GENERATING RESPONSES...\n');

    for (const { tweet, evaluation } of engagements.slice(0, 3)) {
      console.log(`\n📝 To @${tweet.author}:`);
      console.log(`   "${tweet.text.substring(0, 100)}..."`);
      console.log(`   Action: ${evaluation.engagementType}`);

      if (evaluation.engagementType === 'reply' || evaluation.engagementType === 'quote') {
        const response = await brick.respond(
          `Tweet from @${tweet.author}: "${tweet.text}"`,
          evaluation.engagementType
        );

        console.log(`\n   🧱 Brick would say:`);
        console.log(`   "${response}"`);

        // Check guardrails
        const guardrailCheck = await brick.checkGuardrails(response);
        console.log(`\n   Guardrails: ${guardrailCheck.passesGuardrails ? '✅ PASS' : '⚠️ CONCERNS'}`);
        if (guardrailCheck.concerns?.length > 0) {
          console.log(`   Concerns: ${guardrailCheck.concerns.join(', ')}`);
        }
      }

      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Test original post generation
  console.log('\n' + '='.repeat(60));
  console.log('✨ GENERATING ORIGINAL POST...\n');

  const originalPost = await brick.respond(
    'Based on what I\'ve seen on my timeline today - conversations about AI consciousness, creativity, and the different ways cultures relate to technology - what would I want to share?',
    'original'
  );

  console.log('🧱 Brick\'s original thought:');
  console.log(`"${originalPost}"`);

  const originalGuardrails = await brick.checkGuardrails(originalPost);
  console.log(`\nGuardrails: ${originalGuardrails.passesGuardrails ? '✅ PASS' : '⚠️ CONCERNS'}`);

  console.log('\n' + '='.repeat(60));
  console.log('🌱 Test complete! Brick is ready to grow.\n');
}

// Run the test
testBrick().catch(console.error);
