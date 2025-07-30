// === MULTI-BRAIN INTELLIGENCE SYSTEM - BRICK'S 6 SPECIALIZED ANALYSTS ===
// Each brain specializes in different aspects of crypto analysis

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

class MultiBrainIntelligence {
  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });
    
    this.brains = {
      technical: new TechnicalBrain(this.claude),
      fundamental: new FundamentalBrain(this.claude),
      sentiment: new SentimentBrain(this.claude),
      macro: new MacroBrain(this.claude),
      quant: new QuantBrain(this.claude),
      narrative: new NarrativeBrain(this.claude)
    };
    
    logger.info('🧠 Multi-Brain Intelligence System initialized - 6 analysts ready!');
  }

  // === CONSENSUS ANALYSIS ===
  async generateConsensusAnalysis(marketData, asset = 'ethereum') {
    try {
      logger.info(`🔬 Running 6-brain analysis on ${asset}...`);
      
      // Run all brains in parallel
      const analyses = await Promise.all([
        this.brains.technical.analyze(marketData, asset),
        this.brains.fundamental.analyze(marketData, asset),
        this.brains.sentiment.analyze(marketData, asset),
        this.brains.macro.analyze(marketData, asset),
        this.brains.quant.analyze(marketData, asset),
        this.brains.narrative.analyze(marketData, asset)
      ]);

      // Synthesize all brain outputs
      const consensus = await this.synthesizeConsensus(analyses, marketData, asset);
      
      logger.info('✅ 6-brain consensus analysis complete');
      return consensus;
      
    } catch (error) {
      logger.error('❌ Multi-brain analysis failed:', error);
      throw error;
    }
  }

  async synthesizeConsensus(analyses, marketData, asset) {
    const synthesisPrompt = `You are Brick Tamland, crypto god, synthesizing insights from your 6 specialized brain analysts.

TECHNICAL ANALYSIS:
${analyses[0].analysis}
Confidence: ${analyses[0].confidence}%

FUNDAMENTAL ANALYSIS:
${analyses[1].analysis}
Confidence: ${analyses[1].confidence}%

SENTIMENT ANALYSIS:
${analyses[2].analysis}
Confidence: ${analyses[2].confidence}%

MACRO ANALYSIS:
${analyses[3].analysis}
Confidence: ${analyses[3].confidence}%

QUANTITATIVE ANALYSIS:
${analyses[4].analysis}
Confidence: ${analyses[4].confidence}%

NARRATIVE ANALYSIS:
${analyses[5].analysis}
Confidence: ${analyses[5].confidence}%

CURRENT MARKET DATA:
- Price: $${marketData.market?.overview?.prices?.[asset]?.usd || 'N/A'}
- 24h Change: ${marketData.market?.overview?.prices?.[asset]?.usd_24h_change || 'N/A'}%
- Fear/Greed: ${marketData.market?.sentiment?.value || 'N/A'} (${marketData.market?.sentiment?.classification || 'N/A'})
- Volume Trend: ${marketData.market?.technicals?.volumeTrend || 'N/A'}

Create a meta-analysis that:
1. Weighs each brain's input by their confidence levels
2. Identifies consensus vs conflicting signals
3. Generates an overall prediction with confidence range
4. Explains the logic in Brick's voice (confused but brilliant)
5. Includes specific price targets and timeframes

Return as JSON:
{
  "consensus": "bullish/bearish/neutral",
  "confidence": 75,
  "priceTarget": "$2850",
  "timeframe": "3-7 days",
  "keyFactors": ["factor1", "factor2"],
  "risks": ["risk1", "risk2"],
  "brickExplanation": "Great Odin's raven! While staring at my lamp..."
}`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      messages: [{ role: "user", content: synthesisPrompt }],
      timeout: 30000
    });

    try {
      return JSON.parse(response.content[0].text);
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        consensus: "neutral",
        confidence: 60,
        priceTarget: "TBD",
        timeframe: "uncertain",
        keyFactors: ["analysis_error"],
        risks: ["parsing_error"],
        brickExplanation: response.content[0].text
      };
    }
  }
}

// === TECHNICAL ANALYSIS BRAIN ===
class TechnicalBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "Charts, patterns, indicators, price action";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Technical Analysis brain. Analyze the technical setup for ${asset}.

TECHNICAL DATA:
- SMA20: ${marketData.market?.technicals?.sma20 || 'N/A'}
- SMA50: ${marketData.market?.technicals?.sma50 || 'N/A'}
- RSI: ${marketData.market?.technicals?.rsi || 'N/A'}
- Volume Trend: ${marketData.market?.technicals?.volumeTrend || 'N/A'}
- Price Action: ${JSON.stringify(marketData.market?.technicals?.priceAction || {})}
- Support: $${marketData.market?.technicals?.support || 'N/A'}
- Resistance: $${marketData.market?.technicals?.resistance || 'N/A'}

Provide technical analysis focusing on:
1. Trend direction and strength
2. Key support/resistance levels
3. Momentum indicators (RSI, volume)
4. Chart patterns if visible
5. Entry/exit points

