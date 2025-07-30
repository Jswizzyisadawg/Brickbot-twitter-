// === PERFORMANCE TRACKING & SELF-LEARNING SYSTEM - BRICK'S EVOLUTION ENGINE ===
// Tracks performance, learns from mistakes, and continuously improves

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const winston = require('winston');
const fs = require('fs').promises;

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

class PerformanceSelfLearningSystem {
  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    
    // Performance databases
    this.predictionHistory = new Map();
    this.tweetPerformance = new Map();
    this.learningInsights = new Map(); 
    this.marketPatterns = new Map();
    
    // Learning metrics
    this.performance = {
      predictions: {
        total: 0,
        correct: 0,
        accuracy: 0,
        byAsset: new Map(),
        byTimeframe: new Map(),
        byMarketCondition: new Map()
      },
      social: {
        totalTweets: 0,
        totalEngagement: 0,
        avgEngagement: 0,
        topTweets: [],
        engagementTrends: []
      },
      learning: {
        insightsGenerated: 0,
        patternsDiscovered: 0,
        adaptationsMade: 0,
        lastLearningSession: null
      }
    };
    
    this.learningEngine = new LearningEngine(this.claude);
    this.patternRecognition = new PatternRecognition();
    this.adaptationEngine = new AdaptationEngine(this.claude);
    
