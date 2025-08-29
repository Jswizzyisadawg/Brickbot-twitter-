# 🧱 Brick Bot - AI-Powered Crypto Intelligence Bot

An autonomous Twitter bot with distinctive personality that provides cryptocurrency market intelligence, trend analysis, and community engagement.

## 🎬 Features

### 🔍 **Smart Crypto Monitoring**
- Real-time price alerts for major coins (BTC, ETH, SOL)
- Meme coin pump detection (PEPE, SHIB, DOGE, FLOKI, BONK)
- Social media trend analysis for emerging cryptocurrencies
- Risk assessment algorithms to identify potential market manipulation

### 🎭 **Authentic Personality**
- Classic Anchorman quotes mixed with crypto wisdom
- Random non-crypto moments (lamp love, weather reports, existential thoughts)
- 5% chance of surprise brilliant insights
- Interactive responses to mentions and conversations

### 📊 **Intelligent Posting Schedule**
- **Every 4 hours**: Educational crypto content
- **Every 45 minutes**: Random thinking moments
- **Every 30 minutes**: Price movement alerts
- **Every 20 minutes**: Twitter coin monitoring
- **Every 3 hours**: Pure Brick randomness
- **11 PM daily**: Late night lamp thoughts

## 🚀 Deployment

### Railway 
1. Connect this repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically

### Environment Variables
```
TWITTER_API_KEY=your_api_key
TWITTER_API_SECRET=your_api_secret
TWITTER_ACCESS_TOKEN=your_access_token
TWITTER_ACCESS_SECRET=your_access_secret
```

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Twitter API credentials

# Run the bot
npm start
```

## 📁 Project Structure

```
brick-bot/
├── index.js                 # Main bot logic
├── package.json             # Dependencies and scripts
├── railway.json             # Railway deployment config
├── RAILWAY_DEPLOYMENT.md    # Deployment guide
└── README.md               # This file
```

## 🎯 Core Classes

- **`CryptoTracker`** - Monitors coin prices and market movements
- **`TwitterCoinDiscovery`** - Discovers trending coins from Twitter buzz
- **`BrickPersonality`** - Generates responses with Anchorman personality
- **`RandomBrickMoments`** - Creates non-crypto random content
- **`CoinSecurityChecker`** - Basic vibe checks for coin safety

## 🔧 Technology Stack

- **Node.js** - Runtime environment
- **Twitter API v2** - Social media integration
- **CoinGecko API** - Cryptocurrency data
- **Winston** - Logging
- **node-cron** - Scheduled tasks
- **Railway** - Cloud deployment

## ⚠️ Disclaimer

This bot is for entertainment and educational purposes. Always conduct thorough research before making investment decisions. This software does not provide financial advice.

## 📜 License

MIT License - Feel free to fork and create your own personality bot!

---

*"60% of the time, it works every time!" - Brick Bot* 🎬