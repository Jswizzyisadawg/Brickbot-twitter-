// === OMNISCIENT DATA CORE - BRICK'S ALL-SEEING EYE ===
// Real-time market intelligence fusion for crypto god-tier predictions

require('dotenv').config();
const axios = require('axios');
const winston = require('winston');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

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
      // Primary: Coinbase Advanced Trade API (FREE - 10k req/hour)
      coinbase: {
        baseUrl: 'https://api.coinbase.com/api/v3/brokerage',
        endpoints: {
          products: '/products',
          ticker: '/products/{product_id}/ticker', 
          candles: '/products/{product_id}/candles',
          stats: '/products/{product_id}/stats'
        },
        // Public endpoints (no auth needed for market data)
        publicBaseUrl: 'https://api.coinbase.com/api/v3/brokerage'
      },
      
      // Secondary: CoinGecko (Free tier - 50 req/min) 
      coingecko: {
        baseUrl: 'https://api.coingecko.com/api/v3',
        endpoints: {
          price: '/simple/price',
          market: '/coins/markets',
          trending: '/search/trending',
          global: '/global'
        }
      },
      
      // Fear & Greed Index
      fearGreed: {
        baseUrl: 'https://api.alternative.me',
        endpoint: '/fng'
      },
      
      // DefiLlama (Free - unlimited basic usage)
      defilama: {
        baseUrl: 'https://api.llama.fi',
        endpoints: {
          protocols: '/protocols',
          tvl: '/tvl', 
          chains: '/chains'
        }
      },

      // THE TRINITY COMPLETES: DexScreener API (FREE - The Alpha Source)
      dexscreener: {
        baseUrl: 'https://api.dexscreener.com/latest/dex',
        endpoints: {
          tokens: '/tokens/{addresses}',
          pairs: '/pairs/{chainId}/{pairAddress}',
          search: '/search',
          trending: '/trending',
          profiles: '/profiles/{chainId}/{addresses}'
        }
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
      if (data) {
        this.cache.set(key, { data, timestamp: Date.now() });
        
        // Memory management - limit cache size
        if (this.cache.size > 50) {
          const oldestKey = this.cache.keys().next().value;
          this.cache.delete(oldestKey);
        }
      }
      return data;
    } catch (error) {
      logger.error(`Failed to fetch ${key}:`, error.message);
      // Return stale data if available, with warning
      if (cached) {
        logger.warn(`Using stale data for ${key} due to API failure`);
        return cached.data;
      }
      return null;
    }
  }

  // === COINBASE CDP AUTHENTICATION (JWT) ===
  createCoinbaseJWT(method, path) {
    try {
      if (!process.env.COINBASE_API_KEY || !process.env.COINBASE_API_SECRET) {
        throw new Error('Coinbase API credentials not found in environment');
      }

      // Clean up the private key format
      let privateKey = process.env.COINBASE_API_SECRET;
      privateKey = privateKey.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
      
      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN EC PRIVATE KEY-----')) {
        privateKey = `-----BEGIN EC PRIVATE KEY-----\n${privateKey}\n-----END EC PRIVATE KEY-----`;
      }

      // Create JWT claims for Advanced Trade API
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        sub: process.env.COINBASE_API_KEY,  // Subject (API key name)
        iss: 'coinbase-cloud',              // Issuer 
        nbf: now,                           // Not before
        exp: now + 120,                     // Expires in 2 minutes  
        aud: ['retail_rest_api_proxy']      // Audience
      };

      // Sign JWT with EC private key
      const token = jwt.sign(claims, privateKey, { 
        algorithm: 'ES256',
        header: {
          kid: process.env.COINBASE_API_KEY,
          nonce: crypto.randomBytes(16).toString('hex')
        }
      });

      logger.info('✅ JWT created successfully');
      return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
    } catch (error) {
      logger.error('❌ Failed to create Coinbase JWT:', error.message);
      return null;
    }
  }

  async makeCoinbaseRequest(method, path, body = null) {
    try {
      const headers = this.createCoinbaseJWT(method, path);
      if (!headers) {
        throw new Error('Failed to create JWT authentication headers');
      }

      const config = {
        method,
        url: `${this.dataSources.coinbase.baseUrl}${path}`,
        headers: {
          ...headers,
          'User-Agent': 'BrickBot/1.0 (Educational)'
        },
        timeout: 15000
      };

      if (body && method !== 'GET') {
        config.data = body;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      logger.error(`❌ Coinbase ${method} request failed for ${path}:`, error.message);
      throw error;
    }
  }

  // === COINBASE ADVANCED TRADE API DATA FETCHING ===
  async getCoinbaseCandles(productId, granularity = 86400, limit = 100) {
    return this.fetchWithCache(`coinbase_candles_${productId}_${granularity}`, async () => {
      try {
        logger.info(`🪙 Fetching Coinbase candles for ${productId}...`);
        
        // Calculate start/end times
        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (limit * granularity);
        
        const path = `/products/${productId}/candles?start=${startTime}&end=${endTime}&granularity=${granularity}`;
        const candles = await this.makeCoinbaseRequest('GET', path);
        
        // Validate response
        if (!candles || !Array.isArray(candles)) {
          logger.error(`❌ Invalid Coinbase candle response for ${productId}`);
          return [];
        }
        
        if (candles.length === 0) {
          logger.warn(`⚠️ No candle data returned for ${productId}`);
          return [];
        }
        
        // Transform Coinbase candle data to standardized format
        // Coinbase format: [timestamp, low, high, open, close, volume]
        const transformedData = candles.map(candle => ({
          timestamp: candle[0] * 1000, // Convert to milliseconds
          open: parseFloat(candle[3]),
          high: parseFloat(candle[2]),
          low: parseFloat(candle[1]),
          close: parseFloat(candle[4]),
          volume: parseFloat(candle[5])
        })).sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically
        
        logger.info(`✅ Successfully fetched ${transformedData.length} Coinbase candles for ${productId}`);
        return transformedData;
        
      } catch (error) {
        logger.error(`❌ Failed to fetch Coinbase candles for ${productId}:`, error.message);
        if (error.response) {
          logger.error(`📊 Response status: ${error.response.status}`);
          logger.error(`📊 Response headers:`, error.response.headers);
        }
        return [];
      }
    });
  }

  async getCoinbase24hrStats(productIds = ['ETH-USD', 'BTC-USD', 'SOL-USD', 'ADA-USD', 'LINK-USD']) {
    return this.fetchWithCache('coinbase_24hr_stats', async () => {
      try {
        logger.info('🪙 Fetching Coinbase 24hr ticker data via public API...');
        
        const promises = productIds.map(async (productId) => {
          try {
            // Use public endpoint - no auth needed!
            const response = await axios.get(`${this.dataSources.coinbase.baseUrl}/market/products/${productId}`, {
              timeout: 15000,
              headers: {
                'User-Agent': 'BrickBot/1.0 (Educational)',
                'Accept': 'application/json'
              }
            });
            return { productId, data: response.data };
          } catch (error) {
            logger.error(`❌ Failed to fetch stats for ${productId}:`, error.message);
            return { productId, data: null };
          }
        });
        
        const results = await Promise.all(promises);
        const formattedData = {};
        
        results.forEach(({ productId, data }) => {
          if (data) {
            formattedData[productId] = {
              price: parseFloat(data.price || 0),
              change24h: parseFloat(data.price_percentage_change_24h || 0),
              volume24h: parseFloat(data.volume_24h || 0),
              high24h: parseFloat(data.price || 0), // Public API doesn't have high/low
              low24h: parseFloat(data.price || 0)
            };
          }
        });
        
        const successCount = Object.keys(formattedData).length;
        logger.info(`✅ Successfully fetched Coinbase 24hr stats for ${successCount} assets`);
        return formattedData;
        
      } catch (error) {
        logger.error('❌ Failed to fetch Coinbase 24hr stats:', error.message);
        return {};
      }
    });
  }

  // === ENHANCED PRICE METHOD (Coinbase Primary) ===
  async getCurrentPrices(coins = ['ETH-USD', 'BTC-USD', 'SOL-USD', 'ADA-USD', 'LINK-USD']) {
    return this.fetchWithCache('current_prices_enhanced', async () => {
      try {
        // Primary: Get data from Coinbase Advanced Trade API
        const coinbaseData = await this.getCoinbase24hrStats(coins);
        
        // If Coinbase fails, fallback to CoinGecko
        if (Object.keys(coinbaseData).length === 0) {
          logger.warn('📡 Coinbase failed, falling back to CoinGecko...');
          
          // Convert Coinbase product IDs to CoinGecko format
          const coingeckoIds = coins.map(productId => {
            const map = {
              'ETH-USD': 'ethereum',
              'BTC-USD': 'bitcoin', 
              'SOL-USD': 'solana',
              'ADA-USD': 'cardano',
              'LINK-USD': 'chainlink',
              'AVAX-USD': 'avalanche-2',
              'MATIC-USD': 'matic-network',
              'DOT-USD': 'polkadot'
            };
            return map[productId] || 'ethereum';
          }).filter(id => id); // Remove nulls
          
          const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/simple/price`, {
            params: {
              ids: coingeckoIds.join(','),
              vs_currencies: 'usd',
              include_24hr_change: true,
              include_24hr_vol: true
            },
            timeout: 15000
          });
          
          return response.data;
        }
        
        return coinbaseData;
        
      } catch (error) {
        logger.error('❌ Failed to fetch prices from both sources:', error.message);
        return {};
      }
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

  // === ADVANCED MATHEMATICAL ANALYSIS (Powered by Coinbase) ===
  async getAdvancedTechnicalSignals(productId = 'ETH-USD') {
    return this.fetchWithCache(`advanced_technical_${productId}`, async () => {
      try {
        logger.info(`🔬 Starting advanced technical analysis for ${productId}...`);
        
        // Primary: Try Coinbase Advanced Trade API
        let dailyData = await this.getCoinbaseCandles(productId, 86400, 100); // Daily candles
        let hourlyData = await this.getCoinbaseCandles(productId, 3600, 168); // Hourly candles (7 days)
        
        // If Coinbase fails, fallback to CoinGecko
        if (!dailyData.length) {
          logger.info(`🔄 Coinbase unavailable, using CoinGecko fallback for ${productId}...`);
          const coinId = this.coinbaseProductToCoinGeckoId(productId);
          
          if (coinId) {
            dailyData = await this.getCoinGeckoHistoricalData(coinId, 100);
            hourlyData = await this.getCoinGeckoHistoricalData(coinId, 7, 'hourly');
          } else {
            logger.error(`❌ No CoinGecko mapping available for ${productId}`);
            return null;
          }
        }
        
        if (!dailyData.length) {
          logger.warn(`⚠️ No data available for ${productId} technical analysis`);
          return null;
        }
        
        // Calculate all advanced indicators
        const indicators = {
          // Moving Averages
          sma20: this.calculateSMA(dailyData, 20),
          sma50: this.calculateSMA(dailyData, 50),
          ema12: this.calculateEMA(dailyData, 12),
          ema26: this.calculateEMA(dailyData, 26),
          
          // Oscillators
          rsi: this.calculateRSI(dailyData, 14),
          stochastic: this.calculateStochastic(dailyData),
          williamsR: this.calculateWilliamsR(dailyData),
          
          // MACD
          macd: this.calculateMACD(dailyData),
          
          // Bollinger Bands
          bollingerBands: this.calculateBollingerBands(dailyData),
          
          // Volume Analysis
          volumeProfile: this.analyzeVolumeProfile(dailyData),
          volumeTrend: this.analyzeVolumeTrend(dailyData.map(d => [d.timestamp, d.volume])),
          
          // Support/Resistance
          support: this.findSupport(dailyData.map(d => [d.timestamp, d.close])),
          resistance: this.findResistance(dailyData.map(d => [d.timestamp, d.close])),
          
          // Price Action Analysis
          priceAction: {
            daily: this.analyzePriceAction(dailyData.map(d => [d.timestamp, d.close])),
            hourly: this.analyzePriceAction(hourlyData.slice(-24).map(d => [d.timestamp, d.close]))
          },
          
          // Current Price Context
          currentPrice: dailyData[dailyData.length - 1].close,
          priceChange24h: ((dailyData[dailyData.length - 1].close - dailyData[dailyData.length - 2].close) / dailyData[dailyData.length - 2].close) * 100
        };
        
        // Calculate confluence and confidence
        const confluence = this.calculateConfluence(indicators);
        const confidence = this.calculateConfidenceScore(indicators, confluence);
        
        const result = {
          symbol,
          timestamp: Date.now(),
          indicators,
          confluence,
          confidence,
          tradingSignal: this.generateTradingSignal(confidence, indicators)
        };
        
        logger.info(`📊 Advanced technical analysis completed for ${symbol} - Confidence: ${confidence.score}%`);
        return result;
        
      } catch (error) {
        logger.error(`❌ Failed to generate advanced technical signals for ${symbol}:`, error.message);
        return null;
      }
    });
  }

  // === LEGACY METHOD (Enhanced) ===
  async getTechnicalSignals(coinId = 'ethereum') {
    // Convert coin ID to Binance symbol
    const symbolMap = {
      'ethereum': 'ETHUSDT',
      'bitcoin': 'BTCUSDT', 
      'solana': 'SOLUSDT',
      'cardano': 'ADAUSDT',
      'chainlink': 'LINKUSDT'
    };
    
    const symbol = symbolMap[coinId] || 'ETHUSDT';
    return this.getAdvancedTechnicalSignals(symbol);
  }

  // === TRADING SIGNAL GENERATION ===
  generateTradingSignal(confidence, indicators) {
    if (confidence.score < 70) {
      return {
        action: 'HOLD',
        reason: 'Insufficient confidence for trading signal',
        confidence: confidence.score
      };
    }
    
    const signal = {
      action: confidence.direction === 'bullish' ? 'BUY' : confidence.direction === 'bearish' ? 'SELL' : 'HOLD',
      direction: confidence.direction,
      strength: confidence.strength,
      confidence: confidence.score,
      reasoning: confidence.reasoning,
      priceTarget: this.calculatePriceTarget(indicators, confidence.direction),
      stopLoss: this.calculateStopLoss(indicators, confidence.direction),
      timeframe: this.getRecommendedTimeframe(confidence.strength)
    };
    
    return signal;
  }

  calculatePriceTarget(indicators, direction) {
    const currentPrice = indicators.currentPrice;
    const volatility = indicators.priceAction?.daily?.volatility || 5;
    
    if (direction === 'bullish') {
      const resistance = indicators.resistance;
      const targetMultiplier = 1 + (volatility / 100);
      return Math.max(currentPrice * targetMultiplier, resistance * 1.02);
    } else if (direction === 'bearish') {
      const support = indicators.support;
      const targetMultiplier = 1 - (volatility / 100);
      return Math.min(currentPrice * targetMultiplier, support * 0.98);
    }
    
    return currentPrice;
  }

  calculateStopLoss(indicators, direction) {
    const currentPrice = indicators.currentPrice;
    const volatility = indicators.priceAction?.daily?.volatility || 5;
    const riskPercentage = Math.max(volatility * 0.5, 2); // Minimum 2% risk
    
    if (direction === 'bullish') {
      return currentPrice * (1 - riskPercentage / 100);
    } else if (direction === 'bearish') {
      return currentPrice * (1 + riskPercentage / 100);
    }
    
    return currentPrice;
  }

  getRecommendedTimeframe(strength) {
    switch (strength) {
      case 'strong': return '3-7 days';
      case 'moderate': return '1-3 days';
      case 'weak': return '4-24 hours';
      default: return '1-2 days';
    }
  }

  // === ADVANCED TECHNICAL INDICATORS ===
  calculateSMA(data, period) {
    if (!data || data.length < period || period <= 0) return null;
    
    // Handle both price arrays and OHLC objects
    const values = Array.isArray(data[0]) 
      ? data.slice(-period).map(item => item[1] || item[4]) // [timestamp, price] or close price
      : data.slice(-period).map(item => item.close || item);
      
    const sum = values.reduce((acc, val) => acc + parseFloat(val), 0);
    return sum / period;
  }

  calculateEMA(data, period) {
    if (!data || data.length < period) return null;
    
    const values = Array.isArray(data[0])
      ? data.map(item => parseFloat(item[1] || item[4]))
      : data.map(item => parseFloat(item.close || item));
    
    const multiplier = 2 / (period + 1);
    let ema = values.slice(0, period).reduce((a, b) => a + b) / period;
    
    for (let i = period; i < values.length; i++) {
      ema = (values[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  calculateRSI(data, period = 14) {
    if (!data || data.length < period + 1) return null;
    
    const values = Array.isArray(data[0])
      ? data.map(item => parseFloat(item[1] || item[4]))
      : data.map(item => parseFloat(item.close || item));
    
    const changes = [];
    for (let i = 1; i < values.length; i++) {
      changes.push(values[i] - values[i-1]);
    }
    
    let avgGain = 0;
    let avgLoss = 0;
    
    // Calculate initial averages
    const initialChanges = changes.slice(0, period);
    const gains = initialChanges.filter(change => change > 0);
    const losses = initialChanges.filter(change => change < 0);
    
    avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
    avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0)) / period : 0;
    
    // Smooth subsequent values
    for (let i = period; i < changes.length; i++) {
      const change = changes[i];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (!data || data.length < slowPeriod) return null;
    
    const fastEMA = this.calculateEMA(data, fastPeriod);
    const slowEMA = this.calculateEMA(data, slowPeriod);
    
    if (!fastEMA || !slowEMA) return null;
    
    const macdLine = fastEMA - slowEMA;
    
    // Calculate signal line using signalPeriod
    const signalLine = macdLine * (2 / (signalPeriod + 1));
    
    return {
      macd: macdLine,
      signal: signalLine,
      histogram: macdLine * 0.1,
      interpretation: this.interpretMACD(macdLine)
    };
  }

  calculateBollingerBands(data, period = 20, stdDev = 2) {
    if (!data || data.length < period) return null;
    
    const sma = this.calculateSMA(data, period);
    if (!sma) return null;
    
    const values = Array.isArray(data[0])
      ? data.slice(-period).map(item => parseFloat(item[1] || item[4]))
      : data.slice(-period).map(item => parseFloat(item.close || item));
    
    // Calculate standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - sma, 2), 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (standardDeviation * stdDev),
      middle: sma,
      lower: sma - (standardDeviation * stdDev),
      width: (standardDeviation * stdDev * 2) / sma * 100,
      interpretation: this.interpretBollingerBands(sma, standardDeviation)
    };
  }

  calculateStochastic(data, kPeriod = 14, dPeriod = 3) {
    if (!data || data.length < kPeriod) return null;
    
    const recentData = data.slice(-kPeriod);
    const highs = recentData.map(item => parseFloat(item.high || item[2]));
    const lows = recentData.map(item => parseFloat(item.low || item[3]));
    const closes = recentData.map(item => parseFloat(item.close || item[4]));
    
    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);
    const currentClose = closes[closes.length - 1];
    
    const kPercent = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // Calculate %D using dPeriod (simplified moving average)
    const dPercent = kPercent * (2 / (dPeriod + 1));
    
    return {
      k: kPercent,
      d: dPercent,
      interpretation: this.interpretStochastic(kPercent)
    };
  }

  calculateWilliamsR(data, period = 14) {
    const stoch = this.calculateStochastic(data, period);
    if (!stoch) return null;
    
    const williamsR = stoch.k - 100;
    
    return {
      value: williamsR,
      interpretation: this.interpretWilliamsR(williamsR)
    };
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

  analyzeVolumeProfile(ohlcvData) {
    if (!ohlcvData || ohlcvData.length < 20) return null;
    
    // Calculate volume-weighted average price (VWAP)
    let totalVolume = 0;
    let totalVolumePrice = 0;
    
    const recentData = ohlcvData.slice(-20);
    
    recentData.forEach(candle => {
      const typicalPrice = (candle.high + candle.low + candle.close) / 3;
      const volume = candle.volume;
      
      totalVolumePrice += typicalPrice * volume;
      totalVolume += volume;
    });
    
    const vwap = totalVolume > 0 ? totalVolumePrice / totalVolume : null;
    const currentPrice = ohlcvData[ohlcvData.length - 1].close;
    
    // Analyze volume distribution
    const highVolumeCandles = recentData.filter(candle => 
      candle.volume > (totalVolume / recentData.length) * 1.5
    );
    
    return {
      vwap,
      currentVsVwap: vwap ? ((currentPrice - vwap) / vwap) * 100 : null,
      highVolumeNodes: highVolumeCandles.length,
      volumeInterpretation: this.interpretVolumeProfile(vwap, currentPrice, highVolumeCandles.length)
    };
  }

  interpretVolumeProfile(vwap, currentPrice, highVolumeNodes) {
    if (!vwap) return { signal: 'insufficient_data' };
    
    const deviation = ((currentPrice - vwap) / vwap) * 100;
    
    if (deviation > 2 && highVolumeNodes >= 3) {
      return { signal: 'strong_bullish', reason: 'Price above VWAP with high volume support' };
    }
    if (deviation < -2 && highVolumeNodes >= 3) {
      return { signal: 'strong_bearish', reason: 'Price below VWAP with high volume pressure' };
    }
    if (Math.abs(deviation) < 1) {
      return { signal: 'neutral', reason: 'Price consolidating around VWAP' };
    }
    
    return { signal: 'weak_trend', reason: 'Mixed volume signals' };
  }

  // === DEXSCREENER API - THE ALPHA SOURCE ===
  async getDexScreenerTrending() {
    return this.fetchWithCache('dexscreener_trending', async () => {
      try {
        logger.info('🚀 Fetching trending tokens from DexScreener...');
        
        const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/trending', {
          timeout: 15000,
          headers: {
            'User-Agent': 'BrickBot/1.0 (Educational)',
            'Accept': 'application/json'
          }
        });

        if (!response.data || !response.data.pairs) {
          logger.warn('⚠️ No trending data from DexScreener');
          return [];
        }

        // Transform and filter trending tokens
        const trending = response.data.pairs.slice(0, 20).map(pair => ({
          token: {
            name: pair.baseToken?.name || 'Unknown',
            symbol: pair.baseToken?.symbol || 'UNK',
            address: pair.baseToken?.address,
            chain: pair.chainId
          },
          price: parseFloat(pair.priceUsd || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          dexId: pair.dexId,
          pairAddress: pair.pairAddress,
          marketCap: parseFloat(pair.fdv || 0),
          url: pair.url
        }));

        logger.info(`✅ Found ${trending.length} trending tokens on DexScreener`);
        return trending;

      } catch (error) {
        logger.error('❌ Failed to fetch DexScreener trending:', error.message);
        return [];
      }
    }, 2 * 60 * 1000); // Cache for 2 minutes (trending changes fast)
  }

  async getDexScreenerTokenData(tokenAddress, chainId = 'ethereum') {
    return this.fetchWithCache(`dexscreener_token_${chainId}_${tokenAddress}`, async () => {
      try {
        logger.info(`🔍 Fetching DexScreener data for ${tokenAddress} on ${chainId}...`);
        
        const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
          timeout: 10000,
          headers: {
            'User-Agent': 'BrickBot/1.0 (Educational)',
            'Accept': 'application/json'
          }
        });

        if (!response.data || !response.data.pairs || response.data.pairs.length === 0) {
          logger.warn(`⚠️ No DexScreener data found for ${tokenAddress}`);
          return null;
        }

        // Get the most liquid pair for this token
        const bestPair = response.data.pairs
          .filter(pair => pair.chainId === chainId)
          .sort((a, b) => (parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0)))[0];

        if (!bestPair) {
          logger.warn(`⚠️ No suitable pair found for ${tokenAddress} on ${chainId}`);
          return null;
        }

        const tokenData = {
          token: {
            name: bestPair.baseToken?.name || 'Unknown',
            symbol: bestPair.baseToken?.symbol || 'UNK',
            address: bestPair.baseToken?.address,
            chain: bestPair.chainId
          },
          price: parseFloat(bestPair.priceUsd || 0),
          volume24h: parseFloat(bestPair.volume?.h24 || 0),
          priceChange: {
            h1: parseFloat(bestPair.priceChange?.h1 || 0),
            h6: parseFloat(bestPair.priceChange?.h6 || 0),
            h24: parseFloat(bestPair.priceChange?.h24 || 0)
          },
          liquidity: parseFloat(bestPair.liquidity?.usd || 0),
          marketCap: parseFloat(bestPair.fdv || 0),
          dexInfo: {
            dexId: bestPair.dexId,
            pairAddress: bestPair.pairAddress,
            url: bestPair.url
          },
          risk: this.assessTokenRisk(bestPair)
        };

        logger.info(`✅ Retrieved DexScreener data for ${tokenData.token.symbol}`);
        return tokenData;

      } catch (error) {
        logger.error(`❌ Failed to fetch DexScreener token data for ${tokenAddress}:`, error.message);
        return null;
      }
    });
  }

  async searchDexScreenerTokens(query) {
    try {
      logger.info(`🔍 Searching DexScreener for: ${query}`);
      
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/search`, {
        params: { q: query },
        timeout: 10000,
        headers: {
          'User-Agent': 'BrickBot/1.0 (Educational)',
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.pairs) {
        return [];
      }

      // Return top 10 results sorted by liquidity
      const results = response.data.pairs
        .slice(0, 10)
        .map(pair => ({
          token: {
            name: pair.baseToken?.name || 'Unknown',
            symbol: pair.baseToken?.symbol || 'UNK',
            address: pair.baseToken?.address,
            chain: pair.chainId
          },
          price: parseFloat(pair.priceUsd || 0),
          volume24h: parseFloat(pair.volume?.h24 || 0),
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          marketCap: parseFloat(pair.fdv || 0),
          url: pair.url
        }))
        .sort((a, b) => b.liquidity - a.liquidity);

      logger.info(`✅ Found ${results.length} tokens matching "${query}"`);
      return results;

    } catch (error) {
      logger.error(`❌ Failed to search DexScreener for "${query}":`, error.message);
      return [];
    }
  }

  // Risk assessment for new tokens
  assessTokenRisk(pairData) {
    let riskScore = 0;
    const risks = [];
    
    const liquidity = parseFloat(pairData.liquidity?.usd || 0);
    const volume24h = parseFloat(pairData.volume?.h24 || 0);
    const marketCap = parseFloat(pairData.fdv || 0);
    
    // Low liquidity risk
    if (liquidity < 10000) {
      riskScore += 30;
      risks.push('Very low liquidity (<$10K)');
    } else if (liquidity < 50000) {
      riskScore += 15;
      risks.push('Low liquidity (<$50K)');
    }
    
    // Volume to liquidity ratio
    if (liquidity > 0) {
      const volumeRatio = volume24h / liquidity;
      if (volumeRatio > 5) {
        riskScore += 20;
        risks.push('Extremely high volume/liquidity ratio');
      }
    }
    
    // Market cap analysis
    if (marketCap > 0 && marketCap < 100000) {
      riskScore += 25;
      risks.push('Very small market cap (<$100K)');
    }
    
    // Age-based risk (if we had creation time)
    // Could add wallet distribution analysis, etc.
    
    let riskLevel = 'LOW';
    if (riskScore >= 50) riskLevel = 'EXTREME';
    else if (riskScore >= 30) riskLevel = 'HIGH';
    else if (riskScore >= 15) riskLevel = 'MEDIUM';
    
    return {
      score: riskScore,
      level: riskLevel,
      factors: risks,
      recommendation: riskLevel === 'EXTREME' ? 'AVOID' : 
                     riskLevel === 'HIGH' ? 'EXTREME_CAUTION' :
                     riskLevel === 'MEDIUM' ? 'CAREFUL' : 'ACCEPTABLE'
    };
  }

  // === COINGECKO FALLBACK METHODS ===
  coinbaseProductToCoinGeckoId(productId) {
    const mapping = {
      'ETH-USD': 'ethereum',
      'BTC-USD': 'bitcoin',
      'SOL-USD': 'solana', 
      'ADA-USD': 'cardano',
      'LINK-USD': 'chainlink',
      'AVAX-USD': 'avalanche-2',
      'MATIC-USD': 'matic-network',
      'DOT-USD': 'polkadot',
      'UNI-USD': 'uniswap',
      'ATOM-USD': 'cosmos',
      'ALGO-USD': 'algorand'
    };
    
    if (!mapping[productId]) {
      logger.warn(`⚠️ Unknown Coinbase product ${productId}, analysis may be inaccurate`);
    }
    
    return mapping[productId] || null;
  }

  async getCoinGeckoHistoricalData(coinId, days = 100, interval = 'daily') {
    try {
      logger.info(`📈 Fetching CoinGecko historical data for ${coinId}...`);
      
      const response = await axios.get(`${this.dataSources.coingecko.baseUrl}/coins/${coinId}/market_chart`, {
        params: {
          vs_currency: 'usd',
          days: days,
          interval: interval === 'hourly' && days <= 1 ? 'hourly' : 'daily'
        },
        timeout: 15000
      });

      const prices = response.data.prices || [];
      const volumes = response.data.total_volumes || [];
      
      if (prices.length === 0) {
        logger.warn(`⚠️ No price data from CoinGecko for ${coinId}`);
        return [];
      }

      // Transform CoinGecko data to OHLCV format
      // Note: CoinGecko only provides price and volume, so we'll estimate OHLC
      const transformedData = prices.map((price, index) => {
        const [timestamp, close] = price;
        const volume = volumes[index] ? volumes[index][1] : 0;
        
        // Estimate OHLC from price (simplified)
        return {
          timestamp: timestamp,
          open: close * 0.999, // Slight variation for demo
          high: close * 1.002,
          low: close * 0.998, 
          close: close,
          volume: volume
        };
      });

      logger.info(`✅ Successfully fetched ${transformedData.length} data points from CoinGecko for ${coinId}`);
      return transformedData;

    } catch (error) {
      logger.error(`❌ Failed to fetch CoinGecko data for ${coinId}:`, error.message);
      return [];
    }
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

  // === INTERPRETATION METHODS ===
  interpretMACD(macdValue) {
    if (macdValue > 0) return { signal: 'bullish', strength: Math.min(macdValue / 10, 1) };
    return { signal: 'bearish', strength: Math.min(Math.abs(macdValue) / 10, 1) };
  }

  interpretBollingerBands(sma, stdDev) {
    const volatility = stdDev / sma * 100;
    if (volatility < 2) return { condition: 'squeeze', signal: 'breakout_imminent' };
    if (volatility > 5) return { condition: 'expansion', signal: 'high_volatility' };
    return { condition: 'normal', signal: 'neutral' };
  }

  interpretStochastic(kValue) {
    if (kValue > 80) return { condition: 'overbought', signal: 'potential_sell' };
    if (kValue < 20) return { condition: 'oversold', signal: 'potential_buy' };
    return { condition: 'neutral', signal: 'hold' };
  }

  interpretWilliamsR(value) {
    if (value > -20) return { condition: 'overbought', signal: 'sell_signal' };
    if (value < -80) return { condition: 'oversold', signal: 'buy_signal' };
    return { condition: 'neutral', signal: 'hold' };
  }

  // === CONFIDENCE SCORING SYSTEM ===
  calculateConfluence(indicators) {
    const signals = [];
    
    // RSI signals
    if (indicators.rsi) {
      if (indicators.rsi < 30) signals.push({ type: 'RSI', direction: 'bullish', weight: 0.8 });
      if (indicators.rsi > 70) signals.push({ type: 'RSI', direction: 'bearish', weight: 0.8 });
    }
    
    // MACD signals
    if (indicators.macd && indicators.macd.interpretation) {
      signals.push({ 
        type: 'MACD', 
        direction: indicators.macd.interpretation.signal, 
        weight: indicators.macd.interpretation.strength 
      });
    }
    
    // Bollinger Bands signals
    if (indicators.bollingerBands) {
      const bb = indicators.bollingerBands;
      if (bb.interpretation.signal === 'breakout_imminent') {
        signals.push({ type: 'BB', direction: 'neutral', weight: 0.6 });
      }
    }
    
    // Stochastic signals
    if (indicators.stochastic) {
      const stoch = indicators.stochastic.interpretation;
      if (stoch.signal === 'potential_buy') {
        signals.push({ type: 'Stochastic', direction: 'bullish', weight: 0.7 });
      }
      if (stoch.signal === 'potential_sell') {
        signals.push({ type: 'Stochastic', direction: 'bearish', weight: 0.7 });
      }
    }
    
    // Volume confirmation
    if (indicators.volumeTrend === 'increasing_significantly') {
      signals.push({ type: 'Volume', direction: 'bullish', weight: 0.5 });
    }
    
    return {
      signals,
      bullishSignals: signals.filter(s => s.direction === 'bullish'),
      bearishSignals: signals.filter(s => s.direction === 'bearish'),
      neutralSignals: signals.filter(s => s.direction === 'neutral')
    };
  }

  calculateConfidenceScore(indicators, confluence) {
    let confidence = 0;
    const maxConfidence = 100;
    
    // Base confidence from number of indicators
    const indicatorCount = Object.keys(indicators).filter(key => 
      indicators[key] !== null && key !== 'confluence' && key !== 'confidence'
    ).length;
    confidence += Math.min(indicatorCount * 10, 40); // Max 40 from indicator count
    
    // Confluence scoring
    const { bullishSignals, bearishSignals } = confluence;
    
    if (bullishSignals.length > 0 || bearishSignals.length > 0) {
      const dominantSignals = bullishSignals.length > bearishSignals.length ? bullishSignals : bearishSignals;
      const conflictingSignals = bullishSignals.length > bearishSignals.length ? bearishSignals : bullishSignals;
      
      // Add confidence for confluence
      const confluenceScore = dominantSignals.reduce((acc, signal) => acc + (signal.weight * 30), 0);
      confidence += confluenceScore;
      
      // Subtract for conflicting signals
      const conflictPenalty = conflictingSignals.reduce((acc, signal) => acc + (signal.weight * 20), 0);
      confidence -= conflictPenalty;
    }
    
    // Volume confirmation bonus
    if (indicators.volumeTrend === 'increasing_significantly') {
      confidence += 15;
    } else if (indicators.volumeTrend === 'decreasing_significantly') {
      confidence -= 10;
    }
    
    // Market sentiment factor
    // This will be enhanced with fear/greed data
    
    return {
      score: Math.max(0, Math.min(maxConfidence, Math.round(confidence))),
      direction: this.determineOverallDirection(confluence),
      strength: this.determineSignalStrength(confluence),
      reasoning: this.generateConfidenceReasoning(indicators, confluence)
    };
  }

  determineOverallDirection(confluence) {
    const { bullishSignals, bearishSignals } = confluence;
    
    const bullishWeight = bullishSignals.reduce((acc, s) => acc + s.weight, 0);
    const bearishWeight = bearishSignals.reduce((acc, s) => acc + s.weight, 0);
    
    if (Math.abs(bullishWeight - bearishWeight) < 0.3) return 'neutral';
    return bullishWeight > bearishWeight ? 'bullish' : 'bearish';
  }

  determineSignalStrength(confluence) {
    const totalSignals = confluence.signals.length;
    const maxWeight = Math.max(...confluence.signals.map(s => s.weight));
    
    if (totalSignals >= 4 && maxWeight > 0.7) return 'strong';
    if (totalSignals >= 2 && maxWeight > 0.5) return 'moderate';
    return 'weak';
  }

  generateConfidenceReasoning(indicators, confluence) {
    const reasons = [];
    
    confluence.signals.forEach(signal => {
      reasons.push(`${signal.type}: ${signal.direction} (${Math.round(signal.weight * 100)}%)`);
    });
    
    return reasons.slice(0, 5); // Top 5 reasons
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

  generateInsights(marketOverview, sentiment, technicals) {
    const insights = [];
    
    // Only add insights if we have valid technical data
    if (!technicals || !technicals.indicators) {
      return insights;
    }
    
    // Market overview insights
    if (marketOverview && marketOverview.global) {
      if (marketOverview.global.market_cap_change_percentage_24h > 5) {
        insights.push({
          type: 'market',
          signal: 'bullish',
          message: 'Overall crypto market showing strong growth'
        });
      }
    }
    
    // Volume insights
    if (technicals.indicators.volumeTrend === 'increasing_significantly') {
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
    if (technicals.indicators.rsi && technicals.indicators.rsi < 30) {
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