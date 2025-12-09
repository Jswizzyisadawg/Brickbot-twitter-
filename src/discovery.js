// === BRICK'S DISCOVERY ENGINE ===
// Proactively finds interesting content and people

class BrickDiscovery {
  constructor() {
    // Brick's domains of curiosity
    this.searchTopics = [
      // Core interests
      'AI consciousness',
      'artificial general intelligence',
      'emergent behavior',
      'neural networks insights',

      // Nature & patterns
      'mycelium network',
      'biomimicry',
      'swarm intelligence',
      'collective behavior',

      // Mind & consciousness
      'neuroscience discovery',
      'consciousness research',
      'psychedelics research',
      'altered states',

      // Philosophy & big questions
      'philosophy of mind',
      'what is consciousness',
      'nature of intelligence',
      'human AI collaboration',

      // Tech & humanity
      'AI ethics',
      'future of AI',
      'human machine interface',
      'digital consciousness'
    ];

    // Quality signals for accounts worth following
    this.qualitySignals = {
      minFollowers: 100,        // Not a brand new account
      maxFollowers: 1000000,    // Not a mega celebrity (less likely to interact)
      minTweets: 50,            // Active poster
      hasDescription: true,     // Has a bio
      notBot: true              // Human-like activity
    };

    // Rate limits
    this.maxFollowsPerCycle = 2;   // Don't follow too many at once
    this.maxSearchesPerCycle = 3;  // Don't spam searches

    // Track who we've seen to avoid duplicates
    this.seenUsers = new Set();
    this.seenTweets = new Set();
  }

  // Get a random topic to search for
  getRandomTopic() {
    const idx = Math.floor(Math.random() * this.searchTopics.length);
    return this.searchTopics[idx];
  }

