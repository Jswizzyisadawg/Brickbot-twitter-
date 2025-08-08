// Coinbase JWT Authentication Implementation
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class CoinbaseJWTAuth {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey; // format: organizations/{org_id}/apiKeys/{key_id}
    this.apiSecret = this.formatPrivateKey(apiSecret);
  }

  formatPrivateKey(secret) {
    // Clean up the private key format
    let privateKey = secret.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    
    // Ensure proper PEM format
    if (!privateKey.includes('-----BEGIN EC PRIVATE KEY-----')) {
      privateKey = `-----BEGIN EC PRIVATE KEY-----\n${privateKey}\n-----END EC PRIVATE KEY-----`;
    }
    
    return privateKey;
  }

  generateJWT(requestMethod, requestPath) {
    const uri = `${requestMethod} ${requestPath}`;
    const now = Math.floor(Date.now() / 1000);
    
    const payload = {
      sub: this.apiKey,
      iss: 'coinbase-cloud',
      nbf: now,
      exp: now + 120, // JWT expires in 2 minutes
      uri: uri
    };

    const header = {
      kid: this.apiKey,
      nonce: crypto.randomBytes(16).toString('hex')
    };

    try {
      const token = jwt.sign(payload, this.apiSecret, {
        algorithm: 'ES256',
        header: header
      });
      
      return token;
    } catch (error) {
      console.error('Failed to generate JWT:', error.message);
      throw error;
    }
  }

  getAuthHeaders(method, path) {
    const token = this.generateJWT(method.toUpperCase(), path);
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = { CoinbaseJWTAuth };