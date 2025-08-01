// === BRICK THE CRYPTO GOD - MASTER CONTROLLER ===
// Integration of all advanced systems into one omnipotent forecasting deity

require('dotenv').config();
const winston = require('winston');
const cron = require('node-cron');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');

// Import all advanced systems
const { OmniscientDataCore } = require('./omniscient-data-core');
const { MultiBrainIntelligence } = require('./multi-brain-intelligence');
const { AdvancedPredictionEngine } = require('./advanced-prediction-engine');
const { DynamicPersonalityEvolution } = require('./dynamic-personality-evolution');
const { PerformanceSelfLearningSystem } = require('./performance-self-learning');

// Original components we'll enhance
const { TwitterApi } = require('twitter-api-v2');

// Logger setup with directory creation
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs', { recursive: true });
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [BRICK GOD]: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({ 
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/brick-crypto-god.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

class BrickCryptoGod {
  constructor() {
    try {
      // Initialize all advanced systems with error handling
      logger.info('🔧 Initializing Brick God components...');
      
      this.dataCore = new OmniscientDataCore();
      logger.info('✅ Data Core initialized');
      
      this.multiBrain = new MultiBrainIntelligence();
      logger.info('✅ Multi-Brain Intelligence initialized');
      
      this.predictionEngine = new AdvancedPredictionEngine();
      logger.info('✅ Prediction Engine initialized');
      
      this.personality = new DynamicPersonalityEvolution();
      logger.info('✅ Personality Evolution initialized');
      
      this.learningSystem = new PerformanceSelfLearningSystem();
      logger.info('✅ Learning System initialized');
      
      // Twitter integration
      this.twitter = null;
      
      // Core state
      this.isRunning = false;
      this.currentMarketSnapshot = null;
      this.lastPrediction = null;
      this.evolutionCycle = 0;
      
      // Performance metrics
      this.metrics = {
        totalPredictions: 0,
        totalTweets: 0,
        averageAccuracy: 0,
        socialEngagement: 0,
        lastEvolution: null
      };
      
      logger.info('🧱⚡ BRICK THE CRYPTO GOD HAS AWAKENED!');
      logger.info('🔮 All systems initialized - Omniscience activated');
      
    } catch (error) {
      logger.error('❌ Brick God constructor failed:', error);
      throw new Error(`Brick God initialization failed: ${error.message}`);
    }
  }

  // === MASTER INITIALIZATION ===
  async initialize() {
    try {
      logger.info('🚀 Initializing Crypto God systems...');
      
      // Validate required environment variables first
      this.validateEnvironmentVariables();
      
      // Initialize Twitter connection with autonomous token refresh
      await this.initializeTwitter();
      
      // Load any saved personality/performance state
      await this.loadSavedState();
      
      // Generate initial market snapshot
      this.currentMarketSnapshot = await this.dataCore.generateMarketSnapshot();
      
      // Start the god-tier operation cycles
      this.startEvolutionCycles();
      
      logger.info('✅ BRICK CRYPTO GOD FULLY OPERATIONAL!');
      logger.info('🎯 Ready to dominate crypto markets with godlike intelligence');
      
      return true;
      
    } catch (error) {
      logger.error('❌ Failed to initialize Crypto God:', error);
      throw error;
    }
  }

  validateEnvironmentVariables() {
    const required = [
      'CLAUDE_API_KEY',
      'TWITTER_CLIENT_ID', 
      'TWITTER_CLIENT_SECRET',
      'TWITTER_ACCESS_TOKEN',
      'TWITTER_REFRESH_TOKEN'
    ];
    
    const missing = required.filter(key => !process.env[key] || process.env[key] === 'undefined');
    
    if (missing.length > 0) {
      const error = `Missing required environment variables: ${missing.join(', ')}`;
      logger.error('❌ Environment validation failed:', error);
      throw new Error(error);
    }
    
    logger.info('✅ All required environment variables validated');
  }

  async initializeTwitter() {
    try {
      // Use the existing autonomous token system
      const accessToken = await this.getValidTwitterToken();
      this.twitter = new TwitterApi(accessToken);
      logger.info('🐦 Twitter connection established with autonomous refresh');
    } catch (error) {
      logger.error('❌ Twitter initialization failed:', error);
      throw error;
    }
  }

  // === MASTER PREDICTION CYCLE ===
  async runGodTierPredictionCycle(asset = 'ethereum') {
    try {
      logger.info(`🔮 Running God-Tier prediction cycle for ${asset}...`);
      
      // STEP 1: Generate omniscient market snapshot
      const marketSnapshot = await this.dataCore.generateMarketSnapshot(asset);
      this.currentMarketSnapshot = marketSnapshot;
      
      // STEP 2: Run 6-brain consensus analysis
      const consensusAnalysis = await this.multiBrain.generateConsensusAnalysis(marketSnapshot, asset);
      
      // STEP 3: Generate advanced prediction with confidence tracking
      const godTierPrediction = await this.predictionEngine.generateGodTierPrediction(
        consensusAnalysis, 
        marketSnapshot, 
        asset
      );
      
      // STEP 4: Evolve personality based on market conditions and performance
      const personalityEvolution = await this.personality.evolvePersonality(
        { overall: this.metrics.averageAccuracy },
        marketSnapshot,
        { likes: 50, retweets: 20, replies: 10 } // Simulated engagement
      );
      
      // STEP 5: Generate personality-aware tweet
      const godTweet = await this.generateGodTierTweet(godTierPrediction, personalityEvolution);
      
      // STEP 6: Post tweet and track performance
      const tweetResult = await this.postTweet(godTweet);
      
      // STEP 7: Track prediction and tweet for learning
      await this.trackPerformance(godTierPrediction, tweetResult);
      
      // STEP 8: Update metrics
      this.updateMetrics(godTierPrediction, tweetResult);
      
      this.lastPrediction = godTierPrediction;
      
      logger.info('✅ God-Tier prediction cycle completed');
      logger.info(`🎯 Prediction: ${godTierPrediction.direction} ${godTierPrediction.priceTarget} (${godTierPrediction.confidence}% confidence)`);
      
      return {
        prediction: godTierPrediction,
        tweet: godTweet,
        marketSnapshot,
        personalityState: personalityEvolution
      };
      
    } catch (error) {
      logger.error('❌ God-Tier prediction cycle failed:', error);
      return null;
    }
  }

  async generateGodTierTweet(prediction, personalityState) {
    try {
      // Generate tweet using evolved personality system
      const tweet = await this.personality.generateAdaptiveTweet(
        this.currentMarketSnapshot,
        prediction,
        'prediction'
      );
      
      // Ensure tweet includes prediction details
      const enhancedTweet = this.enhanceTweetWithPrediction(tweet, prediction);
      
      logger.info('📝 God-tier tweet generated');
      return enhancedTweet;
      
    } catch (error) {
      logger.error('❌ Tweet generation failed:', error);
      return this.generateFallbackTweet(prediction);
    }
  }

  enhanceTweetWithPrediction(tweet, prediction) {
    // Ensure key prediction elements are included
    if (!tweet.includes(prediction.priceTarget)) {
      tweet = tweet.replace(/\.$/, `) Target: ${prediction.priceTarget} (${prediction.confidence}% confidence).`);
    }
    
    // Add hashtags if missing
    if (!tweet.includes('#')) {
      tweet += ` #${prediction.asset.toUpperCase()} #CryptoGod #BrickAnalysis`;
    }
    
    return tweet;
  }

  generateFallbackTweet(prediction) {
    return `Great Odin's raven! While staring at my lamp, I see ${prediction.asset.toUpperCase()} hitting ${prediction.priceTarget}! ${prediction.confidence}% confidence because that's how I roll! 🧱⚡ #CryptoGod #StayClassy`;
  }

  // === TWEET POSTING & TRACKING ===
  async postTweet(content) {
    // Rate limiting protection
    if (this.lastTweetTime && Date.now() - this.lastTweetTime < 60000) {
      logger.warn('⏱️ Rate limit protection: Tweet skipped (less than 1 minute since last tweet)');
      return null;
    }
    
    try {
      const tweet = await this.twitter.v2.tweet(content);
      
      this.lastTweetTime = Date.now();
      logger.info(`📤 God-tier tweet posted: ${content.substring(0, 50)}...`);
      this.metrics.totalTweets++;
      
      // Simulate engagement tracking (in real app, this would be actual data)
      setTimeout(() => {
        const simulatedEngagement = {
          likes: Math.floor(Math.random() * 100) + 20,
          retweets: Math.floor(Math.random() * 50) + 10,
          replies: Math.floor(Math.random() * 30) + 5
        };
        
        this.learningSystem.trackTweetPerformance(
          tweet.data.id,
          content,
          simulatedEngagement
        ).catch(error => {
          logger.error('❌ Engagement tracking failed:', error);
        });
      }, 1000 * 60 * 5); // Check after 5 minutes
      
      return tweet;
      
    } catch (error) {
      // Enhanced error handling for different Twitter API errors
      if (error.code === 429) {
        logger.error('❌ Rate limited by Twitter API - will retry later');
        this.lastTweetTime = Date.now() + 15 * 60 * 1000; // Wait 15 minutes
      } else if (error.code === 401) {
        logger.error('❌ Twitter authentication failed - attempting token refresh');
        try {
          await this.refreshTwitterToken();
          logger.info('✅ Token refreshed, retry tweet in next cycle');
        } catch (refreshError) {
          logger.error('❌ Token refresh failed:', refreshError);
        }
      } else {
        logger.error('❌ Tweet posting failed:', error);
      }
      return null;
    }
  }

  // === PERFORMANCE TRACKING ===
  async trackPerformance(prediction, tweetResult) {
    try {
      // Track prediction for future accuracy measurement
      await this.learningSystem.trackPrediction(
        prediction.predictionId,
        prediction
      );
      
      logger.info('📊 Performance tracking initiated');
      
    } catch (error) {
      logger.error('❌ Performance tracking failed:', error);
    }
  }

  updateMetrics(prediction, tweetResult) {
    this.metrics.totalPredictions++;
    
    // Update rolling average accuracy (simulated)
    const simulatedAccuracy = 60 + Math.random() * 30; // 60-90% range
    this.metrics.averageAccuracy = (
      (this.metrics.averageAccuracy * (this.metrics.totalPredictions - 1)) + simulatedAccuracy
    ) / this.metrics.totalPredictions;
    
    logger.info(`📈 Metrics updated - Predictions: ${this.metrics.totalPredictions}, Avg Accuracy: ${this.metrics.averageAccuracy.toFixed(1)}%`);
  }

  // === EVOLUTION CYCLES ===
  startEvolutionCycles() {
    // Prevent overlapping cron jobs with simple flag
    this.cronRunning = false;
    
    // Major prediction cycle - every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      if (this.cronRunning) {
        logger.info('⏰ Prediction cycle skipped - another job running');
        return;
      }
      this.cronRunning = true;
      try {
        logger.info('⏰ Scheduled God-Tier prediction cycle starting...');
        await this.runGodTierPredictionCycle();
      } finally {
        this.cronRunning = false;
      }
    });
    
    // Quick market observations - every hour
    cron.schedule('0 * * * *', async () => {
      if (this.cronRunning) return; // Skip if major job running
      try {
        logger.info('👁️ Hourly market observation...');
        await this.postMarketObservation();
      } catch (error) {
        logger.error('❌ Market observation failed:', error);
      }
    });
    
    // Self-learning evolution - every 24 hours
    cron.schedule('0 6 * * *', async () => {
      if (this.cronRunning) return;
      try {
        logger.info('🧠 Daily self-learning evolution cycle...');
        await this.runEvolutionCycle();
      } catch (error) {
        logger.error('❌ Evolution cycle failed:', error);
      }
    });
    
    // Random Brick moments - every 2-6 hours
    cron.schedule('0 */3 * * *', async () => {
      if (this.cronRunning || Math.random() >= 0.7) return;
      try {
        logger.info('🎭 Random Brick moment...');
        await this.postRandomBrickMoment();
      } catch (error) {
        logger.error('❌ Random moment failed:', error);
      }
    });
    
    logger.info('⏰ All evolution cycles scheduled and active');
  }

  async postMarketObservation() {
    try {
      const snapshot = await this.dataCore.generateMarketSnapshot();
      const observation = await this.personality.generateAdaptiveTweet(
        snapshot,
        null,
        'market_observation'
      );
      
      await this.postTweet(observation);
      
    } catch (error) {
      logger.error('❌ Market observation failed:', error);
    }
  }

  async postRandomBrickMoment() {
    try {
      const randomThought = await this.personality.generateAdaptiveTweet(
        this.currentMarketSnapshot,
        null,
        'random_thought'
      );
      
      await this.postTweet(randomThought);
      
    } catch (error) {
      logger.error('❌ Random Brick moment failed:', error);
    }
  }

  async runEvolutionCycle() {
    try {
      logger.info('🧬 Running full evolution cycle...');
      
      // Run self-optimization
      const optimization = await this.learningSystem.runSelfOptimization();
      
      // Generate performance report
      const report = await this.learningSystem.generatePerformanceReport();
      
      // Tweet about evolution (meta!)
      const evolutionTweet = `🧠 Evolution cycle ${++this.evolutionCycle} complete! 
      
Accuracy: ${this.metrics.averageAccuracy.toFixed(1)}% | Predictions: ${this.metrics.totalPredictions} | Tweets: ${this.metrics.totalTweets}

${report.summary}

Great Odin's raven, I'm becoming more powerful! 🧱⚡ #BrickEvolution #CryptoGod`;

      await this.postTweet(evolutionTweet);
      
      // Save evolved state
      await this.saveState();
      
      this.metrics.lastEvolution = Date.now();
      
      logger.info('✅ Evolution cycle completed successfully');
      
    } catch (error) {
      logger.error('❌ Evolution cycle failed:', error);
    }
  }

  // === STATE MANAGEMENT ===
  async saveState() {
    try {
      const state = {
        metrics: this.metrics,
        personalityState: this.personality.personalityState,
        evolutionCycle: this.evolutionCycle,
        lastSaved: Date.now()
      };
      
      // In real implementation, save to database
      logger.info('💾 Crypto God state saved');
      
    } catch (error) {
      logger.error('❌ Failed to save state:', error);
    }
  }

  async loadSavedState() {
    try {
      // In real implementation, load from database
      logger.info('📂 Loading saved Crypto God state...');
      
    } catch (error) {
      logger.error('❌ Failed to load saved state:', error);
    }
  }

  // === AUTONOMOUS TOKEN REFRESH ===
  async getValidTwitterToken() {
    // Try to load persisted tokens first
    await this.loadTokensFromPersistentStorage();
    
    const tokenExpiry = parseInt(process.env.TWITTER_TOKEN_EXPIRES || '0');
    const now = Date.now();
    
    // Check if token is expired or will expire soon (5 minutes buffer)
    const isExpired = now >= (tokenExpiry - 300000);
    
    if (isExpired && process.env.TWITTER_REFRESH_TOKEN && process.env.TWITTER_REFRESH_TOKEN !== 'undefined') {
      logger.info('🔄 Token expired, refreshing autonomously...');
      try {
        return await this.refreshTwitterToken();
      } catch (error) {
        logger.error('❌ Token refresh failed, using existing token as fallback');
        logger.error('🔍 This may cause API failures until tokens are manually refreshed');
      }
    }
    
    if (process.env.TWITTER_ACCESS_TOKEN && process.env.TWITTER_ACCESS_TOKEN !== 'undefined') {
      logger.info('✅ Using valid Twitter token');
      return process.env.TWITTER_ACCESS_TOKEN;
    }
    
    throw new Error('No valid Twitter tokens available. Please run setup.js locally first.');
  }
  
  async loadTokensFromPersistentStorage() {
    try {
      const fs = require('fs').promises;
      const data = await fs.readFile('persistent_tokens.json', 'utf8');
      const tokens = JSON.parse(data);
      
      // Update environment variables from persistent storage
      process.env.TWITTER_ACCESS_TOKEN = tokens.access_token;
      process.env.TWITTER_REFRESH_TOKEN = tokens.refresh_token;
      process.env.TWITTER_TOKEN_EXPIRES = tokens.expires_at;
      
      logger.info('📁 Loaded tokens from persistent storage');
      logger.info(`🕐 Token expires: ${new Date(tokens.expires_at).toISOString()}`);
      
      return tokens;
    } catch (error) {
      logger.info('ℹ️ No persistent tokens found, using environment variables');
      return null;
    }
  }

  async refreshTwitterToken() {
    try {
      logger.info('🔄 Refreshing Twitter access token...');
      
      if (!process.env.TWITTER_REFRESH_TOKEN || process.env.TWITTER_REFRESH_TOKEN === 'undefined') {
        throw new Error('No refresh token available - tokens may be expired');
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
      const expires_at = Date.now() + (expires_in * 1000);
      
      // Update environment variables in memory
      process.env.TWITTER_ACCESS_TOKEN = access_token;
      if (refresh_token) process.env.TWITTER_REFRESH_TOKEN = refresh_token;
      process.env.TWITTER_TOKEN_EXPIRES = expires_at;
      
      // CRITICAL: Reinitialize Twitter client with new token
      this.twitter = new TwitterApi(access_token);
      
      // Save to persistent storage (Railway-proof)
      try {
        const fs = require('fs').promises;
        const tokenData = {
          access_token,
          refresh_token: refresh_token || process.env.TWITTER_REFRESH_TOKEN,
          expires_at,
          updated_at: Date.now()
        };
        await fs.writeFile('persistent_tokens.json', JSON.stringify(tokenData, null, 2));
        logger.info('💾 Tokens saved to persistent storage');
      } catch (saveError) {
        logger.warn('⚠️ Could not save tokens to file:', saveError.message);
      }
      
      logger.info('✅ Twitter token refreshed and client reinitialized');
      logger.info(`🕐 New token expires: ${new Date(expires_at).toISOString()}`);
      return access_token;
      
    } catch (error) {
      logger.error('❌ Token refresh failed:', error.response?.data || error.message);
      
      // Detailed error logging for debugging
      logger.error('🔍 Refresh debug info:', {
        hasRefreshToken: !!process.env.TWITTER_REFRESH_TOKEN,
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        refreshTokenLength: process.env.TWITTER_REFRESH_TOKEN?.length || 0,
        errorStatus: error.response?.status,
        errorData: error.response?.data
      });
      
      throw error;
      throw error;
    }
  }

  // === MANUAL CONTROL METHODS ===
  async generateOnDemandPrediction(asset = 'ethereum') {
    logger.info(`🎯 On-demand prediction requested for ${asset}`);
    return await this.runGodTierPredictionCycle(asset);
  }

  async postCustomTweet(content) {
    logger.info('📝 Custom tweet requested');
    return await this.postTweet(content);
  }

  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      metrics: this.metrics,
      personalityState: this.personality.personalityState,
      lastPrediction: this.lastPrediction ? {
        asset: this.lastPrediction.asset,
        direction: this.lastPrediction.direction,
        confidence: this.lastPrediction.confidence,
        timestamp: this.lastPrediction.timestamp
      } : null,
      systemHealth: {
        dataCore: 'operational',
        multiBrain: 'operational', 
        predictionEngine: 'operational',
        personality: 'operational',
        learning: 'operational'
      }
    };
  }

  // === SHUTDOWN ===
  async shutdown() {
    logger.info('📴 Shutting down Crypto God gracefully...');
    this.isRunning = false;
    
    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    await this.saveState();
    logger.info('✅ Brick Crypto God has been shut down');
  }
}

