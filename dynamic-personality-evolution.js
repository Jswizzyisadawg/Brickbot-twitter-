// === DYNAMIC PERSONALITY EVOLUTION - BRICK'S ADAPTIVE SOUL ===
// Personality that evolves based on performance, market conditions, and interactions

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const winston = require('winston');

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

class DynamicPersonalityEvolution {
  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    
    // Core personality dimensions that evolve
    this.personalityState = {
      confidence: 0.6,        // 0-1 based on recent prediction accuracy
      confusion: 0.7,         // 0-1 based on market volatility 
      enthusiasm: 0.8,        // 0-1 based on engagement and positive feedback
      lampObsession: 0.9,     // Constant - this never changes
      weathermanMode: 0.5,    // 0-1 based on how "professional" recent tweets were
      surpriseBrilliance: 0.05 // 0-1 probability of genius moments
    };
    
    // Performance tracking for personality adaptation
    this.performanceMetrics = {
      recentAccuracy: [],
      engagementScores: [],
      marketVolatility: [],
      userFeedback: []
    };
    
    // Personality modes that Brick can shift between
    this.personalityModes = {
      humble: "Recent predictions were wrong - confused but learning",
      confident: "On a winning streak - cocky but still loveable", 
      confused: "Markets are unpredictable - extra confused energy",
      genius: "Making brilliant connections - rare moments of clarity",
      lampObsessed: "Random lamp tangents dominate thoughts",
      weatherman: "Professional news anchor delivery",
      manic: "Extremely excited about crypto developments",
      philosophical: "Deep thoughts about crypto and existence"
    };
    
    logger.info('🎭 Dynamic Personality Evolution initialized - Brick\'s soul is alive!');
  }

  // === PERSONALITY STATE EVOLUTION ===
  async evolvePersonality(predictionAccuracy, marketData, engagementMetrics) {
    try {
      logger.info('🧬 Evolving Brick\'s personality based on recent performance...');
      
      // Update core personality dimensions
      await this.updateConfidence(predictionAccuracy);
      await this.updateConfusion(marketData);
      await this.updateEnthusiasm(engagementMetrics);
      await this.updateWeathermanMode();
      await this.updateSurpriseBrilliance(predictionAccuracy);
      
      // Determine current dominant personality mode
      const currentMode = this.determineDominantMode();
      
      logger.info(`🎭 Personality evolved - Current mode: ${currentMode}`);
      return {
        state: this.personalityState,
        mode: currentMode,
        evolution: this.generateEvolutionSummary()
      };
      
    } catch (error) {
      logger.error('❌ Personality evolution failed:', error);
      return { state: this.personalityState, mode: 'neutral' };
    }
  }

  async updateConfidence(accuracyData) {
    if (!accuracyData) return;
    
    const recentAccuracy = accuracyData.overall || 60;
    
    // Confidence evolves based on prediction accuracy
    if (recentAccuracy > 80) {
      this.personalityState.confidence = Math.min(0.95, this.personalityState.confidence + 0.1);
    } else if (recentAccuracy < 40) {
      this.personalityState.confidence = Math.max(0.2, this.personalityState.confidence - 0.15);
    } else {
      // Gradual return to baseline
      this.personalityState.confidence = 0.6 + (recentAccuracy - 60) * 0.005;
    }
    
    this.performanceMetrics.recentAccuracy.push(recentAccuracy);
    if (this.performanceMetrics.recentAccuracy.length > 20) {
      this.performanceMetrics.recentAccuracy = this.performanceMetrics.recentAccuracy.slice(-20);
    }
  }

  async updateConfusion(marketData) {
    if (!marketData?.market?.technicals?.priceAction?.volatility) return;
    
    const volatility = marketData.market.technicals.priceAction.volatility;
    
    // More volatile markets = more confusion
    if (volatility > 8) {
      this.personalityState.confusion = Math.min(0.95, this.personalityState.confusion + 0.1);
    } else if (volatility < 3) {
      this.personalityState.confusion = Math.max(0.4, this.personalityState.confusion - 0.05);
    }
    
    this.performanceMetrics.marketVolatility.push(volatility);
    if (this.performanceMetrics.marketVolatility.length > 10) {
      this.performanceMetrics.marketVolatility = this.performanceMetrics.marketVolatility.slice(-10);
    }
  }

  async updateEnthusiasm(engagementMetrics) {
    if (!engagementMetrics) return;
    
    // Enthusiasm based on social engagement
    const avgEngagement = engagementMetrics.likes + engagementMetrics.retweets + engagementMetrics.replies;
    
    if (avgEngagement > 50) {
      this.personalityState.enthusiasm = Math.min(0.95, this.personalityState.enthusiasm + 0.05);
    } else if (avgEngagement < 10) {
      this.personalityState.enthusiasm = Math.max(0.3, this.personalityState.enthusiasm - 0.1);
    }
    
    this.performanceMetrics.engagementScores.push(avgEngagement);
    if (this.performanceMetrics.engagementScores.length > 15) {
      this.performanceMetrics.engagementScores = this.performanceMetrics.engagementScores.slice(-15);
    }
  }

  async updateWeathermanMode() {
    // Weatherman mode increases with successful professional-style predictions
    const recentSuccess = this.performanceMetrics.recentAccuracy.slice(-5);
    const avgRecentSuccess = recentSuccess.reduce((a, b) => a + b, 0) / recentSuccess.length || 60;
    
    if (avgRecentSuccess > 75) {
      this.personalityState.weathermanMode = Math.min(0.8, this.personalityState.weathermanMode + 0.05);
    } else {
      this.personalityState.weathermanMode = Math.max(0.2, this.personalityState.weathermanMode - 0.02);
    }
  }

  async updateSurpriseBrilliance(accuracyData) {
    if (!accuracyData) return;
    
    // Surprise brilliance increases with consistent high accuracy
    const recentAccuracy = accuracyData.overall || 60;
    
    if (recentAccuracy > 85) {
      this.personalityState.surpriseBrilliance = Math.min(0.15, this.personalityState.surpriseBrilliance + 0.01);
    } else if (recentAccuracy < 50) {
      this.personalityState.surpriseBrilliance = Math.max(0.02, this.personalityState.surpriseBrilliance - 0.005);
    }
  }

  determineDominantMode() {
    const { confidence, confusion, enthusiasm, weathermanMode, surpriseBrilliance } = this.personalityState;
    
    // Determine mode based on personality state
    if (Math.random() < surpriseBrilliance) return 'genius';
    if (confidence < 0.3) return 'humble';
    if (confidence > 0.8 && weathermanMode > 0.6) return 'weatherman';
    if (confidence > 0.8) return 'confident';
    if (confusion > 0.8) return 'confused';
    if (enthusiasm > 0.9) return 'manic';
    if (Math.random() < 0.1) return 'lampObsessed'; // Always a chance for lamp thoughts
    
    return 'neutral';
  }

  generateEvolutionSummary() {
    return {
      confidenceTrend: this.getTrend(this.performanceMetrics.recentAccuracy),
      confusionLevel: this.personalityState.confusion > 0.7 ? 'high' : 'moderate',
      enthusiasmLevel: this.personalityState.enthusiasm > 0.8 ? 'very_high' : 'moderate',
      recentChanges: this.getRecentPersonalityChanges()
    };
  }

  getTrend(dataArray) {
    if (dataArray.length < 2) return 'stable';
    const recent = dataArray.slice(-3);
    const older = dataArray.slice(-6, -3);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg + 5) return 'improving';
    if (recentAvg < olderAvg - 5) return 'declining';
    return 'stable';
  }

  getRecentPersonalityChanges() {
    // Track what aspects of personality have changed recently
    return {
      confidence: this.personalityState.confidence > 0.7 ? 'high' : 'moderate',
      confusion: this.personalityState.confusion > 0.8 ? 'very_confused' : 'normal_confusion',
      lampObsession: 'constant' // Never changes
    };
  }

  // === GENERATE PERSONALITY-AWARE CONTENT ===
  async generatePersonalityPrompt(contentType = 'tweet', context = {}) {
    const currentMode = this.determineDominantMode();
    const modeDescription = this.personalityModes[currentMode];
    
    const basePrompt = `You are Brick Tamland, crypto forecasting god.

CURRENT PERSONALITY STATE:
- Mode: ${currentMode} (${modeDescription})
- Confidence: ${Math.round(this.personalityState.confidence * 100)}%
- Confusion: ${Math.round(this.personalityState.confusion * 100)}%
- Enthusiasm: ${Math.round(this.personalityState.enthusiasm * 100)}%
- Weatherman Mode: ${Math.round(this.personalityState.weathermanMode * 100)}%
- Lamp Obsession: MAXIMUM (never changes)

RECENT PERFORMANCE CONTEXT:
- Recent prediction accuracy: ${this.getRecentAccuracyAvg()}%
- Market volatility: ${this.getRecentVolatilityAvg()}%
- Social engagement trend: ${this.getTrend(this.performanceMetrics.engagementScores)}`;

    // Add mode-specific personality instructions
    const modeInstructions = this.getModeSpecificInstructions(currentMode);
    
    return `${basePrompt}

${modeInstructions}

Create ${contentType} that authentically reflects your current personality state. Be natural and spontaneous, not scripted.`;
  }

  getModeSpecificInstructions(mode) {
    const instructions = {
      humble: "You're unsure after recent wrong predictions. Sound confused but eager to learn. Use phrases like 'I might be wrong but...' and 'Great Odin's raven, this is confusing!'",
      
      confident: "You're on fire with recent predictions. Sound cocky but still loveable. Use '60% of the time, it works every time' and 'I'm kind of a big deal in crypto'",
      
      confused: "Markets are crazy and you're extra confused. Sound bewildered but trying your best. Mix up technical terms occasionally.",
      
      genius: "You're having a rare moment of brilliance. Sound surprisingly insightful while still being Brick. Connect complex concepts naturally.",
      
      lampObsessed: "Lamps are dominating your thoughts. Work lamp references into crypto analysis naturally. 'While staring at my lamp, I realized...'",
      
      weatherman: "Channel professional news anchor energy. Sound authoritative but still make Brick-isms. 'This is Brick Tamland with your crypto forecast...'",
      
      manic: "You're extremely excited about crypto. High energy, lots of enthusiasm, multiple exclamation points. Everything is AMAZING!",
      
      philosophical: "Deep thoughts about crypto and existence. Ponder the meaning of decentralization while mentioning lamps."
    };
    
    return instructions[mode] || "Be your normal Brick self - confused but loveable.";
  }

  getRecentAccuracyAvg() {
    const recent = this.performanceMetrics.recentAccuracy.slice(-5);
    return recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 60;
  }

  getRecentVolatilityAvg() {
    const recent = this.performanceMetrics.marketVolatility.slice(-3);
    return recent.length ? Math.round(recent.reduce((a, b) => a + b, 0) / recent.length) : 5;
  }

  // === PERSONALITY-AWARE TWEET GENERATION ===
  async generateAdaptiveTweet(marketData, predictionData = null, tweetType = 'general') {
    try {
      // Input validation
      if (!marketData && tweetType === 'market_observation') {
        logger.warn('No market data provided for market observation tweet');
        tweetType = 'random_thought';
      }
      
      const personalityPrompt = await this.generatePersonalityPrompt('tweet', {
        marketData,
        predictionData,
        tweetType
      });
      
      let specificPrompt = '';
      
      switch (tweetType) {
        case 'prediction':
          const asset = predictionData?.asset || 'crypto';
          specificPrompt = `Create a prediction tweet about ${asset} with your current personality. Include specific price targets and confidence level.`;
          break;
          
        case 'market_observation':
          const sentiment = marketData?.market?.sentiment?.value || 'unknown';
          specificPrompt = `Comment on current market conditions with your personality. Reference specific data like fear/greed index: ${sentiment}`;
          break;
          
        case 'random_thought':
          specificPrompt = `Share a random crypto thought that fits your current mood. Let your personality shine through naturally.`;
          break;
          
        default:
          specificPrompt = `Create an engaging crypto tweet that reflects your current personality state.`;
      }
      
      const fullPrompt = `${personalityPrompt}

${specificPrompt}

Keep it under 280 characters. Make it sound authentic and spontaneous, not scripted. Include relevant crypto hashtags naturally.`;

      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 300,
        messages: [{ role: "user", content: fullPrompt }]
      });

      let tweetText = response.content[0].text;
      
      // Validate tweet length and truncate if necessary
      if (tweetText.length > 280) {
        logger.warn('Tweet too long, truncating...');
        tweetText = tweetText.substring(0, 277) + '...';
      }
      
      return tweetText;
      
    } catch (error) {
      logger.error('❌ Adaptive tweet generation failed:', error);
      
      // Fallback tweets based on personality state
      const fallbacks = [
        "Great Odin's raven! My personality system is confused right now. But I still love lamp! 🧱💡 #StayClassy",
        "60% of the time, my AI works every time! Currently experiencing technical difficulties... #BrickLife 🧱",
        "While staring at my lamp, I realize sometimes even crypto gods need a reboot! 💡⚡ #TechnicalDifficulties"
      ];
      
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
  }

  // === PERSONALITY STATE PERSISTENCE ===
  async savePersonalityState() {
    try {
      const stateData = {
        personalityState: this.personalityState,
        performanceMetrics: {
          recentAccuracy: this.performanceMetrics.recentAccuracy,
          engagementScores: this.performanceMetrics.engagementScores,
          marketVolatility: this.performanceMetrics.marketVolatility
        },
        lastUpdated: Date.now()
      };
      
      // In a real implementation, this would save to a database
      logger.info('💾 Personality state saved');
      return stateData;
      
    } catch (error) {
      logger.error('❌ Failed to save personality state:', error);
    }
  }

  async loadPersonalityState(savedState) {
    try {
      if (savedState) {
        this.personalityState = { ...this.personalityState, ...savedState.personalityState };
        this.performanceMetrics = { ...this.performanceMetrics, ...savedState.performanceMetrics };
        logger.info('📂 Personality state loaded');
      }
    } catch (error) {
      logger.error('❌ Failed to load personality state:', error);
    }
  }
}

module.exports = { DynamicPersonalityEvolution };