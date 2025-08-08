// === INTELLIGENCE ENGINE TEST - BRICK'S BRAIN IN ACTION ===
// Test the complete intelligence layer with real market data

const { IntelligenceEngine } = require('./intelligence-engine');

async function testIntelligence() {
  console.log('🧠 TESTING BRICK\'S INTELLIGENCE ENGINE');
  console.log('=====================================\n');
  
  const brain = new IntelligenceEngine();
  
  try {
    // Run complete intelligence cycle
    const intelligence = await brain.runIntelligenceCycle();
    
    // Display results
    console.log('📊 INTELLIGENCE SUMMARY');
    console.log('=======================');
    console.log(`Market Context: ${intelligence.marketContext.context.toUpperCase()}`);
    console.log(`Fear & Greed: ${intelligence.summary.fearGreed} (${intelligence.summary.fearGreed > 70 ? 'Greed' : intelligence.summary.fearGreed < 30 ? 'Fear' : 'Neutral'})`);
    console.log(`Personality: ${intelligence.personality.mood}`);
    console.log(`Confidence Level: ${Math.round(intelligence.personality.confidence * 100)}%`);
    
    console.log(`\n🎯 SIGNALS DETECTED: ${intelligence.signals.length}`);
    if (intelligence.signals.length > 0) {
      intelligence.signals.forEach(signal => {
        const emoji = signal.signal === 'bullish' ? '🚀' : signal.signal === 'bearish' ? '📉' : '⚡';
        console.log(`  ${emoji} ${signal.asset.toUpperCase()}: ${signal.confidence}% ${signal.signal} at $${signal.price}`);
      });
    } else {
      console.log('  No high-confidence signals detected (waiting for 75%+ opportunities)');
    }
    
    console.log(`\n🚨 ALERTS GENERATED: ${intelligence.alerts.length}`);
    if (intelligence.alerts.length > 0) {
      intelligence.alerts.forEach(alert => {
        console.log(`  [${alert.priority}] ${alert.message}`);
      });
    } else {
      console.log('  No alerts triggered (signals below threshold or in cooldown)');
    }
    
    console.log(`\n💡 RECOMMENDATION: ${intelligence.summary.recommendation}`);
    
    console.log(`\n📈 PERFORMANCE METRICS:`);
    console.log(`  • Average Signal Confidence: ${intelligence.summary.averageConfidence}%`);
    console.log(`  • High-Confidence Signals (85%+): ${intelligence.summary.highConfidenceSignals}`);
    console.log(`  • Market Regime Confidence: ${Math.round(intelligence.marketContext.confidence * 100)}%`);
    console.log(`  • Risk Tolerance: ${Math.round(intelligence.personality.riskTolerance * 100)}%`);
    
    console.log('\n✅ Intelligence Engine Test Complete!');
    console.log('Brick is now operating with full cognitive capabilities 🧱🧠');
    
    return intelligence;
    
  } catch (error) {
    console.error('❌ Intelligence test failed:', error);
  }
}

// Run the test
testIntelligence();