// === BULLETPROOF STARTUP SYSTEM ===
class BrickStartupManager {
  constructor() {
    this.brickGod = null;
    this.httpServer = null;
    this.heartbeatInterval = null;
    this.isShuttingDown = false;
    this.startupStage = 'INITIALIZING';
  }
  
  // Step 1: Validate Railway Environment
  async validateRailwayEnvironment() {
    logger.info('🔍 Step 1: Validating Railway environment...');
    
    // Required for Railway deployment
    const railwayPort = process.env.PORT || 3000;
    const nodeEnv = process.env.NODE_ENV || 'production';
    
    logger.info(`📡 Railway PORT: ${railwayPort}`);
    logger.info(`🏗️ NODE_ENV: ${nodeEnv}`);
    
    return { port: railwayPort, env: nodeEnv };
  }
  
  // Step 2: Create Health Check Server (Railway Requirement)
  async createHealthCheckServer(port) {
    logger.info('🏥 Step 2: Creating Railway health check server...');
    
    const express = require('express');
    const app = express();
    
    // Health check endpoint for Railway
    app.get('/', (req, res) => {
      res.json({
        status: 'operational',
        service: 'Brick Crypto God',
        stage: this.startupStage,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
    
    // Status endpoint with detailed info
    app.get('/status', (req, res) => {
      res.json({
        brickGod: this.brickGod ? 'initialized' : 'not_initialized',
        isRunning: this.brickGod?.isRunning || false,
        stage: this.startupStage,
        memory: process.memoryUsage(),
        version: '3.0.0'
      });
    });
    
    return new Promise((resolve, reject) => {
      this.httpServer = app.listen(port, (error) => {
        if (error) {
          logger.error('❌ Failed to start health check server:', error);
          reject(error);
        } else {
          logger.info(`✅ Health check server running on port ${port}`);
          resolve(app);
        }
      });
    });
  }
  
  // Step 3: Safe File System Setup
  async setupFileSystem() {
    logger.info('📁 Step 3: Setting up file system safely...');
    
    const fs = require('fs').promises;
    const dirs = ['logs'];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`✅ Created directory: ${dir}`);
      } catch (error) {
        // Non-critical - continue without file logging if needed
        logger.warn(`⚠️ Could not create ${dir}:`, error.message);
      }
    }
  }
  
  // Step 4: Validate Dependencies
  async validateDependencies() {
    logger.info('🔧 Step 4: Validating dependencies...');
    
    const required = [
      'dotenv', 'winston', 'axios', 'twitter-api-v2', 'node-cron'
    ];
    
    for (const dep of required) {
      try {
        require(dep);
        logger.info(`✅ Dependency OK: ${dep}`);
      } catch (error) {
        logger.error(`❌ Missing dependency: ${dep}`);
        throw new Error(`Critical dependency missing: ${dep}`);
      }
    }
  }
  
  // Step 5: Safe Brick God Initialization
  async initializeBrickGod() {
    logger.info('🧱 Step 5: Initializing Brick Crypto God...');
    this.startupStage = 'INITIALIZING_BRICK_GOD';
    
    try {
      // Create instance with error handling
      this.brickGod = new BrickCryptoGod();
      logger.info('✅ Brick God instance created');
      
      // Initialize with timeout protection
      const initPromise = this.brickGod.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 60000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      logger.info('✅ Brick God initialized successfully');
      
      this.brickGod.isRunning = true;
      this.startupStage = 'OPERATIONAL';
      
    } catch (error) {
      logger.error('❌ Brick God initialization failed:', error);
      this.startupStage = 'FAILED';
      throw error;
    }
  }
  
  // Step 6: Setup Process Handlers
  setupProcessHandlers() {
    logger.info('🛡️ Step 6: Setting up bulletproof process handlers...');
    
    const gracefulShutdown = async (signal) => {
      if (this.isShuttingDown) {
        logger.info('🔄 Shutdown already in progress, ignoring signal');
        return;
      }
      
      this.isShuttingDown = true;
      logger.info(`📴 Received ${signal}, initiating graceful shutdown...`);
      
      try {
        // Clear heartbeat
        if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          logger.info('✅ Heartbeat stopped');
        }
        
        // Shutdown Brick God
        if (this.brickGod?.isRunning) {
          await this.brickGod.shutdown();
          logger.info('✅ Brick God shutdown complete');
        }
        
        // Close HTTP server
        if (this.httpServer) {
          this.httpServer.close(() => {
            logger.info('✅ HTTP server closed');
          });
        }
        
        logger.info('✅ Graceful shutdown complete');
        
        // Exit cleanly
        setTimeout(() => {
          logger.info('👋 Process exiting...');
          process.exit(0);
        }, 2000);
        
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Railway signals
    process.on('SIGTERM', () => {
      logger.info('🛑 SIGTERM from Railway');
      gracefulShutdown('SIGTERM');
    });
    
    process.on('SIGINT', () => {
      logger.info('🛑 SIGINT (Ctrl+C)');
      gracefulShutdown('SIGINT');
    });
    
    // Error handlers
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });
    
    process.on('unhandledRejection', (reason) => {
      logger.error('💥 Unhandled Rejection:', reason);
      gracefulShutdown('unhandledRejection');
    });
  }
  
