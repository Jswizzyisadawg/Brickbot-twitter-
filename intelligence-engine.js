// === BRICK'S INTELLIGENCE LAYER - THE BRAIN ===
// Event-driven filtering system for high-confidence crypto insights

require('dotenv').config();
const winston = require('winston');
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

class IntelligenceEngine {
  constructor() {
    this.dataCore = new OmniscientDataCore();
    this.alertThreshold = 75; // Only alert on 75%+ confidence signals
    this.marketContext = 'neutral';
    this.lastAlerts = new Map(); // Prevent spam alerts
    this.alertCooldown = 15 * 60 * 1000; // 15 minutes between similar alerts
    
    logger.info('🧠 Intelligence Engine initialized - Brick is thinking...');
  }

  // === SMART SIGNAL DETECTION ===
  async detectHighConfidenceSignals(assets = ['ethereum', 'bitcoin', 'solana']) {
    try {
      logger.info('🔍 Scanning for high-confidence trading signals...');
      
      const signals = [];
      
      for (const asset of assets) {
        try {
          // Get advanced technical analysis from Trinity
          const analysis = await this.dataCore.getTechnicalSignals(asset);
          
          if (analysis && analysis.confidence >= this.alertThreshold) {
            const signal = {
              asset: asset,
              confidence: analysis.confidence,
              signal: analysis.signal,
              price: analysis.currentPrice,
              reasoning: analysis.reasoning,
              timestamp: Date.now(),
              marketContext: this.marketContext,
              alertLevel: this.getAlertLevel(analysis.confidence)
            };
            
            signals.push(signal);
            logger.info(`🚨 HIGH CONFIDENCE SIGNAL: ${asset} - ${analysis.confidence}% confidence`);
          }
          
        } catch (error) {
          logger.error(`❌ Failed to analyze ${asset}:`, error.message);
        }
      }
      
      return signals;
      
    } catch (error) {
      logger.error('❌ Signal detection failed:', error);
      return [];
    }
  }

  // === MARKET CONTEXT AWARENESS ===
  async analyzeMarketContext() {
    try {
      logger.info('📊 Analyzing overall market context...');
      
      const [marketData, sentiment, btcAnalysis] = await Promise.all([
        this.dataCore.getMarketOverview(),
        this.dataCore.getFearGreedIndex(),
        this.dataCore.getTechnicalSignals('bitcoin')
      ]);

      // Determine market regime
      let context = 'neutral';
      let confidence = 0.5;
      
      // Bull market indicators
      if (sentiment.value > 70 && 
          marketData.global?.market_cap_change_percentage_24h > 3 &&
          btcAnalysis?.signal === 'bullish') {
        context = 'bull_market';
        confidence = 0.85;
      }
      
      // Bear market indicators  
      else if (sentiment.value < 30 && 
               marketData.global?.market_cap_change_percentage_24h < -3 &&
               btcAnalysis?.signal === 'bearish') {
        context = 'bear_market';
        confidence = 0.80;
      }
      
      // Sideways/consolidation
      else if (sentiment.value > 40 && sentiment.value < 60 &&
               Math.abs(marketData.global?.market_cap_change_percentage_24h || 0) < 2) {
        context = 'sideways';
        confidence = 0.70;
      }

      this.marketContext = context;
      
      logger.info(`📈 Market Context: ${context.toUpperCase()} (${Math.round(confidence * 100)}% confidence)`);
      
      return {
        context: context,
        confidence: confidence,
        fearGreed: sentiment,
        globalChange: marketData.global?.market_cap_change_percentage_24h || 0,
        btcSignal: btcAnalysis?.signal || 'neutral'
      };
      
    } catch (error) {
      logger.error('❌ Market context analysis failed:', error);
      return { context: 'unknown', confidence: 0.3 };
    }
  }

  // === DYNAMIC PERSONALITY ADAPTATION ===
  async adaptPersonality(marketContext, signals) {
    try {
      let personality = {
        mood: 'analytical',
        confidence: 0.6,
        aggression: 0.5,
        enthusiasm: 0.5,
        riskTolerance: 0.5
      };

      // Bull market personality
      if (marketContext.context === 'bull_market') {
        personality = {
          mood: 'bullish_optimistic',
          confidence: 0.85,
          aggression: 0.7,
          enthusiasm: 0.9,
          riskTolerance: 0.8
        };
      }
      
      // Bear market personality
      else if (marketContext.context === 'bear_market') {
        personality = {
          mood: 'cautious_defensive',
          confidence: 0.7,
          aggression: 0.3,
          enthusiasm: 0.4,
          riskTolerance: 0.3
        };
      }
      
      // High signal environment
      if (signals.length >= 2) {
        personality.enthusiasm += 0.2;
        personality.confidence += 0.15;
      }
      
      // Extreme fear/greed adjustment
      if (marketContext.fearGreed?.value > 80) {
        personality.mood = 'euphoric_but_cautious';
        personality.riskTolerance -= 0.2; // More cautious in extreme greed
      } else if (marketContext.fearGreed?.value < 20) {
        personality.mood = 'opportunistic_contrarian';
        personality.riskTolerance += 0.3; // More aggressive in extreme fear
      }

      logger.info(`🎭 Personality: ${personality.mood} (confidence: ${Math.round(personality.confidence * 100)}%)`);
      
      return personality;
      
    } catch (error) {
      logger.error('❌ Personality adaptation failed:', error);
      return { mood: 'confused', confidence: 0.5 };
    }
  }

