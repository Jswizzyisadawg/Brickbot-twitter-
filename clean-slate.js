// === BRICK CLEAN SLATE ===
// Delete all old tweets and start fresh

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (q) => new Promise(resolve => rl.question(q, resolve));

const AUTO_CONFIRM = process.argv.includes('--confirm');

async function cleanSlate() {
  console.log('\n🧱 BRICK CLEAN SLATE - Starting Fresh\n');
  console.log('This will delete ALL tweets from the Brick account.');
  console.log('=====================================\n');

  if (AUTO_CONFIRM) {
    console.log('⚠️  Running with --confirm flag (auto-confirm enabled)\n');
  }

  // Check for tokens
  if (!process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_REFRESH_TOKEN) {
    console.log('❌ No Twitter tokens found. Let\'s authenticate first.\n');
    await authenticate();
    return;
  }

  // Try to use existing tokens (with refresh if needed)
  try {
    const client = new TwitterApi({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    });

    // Try to refresh the token
    console.log('🔄 Refreshing access token...');
    const { client: refreshedClient, accessToken, refreshToken } = await client.refreshOAuth2Token(
      process.env.TWITTER_REFRESH_TOKEN
    );

    console.log('✅ Token refreshed!\n');
    console.log('📝 Update your .env with these new tokens:');
    console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`TWITTER_REFRESH_TOKEN=${refreshToken}`);
    console.log(`TWITTER_TOKEN_EXPIRES=${Date.now() + 7200000}\n`);

    await deleteTweets(refreshedClient);

  } catch (error) {
    console.log('❌ Token refresh failed:', error.message);
    console.log('\n🔐 Need to re-authenticate...\n');
    await authenticate();
  }
}

async function authenticate() {
  const client = new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID,
    clientSecret: process.env.TWITTER_CLIENT_SECRET,
  });

  const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
    process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/callback',
    { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
  );

  console.log('🔗 Open this URL in your browser:\n');
  console.log(url);
  console.log('\n');

  const callbackUrl = await question('Paste the full callback URL after authorizing: ');

  // Extract code from callback URL
  const urlParams = new URL(callbackUrl).searchParams;
  const code = urlParams.get('code');

  if (!code) {
    console.log('❌ No code found in URL');
    rl.close();
    return;
  }

  try {
    const { client: authedClient, accessToken, refreshToken } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/callback',
    });

    console.log('\n✅ Authentication successful!\n');
    console.log('📝 Add these to your .env file:');
    console.log(`TWITTER_ACCESS_TOKEN=${accessToken}`);
    console.log(`TWITTER_REFRESH_TOKEN=${refreshToken}`);
    console.log(`TWITTER_TOKEN_EXPIRES=${Date.now() + 7200000}\n`);

    const proceed = await question('Proceed to delete all tweets? (yes/no): ');
    if (proceed.toLowerCase() === 'yes') {
      await deleteTweets(authedClient);
    }

  } catch (error) {
    console.log('❌ Auth failed:', error.message);
  }

  rl.close();
}

async function deleteTweets(client) {
  try {
    // Get user info
    const me = await client.v2.me();
    console.log(`\n👤 Logged in as: @${me.data.username}\n`);

    if (!AUTO_CONFIRM) {
      const confirm = await question(`Delete ALL tweets from @${me.data.username}? Type 'DELETE' to confirm: `);
      if (confirm !== 'DELETE') {
        console.log('Cancelled.');
        rl.close();
        return;
      }
    } else {
      console.log(`🚀 Auto-confirmed: Deleting all tweets from @${me.data.username}`);
    }

    console.log('\n🗑️  Fetching tweets...\n');

    let deleted = 0;
    let nextToken;

    do {
      // Fetch tweets
      const tweets = await client.v2.userTimeline(me.data.id, {
        max_results: 100,
        pagination_token: nextToken,
      });

      if (!tweets.data?.data?.length) {
        console.log('No more tweets found.');
        break;
      }

      // Delete each tweet
      for (const tweet of tweets.data.data) {
        try {
          await client.v2.deleteTweet(tweet.id);
          deleted++;
          console.log(`🗑️  Deleted tweet ${deleted}: "${tweet.text?.substring(0, 50)}..."`);

          // Rate limit: wait a bit between deletes
          await new Promise(r => setTimeout(r, 1000));
        } catch (err) {
          console.log(`⚠️  Couldn't delete tweet ${tweet.id}: ${err.message}`);
        }
      }

      nextToken = tweets.data.meta?.next_token;

    } while (nextToken);

    console.log(`\n✨ Clean slate! Deleted ${deleted} tweets.`);
    console.log('🌱 Brick is ready to grow fresh.\n');

  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  rl.close();
}

cleanSlate();
