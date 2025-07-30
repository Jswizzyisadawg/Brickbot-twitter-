// === OMNISCIENT DATA CORE - BRICK'S ALL-SEEING EYE ===
// Real-time market intelligence fusion for crypto god-tier predictions

require('dotenv').config();
const axios = require('axios');
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

class OmniscientDataCore {
  constructor() {
    this.dataSources = {
      // Price & Volume APIs
      coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        endpoints: {
          price: '/simple/price',
          market: '/coins/markets',
          trending: '/search/trending',
          global: '/global',
          fearGreed: '/global' // Fixed endpoint
        }
      },
      
      // Fear & Greed Index
      fearGreed: {
        baseUrl: 'https://api.alternative.me',
        endpoint: '/fng'
      },
      
      // News aggregation
      cryptoNews: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        endpoint: '/news'
      }
    };
    
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    logger.info('🔮 Omniscient Data Core initialized - Brick sees all!');
  }

  // === CORE DATA FETCHING ===
  async fetchWithCache(key, fetchFn, timeout = this.cacheTimeout) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < timeout) {
      return cached.data;
    }
    
    try {
      const data = await fetchFn();
      this.cache.set(key, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      logger.error(`Failed to fetch ${key}:`, error.message);
      return cached ? cached.data : null;
    }
  }

  // === PRICE & MARKET DATA ===
  async getCurrentPrices(coins = ['bitcoin', 'ethereum', 'cardano', 'solana', 'chainlink']) {
    return this.fetchWithCache('current_prices', async () => {
      const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/simple/price`, {
        params: {
          ids: coins.join(','),
          vs_currencies: 'usd',
          include_24hr_change: true,
          include_24hr_vol: true,
          include_market_cap: true
        }
      });
      
      logger.info(`📊 Fetched prices for ${coins.length} assets`);
      return response.data;
    });
  }

  async getMarketOverview() {
    return this.fetchWithCache('market_overview', async () => {
      const [prices, global, trending] = await Promise.all([
        this.getCurrentPrices(),
        this.getGlobalMarketData(),
        this.getTrendingCoins()
      ]);
      
      return {
        prices,
        global,
        trending,
        timestamp: Date.now()
      };
    });
  }

  async getGlobalMarketData() {
    return this.fetchWithCache('global_market', async () => {
      const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/global`);
      return response.data.data;
    });
  }

  async getTrendingCoins() {
    return this.fetchWithCache('trending_coins', async () => {
      const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/search/trending`);
      return response.data.coins.map(coin => ({
        id: coin.item.id,
        name: coin.item.name,
        symbol: coin.item.symbol,
        rank: coin.item.market_cap_rank,
        score: coin.item.score
      }));
    });
  }

  // === SENTIMENT ANALYSIS ===
  async getFearGreedIndex() {
    return this.fetchWithCache('fear_greed', async () => {
      const response = await axios.get(`${this.dataSources.fearGreed.baseUrl}/fng`);
      const latest = response.data.data[0];
      
      return {
        value: parseInt(latest.value),
        classification: latest.value_classification,
        timestamp: latest.timestamp,
        interpretation: this.interpretFearGreed(parseInt(latest.value))
      };
    }, 30 * 60 * 1000); // Cache for 30 minutes
  }

  interpretFearGreed(value) {
    if (value <= 25) return { mood: 'extreme_fear', signal: 'contrarian_buy' };
    if (value <= 45) return { mood: 'fear', signal: 'potential_buy' };
    if (value <= 55) return { mood: 'neutral', signal: 'wait_and_see' };
    if (value <= 75) return { mood: 'greed', signal: 'potential_sell' };
    return { mood: 'extreme_greed', signal: 'contrarian_sell' };
  }

  // === TECHNICAL ANALYSIS DATA ===
  async getTechnicalSignals(coinId = 'ethereum') {
    return this.fetchWithCache(`technical_${coinId}`, async () => {
      // Get historical data for technical analysis
      const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: '30',
          interval: 'daily'
        }
      });
      
      const prices = response.data.prices;
      const volumes = response.data.total_volumes;
      
      return {
        sma20: this.calculateSMA(prices, 20),
        sma50: this.calculateSMA(prices, 50),
        rsi: this.calculateRSI(prices),
        volumeTrend: this.analyzeVolumeTrend(volumes),
        priceAction: this.analyzePriceAction(prices),
        support: this.findSupport(prices),
        resistance: this.findResistance(prices)
      };
    });
  }

  // === HELPER FUNCTIONS FOR TECHNICAL ANALYSIS ===
  calculateSMA(prices, period) {
    if (prices.length < period) return null;
    const recent = prices.slice(-period);
    const sum = recent.reduce((acc, price) => acc + price[1], 0);
    return sum / period;
  }

  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return null;
    
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i][1] - prices[i-1][1]);
    }
    
    const recentChanges = changes.slice(-period);
    const gains = recentChanges.filter(change => change > 0);
    const losses = recentChanges.filter(change => change < 0).map(loss => Math.abs(loss));
    
    const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
    const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  analyzeVolumeTrend(volumes) {
    const recent = volumes.slice(-7).map(v => v[1]);
    const older = volumes.slice(-14, -7).map(v => v[1]);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg * 100;
    
    if (change > 20) return 'increasing_significantly';
    if (change > 5) return 'increasing';
    if (change < -20) return 'decreasing_significantly';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  analyzePriceAction(prices) {
    const recent = prices.slice(-7);
    const trend = recent[recent.length - 1][1] - recent[0][1];
    const volatility = this.calculateVolatility(recent);
    
    return {
      trend: trend > 0 ? 'bullish' : 'bearish',
      strength: Math.abs(trend) / recent[0][1] * 100,
      volatility: volatility
    };
  }

  calculateVolatility(prices) {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i][1] - prices[i-1][1]) / prices[i-1][1]);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, ret) => acc + Math.pow(ret - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  findSupport(prices) {
    const recentPrices = prices.slice(-30).map(p => p[1]);
    return Math.min(...recentPrices);
  }

  findResistance(prices) {
    const recentPrices = prices.slice(-30).map(p => p[1]);
    return Math.max(...recentPrices);
  }

  // === MASTER MARKET SNAPSHOT ===
  async generateMarketSnapshot(focusAsset = 'ethereum') {
    try {
      logger.info('🔮 Generating omniscient market snapshot...');
      
      const [
        marketOverview,
        fearGreed,
        technicals,
        trending
      ] = await Promise.all([
        this.getMarketOverview(),
        this.getFearGreedIndex(),
        this.getTechnicalSignals(focusAsset),
        this.getTrendingCoins()
      ]);

      const snapshot = {
        timestamp: Date.now(),
        focusAsset,
        market: {
          overview: marketOverview,
          sentiment: fearGreed,
          technicals,
          trending
        },
        insights: this.generateInsights(marketOverview, fearGreed, technicals),
        brickMood: this.determineBrickMood(fearGreed, technicals)
      };

      logger.info('✅ Market snapshot generated successfully');
      return snapshot;
      
    } catch (error) {
      logger.error('❌ Failed to generate market snapshot:', error);
      throw error;
    }
  }

  generateInsights(market, sentiment, technicals) {
    const insights = [];
    
    // Volume insights
    if (technicals.volumeTrend === 'increasing_significantly') {
      insights.push({
        type: 'volume',
        signal: 'bullish',
        message: 'Volume surge detected - institutional interest likely'
      });
    }
    
    // Fear/Greed insights
    if (sentiment.value <= 25) {
      insights.push({
        type: 'sentiment',
        signal: 'contrarian_bullish',
        message: 'Extreme fear - historically a buying opportunity'
      });
    }
    
    // Technical insights
    if (technicals.rsi && technicals.rsi < 30) {
      insights.push({
        type: 'technical',
        signal: 'oversold',
        message: 'RSI indicates oversold conditions'
      });
    }
    
    return insights;
  }

  determineBrickMood(sentiment, technicals) {
    let mood = 'neutral';
    let confidence = 0.6;
    
    // Adjust based on market conditions
    if (sentiment.value <= 25 || sentiment.value >= 75) {
      mood = 'confused_but_insightful';
      confidence = 0.8; // Brick is best at extremes
    }
    
    if (technicals.priceAction.volatility > 5) {
      mood = 'excited_and_confused';
      confidence = 0.7;
    }
    
    if (technicals.priceAction.trend === 'bullish' && sentiment.value > 55) {
      mood = 'confident';
      confidence = 0.85;
    }
    
    return { mood, confidence };
  }
}

module.exports = { OmniscientDataCore };