// === THE TRINITY TEST - COINBASE + COINGECKO + DEXSCREENER ===
// Testing Brick's ultimate data intelligence system

const { OmniscientDataCore } = require('./omniscient-data-core');

async function testTheTrinity() {
  console.log('🔥 THE TRINITY TEST - Ultimate Crypto Intelligence\n');
  console.log('🏢 COINBASE: Professional established coins');
  console.log('🦎 COINGECKO: Market data & fundamentals');  
  console.log('🚀 DEXSCREENER: New launches & whale tracking\n');
  
  const dataCore = new OmniscientDataCore();
  
  try {
    // TEST 1: COINBASE - Professional Data
    console.log('🏢 === COINBASE TEST ===');
    const coinbaseData = await dataCore.getCoinbase24hrStats(['ETH-USD', 'BTC-USD', 'SOL-USD']);
    console.log('✅ Coinbase Status:', Object.keys(coinbaseData).length > 0 ? 'CONNECTED' : 'FAILED');
    if (Object.keys(coinbaseData).length > 0) {
      const ethData = coinbaseData['ETH-USD'];
      console.log('📊 ETH Price:', `$${ethData?.price?.toFixed(2) || 'N/A'}`);
      console.log('📈 24h Change:', `${ethData?.change24h?.toFixed(2) || 'N/A'}%`);
      console.log('💰 24h Volume:', `$${(ethData?.volume24h || 0).toLocaleString()}`);
    }

    // TEST 2: COINGECKO - Market Intelligence  
    console.log('\n🦎 === COINGECKO TEST ===');
    const fearGreed = await dataCore.getFearGreedIndex();
    const trending = await dataCore.getTrendingCoins();
    console.log('✅ CoinGecko Status:', fearGreed ? 'CONNECTED' : 'FAILED');
    if (fearGreed) {
      console.log('😱 Fear & Greed:', `${fearGreed.value} (${fearGreed.classification})`);
      console.log('🔥 Trending Coins:', trending.slice(0, 3).map(coin => coin.symbol).join(', '));
    }

    // TEST 3: DEXSCREENER - The Alpha Source
    console.log('\n🚀 === DEXSCREENER TEST ===');
    const dexTrending = await dataCore.getDexScreenerTrending();
    console.log('✅ DexScreener Status:', dexTrending.length > 0 ? 'CONNECTED' : 'FAILED');
    if (dexTrending.length > 0) {
      console.log('🔥 Trending DEX Tokens:');
      dexTrending.slice(0, 5).forEach((token, i) => {
        console.log(`  ${i+1}. ${token.token.symbol} - $${token.price.toFixed(8)} (${token.priceChange24h.toFixed(2)}%)`);
        console.log(`     💧 Liquidity: $${token.liquidity.toLocaleString()}`);
        console.log(`     ⚠️ Risk: ${token.risk?.level || 'UNKNOWN'}`);
      });
    }

    // TEST 4: ADVANCED TECHNICAL ANALYSIS (Trinity Powered)
    console.log('\n🧠 === TRINITY-POWERED TECHNICAL ANALYSIS ===');
    const technicals = await dataCore.getAdvancedTechnicalSignals('ETH-USD');
    if (technicals) {
      console.log('✅ Technical Analysis: SUCCESS');
      console.log('🎯 Confidence Score:', technicals.confidence.score + '%');
      console.log('📊 Direction:', technicals.confidence.direction);
      console.log('🚦 Trading Signal:', technicals.tradingSignal.action);
      console.log('📈 RSI:', technicals.indicators.rsi?.toFixed(2) || 'N/A');
      console.log('⚡ Current Price:', `$${technicals.indicators.currentPrice?.toFixed(2) || 'N/A'}`);
    } else {
      console.log('❌ Technical Analysis: FAILED');
    }

    // TEST 5: SEARCH FUNCTIONALITY
    console.log('\n🔍 === SEARCH TEST ===');
    const searchResults = await dataCore.searchDexScreenerTokens('PEPE');
    console.log('✅ Search Results:', searchResults.length);
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      console.log('🐸 Top PEPE Result:', `${topResult.token.name} (${topResult.token.symbol})`);
      console.log('💰 Price:', `$${topResult.price.toFixed(8)}`);
      console.log('📊 24h Change:', `${topResult.priceChange24h.toFixed(2)}%`);
    }

    // FINAL TRINITY ASSESSMENT
    console.log('\n🎯 === TRINITY STATUS ===');
    const coinbaseOK = Object.keys(coinbaseData).length > 0;
    const coingeckoOK = fearGreed !== null;
    const dexscreenerOK = dexTrending.length > 0;
    
    console.log('🏢 Coinbase:', coinbaseOK ? '🟢 OPERATIONAL' : '🔴 DOWN');
    console.log('🦎 CoinGecko:', coingeckoOK ? '🟢 OPERATIONAL' : '🔴 DOWN');  
    console.log('🚀 DexScreener:', dexscreenerOK ? '🟢 OPERATIONAL' : '🔴 DOWN');
    
    const trinityScore = (coinbaseOK ? 1 : 0) + (coingeckoOK ? 1 : 0) + (dexscreenerOK ? 1 : 0);
    
    if (trinityScore === 3) {
      console.log('\n🔥🔥🔥 THE TRINITY IS COMPLETE! BRICK IS GODLIKE! 🧱⚡🚀');
      console.log('💎 Market Coverage: TOTAL DOMINANCE');
      console.log('🎯 Data Quality: INSTITUTIONAL GRADE'); 
      console.log('🚀 Alpha Discovery: MAXIMUM POTENTIAL');
    } else if (trinityScore === 2) {
      console.log('\n⚡ TRINITY 66% OPERATIONAL - Still Powerful!');
    } else {
      console.log('\n⚠️ TRINITY INCOMPLETE - Some APIs Down');
    }

  } catch (error) {
    console.error('❌ Trinity test failed:', error.message);
  }
}

testTheTrinity();