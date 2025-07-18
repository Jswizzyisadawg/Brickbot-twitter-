# Railway Deployment Guide for Brick Bot

## Prerequisites
1. Install Railway CLI: `npm install -g @railway/cli`
2. Create Railway account at https://railway.app

## Environment Variables Setup

Set these variables in Railway dashboard:

### Required Twitter API Credentials
```
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here
```

### Optional Configuration
```
LOG_LEVEL=info
ACTIVE_BLOCKCHAIN=ethereum
BLOCKCHAIN_NAME=Ethereum
BLOCKCHAIN_TOKEN=ETH
BLOCKCHAIN_SYMBOL=ETH
BLOCKCHAIN_WEBSITE=https://ethereum.org
BLOCKCHAIN_FEATURES=Smart contracts,Decentralized applications,DeFi protocols
```

## Deployment Steps

### 1. Login to Railway
```bash
railway login
```

### 2. Initialize Railway Project
```bash
railway init
```

### 3. Deploy
```bash
npm run deploy
# or
railway up
```

### 4. View Logs
```bash
npm run logs
# or
railway logs
```

### 5. Set Environment Variables
```bash
railway variables set TWITTER_API_KEY=your_key
railway variables set TWITTER_API_SECRET=your_secret
railway variables set TWITTER_ACCESS_TOKEN=your_token
railway variables set TWITTER_ACCESS_SECRET=your_secret
```

## Important Notes

- Railway automatically detects Node.js projects
- The bot will restart automatically on failure (up to 10 times)
- Logs are stored in Railway's logging system
- Environment variables are encrypted and secure
- No local .env file needed on Railway

## Monitoring

- Check deployment status: `railway status`
- View service URL: `railway open`
- Monitor logs: `railway logs --follow`

## Troubleshooting

1. **Build fails**: Check package.json dependencies
2. **Bot doesn't start**: Verify environment variables are set
3. **Twitter API errors**: Check API credentials and rate limits
4. **Crashes**: Check logs with `railway logs`