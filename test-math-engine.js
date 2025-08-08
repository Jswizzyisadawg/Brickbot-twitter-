// === MATHEMATICAL ENGINE TEST ===
// Quick test to verify our advanced technical indicators work properly

const { OmniscientDataCore } = require('./omniscient-data-core');

async function testMathematicalEngine() {
  console.log('🧱 Testing Brick\'s Mathematical Brain...\n');
  
  const dataCore = new OmniscientDataCore();
  
  try {
    // Test 1: Basic price fetching with Binance
    console.log('📊 Test 1: Fetching current market data...');
    const prices = await dataCore.getCurrentPrices(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    console.log('✅ Price data:', Object.keys(prices).length > 0 ? 'SUCCESS' : 'FAILED');
    console.log('Sample data:', Object.keys(prices).slice(0, 2));
    
    // Test 2: Binance OHLCV data
    console.log('\n📈 Test 2: Fetching OHLCV candle data...');
    const klines = await dataCore.getBinanceKlines('ETHUSDT', '1d', 10);
    console.log('✅ Kline data:', klines.length > 0 ? 'SUCCESS' : 'FAILED');
    console.log('Sample candle:', klines[0] || 'No data');
    
    // Test 3: Advanced technical analysis
    console.log('\n🔬 Test 3: Advanced technical indicators...');
    const technicals = await dataCore.getAdvancedTechnicalSignals('ETHUSDT');
    if (technicals) {
      console.log('✅ Technical analysis: SUCCESS');
      console.log('Confidence Score:', technicals.confidence.score + '%');
      console.log('Direction:', technicals.confidence.direction);
      console.log('Trading Signal:', technicals.tradingSignal.action);
      console.log('RSI:', technicals.indicators.rsi?.toFixed(2) || 'N/A');
      console.log('MACD:', technicals.indicators.macd?.macd?.toFixed(4) || 'N/A');
    } else {
      console.log('❌ Technical analysis: FAILED');
    }
    
    // Test 4: Fear & Greed Index
    console.log('\n😱 Test 4: Market sentiment...');
    const fearGreed = await dataCore.getFearGreedIndex();
    console.log('✅ Fear & Greed:', fearGreed ? 'SUCCESS' : 'FAILED');
    if (fearGreed) {
      console.log('Current sentiment:', fearGreed.classification, '(' + fearGreed.value + ')');
    }
    
    console.log('\n🎉 Mathematical engine test completed!');
    console.log('🧱 Brick\'s brain is ready for private equity-level analysis!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMathematicalEngine();