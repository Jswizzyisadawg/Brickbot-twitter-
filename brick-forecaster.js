// === BRICK BOT - CLAUDE API WRAPPER FOR ADAPTIVE CRYPTO FORECASTING ===
// This is Brick's brain for generating personality-driven crypto forecasts
// Uses real-time data + Claude AI + Ron Burgundy personality = LEGENDARY forecasts

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// === CONFIGURATION ===
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

// State file for Brick's mood persistence
const STATE_FILE = path.join(__dirname, 'brick_state.json');

// === BRICK'S PERSONALITY MOODS ===
const MOODS = {
    COCKY: 'cocky',      // >60% positive sentiment
    NEUTRAL: 'neutral',   // 40-60% sentiment  
    HUMBLE: 'humble'      // <40% positive sentiment
};

// === SENTIMENT ANALYSIS KEYWORDS ===
const POSITIVE_KEYWORDS = [
    'bull', 'bullish', 'moon', 'mooning', 'pump', 'pumping', 'rocket', 'lambo', 
    'diamond', 'hands', 'hodl', 'buy', 'long', 'calls', 'green', 'up', 'rise',
    'surge', 'breakout', 'rally', 'gains', 'profit', 'winning', 'bullrun'
];

const NEGATIVE_KEYWORDS = [
    'bear', 'bearish', 'dump', 'dumping', 'crash', 'rekt', 'liquidated',
    'short', 'puts', 'red', 'down', 'fall', 'drop', 'dip', 'correction',
    'sell', 'panic', 'fud', 'fear', 'bleeding', 'death', 'winter'
];

const SLANG_PATTERNS = [
    /\bWAGMI\b/gi, /\bGMI\b/gi, /\bNGMI\b/gi, /\bHODL\b/gi, /\bDYOR\b/gi,
    /\bFOMO\b/gi, /\bFUD\b/gi, /\bATH\b/gi, /\bDCA\b/gi, /\bTO THE MOON\b/gi,
    /\b(?:DIAMOND|💎)\s*(?:HANDS|🙌)\b/gi, /\bAPE\s*IN\b/gi, /\bSTONKS\b/gi,
    /\bLFG\b/gi, /\bBTFD\b/gi, /\bDEGEN\b/gi, /\bSER\b/gi, /\bGM\b/gi
];

// === OAUTH TOKEN REFRESH ===
async function refreshTwitterToken() {
    try {
        console.log('🔄 Refreshing Twitter access token...');
        
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
                }
            }
        );

        const { access_token, refresh_token, expires_in } = response.data;
        
        // Update environment variables in memory
        process.env.TWITTER_ACCESS_TOKEN = access_token;
        if (refresh_token) process.env.TWITTER_REFRESH_TOKEN = refresh_token;
        process.env.TWITTER_TOKEN_EXPIRES = Date.now() + (expires_in * 1000);
        
        console.log('✅ Twitter token refreshed successfully');
        return access_token;
        
    } catch (error) {
        console.error('❌ Failed to refresh Twitter token:', error.response?.data || error.message);
        throw error;
    }
}

// === GET VALID TWITTER TOKEN ===
async function getValidTwitterToken() {
    const tokenExpiry = parseInt(process.env.TWITTER_TOKEN_EXPIRES || '0');
    const now = Date.now();
    
    // If token expires in less than 5 minutes, refresh it
    if (now >= (tokenExpiry - 300000)) {
        return await refreshTwitterToken();
    }
    
    return process.env.TWITTER_ACCESS_TOKEN;
}

// === BRICK STATE MANAGEMENT ===
async function loadBrickState() {
    try {
        const data = await fs.readFile(STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Default state if file doesn't exist
        const defaultState = {
            mood: MOODS.NEUTRAL,
            lastForecast: '',
            lastUpdate: Date.now(),
            totalForecasts: 0
        };
        await saveBrickState(defaultState);
        return defaultState;
    }
}

async function saveBrickState(state) {
    try {
        await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('❌ Failed to save Brick state:', error.message);
    }
}

// === DATA FETCHING FUNCTIONS ===

// Fetch CoinGecko price data
async function fetchCoinGeckoData(coin) {
    try {
        console.log(`📊 Fetching CoinGecko data for ${coin}...`);
        
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart`, {
            params: {
                vs_currency: 'usd',
                days: 1,
                interval: 'hourly'
            },
            timeout: 10000
        });
        
        const prices = response.data.prices;
        const volumes = response.data.total_volumes;
        
        if (prices.length < 2) {
            throw new Error('Insufficient price data');
        }
        
        const currentPrice = prices[prices.length - 1][1];
        const previousPrice = prices[0][1];
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        const currentVolume = volumes[volumes.length - 1][1];
        const previousVolume = volumes[0][1];
        const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
        
        return {
            currentPrice: currentPrice.toFixed(6),
            priceChange: priceChange.toFixed(2),
            volumeChange: volumeChange.toFixed(2),
            success: true
        };
        
    } catch (error) {
        console.error(`❌ CoinGecko API error for ${coin}:`, error.message);
        return {
            currentPrice: 'N/A',
            priceChange: '0.00',
            volumeChange: '0.00',
            success: false
        };
    }
}

// Fetch Twitter sentiment data
async function fetchTwitterSentiment(coin) {
    try {
        console.log(`🐦 Fetching Twitter sentiment for ${coin}...`);
        
        const accessToken = await getValidTwitterToken();
        const query = `${coin} crypto lang:en -is:retweet`;
        
        const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
            params: {
                query: query,
                max_results: 50,
                'tweet.fields': 'created_at,public_metrics'
            },
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 10000
        });
        
        const tweets = response.data.data || [];
        let positiveCount = 0;
        let negativeCount = 0;
        const foundSlang = new Set();
        
        tweets.forEach(tweet => {
            const text = tweet.text.toLowerCase();
            
            // Count positive keywords
            POSITIVE_KEYWORDS.forEach(keyword => {
                if (text.includes(keyword)) positiveCount++;
            });
            
            // Count negative keywords  
            NEGATIVE_KEYWORDS.forEach(keyword => {
                if (text.includes(keyword)) negativeCount++;
            });
            
            // Extract slang
            SLANG_PATTERNS.forEach(pattern => {
                const matches = tweet.text.match(pattern);
                if (matches) {
                    matches.forEach(match => foundSlang.add(match.toUpperCase()));
                }
            });
        });
        
        const totalSentiment = positiveCount + negativeCount;
        const sentimentScore = totalSentiment > 0 ? (positiveCount / totalSentiment) * 100 : 50;
        
        return {
            sentimentScore: sentimentScore.toFixed(1),
            positiveCount,
            negativeCount,
            totalTweets: tweets.length,
            slang: Array.from(foundSlang).slice(0, 3), // Top 3 slang terms
            success: true
        };
        
    } catch (error) {
        console.error(`❌ Twitter API error for ${coin}:`, error.response?.data || error.message);
        return {
            sentimentScore: '50.0',
            positiveCount: 0,
            negativeCount: 0,
            totalTweets: 0,
            slang: [],
            success: false
        };
    }
}

// Fetch news data (optional)
async function fetchNewsData(coin) {
    if (!process.env.NEWS_API_KEY) {
        return { headline: '', success: false };
    }
    
    try {
        console.log(`📰 Fetching news for ${coin}...`);
        
        const response = await axios.get('https://newsapi.org/v2/everything', {
            params: {
                q: `${coin} crypto`,
                sortBy: 'publishedAt',
                pageSize: 1,
                language: 'en'
            },
            headers: {
                'X-API-Key': process.env.NEWS_API_KEY
            },
            timeout: 10000
        });
        
        const articles = response.data.articles || [];
        const headline = articles.length > 0 ? articles[0].title : '';
        
        return {
            headline,
            success: true
        };
        
    } catch (error) {
        console.error(`❌ News API error for ${coin}:`, error.message);
        return { headline: '', success: false };
    }
}

// === MOOD CALCULATION ===
function calculateMood(sentimentScore) {
    const score = parseFloat(sentimentScore);
    if (score > 60) return MOODS.COCKY;
    if (score < 40) return MOODS.HUMBLE;
    return MOODS.NEUTRAL;
}

// === CLAUDE PROMPT GENERATION ===
function generateClaudePrompt(coin, data, state) {
    const { coinGecko, twitter, news } = data;
    const mood = state.mood;
    
    // Mood-specific personality instructions
    const moodInstructions = {
        [MOODS.COCKY]: "Be confident, slightly arrogant, use phrases like 'Obviously' and 'I'm not surprised'",
        [MOODS.NEUTRAL]: "Be balanced and professional but still witty",
        [MOODS.HUMBLE]: "Be more cautious, use phrases like 'I could be wrong but' and 'staying humble'"
    };
    
    const slangText = twitter.slang.length > 0 ? `Use this crypto slang if appropriate: ${twitter.slang.join(', ')}` : '';
    
    return `You are Brick, a crypto forecasting bot with Ron Burgundy's personality from Anchorman. 

CURRENT DATA FOR ${coin.toUpperCase()}:
- Price: $${coinGecko.currentPrice} (24h change: ${coinGecko.priceChange}%)
- Volume change: ${coinGecko.volumeChange}%
- Twitter sentiment: ${twitter.sentimentScore}% positive (${twitter.totalTweets} tweets analyzed)
- Positive mentions: ${twitter.positiveCount}, Negative: ${twitter.negativeCount}
${news.headline ? `- Latest news: ${news.headline}` : ''}

PERSONALITY MODE: ${mood} - ${moodInstructions[mood]}

Create a 24-hour forecast tweet (under 280 characters) that includes:
1. Bullish/Bearish/Neutral prediction with % confidence
2. Ron Burgundy humor and personality 
3. Reference the data naturally
4. End with a twisted Ron Burgundy quote
5. ${slangText}
6. Add "Not financial advice" disclaimer

Keep it fun, witty, and true to Brick's Anchorman personality. Stay classy!`;
}

// === CLAUDE API CALL ===
async function callClaude(prompt) {
    try {
        console.log('🧠 Generating forecast with Claude...');
        
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 200,
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ]
        });
        
        return response.content[0].text.trim();
        
    } catch (error) {
        console.error('❌ Claude API error:', error.message);
        throw error;
    }
}

