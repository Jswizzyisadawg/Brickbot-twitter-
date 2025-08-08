// === TEST BRICK'S SOCIAL INTELLIGENCE ===
// See Brick's personality and "helpful data-stacking" vibe in action

const { SocialIntelligence } = require('./social-intelligence');

async function testBrickSocial() {
  console.log('🧱 TESTING BRICK\'S SOCIAL PERSONALITY');
  console.log('=====================================\n');
  
  const social = new SocialIntelligence();
  
  // Run the demo to see Brick's content generation
  await social.runDemo();
}

testBrickSocial();