// === DELETE ALL TWEETS ===
// Clears Brick's timeline for a fresh start

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

const RATE_LIMIT_DELAY = 1000; // 1 second between deletes
const BATCH_PAUSE = 60000; // 1 minute pause every 50 deletes

async function deleteAllTweets() {
  console.log('\n🧹 BRICK TWEET CLEANER\n');
  console.log('='.repeat(60));

  // Initialize client
  let client;

  try {
    const baseClient = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    // Refresh the token first
    console.log('🔑 Refreshing access token...');
    const { client: refreshedClient, accessToken, refreshToken } =
      await baseClient.refreshOAuth2Token(process.env.TWITTER_REFRESH_TOKEN);

    client = refreshedClient;
    console.log('✅ Token refreshed successfully\n');

    // Save new tokens for later
    console.log('💾 New tokens (save these if needed):');
    console.log(`   TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`   TWITTER_REFRESH_TOKEN=${refreshToken}\n`);

  } catch (error) {
    console.error('❌ Failed to initialize Twitter client:', error.message);
    console.log('\nYou may need to re-authenticate. Run: node setup-oauth.js');
    return;
  }

  // Get user info
  const me = await client.v2.me();
  const userId = me.data.id;
  console.log(`👤 Logged in as @${me.data.username} (ID: ${userId})\n`);

  // Fetch all tweets
  console.log('📥 Fetching your tweets...\n');

  let allTweets = [];
  let paginationToken = undefined;
  let page = 1;

  try {
    do {
      const timeline = await client.v2.userTimeline(userId, {
        max_results: 100,
        pagination_token: paginationToken,
        exclude: ['retweets'], // We'll handle retweets separately
      });

      if (timeline.data?.data) {
        allTweets = allTweets.concat(timeline.data.data);
        console.log(`   Page ${page}: Found ${timeline.data.data.length} tweets (Total: ${allTweets.length})`);
      }

      paginationToken = timeline.data?.meta?.next_token;
      page++;

      // Small delay between pagination requests
      if (paginationToken) {
        await sleep(500);
      }

    } while (paginationToken);

  } catch (error) {
    console.error('Error fetching tweets:', error.message);
    if (error.code === 429) {
      console.log('Rate limited while fetching. Waiting 15 minutes...');
      await sleep(15 * 60 * 1000);
    }
  }

  if (allTweets.length === 0) {
    console.log('\n✨ No tweets found! Timeline is already clean.\n');
    return;
  }

  console.log(`\n📊 Found ${allTweets.length} total tweets to delete\n`);
  console.log('='.repeat(60));
  console.log('🗑️  Starting deletion...\n');

  let deleted = 0;
  let failed = 0;
  let rateLimited = 0;

  for (let i = 0; i < allTweets.length; i++) {
    const tweet = allTweets[i];

    try {
      await client.v2.deleteTweet(tweet.id);
      deleted++;

      const preview = tweet.text.substring(0, 50).replace(/\n/g, ' ');
      console.log(`   ✓ [${deleted}/${allTweets.length}] Deleted: "${preview}..."`);

      // Rate limit handling
      await sleep(RATE_LIMIT_DELAY);

      // Pause every 50 deletes to avoid rate limits
      if (deleted % 50 === 0 && deleted < allTweets.length) {
        console.log(`\n   ⏸️  Pausing for 1 minute to avoid rate limits...\n`);
        await sleep(BATCH_PAUSE);
      }

    } catch (error) {
      if (error.code === 429) {
        rateLimited++;
        console.log(`   ⚠️  Rate limited! Waiting 15 minutes...`);
        await sleep(15 * 60 * 1000);
        i--; // Retry this tweet
      } else {
        failed++;
        console.log(`   ✗ Failed to delete ${tweet.id}: ${error.message}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 DELETION COMPLETE\n');
  console.log(`   ✓ Deleted: ${deleted}`);
  console.log(`   ✗ Failed: ${failed}`);
  console.log(`   ⚠️  Rate limit pauses: ${rateLimited}`);
  console.log('\n🧱 Brick has a clean slate!\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run it
deleteAllTweets().catch(console.error);
