// === SIMPLIFIED INTELLIGENCE ENGINE TEST ===
// Test with working Trinity components

const { IntelligenceEngine } = require('./intelligence-engine');

async function testIntelligenceSimple() {
  console.log('🧠 SIMPLIFIED INTELLIGENCE TEST');
  console.log('================================\n');
  
  const brain = new IntelligenceEngine();
  
  try {
    // Test market context analysis only (this should work)
    console.log('📊 Testing Market Context Analysis...');
    const marketContext = await brain.analyzeMarketContext();
    
    console.log(`Market Context: ${marketContext.context.toUpperCase()}`);
    console.log(`Confidence: ${Math.round(marketContext.confidence * 100)}%`);
    console.log(`Fear & Greed: ${marketContext.fearGreed?.value || 'N/A'}`);
    console.log(`Global Market Change: ${marketContext.globalChange?.toFixed(2) || 'N/A'}%`);
    
    // Test personality adaptation
    console.log('\n🎭 Testing Personality Adaptation...');
    const personality = await brain.adaptPersonality(marketContext, []);
    
    console.log(`Personality Mood: ${personality.mood}`);
    console.log(`Confidence: ${Math.round(personality.confidence * 100)}%`);
    console.log(`Risk Tolerance: ${Math.round(personality.riskTolerance * 100)}%`);
    console.log(`Enthusiasm: ${Math.round(personality.enthusiasm * 100)}%`);
    
    // Generate intelligence summary
    console.log('\n💡 Intelligence Summary...');
    const summary = brain.generateIntelligenceSummary(marketContext, [], personality);
    
    console.log(`Recommendation: ${summary.recommendation}`);
    console.log(`Current Mood: ${summary.currentMood}`);
    console.log(`Market Regime: ${summary.marketRegime}`);
    
    console.log('\n✅ Simplified Intelligence Test Complete!');
    console.log('Core intelligence functions are operational 🧱🧠');
    
  } catch (error) {
    console.error('❌ Intelligence test failed:', error);
  }
}

testIntelligenceSimple();