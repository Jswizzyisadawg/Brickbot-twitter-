// Coinbase Legacy Authentication Implementation
const crypto = require('crypto');

class CoinbaseLegacyAuth {
  constructor(apiKey, apiSecret, passphrase) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.passphrase = passphrase;
  }

  createSignature(method, path, body = '') {
    const timestamp = Math.floor(Date.now() / 1000);
    const message = timestamp + method.toUpperCase() + path + body;
    
    // Legacy auth uses HMAC-SHA256, not EC signatures
    const signature = crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('base64');
    
    return {
      'CB-ACCESS-KEY': this.apiKey,
      'CB-ACCESS-SIGN': signature,
      'CB-ACCESS-TIMESTAMP': timestamp.toString(),
      'CB-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = { CoinbaseLegacyAuth };