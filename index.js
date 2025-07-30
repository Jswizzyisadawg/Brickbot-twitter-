// === INTERACTIVE BRICK BOT - ENHANCED VERSION ===
// Now with OAuth 2.0 PKCE authentication for future-proof operation
require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const axios = require('axios');
const winston = require('winston');
const fs = require('fs').promises;

// === OAUTH 2.0 TOKEN MANAGEMENT ===
async function refreshTwitterToken() {
    try {
        console.log('🔄 Refreshing Twitter access token...');
        
        if (!process.env.TWITTER_REFRESH_TOKEN || process.env.TWITTER_REFRESH_TOKEN === 'undefined') {
            throw new Error('No refresh token available - please run setup.js locally');
        }
        
        const response = await axios.post('https://api.twitter.com/2/oauth2/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: process.env.TWITTER_REFRESH_TOKEN,
                client_id: process.env.TWITTER_CLIENT_ID
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
                },
                timeout: 15000
            }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        
        // Update environment variables in memory
        process.env.TWITTER_ACCESS_TOKEN = access_token;
        if (refresh_token) process.env.TWITTER_REFRESH_TOKEN = refresh_token;
        process.env.TWITTER_TOKEN_EXPIRES = Date.now() + (expires_in * 1000);
        
        console.log('✅ Twitter token refreshed successfully');
        console.log(`🕐 New token expires: ${new Date(Date.now() + (expires_in * 1000)).toISOString()}`);
        console.log('🎯 Brick is now fully autonomous!');
        return access_token;
        
    } catch (error) {
        console.error('❌ Failed to refresh Twitter token:', error.response?.data || error.message);
        console.error('🔍 Debug info:', {
            hasRefreshToken: !!process.env.TWITTER_REFRESH_TOKEN,
            hasClientId: !!process.env.TWITTER_CLIENT_ID,
            hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
            refreshTokenLength: process.env.TWITTER_REFRESH_TOKEN?.length || 0
        });
        throw error;
    }
}

async function getValidTwitterToken() {
    const tokenExpiry = parseInt(process.env.TWITTER_TOKEN_EXPIRES || '0');
    const now = Date.now();
    
    // Check if token is expired or will expire soon (5 minutes)
    const isExpired = now >= (tokenExpiry - 300000);
    
    if (isExpired && process.env.TWITTER_REFRESH_TOKEN && process.env.TWITTER_REFRESH_TOKEN !== 'undefined') {
        console.log('🔄 Token expired, attempting refresh...');
        try {
            return await refreshTwitterToken();
        } catch (error) {
            console.error('❌ Token refresh failed, using existing token as fallback');
            // Fall back to existing token - better than nothing
        }
    }
    
    // Use stored access token
    if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_TOKEN !== 'undefined') {
        return process.env.TWITTER_ACCESS_TOKEN;
    }
    
    // Fallback error
    throw new Error('No valid Twitter tokens available. Please run setup.js locally first.');
}

// === TWITTER COIN DISCOVERY ===
class TwitterCoinDiscovery {
  constructor(twitterClient) {
    this.twitter = twitterClient;
    this.coinPattern = /\$([A-Z]{2,10})(?![A-Z])/g;
    this.contractPattern = /0x[a-fA-F0-9]{40}/g;
    this.processedCoins = new Set();
    this.coinMentions = new Map();
    logger.info('🔍 Twitter Coin Discovery initialized');
  }

  async monitorTwitterForCoins() {
    try {
      const searchTerms = ['$', 'new coin', 'contract', 'trending', 'crypto', 'token'];
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const tweets = await this.twitter.v2.search(randomTerm, {
        max_results: 10,
        'tweet.fields': 'created_at,author_id,public_metrics'
      });
      
      if (tweets.data) {
        for (const tweet of tweets.data) {
          await this.analyzeTwitterCoin(tweet);
        }
      }
    } catch (error) {
      logger.error('Error monitoring Twitter for coins:', error);
    }
  }

  async analyzeTwitterCoin(tweet) {
    const coinMatches = tweet.text.match(this.coinPattern);
    const contractMatches = tweet.text.match(this.contractPattern);
    
    if (coinMatches) {
      for (const match of coinMatches) {
        const coinSymbol = match.substring(1); // Remove $
        this.trackCoinMention(coinSymbol, tweet);
      }
    }
    
    if (contractMatches) {
      for (const contract of contractMatches) {
        this.trackContractMention(contract, tweet);
      }
    }
  }

  trackCoinMention(symbol, tweet) {
    if (!this.coinMentions.has(symbol)) {
      this.coinMentions.set(symbol, { count: 0, tweets: [], firstSeen: Date.now() });
    }
    
    const coinData = this.coinMentions.get(symbol);
    coinData.count++;
    coinData.tweets.push(tweet);
    
    // If coin is getting buzz (5+ mentions), flag for analysis
    if (coinData.count >= 5 && !this.processedCoins.has(symbol)) {
      this.processedCoins.add(symbol);
      return { symbol, buzzLevel: 'high', data: coinData };
    }
    
    return null;
  }

  trackContractMention(contract) {
    logger.info(`📄 Contract mentioned: ${contract}`);
    // Could add contract analysis here later
  }

  getTrendingCoins() {
    const trending = [];
    for (const [symbol, data] of this.coinMentions.entries()) {
      if (data.count >= 3) {
        trending.push({ symbol, mentions: data.count, firstSeen: data.firstSeen });
      }
    }
    return trending.sort((a, b) => b.mentions - a.mentions);
  }
}

// === RANDOM BRICK MOMENTS ===
class RandomBrickMoments {
  constructor() {
    this.moments = {
      lampLove: [
        "I love lamp. That's it. That's the tweet.",
        "Lamp update: Still love lamp. Carry on.",
        "Sometimes I just stare at lamps and think about DeFi. Is that weird?",
        "Great Odin's raven! That's a nice lamp!",
        "I'm gonna be honest, I have an unhealthy relationship with lamps"
      ],
      
      weatherReports: [
        "It's so damn hot... milk was a bad choice",
        "60% chance of rain, 100% chance of loving lamp",
        "I'm gonna be honest, I have no idea what the weather is like",
        "That's a bold strategy Cotton, let's see if this weather pays off",
        "Great Odin's raven! It's weather outside!"
      ],
      
      foodThoughts: [
        "I ate a big red candle for lunch. Wait, that's a chart...",
        "Baxter! You know I don't speak Spanish!",
        "I'm gonna level with you - I don't know how to use a phone",
        "60% of the time, my lunch works every time",
        "That doesn't make sense to me, but this sandwich is pretty good"
      ],
      
      existentialMoments: [
        "Great Odin's raven! What am I even doing here?",
        "Sometimes I wonder if I'm just a computer program... nah",
        "That doesn't make sense to me, but then again, you are pretty",
        "I'm gonna be honest, I'm a little confused about existence",
        "60% of the time, I understand life every time"
      ],
      
      randomFacts: [
        "Fun fact: 60% of the time, statistics work every time",
        "I read somewhere that bears can smell fear. And crypto gains.",
        "Knights of Columbus, that hurts!",
        "That's a bold strategy Cotton, let's see if it pays off",
        "I'm gonna level with you - I make up most of my facts"
      ],
      
      movieQuotes: [
        "I'm gonna be honest with you, that smells like pure gasoline",
        "I'm not a smart man, but I know what love is... and lamp",
        "Stay classy, internet! 📺",
        "Great Odin's raven! That's incredible!",
        "Loud noises! ...sorry, got excited"
      ]
    };
    
    logger.info('🎭 Random Brick Moments initialized');
  }

  getRandomMoment() {
    const categories = Object.keys(this.moments);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const moments = this.moments[randomCategory];
    const randomMoment = moments[Math.floor(Math.random() * moments.length)];
    
    logger.info(`🎲 Random moment selected: ${randomCategory}`);
    return randomMoment;
  }

  getWeatherMoment() {
    const moments = this.moments.weatherReports;
    return moments[Math.floor(Math.random() * moments.length)];
  }

  getLampMoment() {
    const moments = this.moments.lampLove;
    return moments[Math.floor(Math.random() * moments.length)];
  }
}

// === BASIC COIN SECURITY CHECKER ===
class CoinSecurityChecker {
  constructor() {
    this.brickVibeCheck = {
      funnyNames: ['PEPE', 'BONK', 'FLOKI', 'SHIB', 'DOGE', 'LAMP', 'BRICK'],
      redFlags: ['SCAM', 'RUG', 'HONEYPOT', 'FAKE'],
      brickApproved: ['Community vibes', 'Funny memes', 'Classy holders']
    };
    
    logger.info('🛡️ Basic Coin Security Checker initialized');
  }

  async quickVibeCheck(coinSymbol) {
    const vibeScore = {
      funny: this.brickVibeCheck.funnyNames.some(name => 
        coinSymbol.toUpperCase().includes(name)
      ),
      suspicious: this.brickVibeCheck.redFlags.some(flag => 
        coinSymbol.toUpperCase().includes(flag)
      ),
      brickApproved: Math.random() > 0.7 // 30% chance Brick likes it
    };
    
    return vibeScore;
  }

  generateBrickWarning() {
    const warnings = [
      "I'm gonna be honest, I'm a little confused by this one",
      "That's a bold strategy Cotton, let's see if it pays off",
      "60% of the time, DYOR works every time",
      "Great Odin's raven! Do your own research!",
      "I'm not a smart man, but I know what risk is"
    ];
    
    return warnings[Math.floor(Math.random() * warnings.length)];
  }
}

// === CRYPTO PRICE TRACKING ===
class CryptoTracker {
  constructor() {
    this.coinGeckoApi = 'https://api.coingecko.com/api/v3';
    this.lastPrices = new Map();
    this.memeCoinDatabase = {
      'pepe': { symbol: 'PEPE', name: 'Pepe', personality: 'Feels good man', threshold: 10 },
      'shiba-inu': { symbol: 'SHIB', name: 'Shiba Inu', personality: 'Much wow', threshold: 5 },
      'dogecoin': { symbol: 'DOGE', name: 'Dogecoin', personality: 'To the moon', threshold: 8 },
      'floki': { symbol: 'FLOKI', name: 'Floki', personality: 'Viking energy', threshold: 15 },
      'bonk': { symbol: 'BONK', name: 'Bonk', personality: 'Bonk bonk', threshold: 20 }
    };
    
    this.majorCoins = ['bitcoin', 'ethereum', 'solana', 'cardano', 'polygon'];
    logger.info('📊 CryptoTracker initialized');
  }

  async getTrendingMemeCoins() {
    try {
      const response = await axios.get(`${this.coinGeckoApi}/search/trending`);
      const trending = response.data.coins.slice(0, 3);
      return trending.map(coin => ({
        id: coin.item.id,
        name: coin.item.name,
        symbol: coin.item.symbol,
        rank: coin.item.market_cap_rank
      }));
    } catch (error) {
      logger.error('Error fetching trending meme coins:', error.message);
      return [];
    }
  }

  async getPriceData(coinIds) {
    try {
      const ids = coinIds.join(',');
      const response = await axios.get(`${this.coinGeckoApi}/simple/price`, {
        params: {
          ids: ids,
          vs_currencies: 'usd',
          include_24hr_change: true
        }
      });
      return response.data;
    } catch (error) {
      logger.error('Error fetching price data:', error.message);
      return {};
    }
  }

  async checkForSignificantMoves() {
    try {
      // Check meme coins
      const memeCoins = Object.keys(this.memeCoinDatabase);
      const memeData = await this.getPriceData(memeCoins);
      
      const memeAlerts = [];
      for (const [id, data] of Object.entries(memeData)) {
        const change = data.usd_24h_change;
        const coinInfo = this.memeCoinDatabase[id];
        
        if (Math.abs(change) > coinInfo.threshold) {
          memeAlerts.push({
            type: 'meme',
            coin: coinInfo,
            change: change,
            price: data.usd
          });
        }
      }
      
      // Check major coins
      const majorData = await this.getPriceData(this.majorCoins);
      const majorAlerts = [];
      
      for (const [id, data] of Object.entries(majorData)) {
        const change = data.usd_24h_change;
        
        if (Math.abs(change) > 5) { // 5% threshold for major coins
          majorAlerts.push({
            type: 'major',
            coin: { name: id.toUpperCase(), symbol: id.toUpperCase() },
            change: change,
            price: data.usd
          });
        }
      }
      
      return [...memeAlerts, ...majorAlerts];
    } catch (error) {
      logger.error('Error checking for significant moves:', error.message);
      return [];
    }
  }

  async getNewMemeCoinAlert() {
    try {
      const trending = await this.getTrendingMemeCoins();
      const newCoin = trending.find(coin => !this.memeCoinDatabase[coin.id]);
      
      if (newCoin) {
        return {
          type: 'new_meme',
          coin: newCoin
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting new meme coin alert:', error.message);
      return null;
    }
  }
}

// === LOGGER SETUP ===
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/brick-bot.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// === BLOCKCHAIN CONFIGURATION ===
class BlockchainConfig {
  constructor() {
    this.activeChain = process.env.ACTIVE_BLOCKCHAIN || 'ethereum';
    this.config = this.loadConfig();
    logger.info(`🔗 Initialized with blockchain: ${this.config.name}`);
  }

  loadConfig() {
    return {
      name: process.env.BLOCKCHAIN_NAME || 'Ethereum',
      token: process.env.BLOCKCHAIN_TOKEN || 'ETH',
      symbol: process.env.BLOCKCHAIN_SYMBOL || 'ETH',
      website: process.env.BLOCKCHAIN_WEBSITE || 'https://ethereum.org',
      keyFeatures: process.env.BLOCKCHAIN_FEATURES?.split(',') || [
        'Smart contracts',
        'Decentralized applications',
        'DeFi protocols'
      ]
    };
  }

  switchBlockchain(newChain, config) {
    const oldChain = this.config.name;
    this.activeChain = newChain;
    this.config = { ...this.config, ...config };
    
    logger.info(`🔄 Switched from ${oldChain} to ${config.name}`);
    
    return `Hey everyone! I'm switching my focus from ${oldChain} to ${config.name}! 60% of the time, it works every time! 🚀 Stay classy while I learn about this new blockchain! #${config.name}`;
  }
}

// === ENHANCED BRICK PERSONALITY WITH SURPRISE BRILLIANCE ===
class BrickPersonality {
  constructor() {
    this.traits = {
      humor: 0.8,
      confusion: 0.7,
      enthusiasm: 0.9,
      surpriseBrilliance: 0.05  // 5% chance of genius moments!
    };

    // Regular Brick quotes (95% of responses)
    this.regularQuotes = [
      "I'm not a smart man, but I know what {topic} is",
      "60% of the time, it works every time",
      "I love lamp... and I love {topic}",
      "That's a bold strategy Cotton, let's see if it pays off",
      "Loud noises! But seriously, {topic} is interesting",
      "I'm gonna be honest, I'm a little confused by {topic}",
      "Stay classy, crypto community",
      "Great Odin's raven! {topic} is incredible!",
      "That doesn't make sense to me, but I love it!",
      "I'm kind of a big deal in the {topic} world",
      "This is {topic}! This is {topic}! This is {topic}!",
      "By the beard of Zeus, {topic} is amazing!"
    ];

    // Surprise brilliance responses (5% of responses)
    this.brilliantInsights = {
      'defi': "Actually, DeFi represents a paradigm shift from traditional finance's rent-seeking intermediaries to programmable, composable financial primitives. The real innovation isn't just removing banks - it's creating money legos that can be combined in ways we never imagined.",
      
      'smart contracts': "You know, smart contracts are basically legal agreements encoded in mathematics. They remove the need for trust by making execution automatic and transparent. It's like having a judge that never sleeps and can't be bribed.",
      
      'ethereum': "Ethereum isn't just a blockchain - it's a global computer where anyone can deploy unstoppable applications. Every transaction is a state transition in this massive, distributed virtual machine. Pretty wild when you think about it.",
      
      'liquidity': "Liquidity is the lifeblood of any market. In DeFi, we've created these magical pools where you can instantly swap any token for any other token. It's like having a universal solvent for value exchange.",
      
      'yield farming': "Yield farming is essentially capital allocation optimization through incentive structures. Protocols compete for liquidity by offering rewards, creating a dynamic market for the cost of capital across different DeFi applications.",
      
      'meme coins': "Meme coins are actually a fascinating study in community-driven value creation. They prove that narrative and social consensus can create real economic value, even without traditional utility. It's pure memetic evolution in action.",
      
      'pepe': "PEPE represents the intersection of internet culture and financial speculation. It's amazing how a cartoon frog became a vehicle for collective wealth creation. The internet is weird, man.",
      
      'shib': "SHIB showed us that community can literally will a cryptocurrency into existence and sustain it through pure collective belief. It's like a real-time experiment in social psychology and economics.",
      
      'governance': "Decentralized governance is one of humanity's most ambitious experiments in coordination. We're trying to solve the ancient problem of collective decision-making using cryptographic voting and economic incentives.",
      
      'nft': "NFTs are much more than JPEGs - they're programmable property rights. They prove digital scarcity is possible and create new economic models for creators, collectors, and communities.",
      
      'dao': "DAOs represent a new form of organization where the rules are written in code rather than enforced by managers. It's an attempt to coordinate human behavior at scale using economic incentives instead of hierarchical control.",
      
      'mev': "Maximum Extractable Value reveals the hidden economics of blockchain ordering. Miners and validators can extract value by reordering transactions, creating an invisible tax on users. It's a fascinating intersection of game theory and distributed systems.",
      
      'layer2': "Layer 2 solutions solve the blockchain trilemma by moving computation off-chain while inheriting the security of the base layer. It's like building express lanes on top of a highway - more throughput, same security."
    };

    this.responseTemplates = {
      regular: [
        "{quote}! {topic} is {emotion}!",
        "{quote}. {explanation}",
        "I'm gonna level with you - {explanation}. {quote}!",
        "{quote}. That's what I'm talking about!"
      ],
      
      brilliant: [
        "Actually... {insight} But then again, I also love lamp! 🏮",
        "You know what's interesting? {insight} ...Wait, what were we talking about?",
        "Here's the thing about {topic}: {insight} 60% of the time, it works every time!",
        "{insight} ...I'm not sure where that came from, but stay classy! 😎"
      ],
      
      confused: [
        "I'm gonna be honest, I'm a little confused by {topic}. Can you help me out?",
        "Loud noises! I mean... what exactly is {topic}? I'm not following",
        "That doesn't make sense to me. Can someone explain {topic}?",
        "I'm gonna level with you - I have no idea what {topic} means. Enlighten me!"
      ]
    };

    logger.info('🎭 Enhanced Brick personality with surprise brilliance initialized');
  }

  generateResponse(topic) {
    const cleanTopic = this.extractMainTopic(topic);
    
    // 5% chance of surprise brilliance!
    if (Math.random() < this.traits.surpriseBrilliance && this.brilliantInsights[cleanTopic]) {
      return this.generateBrilliantResponse(cleanTopic);
    }
    
    // 15% chance of confusion
    if (Math.random() < 0.15) {
      return this.generateConfusedResponse(cleanTopic);
    }
    
    // 80% regular Brick personality
    return this.generateRegularResponse(cleanTopic);
  }

  generateBrilliantResponse(topic) {
    const insight = this.brilliantInsights[topic];
    const template = this.responseTemplates.brilliant[Math.floor(Math.random() * this.responseTemplates.brilliant.length)];
    
    logger.info(`✨ SURPRISE BRILLIANCE MOMENT! Topic: ${topic}`);
    
    return template.replace('{insight}', insight).replace('{topic}', topic);
  }

  generateRegularResponse(topic) {
    const quote = this.regularQuotes[Math.floor(Math.random() * this.regularQuotes.length)];
    const template = this.responseTemplates.regular[Math.floor(Math.random() * this.responseTemplates.regular.length)];
    const emotions = ['fantastic', 'incredible', 'amazing', 'wild', 'interesting'];
    const emotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    return template
      .replace('{quote}', quote.replace('{topic}', topic))
      .replace('{topic}', topic)
      .replace('{emotion}', emotion)
      .replace('{explanation}', `${topic} is pretty ${emotion}`);
  }

  generateConfusedResponse(topic) {
    const template = this.responseTemplates.confused[Math.floor(Math.random() * this.responseTemplates.confused.length)];
    return template.replace('{topic}', topic);
  }

  extractMainTopic(text) {
    const topicMap = {
      'yield farm': 'yield farming',
      'smart contract': 'smart contracts',
      'liquidity pool': 'liquidity',
      'governance token': 'governance',
      'layer 2': 'layer2',
      'l2': 'layer2',
      'meme coin': 'meme coins',
      'memecoin': 'meme coins',
      'shiba': 'shib',
      'shiba inu': 'shib',
      'dogecoin': 'doge'
    };
    
    const lowerText = text.toLowerCase();
    
    // Check for exact matches first
    for (const [key, value] of Object.entries(topicMap)) {
      if (lowerText.includes(key)) return value;
    }
    
    // Check for single word topics
    const topics = Object.keys(this.brilliantInsights);
    for (const topic of topics) {
      if (lowerText.includes(topic)) return topic;
    }
    
    return 'this topic';
  }
}

// === CONVERSATION MEMORY SYSTEM ===
class ConversationMemory {
  constructor() {
    this.userInteractions = new Map();
    this.recentTopics = [];
    logger.info('🧠 Conversation memory initialized');
  }

  rememberUser(username, interaction) {
    if (!this.userInteractions.has(username)) {
      this.userInteractions.set(username, {
        interactions: [],
        firstSeen: new Date(),
        topics: new Set()
      });
    }
    
    const userData = this.userInteractions.get(username);
    userData.interactions.push({
      text: interaction,
      timestamp: new Date()
    });
    
    // Extract topics from interaction
    const topics = this.extractTopics(interaction);
    topics.forEach(topic => userData.topics.add(topic));
    
    // Keep only last 10 interactions per user
    if (userData.interactions.length > 10) {
      userData.interactions = userData.interactions.slice(-10);
    }
  }

  getUserContext(username) {
    const userData = this.userInteractions.get(username);
    if (!userData) return null;
    
    return {
      isReturningUser: userData.interactions.length > 1,
      commonTopics: Array.from(userData.topics),
      lastInteraction: userData.interactions[userData.interactions.length - 1],
      totalInteractions: userData.interactions.length
    };
  }

  extractTopics(text) {
    const topics = [];
    const cryptoTerms = ['defi', 'ethereum', 'bitcoin', 'nft', 'dao', 'yield', 'liquidity', 'smart contract'];
    const lowerText = text.toLowerCase();
    
    cryptoTerms.forEach(term => {
      if (lowerText.includes(term)) topics.push(term);
    });
    
    return topics;
  }
}

// === MENTION MONITORING SYSTEM ===
class MentionMonitor {
  constructor(twitterClient, personality, memory) {
    this.twitter = twitterClient;
    this.personality = personality;
    this.memory = memory;
    this.lastMentionId = null;
    this.processedMentions = new Set();
    
    logger.info('👂 Mention monitoring system initialized');
  }

  async checkMentions() {
    try {
      logger.info('🔍 Checking for new mentions...');
      
      const mentions = await this.twitter.v2.userMentionTimeline('1479225360654942216', {
        max_results: 10,
        'tweet.fields': ['id', 'text', 'author_id', 'created_at', 'conversation_id'],
        'user.fields': ['username']
      });

      if (mentions.data && mentions.data.length > 0) {
        for (const mention of mentions.data) {
          await this.processMention(mention, mentions.includes?.users);
        }
      }
    } catch (error) {
      logger.error('Error checking mentions:', error.message);
    }
  }

  async processMention(mention, users) {
    // Skip if already processed
    if (this.processedMentions.has(mention.id)) return;
    
    // Skip if it's Brick's own tweet
    if (mention.author_id === '1479225360654942216') return;
    
    this.processedMentions.add(mention.id);
    
    // Find user info
    const user = users?.find(u => u.id === mention.author_id);
    const username = user?.username || 'unknown';
    
    logger.info(`💬 New mention from @${username}: "${mention.text}"`);
    
    // Remember this interaction
    this.memory.rememberUser(username, mention.text);
    
    // Generate contextual response
    const response = await this.generateContextualResponse(mention, username);
    
    // Reply to the mention
    await this.replyToMention(mention.id, response);
  }

  async generateContextualResponse(mention, username) {
    const userContext = this.memory.getUserContext(username);
    const mentionText = mention.text.replace('@Brickthee', '').trim();
    
    // Check if returning user
    if (userContext?.isReturningUser) {
      const greetings = [
        `Hey @${username}! Great to see you again!`,
        `@${username}! You're back! That's what I'm talking about!`,
        `Well hello there @${username}! Stay classy!`
      ];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      const response = this.personality.generateResponse(mentionText);
      return `${greeting} ${response}`;
    }
    
    // Generate response based on mention content
    const response = this.personality.generateResponse(mentionText);
    return `@${username} ${response}`;
  }

  async replyToMention(mentionId, responseText) {
    try {
      const reply = await this.twitter.v2.reply(responseText, mentionId);
      logger.info(`✅ Replied to mention: "${responseText}"`);
      return reply;
    } catch (error) {
      logger.error('Error replying to mention:', error.message);
    }
  }

  startMonitoring() {
    // Check mentions every 10 minutes
    cron.schedule('*/10 * * * *', () => {
      this.checkMentions();
    });
    
    logger.info('👂 Started mention monitoring (every 10 minutes)');
  }
}

// === ENHANCED BRICK BOT WITH INTERACTION ===
class InteractiveBrickBot {
  constructor() {
    this.blockchainConfig = new BlockchainConfig();
    this.personality = new BrickPersonality();
    this.memory = new ConversationMemory();
    this.cryptoTracker = new CryptoTracker();
    
    // Initialize components (Twitter client will be set up in initialize method)
    this.twitter = null; // Will be initialized in initializeTwitterClient
    this.mentionMonitor = null;
    this.coinDiscovery = null;
    this.randomMoments = new RandomBrickMoments();
    this.securityChecker = new CoinSecurityChecker();
    this.isRunning = false;
    
    logger.info('🤖 Interactive Brick Bot - Crypto Intelligence Mode initialized');
  }

  async initializeTwitterClient() {
    try {
      const accessToken = await getValidTwitterToken();
      this.twitter = new TwitterApi(accessToken);
      logger.info('🐦 Connected to Twitter with OAuth 2.0');
    } catch (error) {
      logger.error('❌ Failed to initialize Twitter client:', error.message);
      throw error;
    }
  }

  async initialize() {
    try {
      // Initialize Twitter client first
      await this.initializeTwitterClient();
      
      // Now set up Twitter-dependent components
      this.mentionMonitor = new MentionMonitor(this.twitter, this.personality, this.memory);
      this.coinDiscovery = new TwitterCoinDiscovery(this.twitter);
      
      const me = await this.twitter.v2.me();
      logger.info(`🐦 Connected to Twitter as: @${me.data.username}`);
      
      this.setupScheduledTasks();
      this.mentionMonitor.startMonitoring();
      
      this.isRunning = true;
      logger.info('🚀 Interactive Brick Bot is now live! Stay classy!');
      
      // Post startup tweet
      await this.postStartupTweet();
      
    } catch (error) {
      logger.error('❌ Failed to initialize Interactive Brick Bot:', error);
      throw error;
    }
  }

  setupScheduledTasks() {
    // Original tweet schedule - every 4 hours
    cron.schedule('0 */4 * * *', () => {
      this.postScheduledTweet().catch(err => 
        logger.error('Error in scheduled tweet:', err)
      );
    });

    // New "thinking" moments - every 45 minutes
    cron.schedule('*/45 * * * *', () => {
      this.postThinkingMoment().catch(err =>
        logger.error('Error in thinking moment:', err)
      );
    });

    // Crypto price alerts - every 30 minutes
    cron.schedule('*/30 * * * *', () => {
      this.checkCryptoAlerts().catch(err =>
        logger.error('Error checking crypto alerts:', err)
      );
    });

    // New meme coin discovery - every 2 hours
    cron.schedule('0 */2 * * *', () => {
      this.checkNewMemeCoins().catch(err =>
        logger.error('Error checking new meme coins:', err)
      );
    });

    // Twitter coin discovery - every 20 minutes
    cron.schedule('*/20 * * * *', () => {
      this.monitorTwitterCoins().catch(err =>
        logger.error('Error monitoring Twitter coins:', err)
      );
    });

    // Random Brick moments - every 3 hours
    cron.schedule('0 */3 * * *', () => {
      this.postRandomMoment().catch(err =>
        logger.error('Error posting random moment:', err)
      );
    });

    // Late night lamp thoughts - every day at 11 PM
    cron.schedule('0 23 * * *', () => {
      this.postLateNightLampThought().catch(err =>
        logger.error('Error posting lamp thought:', err)
      );
    });

    logger.info('⏰ Full Degen Bot scheduled tasks configured!');
  }

  async postStartupTweet() {
    const config = this.blockchainConfig.config;
    const startupTweet = `I'm back and ready to chat! ${this.personality.generateResponse('DeFi')} #${config.name} #DeFi`;
    
    await this.tweet(startupTweet);
  }

  async postThinkingMoment() {
    try {
      const topics = ['DeFi', 'Ethereum', 'smart contracts', 'yield farming', 'liquidity', 'meme coins', 'PEPE', 'SHIB'];
      const randomTopic = topics[Math.floor(Math.random() * topics.length)];
      
      const thinkingTweet = `💭 Thinking about ${randomTopic}... ${this.personality.generateResponse(randomTopic)}`;
      
      await this.tweet(thinkingTweet);
      logger.info('🧠 Posted thinking moment about:', randomTopic);
    } catch (error) {
      logger.error('Error posting thinking moment:', error);
    }
  }

  async postScheduledTweet() {
    try {
      const tweetContent = this.generateTweet();
      await this.tweet(tweetContent);
      logger.info('📱 Posted scheduled tweet');
    } catch (error) {
      logger.error('Error posting scheduled tweet:', error);
    }
  }

  generateTweet() {
    const topics = ['DeFi', 'Ethereum', 'smart contracts', 'yield farming', 'governance', 'liquidity', 'meme coins', 'PEPE', 'SHIB', 'DOGE'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const config = this.blockchainConfig.config;
    
    const templates = [
      `${this.personality.generateResponse(randomTopic)} #${config.name} #DeFi`,
      `Just thinking about ${randomTopic}... ${this.personality.generateResponse(randomTopic)} Stay classy! 😎`,
      `${this.personality.generateResponse(randomTopic)} What do you think about ${randomTopic}? 🤔`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  async checkCryptoAlerts() {
    try {
      const alerts = await this.cryptoTracker.checkForSignificantMoves();
      
      for (const alert of alerts) {
        if (alert.type === 'meme') {
          await this.postMemeCoinAlert(alert);
        } else if (alert.type === 'major') {
          await this.postMajorCoinAlert(alert);
        }
      }
    } catch (error) {
      logger.error('Error in crypto alerts:', error);
    }
  }

  async checkNewMemeCoins() {
    try {
      const newCoin = await this.cryptoTracker.getNewMemeCoinAlert();
      
      if (newCoin) {
        await this.postNewMemeCoinAlert(newCoin);
      }
    } catch (error) {
      logger.error('Error checking new meme coins:', error);
    }
  }

  async postMemeCoinAlert(alert) {
    const { coin, change, price } = alert;
    const direction = change > 0 ? '🚀' : '📉';
    const emoji = change > 0 ? '🔥' : '💸';
    
    const brickResponse = this.personality.generateResponse('meme coins');
    
    const alertTweet = `${emoji} ${coin.symbol} Alert! ${direction}

${coin.name} is ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(2)}% in 24h!
Price: $${price}

${brickResponse} ${coin.personality}! #${coin.symbol} #MemeCoins`;
    
    await this.tweet(alertTweet);
    logger.info(`🚨 Posted meme coin alert for ${coin.symbol}`);
  }

  async postMajorCoinAlert(alert) {
    const { coin, change, price } = alert;
    const direction = change > 0 ? '🚀' : '📉';
    const emoji = change > 0 ? '🔥' : '⚠️';
    
    const brickResponse = this.personality.generateResponse(coin.name.toLowerCase());
    
    const alertTweet = `${emoji} ${coin.symbol} Alert! ${direction}

${change > 0 ? 'Pumping' : 'Dumping'} ${Math.abs(change).toFixed(2)}% in 24h!
Price: $${price.toLocaleString()}

${brickResponse} #${coin.symbol} #Crypto`;
    
    await this.tweet(alertTweet);
    logger.info(`🚨 Posted major coin alert for ${coin.symbol}`);
  }

  async postNewMemeCoinAlert(alert) {
    const { coin } = alert;
    const brickResponse = this.personality.generateResponse('new meme coins');
    
    const newCoinTweet = `🔥 New meme coin trending! 🔥

${coin.name} (${coin.symbol}) is making moves!
Rank: #${coin.rank}

${brickResponse} But remember - DYOR! 📚 #MemeCoins #NewCoin`;
    
    await this.tweet(newCoinTweet);
    logger.info(`🆕 Posted new meme coin alert for ${coin.symbol}`);
  }

  async monitorTwitterCoins() {
    try {
      await this.coinDiscovery.monitorTwitterForCoins();
      const trending = this.coinDiscovery.getTrendingCoins();
      
      if (trending.length > 0) {
        const topCoin = trending[0];
        await this.postTwitterCoinAlert(topCoin);
      }
    } catch (error) {
      logger.error('Error monitoring Twitter coins:', error);
    }
  }

  async postTwitterCoinAlert(coinData) {
    const vibeCheck = await this.securityChecker.quickVibeCheck(coinData.symbol);
    
    if (vibeCheck.suspicious) {
      // Skip suspicious coins
      logger.info(`🚨 Skipping suspicious coin: ${coinData.symbol}`);
      return;
    }
    
    const brickResponse = this.personality.generateResponse('new coins');
    
    let tweet = `🔍 Twitter buzz alert! 🔍

$${coinData.symbol} is getting ${coinData.mentions} mentions!

${brickResponse}`;
    
    if (vibeCheck.funny) {
      tweet += ` This one makes me laugh! 😂`;
    }
    
    if (!vibeCheck.brickApproved) {
      tweet += `

${this.securityChecker.generateBrickWarning()}`;
    }
    
    tweet += ` #${coinData.symbol} #CryptoAlert`;
    
    await this.tweet(tweet);
    logger.info(`🔍 Posted social media trend alert for ${coinData.symbol}`);
  }

  async postRandomMoment() {
    try {
      const randomMoment = this.randomMoments.getRandomMoment();
      await this.tweet(randomMoment);
      logger.info('🎲 Posted random Brick moment');
    } catch (error) {
      logger.error('Error posting random moment:', error);
    }
  }

  async postLateNightLampThought() {
    try {
      const lampMoment = this.randomMoments.getLampMoment();
      const tweet = `🌙 Late night lamp thoughts...

${lampMoment}

#LampLife #StayClassy`;
      await this.tweet(tweet);
      logger.info('💡 Posted late night lamp thought');
    } catch (error) {
      logger.error('Error posting lamp thought:', error);
    }
  }

  async tweet(content) {
    try {
      const tweet = await this.twitter.v2.tweet(content);
      logger.info(`📤 Tweet posted: ${content}`);
      return tweet;
    } catch (error) {
      logger.error('Error posting tweet:', error);
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    logger.info('�� Interactive Brick Bot stopped');
  }
}

// === STARTUP ===
async function startInteractiveBrickBot() {
  try {
    await fs.mkdir('logs', { recursive: true });
    
    logger.info('🚀 Starting Interactive Brick Bot...');
    
    const brick = new InteractiveBrickBot();
    await brick.initialize();
    
    process.on('SIGINT', async () => {
      logger.info('📴 Shutting down gracefully...');
      await brick.stop();
      process.exit(0);
    });
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
    
  } catch (error) {
    logger.error('💥 Failed to start Interactive Brick Bot:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startInteractiveBrickBot();
}

module.exports = { InteractiveBrickBot, BrickPersonality, ConversationMemory };
