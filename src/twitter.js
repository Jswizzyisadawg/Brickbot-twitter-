// === BRICK'S TWITTER INTERFACE ===
// Eyes, voice, and hands on X
// Tokens stored in Supabase for persistence across deploys

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');

class BrickTwitter {
  constructor() {
    this.client = null;
    this.me = null;
    this.supabase = null;
  }

  async initialize() {
    try {
      // Initialize Supabase for token storage
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        this.supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );
      }

      // Try to get tokens from Supabase first, fall back to env vars
      let tokens = await this.getTokensFromSupabase();

      if (!tokens) {
        // Fall back to env vars (for initial setup or local dev)
        tokens = {
          accessToken: process.env.TWITTER_ACCESS_TOKEN,
          refreshToken: process.env.TWITTER_REFRESH_TOKEN,
          expiresAt: parseInt(process.env.TWITTER_TOKEN_EXPIRES) || 0
        };
      }

      if (!tokens.refreshToken && !tokens.accessToken) {
        throw new Error('No Twitter tokens found. Run: node setup-twitter-auth.js');
      }

      // Check if token is expired or will expire soon (within 5 min)
      const needsRefresh = !tokens.accessToken ||
                           Date.now() > (tokens.expiresAt - 5 * 60 * 1000);

      if (needsRefresh && tokens.refreshToken) {
        console.log('🔄 Refreshing Twitter tokens...');
        tokens = await this.refreshTokens(tokens.refreshToken);

        if (tokens) {
          await this.saveTokensToSupabase(tokens);
          console.log('✅ Tokens refreshed and saved');
        }
      }

      if (!tokens || !tokens.accessToken) {
        throw new Error('Failed to get valid access token');
      }

      // Create authenticated client
      this.client = new TwitterApi(tokens.accessToken);

      // Verify connection
      this.me = await this.client.v2.me();
      console.log(`👁️  Twitter connected as @${this.me.data.username}`);

      return true;

    } catch (error) {
      console.error('Twitter initialization failed:', error.message);

      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('💡 Tokens may be invalid. Run: node setup-twitter-auth.js');
      }

      return false;
    }
  }

  // Get tokens from Supabase
  async getTokensFromSupabase() {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('brick_tokens')
        .select('*')
        .eq('id', 'twitter')
        .single();

      if (error || !data) return null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_at,
        userId: data.user_id,
        username: data.username
      };
    } catch (err) {
      console.warn('Could not read tokens from Supabase:', err.message);
      return null;
    }
  }

  // Save tokens to Supabase
  async saveTokensToSupabase(tokens) {
    if (!this.supabase) {
      console.warn('Supabase not configured - tokens not persisted');
      return false;
    }

    try {
      const { error } = await this.supabase
        .from('brick_tokens')
        .upsert({
          id: 'twitter',
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: tokens.expiresAt,
          user_id: tokens.userId || null,
          username: tokens.username || null
        });

      if (error) throw error;
      return true;

    } catch (err) {
      console.error('Failed to save tokens to Supabase:', err.message);
      return false;
    }
  }

  // Refresh tokens using refresh token
  async refreshTokens(refreshToken) {
    try {
      const client = new TwitterApi({
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      });

      const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn
      } = await client.refreshOAuth2Token(refreshToken);

      // Get user info
      const me = await refreshedClient.v2.me();

      return {
        accessToken,
        refreshToken: newRefreshToken,
        expiresAt: Date.now() + (expiresIn * 1000),
        userId: me.data.id,
        username: me.data.username
      };

    } catch (error) {
      console.error('Token refresh failed:', error.message);
      return null;
    }
  }

  // Proactive token refresh - call this every cycle to keep tokens warm
  // This prevents refresh token invalidation from inactivity
  async keepTokensFresh() {
    if (!this.supabase) return false;

    try {
      const tokens = await this.getTokensFromSupabase();
      if (!tokens || !tokens.refreshToken) {
        console.warn('⚠️ No refresh token available');
        return false;
      }

      // Refresh if token is older than 1 hour (proactive, not waiting for expiry)
      const tokenAge = Date.now() - (tokens.expiresAt - 2 * 60 * 60 * 1000); // expiresAt is 2hrs after creation
      const oneHour = 60 * 60 * 1000;

      if (tokenAge > oneHour) {
        console.log('🔄 Proactively refreshing tokens (keeping them warm)...');
        const newTokens = await this.refreshTokens(tokens.refreshToken);

        if (newTokens) {
          await this.saveTokensToSupabase(newTokens);
          // Update the current client with new token
          this.client = new TwitterApi(newTokens.accessToken);
          console.log('✅ Tokens refreshed proactively');
          return true;
        } else {
          console.warn('⚠️ Proactive refresh failed - tokens may expire soon');
          return false;
        }
      }

      return true; // Tokens still fresh
    } catch (error) {
      console.error('Error in proactive token refresh:', error.message);
      return false;
    }
  }

  // === EYES: Reading ===

  async getTimeline(count = 20) {
    if (!this.client) return [];

    try {
      const timeline = await this.client.v2.homeTimeline({
        max_results: Math.min(count, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'attachments'],
        'user.fields': ['username', 'name', 'description'],
        'media.fields': ['url', 'preview_image_url', 'type', 'alt_text'],
        expansions: ['author_id', 'attachments.media_keys']
      });

      return this.formatTweets(timeline);
    } catch (error) {
      console.error('Error getting timeline:', error.message);
      return [];
    }
  }

  async getMentions(count = 20) {
    if (!this.client || !this.me) return [];

    try {
      const mentions = await this.client.v2.userMentionTimeline(this.me.data.id, {
        max_results: Math.min(count, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id', 'attachments'],
        'user.fields': ['username', 'name', 'description'],
        'media.fields': ['url', 'preview_image_url', 'type', 'alt_text'],
        expansions: ['author_id', 'attachments.media_keys']
      });

      return this.formatTweets(mentions);
    } catch (error) {
      console.error('Error getting mentions:', error.message);
      return [];
    }
  }

  async search(query, count = 20) {
    if (!this.client) return [];

    try {
      const results = await this.client.v2.search(query, {
        max_results: Math.min(count, 100),
        'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
        'user.fields': ['username', 'name'],
        expansions: ['author_id']
      });

      return this.formatTweets(results);
    } catch (error) {
      console.error('Error searching:', error.message);
      return [];
    }
  }

  formatTweets(response) {
    if (!response.data?.data) return [];

    const users = {};
    if (response.data.includes?.users) {
      response.data.includes.users.forEach(u => {
        users[u.id] = u;
      });
    }

    // Build media lookup
    const media = {};
    if (response.data.includes?.media) {
      response.data.includes.media.forEach(m => {
        media[m.media_key] = {
          type: m.type,  // 'photo', 'video', 'animated_gif'
          url: m.url || m.preview_image_url,
          altText: m.alt_text
        };
      });
    }

    return response.data.data.map(tweet => {
      // Get media for this tweet
      const tweetMedia = [];
      if (tweet.attachments?.media_keys) {
        tweet.attachments.media_keys.forEach(key => {
          if (media[key]) {
            tweetMedia.push(media[key]);
          }
        });
      }

      return {
        id: tweet.id,
        text: tweet.text,
        author: users[tweet.author_id]?.username || 'unknown',
        authorName: users[tweet.author_id]?.name || 'Unknown',
        authorBio: users[tweet.author_id]?.description || '',
        authorId: tweet.author_id,
        createdAt: tweet.created_at,
        metrics: tweet.public_metrics,
        media: tweetMedia,  // Array of { type, url, altText }
        hasMedia: tweetMedia.length > 0,
        hasImage: tweetMedia.some(m => m.type === 'photo'),
        hasVideo: tweetMedia.some(m => m.type === 'video' || m.type === 'animated_gif')
      };
    });
  }

  // === VOICE: Posting ===

  async tweet(content) {
    if (!this.client) return null;

    try {
      const result = await this.client.v2.tweet(content);
      console.log(`📤 Posted tweet: ${content.substring(0, 50)}...`);
      return result;
    } catch (error) {
      console.error('Error posting tweet:', error.message);
      return null;
    }
  }

  async reply(tweetId, content) {
    if (!this.client) return null;

    try {
      const result = await this.client.v2.reply(content, tweetId);
      console.log(`💬 Replied to ${tweetId}: ${content.substring(0, 50)}...`);
      return result;
    } catch (error) {
      console.error('Error replying:', error.message);
      return null;
    }
  }

  async quote(tweetId, content) {
    if (!this.client) return null;

    try {
      const result = await this.client.v2.tweet({
        text: content,
        quote_tweet_id: tweetId
      });
      console.log(`🔄 Quoted ${tweetId}: ${content.substring(0, 50)}...`);
      return result;
    } catch (error) {
      console.error('Error quoting:', error.message);
      return null;
    }
  }

  // === HANDS: Engagement ===

  async like(tweetId) {
    if (!this.client || !this.me) return false;

    try {
      await this.client.v2.like(this.me.data.id, tweetId);
      console.log(`❤️  Liked tweet ${tweetId}`);
      return true;
    } catch (error) {
      console.error('Error liking:', error.message);
      return false;
    }
  }

  async follow(userId) {
    if (!this.client || !this.me) return false;

    try {
      await this.client.v2.follow(this.me.data.id, userId);
      console.log(`➕ Followed user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error following:', error.message);
      return false;
    }
  }

  async unfollow(userId) {
    if (!this.client || !this.me) return false;

    try {
      await this.client.v2.unfollow(this.me.data.id, userId);
      console.log(`➖ Unfollowed user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error unfollowing:', error.message);
      return false;
    }
  }

  async getUser(username) {
    if (!this.client) return null;

    try {
      const user = await this.client.v2.userByUsername(username, {
        'user.fields': ['description', 'public_metrics', 'created_at']
      });
      return user.data;
    } catch (error) {
      console.error('Error getting user:', error.message);
      return null;
    }
  }
}

module.exports = { BrickTwitter };