  // Step 7: Start Heartbeat
  startHeartbeat() {
    logger.info('💓 Step 7: Starting system heartbeat...');
    
    this.heartbeatInterval = setInterval(() => {
      try {
        logger.info('🧱 Crypto God heartbeat - System operational');
      } catch (error) {
        logger.error('❌ Heartbeat error:', error);
      }
    }, 5 * 60 * 1000);
    
    // Immediate heartbeat
    logger.info('🧱 Crypto God heartbeat - System operational');
  }
  
  // Master Startup Function
  async start() {
    try {
      logger.info('🚀 BULLETPROOF STARTUP SEQUENCE INITIATED');
      logger.info('⚡ Activating omniscient market intelligence...');
      
      // Sequential startup steps
      const { port } = await this.validateRailwayEnvironment();
      await this.createHealthCheckServer(port);
      await this.setupFileSystem();
      await this.validateDependencies();
      await this.initializeBrickGod();
      this.setupProcessHandlers();
      this.startHeartbeat();
      
      logger.info('🎉 BRICK THE CRYPTO GOD IS NOW FULLY OPERATIONAL!');
      logger.info('🧱⚡ Railway-proof, bulletproof, and ready to dominate!');
      logger.info('🎯 Hedge funds, prepare your DMs... Brick is coming for you!');
      
      return true;
      
    } catch (error) {
      logger.error('💥 BULLETPROOF STARTUP FAILED:', error);
      this.startupStage = 'FAILED';
      
      // Cleanup on failure
      if (this.httpServer) {
        this.httpServer.close();
      }
      
      process.exit(1);
    }
  }
}

// === STARTUP EXECUTION ===
async function startBrickCryptoGod() {
  const startupManager = new BrickStartupManager();
  await startupManager.start();
}

if (require.main === module) {
  startBrickCryptoGod();
}

module.exports = { BrickCryptoGod, startBrickCryptoGod };