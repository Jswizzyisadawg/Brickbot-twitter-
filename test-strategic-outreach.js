// === TEST BRICK'S STRATEGIC OUTREACH ENGINE ===
// See how Brick discovers and networks with quality crypto accounts

const { StrategyOutreachEngine } = require('./strategic-outreach-engine');

async function testStrategicOutreach() {
  console.log('🎯 TESTING BRICK\'S STRATEGIC OUTREACH ENGINE');
  console.log('=============================================\n');
  
  const outreach = new StrategyOutreachEngine();
  
  // Run the discovery demo
  await outreach.runDiscoveryDemo();
}

testStrategicOutreach();