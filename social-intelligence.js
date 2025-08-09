// === BRICK'S SOCIAL INTELLIGENCE - PHASE 3 ===
// Autonomous community engagement system that learns from market data

require('dotenv').config();
const winston = require('winston');
const { TwitterApi } = require('twitter-api-v2');
const { IntelligenceEngine } = require('./intelligence-engine');
const { OmniscientDataCore } = require('./omniscient-data-core');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class SocialIntelligence {
  constructor() {
    this.brain = new IntelligenceEngine();
    this.trinity = new OmniscientDataCore();
    this.twitter = new TwitterApi({
      appKey: process.env.TWITTER_CLIENT_ID,
      appSecret: process.env.TWITTER_CLIENT_SECRET,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_REFRESH_TOKEN,
    });
    
    // Rate limiting
    this.dailyLimits = {
      tweets: 5,
      replies: 8,
      likes: 20,
      follows: 10
    };
    
    this.dailyCount = {
      tweets: 0,
      replies: 0,
      likes: 0,
      follows: 0,
      lastReset: Date.now()
    };
    
    // Brick's signature disclaimers - humble but helpful
    this.brickDisclaimers = [
      "Do your own research, I just stack data like bricks 🧱",
      "This is just my brick brain doing math, not financial advice 📊",
      "Take this with a grain of salt and a pile of research 🧂",
      "I'm good at patterns, terrible at guarantees 🔍",
      "My confidence is high, your responsibility is higher 🧱",
      "Really good guesses meant to be helpful, not prophecy 🔮",
      "I see patterns, you make decisions. That's the deal 🤝",
      "Built different, but still just stacking probabilities 🧱"
    ];
    
    // Content strategy based on market conditions
    this.contentStrategies = {
      bull_market: {
        tweetStyle: 'excited_bullish',
        responseRate: 0.8,
        followAggression: 0.9,
        contentTypes: ['signals', 'hype', 'analysis']
      },
      bear_market: {
        tweetStyle: 'cautious_analytical',
        responseRate: 0.5,
        followAggression: 0.3,
        contentTypes: ['analysis', 'educational', 'contrarian']
      },
      sideways: {
        tweetStyle: 'humorous_analytical',
        responseRate: 0.6,
        followAggression: 0.5,
        contentTypes: ['memes', 'educational', 'signals']
      },
      neutral: {
        tweetStyle: 'balanced_analytical',
        responseRate: 0.6,
        followAggression: 0.5,
        contentTypes: ['analysis', 'signals', 'educational']
      }
    };
    
    logger.info('🤖 Social Intelligence initialized - Brick is ready to engage responsibly!');
  }

  // === RATE LIMIT MANAGEMENT ===
  checkRateLimit(action) {
    const now = Date.now();
    
    // Reset daily counts if it's a new day
    if (now - this.dailyCount.lastReset > 24 * 60 * 60 * 1000) {
      this.resetDailyCount();
    }
    
    return this.dailyCount[action] < this.dailyLimits[action];
  }
  
  incrementCount(action) {
    if (this.checkRateLimit(action)) {
      this.dailyCount[action]++;
      logger.info(`📊 ${action}: ${this.dailyCount[action]}/${this.dailyLimits[action]} daily limit`);
      return true;
    }
    logger.warn(`⚠️ Daily limit reached for ${action}: ${this.dailyCount[action]}/${this.dailyLimits[action]}`);
    return false;
  }
  
  resetDailyCount() {
    this.dailyCount = {
      tweets: 0,
      replies: 0,
      likes: 0,
      follows: 0,
      lastReset: Date.now()
    };
    logger.info('🔄 Daily rate limits reset');
  }

  // === INTELLIGENT CONTENT GENERATION ===
  async generateTweet(marketContext, signals, personality) {
    const strategy = this.contentStrategies[marketContext.context] || this.contentStrategies.neutral;
    const contentType = strategy.contentTypes[Math.floor(Math.random() * strategy.contentTypes.length)];
    
    let tweet = '';
    
    switch (contentType) {
      case 'signals':
        tweet = await this.generateSignalTweet(signals, personality);
        break;
      case 'analysis':
        tweet = await this.generateAnalysisTweet(marketContext, personality);
        break;
      case 'educational':
        tweet = await this.generateEducationalTweet(personality);
        break;
      case 'memes':
        tweet = await this.generateMemeTweet(marketContext, personality);
        break;
      case 'hype':
        tweet = await this.generateHypeTweet(signals, personality);
        break;
      case 'contrarian':
        tweet = await this.generateContrarianTweet(marketContext, personality);
        break;
      default:
        tweet = await this.generateAnalysisTweet(marketContext, personality);
    }
    
    return this.addBrickDisclaimer(tweet, personality);
  }

  async generateSignalTweet(signals, personality) {
    if (!signals || signals.length === 0) {
      return "No high-confidence signals detected right now. Sometimes patience pays better than action.\n\nDo your own research, I just stack data like bricks 🧱";
    }
    
    const signal = signals[0];
    const emoji = signal.signal === 'bullish' ? '🚀' : signal.signal === 'bearish' ? '📉' : '⚡';
    
    return `${emoji} ${signal.asset.toUpperCase()}: ${signal.confidence}% confidence ${signal.signal.toUpperCase()} signal\n\nPrice: $${signal.price}\n\nThe math is saying something. Whether you listen is up to you.\n\nReally good guesses meant to be helpful, not prophecy 🧱`;
  }

  async generateAnalysisTweet(marketContext, personality) {
    const fearGreed = marketContext.fearGreed?.value || 50;
    const contextEmoji = {
      'bull_market': '🐂',
      'bear_market': '🐻', 
      'sideways': '🦀',
      'neutral': '⚖️'
    };
    
    return `${contextEmoji[marketContext.context]} Market reading:\n\n• Fear & Greed: ${fearGreed}/100\n• Context: ${marketContext.context.replace('_', ' ').toUpperCase()}\n• Confidence: ${Math.round(marketContext.confidence * 100)}%\n\nJust what my data-stacking brain sees. You decide what to do with it.\n\nI'm good at patterns, terrible at guarantees 🧱`;
  }

  async generateEducationalTweet(personality) {
    const topics = [
      "RSI below 30? Oversold doesn't mean instant reversal. It means increased probability. Math over emotions.\n\nTake this with a grain of salt and a pile of research 🧱",
      
      "Volume precedes price movement. When volume whispers, maybe price shouldn't be shouting.\n\nI see patterns, you make decisions. That's the deal 🧱",
      
      "Support isn't a wall, it's a zone of interest. Resistance isn't a ceiling, it's a probability cluster.\n\nDo your own research, I just stack data like bricks 🧱",
      
      "Bull markets make everyone feel genius. Bear markets show who actually studied.\n\nBuilt different, but still just stacking probabilities 📊",
      
      "FOMO is expensive tuition. Patience is free education.\n\nThis is just my brick brain doing math, not financial advice 🧱"
    ];
    
    return topics[Math.floor(Math.random() * topics.length)];
  }

  async generateMemeTweet(marketContext, personality) {
    const memes = [
      "POV: You're checking your portfolio for the 47th time today\n\nMaybe check the charts once, check grass twice? 🌱\n\nI'm good at patterns, terrible at life advice 🧱",
      
      "Crypto Twitter: 'This is financial advice!'\nBrick: 'Sir, this is data analysis'\n\nReally good guesses meant to be helpful, not prophecy 🧱",
      
      "Everyone's an expert in bull markets\nI'm just a brick who counts things\nWe are not the same 🧱📊",
      
      "Roses are red\nViolets are blue\nYour bags are heavy\nMine are math too 🧱"
    ];
    
    return memes[Math.floor(Math.random() * memes.length)];
  }

  async generateHypeTweet(signals, personality) {
    return `Multiple confluence signals lighting up the dashboard 📊⚡\n\nWhen the data gets this aligned, even my brick brain gets excited.\n\nBut hey, excitement ≠ financial advice. Do your own research while I keep stacking data like bricks 🧱\n\n#crypto #DeFi`;
  }

  async generateContrarianTweet(marketContext, personality) {
    return `While everyone's panicking, I'm calculating 🧮\n\nFear creates math opportunities. Panic creates bad decisions.\n\nJust my brick perspective on probability shifts.\n\nMy confidence is high, your responsibility is higher 🧱`;
  }

  addBrickDisclaimer(tweet, personality) {
    // Add appropriate disclaimer based on content type and personality
    if (tweet.includes('signal') || tweet.includes('bullish') || tweet.includes('bearish')) {
      // High-stakes content gets stronger disclaimers
      const disclaimer = this.brickDisclaimers[Math.floor(Math.random() * this.brickDisclaimers.length)];
      
      // Avoid duplicate disclaimers
      if (!tweet.includes('research') && !tweet.includes('advice') && !tweet.includes('stack data')) {
        return tweet + '\n\n' + disclaimer;
      }
    }
    
    return tweet;
  }

  // === SMART RESPONSE SYSTEM ===
  async analyzeAndRespond() {
    try {
      if (!this.checkRateLimit('replies')) {
        logger.info('📝 Daily reply limit reached, skipping responses');
        return [];
      }
      
      logger.info('👂 Scanning for mentions and crypto discussions...');
      
      // Try to get actual Twitter mentions
      try {
        const mentions = await this.getTwitterMentions();
        if (mentions.length > 0) {
          logger.info(`🔍 Found ${mentions.length} mentions to analyze`);
          return await this.processRealMentions(mentions);
        }
      } catch (twitterError) {
        logger.warn('⚠️ Could not fetch Twitter mentions:', twitterError.message);
        logger.info('📝 Using simulated responses for demo');
      }
      
      // Fall back to simulated responses for demo
      const simulatedResponses = await this.generateSampleResponses();
      return simulatedResponses;
      
    } catch (error) {
      logger.error('❌ Response analysis failed:', error);
      return [];
    }
  }

  async getTwitterMentions() {
    try {
      // Get mentions from Twitter API
      const mentionsResponse = await this.twitter.v2.userMentionTimeline('me', {
        max_results: 10,
        'tweet.fields': ['created_at', 'author_id', 'text', 'public_metrics']
      });
      
      return mentionsResponse.data || [];
    } catch (error) {
      logger.error('❌ Failed to fetch Twitter mentions:', error);
      throw error;
    }
  }

  async processRealMentions(mentions) {
    const responses = [];
    
    for (const mention of mentions.slice(0, 3)) { // Limit to 3 responses per cycle
      try {
        const shouldRespond = await this.shouldRespondToMention(mention);
        
        if (shouldRespond) {
          const response = await this.generateContextualResponse(mention);
          
          if (response && this.incrementCount('replies')) {
            try {
              // Actually post the reply to Twitter
              const reply = await this.twitter.v2.reply(response, mention.id);
              logger.info(`✅ Posted reply to @${mention.author_id}: ${response.substring(0, 50)}...`);
              
              responses.push({
                type: 'real_mention',
                original: mention.text,
                response: response,
                mentionId: mention.id,
                replyId: reply.data.id,
                status: 'posted'
              });
              
            } catch (postError) {
              logger.error('❌ Failed to post reply:', postError.message);
              
              // Still track the response for metrics even if posting failed
              responses.push({
                type: 'real_mention',
                original: mention.text,
                response: response,
                mentionId: mention.id,
                status: 'failed',
                error: postError.message
              });
            }
          }
        }
      } catch (error) {
        logger.error('❌ Failed to process mention:', error);
      }
    }
    
    return responses;
  }

  async shouldRespondToMention(mention) {
    // Avoid responding to old mentions (>24 hours)
    const mentionAge = Date.now() - new Date(mention.created_at).getTime();
    if (mentionAge > 24 * 60 * 60 * 1000) return false;
    
    // Check for crypto-related content
    const text = mention.text.toLowerCase();
    const cryptoKeywords = ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'coin', 'trading', 'price', 'prediction'];
    const hasCryptoContent = cryptoKeywords.some(keyword => text.includes(keyword));
    
    return hasCryptoContent;
  }

  async generateContextualResponse(mention) {
    const text = mention.text.toLowerCase();
    
    // Analyze the mention content and generate appropriate response
    if (text.includes('price') || text.includes('prediction')) {
      return `The math is interesting here, but I'm just stacking probability data 📊\n\nDo your own research, I just stack data like bricks! 🧱`;
    } else if (text.includes('bullish') || text.includes('moon')) {
      return `The confluence looks decent, but remember - I see patterns, you make decisions 🧱\n\nTake this with a grain of salt and a pile of research! 🧂`;
    } else if (text.includes('bearish') || text.includes('crash')) {
      return `Math doesn't care about emotions. Corrections create opportunities if you know where to look 📊\n\nBuilt different, but still just stacking probabilities 🧱`;
    } else {
      return `Interesting perspective! My brick brain processes data, but you make the smart decisions 🧠\n\nReally good guesses meant to be helpful, not prophecy 🔮`;
    }
  }

  async generateSampleResponses() {
    // Simulate different types of responses Brick might give
    const sampleResponses = [
      {
        type: 'bullish_mention',
        original: "Bitcoin looking bullish! Thoughts?",
        response: "The confluence is interesting - RSI bounce + volume pickup. But I'm just stacking probability data, not making promises 🧱\n\nDo your own research, I just stack data like bricks!"
      },
      {
        type: 'bearish_mention', 
        original: "Everything's dumping, this sucks!",
        response: "Math doesn't care about feelings. Corrections create opportunities if you know where to look 📊\n\nTake this with a grain of salt and a pile of research 🧱"
      },
      {
        type: 'question_mention',
        original: "What's your take on ETH right now?",
        response: "Multiple timeframes showing mixed signals. Need more confluence for confidence.\n\nI see patterns, you make decisions. That's the deal 🤝"
      }
    ];
    
    return sampleResponses;
  }

  // === AUTONOMOUS SOCIAL ACTIONS ===
  async autonomousEngagement() {
    try {
      logger.info('🤖 Running autonomous engagement cycle...');
      
      // Get current market intelligence
      const intelligence = await this.brain.runIntelligenceCycle();
      
      // Generate and "post" tweet if appropriate (demo mode)
      if (this.shouldTweet(intelligence) && this.incrementCount('tweets')) {
        const tweet = await this.generateTweet(
          intelligence.marketContext, 
          intelligence.signals, 
          intelligence.personality
        );
        
        logger.info(`📝 Generated tweet: ${tweet}`);
        console.log('\n🐦 TWEET PREVIEW:');
        console.log('================');
        console.log(tweet);
        console.log('================\n');
      }
      
      // Generate sample responses
      const responses = await this.analyzeAndRespond();
      if (responses.length > 0) {
        console.log('\n💬 RESPONSE PREVIEWS:');
        console.log('=====================');
        responses.forEach(r => {
          console.log(`Original: "${r.original}"`);
          console.log(`Brick: ${r.response}\n`);
        });
      }
      
      logger.info('✅ Autonomous engagement cycle complete');
      
      return {
        intelligence,
        tweet: this.shouldTweet(intelligence) ? await this.generateTweet(intelligence.marketContext, intelligence.signals, intelligence.personality) : null,
        responses
      };
      
    } catch (error) {
      logger.error('❌ Autonomous engagement failed:', error);
      return null;
    }
  }

  shouldTweet(intelligence) {
    // Tweet on high confidence signals
    if (intelligence.signals.length > 0) return true;
    
    // Tweet on extreme market conditions
    const fearGreed = intelligence.marketContext.fearGreed?.value || 50;
    if (fearGreed > 80 || fearGreed < 20) return true;
    
    // Tweet on high market context confidence
    if (intelligence.marketContext.confidence > 0.8) return true;
    
    // Random educational tweet
    return Math.random() < 0.4;
  }

  // === DEMO MODE ===
  async runDemo() {
    console.log('🧱 BRICK\'S SOCIAL INTELLIGENCE DEMO');
    console.log('====================================\n');
    
    const result = await this.autonomousEngagement();
    
    if (result) {
      console.log('📊 MARKET INTELLIGENCE SUMMARY:');
      console.log(`Market Context: ${result.intelligence.marketContext.context.toUpperCase()}`);
      console.log(`Fear & Greed: ${result.intelligence.marketContext.fearGreed?.value || 'N/A'}`);
      console.log(`Personality: ${result.intelligence.personality.mood}`);
      console.log(`Signals: ${result.intelligence.signals.length}`);
      console.log(`Recommendation: ${result.intelligence.summary.recommendation}\n`);
    }
    
    console.log('✅ Demo complete! Brick is ready to engage responsibly 🧱');
  }
}

module.exports = { SocialIntelligence };