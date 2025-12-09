// Test Twitter actions: like, reply, follow
require('dotenv').config();
const { BrickTwitter } = require('./src/twitter');
const { BrickCore } = require('./src/core');

async function testActions() {
  console.log('🧪 Testing Brick Twitter Actions\n');

  const twitter = new BrickTwitter();
  const core = new BrickCore();

  // Initialize
  const ready = await twitter.initialize();
  if (!ready) {
    console.log('❌ Twitter not ready');
    return;
  }

  core.loadConstitution();

  // Get a recent tweet from timeline to interact with
  console.log('\n📋 Getting a tweet to test with...');
  const timeline = await twitter.getTimeline(5);

  if (timeline.length === 0) {
    console.log('❌ No tweets found');
    return;
  }

  // Find a good tweet to test with (not our own)
  const testTweet = timeline.find(t => t.author !== 'Brickthee');

  if (!testTweet) {
    console.log('❌ No external tweets to test with');
    return;
  }

  console.log(`\n📄 Test tweet from @${testTweet.author}:`);
  console.log(`   "${testTweet.text.substring(0, 80)}..."`);
  console.log(`   ID: ${testTweet.id}`);

  // TEST 1: Like
  console.log('\n❤️  Testing LIKE...');
  const likeResult = await twitter.like(testTweet.id);
  console.log(`   Result: ${likeResult ? '✅ Success' : '❌ Failed'}`);

  // TEST 2: Reply
  console.log('\n💬 Testing REPLY...');

  // Generate a Brick-style reply
  const replyPrompt = `Tweet from @${testTweet.author}: "${testTweet.text}"

Write a brief, curious reply as Brick. Keep it short and genuine.`;

  const replyContent = await core.respond(replyPrompt, 'reply');
  console.log(`   Generated: "${replyContent}"`);

  if (replyContent) {
    const replyResult = await twitter.reply(testTweet.id, replyContent);
    console.log(`   Result: ${replyResult ? '✅ Success' : '❌ Failed'}`);
  }

  // TEST 3: Follow (the author)
  console.log('\n➕ Testing FOLLOW...');
  console.log(`   Following @${testTweet.author} (ID: ${testTweet.authorId})`);
  const followResult = await twitter.follow(testTweet.authorId);
  console.log(`   Result: ${followResult ? '✅ Success' : '❌ Failed'}`);

  console.log('\n✅ All action tests complete!');
}

testActions().catch(console.error);