    logger.info('🧠 Performance Self-Learning System initialized - Brick is ready to evolve!');
  }

  // === PREDICTION PERFORMANCE TRACKING ===
  async trackPrediction(predictionId, prediction, actualResult = null) {
    try {
      const trackingData = {
        id: predictionId,
        prediction,
        actualResult,
        timestamp: Date.now(),
        accuracy: null,
        factors: prediction.keyFactors || [],
        marketConditions: prediction.marketSnapshot || {},
        status: actualResult ? 'evaluated' : 'pending'
      };
      
      if (actualResult) {
        trackingData.accuracy = this.calculatePredictionAccuracy(prediction, actualResult);
        this.updatePerformanceMetrics(trackingData);
        
        // Trigger learning if accuracy is unexpected
        if (trackingData.accuracy < 30 || trackingData.accuracy > 90) {
          await this.triggerLearningSession(trackingData);
        }
      }
      
      this.predictionHistory.set(predictionId, trackingData);
      logger.info(`📊 Prediction ${predictionId} tracked - Accuracy: ${trackingData.accuracy || 'Pending'}%`);
      
      return trackingData;
      
    } catch (error) {
      logger.error('❌ Failed to track prediction:', error);
      return null;
    }
  }

  calculatePredictionAccuracy(prediction, actualResult) {
    // Simplified accuracy calculation
    // In real implementation, this would be more sophisticated
    const predicted = prediction.direction;
    const actual = actualResult.direction;
    
    if (predicted === actual) {
      // Additional accuracy based on price target proximity
      const priceAccuracy = this.calculatePriceAccuracy(prediction.priceTarget, actualResult.actualPrice);
      return Math.min(100, 70 + priceAccuracy);
    } else {
      return Math.max(0, 30 - Math.abs(prediction.confidence - 50));
    }
  }

  calculatePriceAccuracy(predicted, actual) {
    if (!predicted || !actual) return 0;
    const predictedPrice = parseFloat(predicted.replace(/[^0-9.]/g, ''));
    const actualPrice = parseFloat(actual);
    const error = Math.abs(predictedPrice - actualPrice) / actualPrice;
    return Math.max(0, 30 * (1 - error));
  }

  updatePerformanceMetrics(trackingData) {
    this.performance.predictions.total++;
    if (trackingData.accuracy > 60) {
      this.performance.predictions.correct++;
    }
    
    this.performance.predictions.accuracy = 
      (this.performance.predictions.correct / this.performance.predictions.total) * 100;
    
    // Update by asset
    const asset = trackingData.prediction.asset;
    if (!this.performance.predictions.byAsset.has(asset)) {
      this.performance.predictions.byAsset.set(asset, { total: 0, correct: 0, accuracy: 0 });
    }
    const assetStats = this.performance.predictions.byAsset.get(asset);
    assetStats.total++;
    if (trackingData.accuracy > 60) assetStats.correct++;
    assetStats.accuracy = (assetStats.correct / assetStats.total) * 100;
  }

  // === SOCIAL PERFORMANCE TRACKING ===
  async trackTweetPerformance(tweetId, tweetContent, engagementData) {
    try {
      const tweetTracking = {
        id: tweetId,
        content: tweetContent,
        timestamp: Date.now(),
        engagement: engagementData,
        score: this.calculateEngagementScore(engagementData),
        type: this.classifyTweetType(tweetContent),
        sentiment: await this.analyzeTweetSentiment(tweetContent)
      };
      
      this.tweetPerformance.set(tweetId, tweetTracking);
      this.updateSocialMetrics(tweetTracking);
      
      // Learn from high-performing tweets
      if (tweetTracking.score > this.performance.social.avgEngagement * 2) {
        await this.analyzeHighPerformingTweet(tweetTracking);
      }
      
      logger.info(`📱 Tweet ${tweetId} tracked - Score: ${tweetTracking.score}`);
      return tweetTracking;
      
    } catch (error) {
      logger.error('❌ Failed to track tweet performance:', error);
      return null;
    }
  }

  calculateEngagementScore(engagement) {
    return (engagement.likes || 0) + 
           (engagement.retweets || 0) * 2 +
           (engagement.replies || 0) * 3 +
           (engagement.quotes || 0) * 2;
  }

  classifyTweetType(content) {
    if (content.includes('$') && /\d/.test(content)) return 'prediction';
    if (content.includes('lamp')) return 'lamp_obsessed';
    if (content.includes('Great Odin')) return 'catchphrase';
    if (content.includes('%') || content.includes('confidence')) return 'analysis';
    return 'general';
  }

  updateSocialMetrics(tweetTracking) {
    this.performance.social.totalTweets++;
    this.performance.social.totalEngagement += tweetTracking.score;
    this.performance.social.avgEngagement = 
      this.performance.social.totalEngagement / this.performance.social.totalTweets;
    
    // Track top tweets
    this.performance.social.topTweets.push(tweetTracking);
    this.performance.social.topTweets.sort((a, b) => b.score - a.score);
    this.performance.social.topTweets = this.performance.social.topTweets.slice(0, 10);
  }

  // === LEARNING ENGINE ===
  async triggerLearningSession(triggeringData) {
    try {
      logger.info('🎓 Triggering learning session...');
      
      const learningPrompt = `You are Brick's learning engine. Analyze this prediction result and extract insights.

PREDICTION THAT TRIGGERED LEARNING:
${JSON.stringify(triggeringData.prediction, null, 2)}

ACTUAL RESULT:
${JSON.stringify(triggeringData.actualResult, null, 2)}

ACCURACY: ${triggeringData.accuracy}%

MARKET CONDITIONS AT TIME OF PREDICTION:
${JSON.stringify(triggeringData.marketConditions, null, 2)}

Analyze what went right or wrong and generate learning insights:

1. If accuracy was very high (>90%): What factors contributed to success?
2. If accuracy was low (<30%): What went wrong and how to improve?
3. Pattern identification: Are there recurring patterns in similar situations?
4. Factor weighting: Should certain analysis factors be weighted differently?
5. Market condition adjustments: How should predictions adapt to these conditions?

Return insights as JSON:
{
  "insight": "Main learning insight",
  "factorAdjustments": ["factor1 should be weighted higher", "factor2 was misleading"],
  "patternRecognition": "Pattern identified in market conditions",
  "futureAdaptations": ["adaptation1", "adaptation2"],
  "confidence": 85
}`;

      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 800,
        messages: [{ role: "user", content: learningPrompt }]
      });

      try {
        const insights = JSON.parse(response.content[0].text);
        await this.storeInsights(insights, triggeringData);
        this.performance.learning.insightsGenerated++;
        
        logger.info('✅ Learning session completed - New insights generated');
        return insights;
        
      } catch (parseError) {
        logger.error('❌ Failed to parse learning insights:', parseError);
        return null;
      }
      
    } catch (error) {
      logger.error('❌ Learning session failed:', error);
      return null;
    }
  }

  async analyzeHighPerformingTweet(tweetData) {
    try {
      const analysisPrompt = `Analyze this high-performing tweet to understand what made it successful.

TWEET DATA:
Content: "${tweetData.content}"
Engagement Score: ${tweetData.score}
Type: ${tweetData.type}
Likes: ${tweetData.engagement.likes}
Retweets: ${tweetData.engagement.retweets}
Replies: ${tweetData.engagement.replies}

Average engagement for comparison: ${this.performance.social.avgEngagement}

Identify success factors:
1. Content elements that drove engagement
2. Personality traits that resonated
3. Timing or market context factors
4. Language patterns or phrases
5. Emotional hooks or triggers

Return as JSON:
{
  "successFactors": ["factor1", "factor2"],
  "keyPhrases": ["phrase1", "phrase2"],
  "personalityElements": ["element1", "element2"],
  "replicationStrategy": "How to apply these insights to future tweets"
}`;

      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 600,
        messages: [{ role: "user", content: analysisPrompt }]
      });

      const analysis = JSON.parse(response.content[0].text);
      await this.storeInsights(analysis, tweetData, 'social');
      
      logger.info('📈 High-performing tweet analyzed for learning');
      return analysis;
      
    } catch (error) {
      logger.error('❌ Failed to analyze high-performing tweet:', error);
      return null;
    }
  }

  async storeInsights(insights, triggeringData, type = 'prediction') {
    const insightId = `${type}_${Date.now()}`;
    const insightData = {
      id: insightId,
      type,
      insights,
      triggeringData,
      timestamp: Date.now(),
      applied: false
    };
    
    this.learningInsights.set(insightId, insightData);
    
    // Trigger adaptation if insights have high confidence
    if (insights.confidence > 80) {
      await this.adaptationEngine.applyInsights(insights);
      insightData.applied = true;
      this.performance.learning.adaptationsMade++;
    }
  }

  // === PATTERN RECOGNITION ===
  async recognizePatterns() {
    try {
      logger.info('🔍 Running pattern recognition analysis...');
      
      const recentPredictions = Array.from(this.predictionHistory.values())
        .filter(p => p.status === 'evaluated')
        .slice(-20);
      
      if (recentPredictions.length < 5) {
        logger.info('📊 Not enough data for pattern recognition');
        return null;
      }
      
      const patterns = await this.patternRecognition.findPatterns(recentPredictions);
      
      if (patterns.length > 0) {
        this.performance.learning.patternsDiscovered += patterns.length;
        logger.info(`🎯 Discovered ${patterns.length} new patterns`);
      }
      
      return patterns;
      
    } catch (error) {
      logger.error('❌ Pattern recognition failed:', error);
      return [];
    }
  }

  // === PERFORMANCE REPORTING ===
  async generatePerformanceReport() {
    const report = {
      timestamp: Date.now(),
      predictionPerformance: {
        overall: this.performance.predictions,
        byAsset: Object.fromEntries(this.performance.predictions.byAsset),
        recentTrend: this.calculateRecentTrend()
      },
      socialPerformance: {
        overall: this.performance.social,
        topTweets: this.performance.social.topTweets.slice(0, 5),
        engagementTrend: this.calculateEngagementTrend()
      },
      learning: {
        metrics: this.performance.learning,
        recentInsights: this.getRecentInsights(),
        recommendedAdaptations: await this.getRecommendedAdaptations()
      },
      summary: await this.generateBrickStyleSummary()
    };
    
    logger.info('📋 Performance report generated');
    return report;
  }

  calculateRecentTrend() {
    const recentPredictions = Array.from(this.predictionHistory.values())
      .filter(p => p.status === 'evaluated')
      .slice(-10);
    
    if (recentPredictions.length < 5) return 'insufficient_data';
    
    const recentAccuracy = recentPredictions.reduce((sum, p) => sum + p.accuracy, 0) / recentPredictions.length;
    const overallAccuracy = this.performance.predictions.accuracy;
    
    if (recentAccuracy > overallAccuracy + 5) return 'improving';
    if (recentAccuracy < overallAccuracy - 5) return 'declining';
    return 'stable';
  }

  calculateEngagementTrend() {
    const recentTweets = Array.from(this.tweetPerformance.values()).slice(-10);
    if (recentTweets.length < 5) return 'insufficient_data';
    
    const recentAvg = recentTweets.reduce((sum, t) => sum + t.score, 0) / recentTweets.length;
    const overallAvg = this.performance.social.avgEngagement;
    
    if (recentAvg > overallAvg * 1.2) return 'increasing';
    if (recentAvg < overallAvg * 0.8) return 'decreasing';
    return 'stable';
  }

  getRecentInsights() {
    return Array.from(this.learningInsights.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5)
      .map(insight => ({
        insight: insight.insights.insight,
        confidence: insight.insights.confidence,
        applied: insight.applied
      }));
  }

  async getRecommendedAdaptations() {
    // This would analyze current performance gaps and recommend changes
    const adaptations = [];
    
    if (this.performance.predictions.accuracy < 60) {
      adaptations.push('Increase confidence calibration sensitivity');
    }
    
    if (this.performance.social.avgEngagement < 20) {
      adaptations.push('Adjust personality for higher engagement');
    }
    
    return adaptations;
  }

  async generateBrickStyleSummary() {
    const summaryPrompt = `You are Brick generating a performance summary for yourself.

CURRENT PERFORMANCE:
- Prediction Accuracy: ${this.performance.predictions.accuracy}%
- Total Predictions: ${this.performance.predictions.total}
- Average Social Engagement: ${this.performance.social.avgEngagement}
- Learning Insights Generated: ${this.performance.learning.insightsGenerated}

Create a brief, Brick-style summary of your performance. Be honest about strengths and weaknesses while maintaining your personality. Include lamp references if appropriate.

Keep it under 200 characters for potential tweet use.`;

    try {
      const response = await this.claude.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 250,
        messages: [{ role: "user", content: summaryPrompt }]
      });

      return response.content[0].text;
    } catch (error) {
      return "Great Odin's raven! I'm learning and growing, just like my love for lamp! 🧱📊 #StayClassy";
    }
  }

  // === SELF-OPTIMIZATION ===
  async runSelfOptimization() {
    try {
      logger.info('🔧 Running self-optimization routine...');
      
      const [patterns, insights, report] = await Promise.all([
        this.recognizePatterns(),
        this.getRecentInsights(),
        this.generatePerformanceReport()
      ]);
      
      // Apply optimizations based on findings
      const optimizations = await this.adaptationEngine.generateOptimizations(report);
      
      this.performance.learning.lastLearningSession = Date.now();
      
      logger.info('✅ Self-optimization completed');
      return {
        patterns,
        insights,
        optimizations,
        report
      };
      
    } catch (error) {
      logger.error('❌ Self-optimization failed:', error);
      return null;
    }
  }
}

// === SUPPORTING CLASSES ===
class LearningEngine {
  constructor(claude) {
    this.claude = claude;
  }
  
  // Additional learning methods would be implemented here
}

class PatternRecognition {
  findPatterns(predictions) {
    // Simplified pattern recognition
    const patterns = [];
    
    // Example: Find accuracy patterns by market condition
    const byVolatility = this.groupByVolatility(predictions);
    if (byVolatility.high.length > 0 && byVolatility.low.length > 0) {
      const highVolAccuracy = this.calculateAvgAccuracy(byVolatility.high);
      const lowVolAccuracy = this.calculateAvgAccuracy(byVolatility.low);
      
      if (Math.abs(highVolAccuracy - lowVolAccuracy) > 20) {
        patterns.push({
          type: 'volatility_correlation',
          description: `${highVolAccuracy > lowVolAccuracy ? 'Better' : 'Worse'} performance in high volatility`,
          confidence: 0.8
        });
      }
    }
    
    return patterns;
  }
  
  groupByVolatility(predictions) {
    return predictions.reduce((groups, pred) => {
      const volatility = pred.marketConditions?.technicals?.priceAction?.volatility || 5;
      if (volatility > 7) {
        groups.high.push(pred);
      } else {
        groups.low.push(pred);
      }
      return groups;
    }, { high: [], low: [] });
  }
  
  calculateAvgAccuracy(predictions) {
    return predictions.reduce((sum, pred) => sum + pred.accuracy, 0) / predictions.length;
  }
}

class AdaptationEngine {
  constructor(claude) {
    this.claude = claude;
  }
  
  async applyInsights(insights) {
    // This would implement actual system adaptations
    logger.info('🔄 Applying learning insights to system parameters');
    return true;
  }
  
  async generateOptimizations(report) {
    // Generate specific optimization recommendations
    return [
      'Increase technical analysis weight for high volatility markets',
      'Reduce confidence during fear/greed extremes',
      'Emphasize lamp references for higher social engagement'
    ];
  }
}

module.exports = { PerformanceSelfLearningSystem };