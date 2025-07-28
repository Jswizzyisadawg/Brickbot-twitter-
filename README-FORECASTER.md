# 🧱 BRICK BOT v2.0 - AI-POWERED CRYPTO FORECASTING SYSTEM

**The legendary Ron Burgundy of crypto forecasting is back and better than ever!**

Brick Bot v2.0 introduces revolutionary adaptive forecasting powered by Claude AI, real-time market data fusion, and dynamic personality modes. This is our most ambitious upgrade yet!

## 🚀 NEW FEATURES

### 🧠 **Adaptive AI Forecasting**
- **Claude 3.5 Sonnet integration** for intelligent market analysis
- **Dynamic prompts** based on real-time data (no more static responses!)
- **Personality-driven forecasts** that adapt to market sentiment

### 📊 **Real-Time Data Fusion**
- **CoinGecko API**: Live prices, 24h volume changes
- **Twitter v2 API**: Sentiment analysis from 50 recent tweets
- **NewsAPI**: Latest crypto headlines (optional)
- **Smart fallbacks** when APIs fail

### 🎭 **Dynamic Personality Modes**
- **Cocky Mode**: >60% positive sentiment ("Obviously this is happening!")
- **Neutral Mode**: 40-60% sentiment (balanced Ron Burgundy)
- **Humble Mode**: <40% sentiment ("I could be wrong but...")

### 🔄 **Advanced OAuth 2.0**
- **PKCE flow** for Twitter v2 API
- **Auto-refresh tokens** (no more expired tokens!)
- **Secure user-context authentication**

### 🎯 **Smart Features**
- **Slang integration**: Automatically uses crypto slang from tweets (WAGMI, HODL, etc.)
- **State persistence**: Mood tracking in `brick_state.json`
- **Easter eggs**: Try asking for "scotch" forecasts! 🥃
- **Character limit compliance**: Always under 280 characters

## 📋 SETUP INSTRUCTIONS

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Get Your API Keys**

#### **🧠 Claude API** (Required)
- Go to: https://console.anthropic.com/
- Create account and get API key
- Add to `.env`: `CLAUDE_API_KEY=your_key_here`

#### **🐦 Twitter v2 API** (Required)
- Go to: https://developer.twitter.com/
- Create new app with OAuth 2.0 enabled
- Set callback URL: `http://localhost:3000/callback`
- Get Client ID and Client Secret
- Add to `.env`:
  ```
  TWITTER_CLIENT_ID=your_client_id
  TWITTER_CLIENT_SECRET=your_client_secret
  ```

#### **📰 NewsAPI** (Optional)
- Go to: https://newsapi.org/
- Get free API key
- Add to `.env`: `NEWS_API_KEY=your_key_here`

### 3. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. **Run Twitter OAuth Setup** (One-time only)
```bash
npm run setup
```
This will:
- Open your browser automatically
- Guide you through Twitter authorization
- Save access/refresh tokens to `.env`
- Auto-close when complete

### 5. **Test the Forecaster**
```bash
npm run test-forecast
```

## 🎯 USAGE

### **Generate a Forecast**
```javascript
const { generateBrickForecast } = require('./brick-forecaster');

// Generate forecast for any coin
const forecast = await generateBrickForecast('bitcoin');
console.log(forecast);

// Example output:
// "📈 Bitcoin looking BULLISH! 73% confidence. Price up 5.2%, volume pumping 12%! 
// Twitter's going WAGMI mode. I'm not surprised - stay classy! Not financial advice 🧱"
```

### **Integration with Existing Bot**
```javascript
// In your main bot file
const { generateBrickForecast } = require('./brick-forecaster');

// Use in scheduled posts, replies, or on-demand
async function handleForecastRequest(coin) {
    const forecast = await generateBrickForecast(coin);
    await postTweet(forecast); // Your existing Twitter posting logic
}
```

## 🧱 HOW IT WORKS

### **Data Collection Process**
1. **Fetch CoinGecko data**: Current price, 24h change, volume
2. **Analyze Twitter sentiment**: 50 recent tweets, keyword analysis
3. **Get latest news**: Optional headline integration
4. **Extract crypto slang**: WAGMI, HODL, LFG, etc.

### **AI Analysis**
1. **Mood calculation**: Sentiment score determines personality mode
2. **Dynamic prompt generation**: Real data + mood + instructions
3. **Claude analysis**: Advanced AI generates forecast
4. **Output formatting**: Twitter-ready, under 280 characters

### **State Management**
- **Persistent mood tracking** in `brick_state.json`
- **Automatic mood updates** based on market sentiment
- **Forecast history** and statistics

## 🛡️ ERROR HANDLING & DURABILITY

### **Robust Fallbacks**
- **API failures**: Graceful degradation with default values
- **Token expiry**: Automatic OAuth refresh
- **Rate limits**: Smart retry logic
- **Network issues**: Fallback responses maintained

### **Logging & Monitoring**
- **Detailed logging** for all API calls
- **Success/failure tracking** for each data source
- **Error reporting** with context

## 🎨 EASTER EGGS & FUN

### **Scotch Analysis**
```javascript
const forecast = await generateBrickForecast('scotch');
// "Scotchy scotch scotch! Market's drunk—50% chaos vibes. Stay classy! 🥃"
```

### **Personality Examples**

**Cocky Mode** (Bull market vibes):
> "📈 Obviously Bitcoin's mooning! 85% confidence. Volume pumping like my cologne collection! WAGMI energy everywhere. 60% of the time, it works every time! Not financial advice 🧱"

**Humble Mode** (Bear market feels):
> "📉 I could be wrong but Bitcoin looking bearish... 45% confidence. Twitter's pretty rekt right now. Even I'm staying humble on this one. Not financial advice 🧱"

## 📁 FILE STRUCTURE

```
brick-bot/
├── setup.js              # One-time Twitter OAuth setup
├── brick-forecaster.js   # Main AI forecasting engine
├── index.js              # Original bot logic (unchanged)
├── brick_state.json      # Persistent state (auto-generated)
├── package.json          # Updated dependencies
└── .env                  # Your API keys
```

## 🚀 DEPLOYMENT

The system is **Railway-ready**! Just:
1. Add your API keys to Railway environment variables
2. Deploy as usual
3. The forecasting system runs alongside your existing bot

## 🔧 DEVELOPMENT

### **Testing Individual Components**
```bash
# Test forecaster with different coins
node brick-forecaster.js

# Test OAuth setup
npm run setup

# Run existing bot
npm start
```

### **Adding New Features**
The forecaster is modular and extensible. Easy to add:
- New data sources
- Additional personality modes  
- Custom analysis logic
- Enhanced slang detection

## 🎭 THE BRICK PERSONALITY

Brick maintains his legendary Ron Burgundy charm while delivering sophisticated market analysis:

- **Confident delivery** with percentage confidence levels
- **Anchorman quotes** twisted for crypto context
- **Professional disclaimers** (Not financial advice)
- **Classy sign-offs** ("Stay classy!")
- **Adaptive humor** based on market conditions

---

**🧱 "I'm gonna be honest with you, that smells like pure gasoline... and PROFITS!" - Brick Bot 2024**

*60% of the time, it works every time. Stay classy!* 📺🥃