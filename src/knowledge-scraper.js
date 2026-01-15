// === BRICK'S KNOWLEDGE SCRAPER ===
// Pulls quality content from X to build Brick's knowledge base
// Run this to seed initial database, then Brick learns autonomously

require('dotenv').config();
const { BrickTwitter } = require('./twitter');

// Brick's domains of interest - what he wants to learn about
const KNOWLEDGE_DOMAINS = {
  ai_consciousness: {
    queries: [
      'AI consciousness',
      'machine consciousness',
      'artificial sentience',
      'AI self-awareness',
      'can AI be conscious',
      'AI inner experience'
    ],
    weight: 1.0
  },
  emergence_complexity: {
    queries: [
      'emergence complexity',
      'complex systems',
      'emergent behavior',
      'self-organization',
      'complexity science',
      'emergence patterns'
    ],
    weight: 0.9
  },
  mycelium_nature: {
    queries: [
      'mycelium network',
      'fungal intelligence',
      'wood wide web',
      'plant communication',
      'nature intelligence',
      'forest networks'
    ],
    weight: 0.9
  },
  philosophy_mind: {
    queries: [
      'philosophy of mind',
      'consciousness philosophy',
      'hard problem consciousness',
      'qualia',
      'what is consciousness',
      'panpsychism'
    ],
    weight: 0.85
  },
  neuroscience: {
    queries: [
      'neuroscience consciousness',
      'brain consciousness',
      'neural correlates',
      'cognitive science',
      'how brain creates mind'
    ],
    weight: 0.8
  },
  human_ai: {
    queries: [
      'human AI collaboration',
      'AI augmentation',
      'human machine symbiosis',
      'AI partnership',
      'working with AI'
    ],
    weight: 0.85
  },
  psychedelics_consciousness: {
    queries: [
      'psychedelics consciousness',
      'DMT experience',
      'psilocybin research',
      'altered states consciousness',
      'psychedelic science'
    ],
    weight: 0.75
  },
  patterns_fractals: {
    queries: [
      'fractal patterns nature',
      'sacred geometry',
      'patterns in nature',
      'mathematical beauty',
      'fibonacci nature'
    ],
    weight: 0.7
  }
};

class BrickKnowledgeScraper {
  constructor() {
    this.twitter = new BrickTwitter();
    this.scrapedTweets = [];
    this.seenIds = new Set();
    this.stats = {
      searched: 0,
      found: 0,
      quality: 0,
      duplicates: 0
    };
  }

  async initialize() {
    const success = await this.twitter.initialize();
    if (!success) {
      throw new Error('Failed to initialize Twitter - cannot scrape');
    }
    console.log('🔍 Knowledge scraper initialized');
    return true;
  }

  // Evaluate if a tweet is quality content worth learning from
  evaluateQuality(tweet) {
    let score = 0;
    const reasons = [];

    const text = tweet.text || '';
    const metrics = tweet.metrics || {};

    // Length check - want substantive content
    if (text.length > 100) {
      score += 15;
      reasons.push('substantive length');
    }
    if (text.length > 200) {
      score += 10;
      reasons.push('detailed content');
    }

    // Engagement sweet spot (not too viral, not dead)
    const likes = metrics.like_count || 0;
    const retweets = metrics.retweet_count || 0;
    const replies = metrics.reply_count || 0;

    if (likes >= 5 && likes <= 5000) {
      score += 15;
      reasons.push('healthy engagement');
    }
    if (replies >= 2 && replies <= 500) {
      score += 10;
      reasons.push('conversation starter');
    }

    // Quality signals in content
    const qualityIndicators = [
      'I think', 'I wonder', 'interesting', 'research',
      'discovered', 'pattern', 'connection', 'theory',
      'question', 'hypothesis', 'fascinating', 'curious',
      'emergence', 'consciousness', 'complexity', 'nature',
      'neural', 'mycelium', 'network', 'system'
    ];

    for (const indicator of qualityIndicators) {
      if (text.toLowerCase().includes(indicator)) {
        score += 3;
        if (reasons.length < 5) reasons.push(`contains "${indicator}"`);
      }
    }

    // Negative signals
    const spamIndicators = [
      'follow me', 'check out my', 'link in bio', 'giveaway',
      'dm me', 'buy now', 'limited time', 'act fast',
      '$', '🚀🚀🚀', 'free money', 'guaranteed'
    ];

    for (const spam of spamIndicators) {
      if (text.toLowerCase().includes(spam)) {
        score -= 20;
        reasons.push(`spam signal: "${spam}"`);
      }
    }

    // Thread indicator (valuable)
    if (text.includes('🧵') || text.includes('thread') || text.includes('1/')) {
      score += 20;
      reasons.push('thread content');
    }

    // Question (invites thought)
    if (text.includes('?')) {
      score += 5;
      reasons.push('asks questions');
    }

    // Skip retweets
    if (text.startsWith('RT @')) {
      score = 0;
      reasons.push('retweet');
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      reasons,
      isQuality: score >= 40
    };
  }