  // === REAL-TIME ALERT SYSTEM ===
  async processAlerts(signals) {
    try {
      const newAlerts = [];
      
      for (const signal of signals) {
        const alertKey = `${signal.asset}_${signal.signal}`;
        const lastAlert = this.lastAlerts.get(alertKey);
        
        // Check cooldown
        if (!lastAlert || (Date.now() - lastAlert) > this.alertCooldown) {
          const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'HIGH_CONFIDENCE_SIGNAL',
            asset: signal.asset,
            confidence: signal.confidence,
            signal: signal.signal,
            price: signal.price,
            message: this.generateAlertMessage(signal),
            timestamp: Date.now(),
            priority: signal.alertLevel
          };
          
          newAlerts.push(alert);
          this.lastAlerts.set(alertKey, Date.now());
          
          logger.info(`🚨 NEW ALERT: ${alert.message}`);
        }
      }
      
      return newAlerts;
      
    } catch (error) {
      logger.error('❌ Alert processing failed:', error);
      return [];
    }
  }

  // === MASTER INTELLIGENCE CYCLE ===
  async runIntelligenceCycle() {
    try {
      logger.info('🧠 Starting Intelligence Cycle...');
      
      // 1. Analyze market context
      const marketContext = await this.analyzeMarketContext();
      
      // 2. Detect high-confidence signals
      const signals = await this.detectHighConfidenceSignals();
      
      // 3. Adapt personality to current conditions
      const personality = await this.adaptPersonality(marketContext, signals);
      
      // 4. Process alerts for actionable signals
      const alerts = await this.processAlerts(signals);
      
      // 5. Generate intelligence summary
      const intelligence = {
        timestamp: Date.now(),
        marketContext: marketContext,
        personality: personality,
        signals: signals,
        alerts: alerts,
        summary: this.generateIntelligenceSummary(marketContext, signals, personality)
      };
      
      logger.info(`✅ Intelligence Cycle Complete - ${signals.length} signals, ${alerts.length} alerts`);
      
      return intelligence;
      
    } catch (error) {
      logger.error('❌ Intelligence cycle failed:', error);
      throw error;
    }
  }

  // === HELPER METHODS ===
  getAlertLevel(confidence) {
    if (confidence >= 90) return 'CRITICAL';
    if (confidence >= 80) return 'HIGH';
    if (confidence >= 75) return 'MEDIUM';
    return 'LOW';
  }

  generateAlertMessage(signal) {
    const emoji = signal.signal === 'bullish' ? '🚀' : signal.signal === 'bearish' ? '📉' : '⚡';
    return `${emoji} ${signal.asset.toUpperCase()}: ${signal.confidence}% confidence ${signal.signal.toUpperCase()} signal at $${signal.price}`;
  }

  generateIntelligenceSummary(context, signals, personality) {
    const highConfidenceCount = signals.filter(s => s.confidence >= 85).length;
    const avgConfidence = signals.length > 0 ? 
      Math.round(signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length) : 0;

    return {
      marketRegime: context.context,
      signalCount: signals.length,
      highConfidenceSignals: highConfidenceCount,
      averageConfidence: avgConfidence,
      currentMood: personality.mood,
      fearGreed: context.fearGreed?.value || 50,
      recommendation: this.generateRecommendation(context, signals, personality)
    };
  }

  generateRecommendation(context, signals, personality) {
    if (signals.length === 0) return 'WAIT - No high-confidence opportunities detected';
    
    if (context.context === 'bull_market' && signals.length >= 2) {
      return 'AGGRESSIVE - Multiple bull signals in strong market';
    }
    
    if (context.context === 'bear_market' && signals.some(s => s.signal === 'bearish')) {
      return 'DEFENSIVE - Bearish signals confirmed in weak market';
    }
    
    if (signals.some(s => s.confidence >= 90)) {
      return 'HIGH CONVICTION - Exceptional opportunity detected';
    }
    
    return 'MODERATE - Proceed with calculated risk';
  }
}

module.exports = { IntelligenceEngine };