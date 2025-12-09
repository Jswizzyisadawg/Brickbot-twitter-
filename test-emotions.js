// === TEST EMOTIONAL INTELLIGENCE ===
// Quick test of the emotional processing system

require('dotenv').config();
const { BrickEmotions, EMOTIONAL_STATES } = require('./src/emotions');
const { BrickCore } = require('./src/core');

async function testEmotions() {
  console.log('\n🧪 TESTING BRICK\'S EMOTIONAL INTELLIGENCE\n');
  console.log('='.repeat(60));

  const emotions = new BrickEmotions();
  const core = new BrickCore();

  // Initialize
  await emotions.initialize();
  core.loadConstitution();

  console.log('\n📊 Available Emotional States:');
  for (const [name, state] of Object.entries(EMOTIONAL_STATES)) {
    console.log(`   ${name}: ${state.description}`);
  }

  // Test stimuli
  const testStimuli = [
    {
      type: 'tweet',
      content: 'What if consciousness is just pattern recognition all the way down?',
      author: 'curious_mind',
      id: 'test1'
    },
    {
      type: 'tweet',
      content: 'This connection between mycelium networks and neural pathways blows my mind. Nature figured it out first.',
      author: 'nature_ai',
      id: 'test2'
    },
    {
      type: 'tweet',
      content: 'AI will destroy humanity. Wake up people!!! 🔥🔥🔥',
      author: 'doom_poster',
      id: 'test3'
    },
    {
      type: 'tweet',
      content: 'lol what if the first AGI just wants to make art and we\'re all worried for nothing',
      author: 'playful_thinker',
      id: 'test4'
    },
    {
      type: 'tweet',
      content: 'I don\'t understand how transformers work. Can someone explain attention mechanisms?',
      author: 'learning_dev',
      id: 'test5'
    }
  ];

  console.log('\n🧠 Testing Emotional Responses:\n');
  console.log('-'.repeat(60));

  for (const stimulus of testStimuli) {
    console.log(`\n📥 Stimulus from @${stimulus.author}:`);
    console.log(`   "${stimulus.content.substring(0, 60)}..."`);

    // Process emotional response
    const response = await emotions.processStimulus(stimulus);

    console.log(`\n   💭 Emotional Response:`);
    console.log(`      State: ${response.newState} (was: ${response.previousState})`);
    console.log(`      Intensity: ${response.intensity.toFixed(2)}`);
    console.log(`      Suggested action: ${response.suggestedDecision}`);
    console.log(`      Reasoning: ${response.reasoning}`);

    // Get prompt modifier
    const promptMod = emotions.getPromptModifier();
    console.log(`\n   📝 Prompt modifier preview:`);
    console.log(`      ${promptMod.split('\n')[0]}...`);

    // Test with core evaluation
    console.log(`\n   🔍 Core evaluation with emotional context:`);
    const evaluation = await core.evaluateCuriosity(stimulus.content, promptMod);
    console.log(`      Domain match: ${evaluation.domainMatch}`);
    console.log(`      Spark level: ${evaluation.sparkLevel}/10`);
    console.log(`      Should engage: ${evaluation.shouldEngage}`);
    console.log(`      Engagement type: ${evaluation.engagementType}`);
    console.log(`      Reason: ${evaluation.reason}`);

    console.log('\n' + '-'.repeat(60));

    // Brief pause between tests
    await new Promise(r => setTimeout(r, 1000));
  }

  // Test emotional state persistence
  console.log('\n📊 Final Emotional State:');
  const finalState = emotions.getState();
  console.log(`   State: ${finalState.state}`);
  console.log(`   Intensity: ${finalState.intensity.toFixed(2)}`);
  console.log(`   Info: ${finalState.info.description}`);

  console.log('\n✅ Emotional intelligence test complete!\n');
}

testEmotions().catch(console.error);
