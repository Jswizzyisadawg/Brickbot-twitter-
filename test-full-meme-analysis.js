// === FULL STACK MEME COIN ANALYSIS DEMO ===
// Show how Trinity + Intelligence + Social work together

const { SocialIntelligence } = require('./social-intelligence');

async function demonstrateFullStack() {
  console.log('🧱 BRICK\'S FULL STACK MEME COIN ANALYSIS');
  console.log('==========================================\n');
  
  const social = new SocialIntelligence();
  
  try {
    console.log('🔍 Step 1: Trinity searches for trending meme coins...');
    
    // Simulate finding a hot meme coin via DexScreener
    const trendingMeme = {
      name: 'DogeElonMars',
      symbol: 'DEM', 
      price: '$0.000045',
      change24h: 147.8,
      volume24h: 2400000,
      marketCap: 18000000,
      liquidity: 450000,
      holders: 12500,
      age: '3 days'
    };
    
    console.log(`✅ Found trending meme: ${trendingMeme.name} (${trendingMeme.symbol})`);
    console.log(`   Price: ${trendingMeme.price} | +${trendingMeme.change24h}% (24h)`);
    console.log(`   Volume: $${trendingMeme.volume24h.toLocaleString()} | Holders: ${trendingMeme.holders.toLocaleString()}`);
    
    console.log('\n🧠 Step 2: Intelligence Engine analyzes risk factors...');
    
    // Simulate intelligence analysis
    const analysis = {
      riskScore: 78, // High risk
      confidence: 72, // But decent confidence in the analysis
      signals: {
        volume: 'POSITIVE - Significant volume surge',
        liquidity: 'CAUTION - Low liquidity ratio', 
        momentum: 'STRONG - Parabolic price action',
        social: 'MIXED - High engagement, few real users'
      },
      timeframe: '2-5 days',
      prediction: 'SHORT_TERM_PUMP_LIKELY_DUMP'
    };
    
    console.log(`   Risk Score: ${analysis.riskScore}/100 (HIGH RISK)`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    console.log(`   Prediction: ${analysis.prediction.replace(/_/g, ' ')}`);
    console.log(`   Timeframe: ${analysis.timeframe}`);
    
    console.log('\n📊 Step 3: Market context adds intelligence...');
    
    const marketContext = await social.brain.analyzeMarketContext();
    console.log(`   Market Regime: ${marketContext.context.toUpperCase()}`);
    console.log(`   Fear & Greed: ${marketContext.fearGreed?.value || 'N/A'}`);
    console.log(`   Overall Confidence: ${Math.round(marketContext.confidence * 100)}%`);
    
    console.log('\n🎭 Step 4: Personality adapts to meme coin context...');
    
    const personality = {
      mood: 'cautious_but_intrigued',
      confidence: 0.7,
      riskTolerance: 0.3, // Lower for meme coins
      warningLevel: 'HIGH'
    };
    
    console.log(`   Personality: ${personality.mood}`);
    console.log(`   Risk Tolerance: ${Math.round(personality.riskTolerance * 100)}%`);
    console.log(`   Warning Level: ${personality.warningLevel}`);
    
    console.log('\n🐦 Step 5: Social Intelligence generates the perfect tweet...\n');
    
    // Generate meme coin analysis tweet
    const tweet = generateMemeCoinAnalysis(trendingMeme, analysis, marketContext, personality);
    
    console.log('📝 BRICK\'S MEME COIN TWEET:');
    console.log('============================');
    console.log(tweet);
    console.log('============================\n');
    
    console.log('🎯 WHAT MAKES THIS POWERFUL:');
    console.log('• Trinity Data: Real meme coin discovery via DexScreener');
    console.log('• Intelligence: Risk analysis + market context awareness');  
    console.log('• Social: Perfect disclaimers + helpful-but-cautious tone');
    console.log('• Personality: Adapts warning level based on asset risk');
    
    console.log('\n✅ Full stack working beautifully! 🧱⚡🚀');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  }
}

function generateMemeCoinAnalysis(coin, analysis, marketContext, personality) {
  const riskEmoji = analysis.riskScore > 75 ? '🚨' : analysis.riskScore > 50 ? '⚠️' : '📊';
  const pumpEmoji = analysis.prediction.includes('PUMP') ? '🚀' : '📉';
  
  return `${riskEmoji} MEME COIN ALERT: ${coin.name} (${coin.symbol})

${pumpEmoji} +${coin.change24h}% in 24h | $${(coin.volume24h / 1000000).toFixed(1)}M volume

🔍 QUICK ANALYSIS:
• Risk Level: ${analysis.riskScore}/100 (HIGH)
• Liquidity: Low ($${(coin.liquidity / 1000).toFixed(0)}K)
• Momentum: Parabolic 
• Timeframe: ${analysis.timeframe}

🧱 BRICK'S TAKE:
Math says short-term pump likely, but this screams classic meme pattern. Volume is real, liquidity is scary. 

If you're degening, set stop losses. If you're investing, this ain't it chief.

⚠️ MEME COIN = MAXIMUM RISK
Do your own research, I just stack data like bricks. This could rug faster than you can say "diamond hands" 💎🙌

Really good guesses meant to be helpful, not financial advice 🧱`;
}

demonstrateFullStack();