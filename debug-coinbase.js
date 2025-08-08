// Debug Coinbase API authentication
require('dotenv').config();
const axios = require('axios');
const { OmniscientDataCore } = require('./omniscient-data-core');

async function debugCoinbase() {
  console.log('🔍 DEBUGGING COINBASE API');
  
  const dataCore = new OmniscientDataCore();
  
  try {
    console.log('API Key present:', !!process.env.COINBASE_API_KEY);
    console.log('API Secret present:', !!process.env.COINBASE_API_SECRET);
    
    // Test JWT creation
    const testJWT = dataCore.createCoinbaseJWT('GET', '/products/ETH-USD/stats');
    console.log('JWT headers:', testJWT);
    
    // Test PUBLIC endpoints (no auth needed)
    const publicEndpoints = ['/market/products', '/market/products/ETH-USD'];
    console.log('\n🔓 Testing PUBLIC endpoints (no auth):');
    
    for (const endpoint of publicEndpoints) {
      console.log(`\n🧪 Testing: ${endpoint}`);
      try {
        // Test without authentication
        const response = await axios.get(`https://api.coinbase.com/api/v3/brokerage${endpoint}`);
        console.log('✅ Public endpoint success!', Object.keys(response.data));
      } catch (error) {
        console.log('❌ Public failed:', error.response?.status);
      }
    }
    
    // Test PRIVATE endpoints (with auth)
    const privateEndpoints = ['/products', '/products/ETH-USD'];
    console.log('\n🔐 Testing PRIVATE endpoints (with JWT):');
    
    for (const endpoint of privateEndpoints) {
      console.log(`\n🧪 Testing: ${endpoint}`);
      try {
        const result = await dataCore.makeCoinbaseRequest('GET', endpoint);
        console.log('✅ Private success!', Object.keys(result));
        break;
      } catch (error) {
        console.log('❌ Private failed:', error.response?.status, error.response?.statusText);
      }
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

debugCoinbase();