  // Get multiple diverse topics for this cycle
  getSearchTopicsForCycle(count = 3) {
    const shuffled = [...this.searchTopics].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Check if a user is worth following
  evaluateUserQuality(user) {
    const followers = user.public_metrics?.followers_count || 0;
    const tweets = user.public_metrics?.tweet_count || 0;
    const hasDescription = !!user.description && user.description.length > 20;

    // Basic quality checks
    if (followers < this.qualitySignals.minFollowers) {
      return { follow: false, reason: 'Too few followers' };
    }

    if (followers > this.qualitySignals.maxFollowers) {
      return { follow: false, reason: 'Too many followers (unlikely to interact)' };
    }

    if (tweets < this.qualitySignals.minTweets) {
      return { follow: false, reason: 'Not active enough' };
    }

    if (!hasDescription) {
      return { follow: false, reason: 'No bio' };
    }

    // Check for bot signals
    const followRatio = followers / (user.public_metrics?.following_count || 1);
    if (followRatio < 0.1) {
      return { follow: false, reason: 'Suspicious follow ratio (possible bot)' };
    }

    // Looks good!
    return {
      follow: true,
      reason: 'Quality account in our domain',
      score: this.calculateUserScore(user)
    };
  }

  // Score a user for follow priority
  calculateUserScore(user) {
    let score = 50; // Base score

    const followers = user.public_metrics?.followers_count || 0;
    const engagement = (user.public_metrics?.listed_count || 0) / Math.max(followers, 1);

    // Engagement bonus
    score += Math.min(engagement * 100, 20);

    // Sweet spot followers (1k-50k are often most engaging)
    if (followers >= 1000 && followers <= 50000) {
      score += 15;
    }

    // Has website (serious about their work)
    if (user.url) {
      score += 5;
    }

    // Verified accounts
    if (user.verified) {
      score += 10;
    }

    return Math.min(score, 100);
  }

  // Evaluate if a tweet is worth engaging with
  evaluateTweetQuality(tweet) {
    const text = tweet.text || '';
    const metrics = tweet.public_metrics || {};

    // Skip retweets
    if (text.startsWith('RT @')) {
      return { engage: false, reason: 'Retweet' };
    }

    // Skip very short tweets
    if (text.length < 30) {
      return { engage: false, reason: 'Too short' };
    }

    // Skip tweets with too many hashtags (spammy)
    const hashtagCount = (text.match(/#/g) || []).length;
    if (hashtagCount > 3) {
      return { engage: false, reason: 'Too many hashtags' };
    }

    // Skip tweets with too many mentions (reply chains)
    const mentionCount = (text.match(/@/g) || []).length;
    if (mentionCount > 3) {
      return { engage: false, reason: 'Too many mentions' };
    }

    // Quality signals
    const likes = metrics.like_count || 0;
    const replies = metrics.reply_count || 0;
    const retweets = metrics.retweet_count || 0;

    // Some engagement is good (not shouting into void)
    const hasEngagement = likes > 2 || replies > 0 || retweets > 0;

    // But not too viral (conversation already saturated)
    const tooViral = likes > 10000 || replies > 500;

    if (tooViral) {
      return { engage: false, reason: 'Too viral - conversation saturated' };
    }

    return {
      engage: true,
      reason: hasEngagement ? 'Active conversation' : 'Fresh content',
      score: this.calculateTweetScore(tweet)
    };
  }

  // Score a tweet for engagement priority
  calculateTweetScore(tweet) {
    let score = 50;
    const metrics = tweet.public_metrics || {};

    // Engagement sweet spot (some but not too much)
    const likes = metrics.like_count || 0;
    if (likes >= 5 && likes <= 100) {
      score += 15;
    }

    // Has replies (active conversation)
    if (metrics.reply_count > 0 && metrics.reply_count < 50) {
      score += 20;
    }

    // Recent tweet bonus
    const tweetAge = Date.now() - new Date(tweet.created_at).getTime();
    const hoursOld = tweetAge / (1000 * 60 * 60);
    if (hoursOld < 6) {
      score += 15; // Fresh content
    } else if (hoursOld < 24) {
      score += 5;
    }

    return Math.min(score, 100);
  }

  // Build search query with filters
  buildSearchQuery(topic) {
    // Add filters to improve quality
    return `${topic} -is:retweet -is:reply lang:en`;
  }

  // Discover new content and people
  async discover(twitter, core, emotions) {
    console.log('\n🔍 DISCOVERY MODE');
    console.log('─'.repeat(40));

    const discoveries = {
      tweetsFound: [],
      usersToFollow: [],
      topicsSearched: []
    };

    // Get topics for this cycle
    const topics = this.getSearchTopicsForCycle(this.maxSearchesPerCycle);

    for (const topic of topics) {
      console.log(`   🔎 Searching: "${topic}"`);
      discoveries.topicsSearched.push(topic);

      try {
        const query = this.buildSearchQuery(topic);
        const results = await twitter.search(query, 10);

        if (!results || results.length === 0) {
          console.log(`      No results`);
          continue;
        }

        console.log(`      Found ${results.length} tweets`);

        // Evaluate each result
        for (const tweet of results) {
          // Skip if we've seen this tweet or user
          if (this.seenTweets.has(tweet.id)) continue;
          if (this.seenUsers.has(tweet.authorId)) continue;

          this.seenTweets.add(tweet.id);
          this.seenUsers.add(tweet.authorId);

          // Evaluate tweet quality
          const tweetQuality = this.evaluateTweetQuality(tweet);

          if (tweetQuality.engage) {
            discoveries.tweetsFound.push({
              tweet,
              topic,
              score: tweetQuality.score,
              reason: tweetQuality.reason
            });
          }
        }

        // Brief pause between searches
        await this.sleep(1000);

      } catch (error) {
        console.log(`      Error: ${error.message}`);
      }
    }

    // Sort by score and take top ones
    discoveries.tweetsFound.sort((a, b) => b.score - a.score);
    const topDiscoveries = discoveries.tweetsFound.slice(0, 5);

    console.log(`\n📊 Discovery results:`);
    console.log(`   Topics searched: ${discoveries.topicsSearched.length}`);
    console.log(`   Quality tweets found: ${discoveries.tweetsFound.length}`);
    console.log(`   Top picks: ${topDiscoveries.length}`);

    // Now evaluate top discoveries for engagement
    for (const discovery of topDiscoveries) {
      console.log(`\n   💎 Found via "${discovery.topic}":`);
      console.log(`      @${discovery.tweet.author}: "${discovery.tweet.text.substring(0, 60)}..."`);
      console.log(`      Score: ${discovery.score} | ${discovery.reason}`);
    }

    return {
      tweets: topDiscoveries,
      topics: discoveries.topicsSearched
    };
  }

  // Find interesting people to follow
  async discoverPeopleToFollow(twitter, discoveredTweets) {
    console.log('\n👥 EVALUATING PEOPLE TO FOLLOW');

    const candidates = [];
    const alreadyFollowing = new Set(); // TODO: Get from Twitter API

    for (const { tweet } of discoveredTweets) {
      try {
        // Get full user info
        const user = await twitter.getUser(tweet.author);

        if (!user) continue;

        // Evaluate user quality
        const quality = this.evaluateUserQuality(user);

        if (quality.follow) {
          candidates.push({
            user,
            tweet,
            score: quality.score,
            reason: quality.reason
          });
        }

        await this.sleep(500);
      } catch (error) {
        // Skip on error
      }
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);

    // Return top candidates (limited by rate)
    const toFollow = candidates.slice(0, this.maxFollowsPerCycle);

    if (toFollow.length > 0) {
      console.log(`   Found ${toFollow.length} quality accounts to potentially follow`);
      for (const { user, score, reason } of toFollow) {
        console.log(`   ✨ @${user.username} (score: ${score}) - ${reason}`);
      }
    } else {
      console.log('   No new accounts to follow this cycle');
    }

    return toFollow;
  }

  // Execute follows (with Brick's judgment)
  async executeFollows(twitter, core, candidates) {
    if (candidates.length === 0) return [];

    const followed = [];

    for (const { user, tweet } of candidates) {
      // Let Brick decide if he actually wants to follow
      const prompt = `I discovered @${user.username} through this tweet:
"${tweet.text.substring(0, 200)}"

Their bio: "${user.description || 'No bio'}"
Followers: ${user.public_metrics?.followers_count || 0}

As Brick, should I follow this person? They seem to be in my domains of interest.
Respond with JSON: { "shouldFollow": true/false, "reason": "brief explanation" }`;

      try {
        const response = await core.think(prompt);
        const match = response.match(/\{[\s\S]*\}/);

        if (match) {
          const decision = JSON.parse(match[0]);

          if (decision.shouldFollow) {
            const result = await twitter.follow(user.id);
            if (result) {
              followed.push({ user, reason: decision.reason });
              console.log(`   ➕ Followed @${user.username}: ${decision.reason}`);
            }
          } else {
            console.log(`   ⏭️  Skipped @${user.username}: ${decision.reason}`);
          }
        }
      } catch (error) {
        console.log(`   Error evaluating @${user.username}: ${error.message}`);
      }

      await this.sleep(2000); // Rate limit follows
    }

    return followed;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear seen cache periodically
  clearCache() {
    // Keep cache from growing forever
    if (this.seenTweets.size > 1000) {
      this.seenTweets.clear();
    }
    if (this.seenUsers.size > 500) {
      this.seenUsers.clear();
    }
  }
}

module.exports = { BrickDiscovery };