Be precise and technical. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'technical',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 70;
  }
}

// === FUNDAMENTAL ANALYSIS BRAIN ===
class FundamentalBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "On-chain metrics, tokenomics, network fundamentals";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Fundamental Analysis brain. Analyze the fundamental health of ${asset}.

MARKET DATA:
- Market Cap: $${marketData.market?.overview?.global?.total_market_cap?.usd || 'N/A'}
- 24h Volume: $${marketData.market?.overview?.prices?.[asset]?.usd_24h_vol || 'N/A'}
- Market Cap Dominance: ${marketData.market?.overview?.global?.market_cap_percentage || 'N/A'}
- Trending Coins: ${JSON.stringify(marketData.market?.trending || [])}

For ${asset}, analyze:
1. Network fundamentals (if applicable)
2. Adoption and development activity  
3. Tokenomics and supply dynamics
4. Ecosystem growth and partnerships
5. Long-term value proposition

Focus on fundamental strengths/weaknesses. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'fundamental',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 75;
  }
}

// === SENTIMENT ANALYSIS BRAIN ===
class SentimentBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "Social sentiment, fear/greed, market psychology";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Sentiment Analysis brain. Analyze market psychology for ${asset}.

SENTIMENT DATA:
- Fear/Greed Index: ${marketData.market?.sentiment?.value || 'N/A'} (${marketData.market?.sentiment?.classification || 'N/A'})
- Sentiment Interpretation: ${JSON.stringify(marketData.market?.sentiment?.interpretation || {})}
- Trending Coins: ${JSON.stringify(marketData.market?.trending || [])}
- Brick's Current Mood: ${marketData.brickMood?.mood || 'neutral'} (${marketData.brickMood?.confidence || 0.6} confidence)

Analyze:
1. Current market psychology state
2. Social media sentiment trends
3. Retail vs institutional sentiment
4. Contrarian vs momentum signals
5. Sentiment-based opportunities/risks

Focus on psychological factors driving price. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'sentiment',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 65;
  }
}

// === MACRO ANALYSIS BRAIN ===
class MacroBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "Global economics, Fed policy, macro trends";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Macro Analysis brain. Analyze macro factors affecting ${asset}.

MACRO CONTEXT:
- Global Market Cap: $${marketData.market?.overview?.global?.total_market_cap?.usd || 'N/A'}
- Market Cap Change 24h: ${marketData.market?.overview?.global?.market_cap_change_percentage_24h_usd || 'N/A'}%
- Current Date: ${new Date().toISOString().split('T')[0]}

Consider macro factors:
1. Federal Reserve policy and interest rates
2. Global economic conditions
3. Inflation trends and monetary policy
4. Traditional market correlations
5. Institutional adoption trends

Analyze how macro environment affects crypto and ${asset} specifically. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'macro',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 60;
  }
}

// === QUANTITATIVE ANALYSIS BRAIN ===
class QuantBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "Mathematical models, statistical analysis, patterns";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Quantitative Analysis brain. Apply mathematical models to ${asset}.

QUANTITATIVE DATA:
- Price Volatility: ${marketData.market?.technicals?.priceAction?.volatility || 'N/A'}%
- Volume Trend: ${marketData.market?.technicals?.volumeTrend || 'N/A'}
- RSI: ${marketData.market?.technicals?.rsi || 'N/A'}
- Price Action: ${JSON.stringify(marketData.market?.technicals?.priceAction || {})}

Apply quantitative methods:
1. Statistical probability models
2. Volatility analysis and predictions
3. Risk-adjusted return calculations
4. Correlation analysis with market factors
5. Mathematical pattern recognition

Use numbers and probabilities. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'quant',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 80;
  }
}

// === NARRATIVE ANALYSIS BRAIN ===
class NarrativeBrain {
  constructor(claude) {
    this.claude = claude;
    this.specialty = "Market narratives, meme cycles, story patterns";
  }

  async analyze(marketData, asset) {
    const prompt = `You are Brick's Narrative Analysis brain. Analyze the story and narrative around ${asset}.

NARRATIVE CONTEXT:
- Trending Coins: ${JSON.stringify(marketData.market?.trending || [])}
- Current Market Sentiment: ${marketData.market?.sentiment?.classification || 'neutral'}
- Asset Focus: ${asset}

Analyze narratives:
1. Current dominant crypto narratives
2. ${asset} specific storylines and themes
3. Meme cycle positioning
4. Community sentiment and social proof
5. Narrative momentum vs reality gaps

Focus on stories driving markets. Give confidence level 1-100.`;

    const response = await this.claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    });

    return {
      brain: 'narrative',
      analysis: response.content[0].text,
      confidence: this.extractConfidence(response.content[0].text)
    };
  }

  extractConfidence(text) {
    const match = text.match(/confidence[:\s]*(\d+)/i);
    return match ? parseInt(match[1]) : 70;
  }
}

module.exports = { MultiBrainIntelligence };