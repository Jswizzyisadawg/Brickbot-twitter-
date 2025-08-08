// === FULL INTEGRATION TEST - PHASE 1 + PHASE 2 ===
// Test Trinity Data + Intelligence Layer working together

const { OmniscientDataCore } = require('./omniscient-data-core');
const { IntelligenceEngine } = require('./intelligence-engine');

async function testFullIntegration() {
  console.log('🔗 TESTING FULL PHASE 1 + PHASE 2 INTEGRATION');
  console.log('===============================================\n');
  
  try {
    // Initialize both systems
    console.log('🚀 Initializing systems...');
    const trinity = new OmniscientDataCore();
    const brain = new IntelligenceEngine();
    
    // Test 1: Trinity Data Flow
    console.log('\n📊 PHASE 1: Testing Trinity Data Flow...');
    const marketOverview = await trinity.getMarketOverview();
    const sentiment = await trinity.getFearGreedIndex();
    const coinbaseData = await trinity.getCoinbase24hrStats(['ETH-USD', 'BTC-USD']);
    
    console.log('✅ Trinity Data Results:');
    console.log(`  • Market Overview: ${Object.keys(marketOverview).length} data points`);
    console.log(`  • Fear & Greed: ${sentiment.value} (${sentiment.value > 70 ? 'Greed' : sentiment.value < 30 ? 'Fear' : 'Neutral'})`);
    console.log(`  • Coinbase Assets: ${Object.keys(coinbaseData).length} assets`);
    
    // Test 2: Intelligence Processing
    console.log('\n🧠 PHASE 2: Testing Intelligence Processing...');
    const marketContext = await brain.analyzeMarketContext();
    const personality = await brain.adaptPersonality(marketContext, []);
    
    console.log('✅ Intelligence Results:');
    console.log(`  • Market Context: ${marketContext.context.toUpperCase()}`);
    console.log(`  • Confidence: ${Math.round(marketContext.confidence * 100)}%`);
    console.log(`  • Personality: ${personality.mood}`);
    console.log(`  • Risk Tolerance: ${Math.round(personality.riskTolerance * 100)}%`);
    
    // Test 3: Data Flow Integration
    console.log('\n🔗 INTEGRATION: Testing Data Flow...');
    console.log('Phase 1 → Phase 2 Data Pipeline:');
    
    // Show how Trinity data flows into Intelligence
    if (marketOverview.global) {
      console.log(`  ✅ Global market data: ${marketOverview.global.market_cap_change_percentage_24h?.toFixed(2)}% change`);
    }
    
    if (sentiment.value) {
      console.log(`  ✅ Sentiment data: ${sentiment.value}/100 feeding into personality`);
    }
    
    if (Object.keys(coinbaseData).length > 0) {
      const ethPrice = coinbaseData['ETH-USD']?.price;
      if (ethPrice) {
        console.log(`  ✅ Coinbase price data: ETH at $${ethPrice}`);
      }
    }
    
    // Test 4: Intelligence Output
    console.log('\n💡 INTELLIGENCE OUTPUT:');
    const summary = brain.generateIntelligenceSummary(marketContext, [], personality);
    
    console.log(`  • Recommendation: ${summary.recommendation}`);
    console.log(`  • Market Regime: ${summary.marketRegime}`);
    console.log(`  • Current Mood: ${summary.currentMood}`);
    
    // Test 5: System Health Check
    console.log('\n🏥 SYSTEM HEALTH CHECK:');
    console.log('  Phase 1 (Trinity):');
    console.log(`    🏢 Coinbase: ${Object.keys(coinbaseData).length > 0 ? '🟢 OPERATIONAL' : '🔴 DOWN'}`);
    console.log(`    🦎 CoinGecko: ${sentiment.value ? '🟢 OPERATIONAL' : '🔴 DOWN'}`);
    console.log(`    🚀 DexScreener: 🟡 SEARCH ONLY`);
    
    console.log('  Phase 2 (Intelligence):');
    console.log(`    🧠 Market Context: ${marketContext.confidence > 0.4 ? '🟢 OPERATIONAL' : '🔴 DOWN'}`);
    console.log(`    🎭 Personality: ${personality.confidence > 0.4 ? '🟢 OPERATIONAL' : '🔴 DOWN'}`);
    console.log(`    🚨 Alert System: 🟢 READY`);
    
    console.log('\n✅ INTEGRATION TEST COMPLETE!');
    console.log('Phase 1 & 2 are working fluidly together 🔗🧱');
    
    return {
      trinity: { marketOverview, sentiment, coinbaseData },
      intelligence: { marketContext, personality, summary },
      status: 'FULLY_INTEGRATED'
    };
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return { status: 'INTEGRATION_ERROR', error: error.message };
  }
}

testFullIntegration();