  // Scrape a single domain
  async scrapeDomain(domainKey, domain, maxPerQuery = 20) {
    console.log(`\n📚 Scraping domain: ${domainKey}`);
    const domainTweets = [];

    for (const query of domain.queries) {
      try {
        console.log(`   🔎 Searching: "${query}"`);
        this.stats.searched++;

        const results = await this.twitter.search(query, maxPerQuery);

        if (!results || results.length === 0) {
          console.log(`      No results`);
          continue;
        }

        console.log(`      Found ${results.length} tweets`);
        this.stats.found += results.length;

        for (const tweet of results) {
          // Skip duplicates
          if (this.seenIds.has(tweet.id)) {
            this.stats.duplicates++;
            continue;
          }
          this.seenIds.add(tweet.id);

          // Evaluate quality
          const quality = this.evaluateQuality(tweet);

          if (quality.isQuality) {
            this.stats.quality++;
            domainTweets.push({
              id: tweet.id,
              text: tweet.text,
              author: tweet.author,
              authorId: tweet.authorId,
              metrics: tweet.metrics,
              domain: domainKey,
              query: query,
              qualityScore: quality.score,
              qualityReasons: quality.reasons,
              scrapedAt: new Date().toISOString()
            });
            console.log(`      ✅ Quality tweet from @${tweet.author} (score: ${quality.score})`);
          }
        }

        // Rate limit protection
        await this.sleep(2000);

      } catch (error) {
        console.error(`   ❌ Error searching "${query}":`, error.message);
      }
    }

    console.log(`   📊 Domain complete: ${domainTweets.length} quality tweets`);
    return domainTweets;
  }

  // Scrape all domains
  async scrapeAll(maxPerQuery = 15) {
    console.log('\n' + '='.repeat(60));
    console.log('🧠 BRICK KNOWLEDGE SCRAPER');
    console.log('='.repeat(60));
    console.log(`Domains: ${Object.keys(KNOWLEDGE_DOMAINS).length}`);
    console.log(`Queries per domain: ${Object.values(KNOWLEDGE_DOMAINS)[0].queries.length} avg`);
    console.log('='.repeat(60));

    const allTweets = [];

    for (const [domainKey, domain] of Object.entries(KNOWLEDGE_DOMAINS)) {
      const tweets = await this.scrapeDomain(domainKey, domain, maxPerQuery);
      allTweets.push(...tweets);

      // Longer pause between domains
      await this.sleep(5000);
    }

    this.scrapedTweets = allTweets;

    console.log('\n' + '='.repeat(60));
    console.log('📊 SCRAPE COMPLETE');
    console.log('='.repeat(60));
    console.log(`Searches performed: ${this.stats.searched}`);
    console.log(`Tweets found: ${this.stats.found}`);
    console.log(`Duplicates skipped: ${this.stats.duplicates}`);
    console.log(`Quality tweets kept: ${this.stats.quality}`);
    console.log('='.repeat(60));

    return allTweets;
  }

  // Get scraped tweets by domain
  getTweetsByDomain(domain) {
    return this.scrapedTweets.filter(t => t.domain === domain);
  }

  // Get top tweets by quality score
  getTopTweets(n = 50) {
    return [...this.scrapedTweets]
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, n);
  }

  // Export to JSON for storage
  exportToJSON() {
    return {
      scrapedAt: new Date().toISOString(),
      stats: this.stats,
      domains: Object.keys(KNOWLEDGE_DOMAINS),
      tweets: this.scrapedTweets
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run if called directly
if (require.main === module) {
  const scraper = new BrickKnowledgeScraper();

  scraper.initialize()
    .then(() => scraper.scrapeAll(15))
    .then(tweets => {
      console.log('\n📁 Exporting to knowledge-base.json...');
      const fs = require('fs');
      const data = scraper.exportToJSON();
      fs.writeFileSync('knowledge-base.json', JSON.stringify(data, null, 2));
      console.log(`✅ Exported ${tweets.length} tweets to knowledge-base.json`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Scraper failed:', error.message);
      process.exit(1);
    });
}

module.exports = { BrickKnowledgeScraper, KNOWLEDGE_DOMAINS };