// === MAIN FORECAST FUNCTION ===
async function generateBrickForecast(coin) {
    try {
        console.log(`🧱 BRICK FORECAST STARTING FOR: ${coin.toUpperCase()}`);
        
        // Easter egg for scotch!
        if (coin.toLowerCase().includes('scotch')) {
            return "Scotchy scotch scotch! Market's drunk—50% chaos vibes. Stay classy! 🥃 #ScotchAnalysis";
        }
        
        // Load current state
        const state = await loadBrickState();
        console.log(`🎭 Current mood: ${state.mood}`);
        
        // Fetch all data in parallel
        console.log('📡 Fetching market data...');
        const [coinGeckoData, twitterData, newsData] = await Promise.all([
            fetchCoinGeckoData(coin),
            fetchTwitterSentiment(coin),
            fetchNewsData(coin)
        ]);
        
        // Update mood based on sentiment
        const newMood = calculateMood(twitterData.sentimentScore);
        if (newMood !== state.mood) {
            console.log(`🎭 Mood changed: ${state.mood} → ${newMood}`);
            state.mood = newMood;
        }
        
        // Generate Claude prompt
        const prompt = generateClaudePrompt(coin, {
            coinGecko: coinGeckoData,
            twitter: twitterData,
            news: newsData
        }, state);
        
        // Get forecast from Claude
        const forecast = await callClaude(prompt);
        
        // Update state
        state.lastForecast = forecast;
        state.lastUpdate = Date.now();
        state.totalForecasts = (state.totalForecasts || 0) + 1;
        await saveBrickState(state);
        
        console.log('✅ Forecast generated successfully!');
        console.log('📊 Data sources:', {
            coinGecko: coinGeckoData.success ? '✅' : '❌',
            twitter: twitterData.success ? '✅' : '❌', 
            news: newsData.success ? '✅' : '❌'
        });
        
        return forecast;
        
    } catch (error) {
        console.error('💥 Forecast generation failed:', error.message);
        
        // Fallback response
        const fallbackQuotes = [
            "I'm gonna be honest with you, that smells like pure gasoline... and uncertainty! 50% chaos vibes. Stay classy! Not financial advice 🧱",
            "Great Caesar's ghost! The market's being mysterious. I'm 40% confused but 100% classy. Stay strong! Not financial advice 📺",
            "By the beard of Zeus! Technical difficulties in the forecast department. Markets gonna market! Stay classy! Not financial advice ⚓"
        ];
        
        return fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    }
}

// === EXPORT FOR INTEGRATION ===
module.exports = {
    generateBrickForecast,
    loadBrickState,
    saveBrickState
};

// === EXAMPLE USAGE (for testing) ===
if (require.main === module) {
    async function testForecast() {
        console.log('🧪 Testing Brick Forecaster...');
        
        const testCoins = ['bitcoin', 'ethereum', 'scotch'];
        
        for (const coin of testCoins) {
            console.log(`\n${'='.repeat(50)}`);
            console.log(`Testing: ${coin}`);
            console.log('='.repeat(50));
            
            try {
                const forecast = await generateBrickForecast(coin);
                console.log('\n🎯 FORECAST:');
                console.log(forecast);
                console.log(`\n✅ Character count: ${forecast.length}/280`);
            } catch (error) {
                console.error(`❌ Test failed for ${coin}:`, error.message);
            }
            
            // Wait between tests to avoid rate limits
            if (coin !== testCoins[testCoins.length - 1]) {
                console.log('\n⏳ Waiting 5 seconds...');
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
        
        console.log('\n🧱 Test complete! Stay classy!');
    }
    
    testForecast().catch(console.error);
}