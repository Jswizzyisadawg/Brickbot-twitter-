// === TWITTER OAUTH 2.0 SETUP ===
// Run this once to authenticate: node setup-twitter-auth.js
// Tokens are saved to Supabase for Railway deployment

require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const http = require('http');
const url = require('url');

class TwitterOAuthSetup {
  constructor() {
    this.clientId = process.env.TWITTER_CLIENT_ID;
    this.clientSecret = process.env.TWITTER_CLIENT_SECRET;
    this.callbackUrl = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/callback';
    this.codeVerifier = null;

    // Validate required env vars
    const missing = [];
    if (!this.clientId) missing.push('TWITTER_CLIENT_ID');
    if (!this.clientSecret) missing.push('TWITTER_CLIENT_SECRET');
    if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!process.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY');

    if (missing.length > 0) {
      throw new Error(`Missing required env vars: ${missing.join(', ')}`);
    }

    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
  }

  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  getAuthorizationUrl() {
    const pkce = this.generatePKCE();
    this.codeVerifier = pkce.codeVerifier;

    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.callbackUrl);
    authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read follows.read follows.write like.read like.write offline.access');
    authUrl.searchParams.set('state', crypto.randomBytes(16).toString('hex'));
    authUrl.searchParams.set('code_challenge', pkce.codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return authUrl.toString();
  }

  async exchangeCodeForTokens(authorizationCode) {
    const twitterClient = new TwitterApi({
      clientId: this.clientId,
      clientSecret: this.clientSecret
    });

    const { client: authedClient, accessToken, refreshToken, expiresIn } =
      await twitterClient.loginWithOAuth2({
        code: authorizationCode,
        codeVerifier: this.codeVerifier,
        redirectUri: this.callbackUrl
      });

    const me = await authedClient.v2.me();

    return {
      accessToken,
      refreshToken,
      expiresAt: Date.now() + (expiresIn * 1000),
      userId: me.data.id,
      username: me.data.username
    };
  }

  async saveToSupabase(tokens) {
    const { error } = await this.supabase
      .from('brick_tokens')
      .upsert({
        id: 'twitter',
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_at: tokens.expiresAt,
        user_id: tokens.userId,
        username: tokens.username
      });

    if (error) throw error;
    return true;
  }

  async authenticateInteractively() {
    return new Promise((resolve, reject) => {
      console.log('\n');
      console.log('='.repeat(50));
      console.log('  BRICK TWITTER AUTHENTICATION');
      console.log('='.repeat(50));
      console.log('\n');

      const authUrl = this.getAuthorizationUrl();

      console.log('Step 1: Open this URL in your browser:\n');
      console.log('\x1b[36m%s\x1b[0m', authUrl);
      console.log('\n');
      console.log('Step 2: Log in to Twitter and authorize Brick Bot');
      console.log('Step 3: You\'ll be redirected - this script will capture it\n');
      console.log('-'.repeat(50));

      const server = http.createServer(async (req, res) => {
        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === '/callback') {
          const authCode = parsedUrl.query.code;
          const error = parsedUrl.query.error;

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`
              <html>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                  <h1>Authorization Failed</h1>
                  <p style="color: red;">${error}</p>
                  <p>Please try again.</p>
                </body>
              </html>
            `);
            server.close();
            reject(new Error('Authorization denied: ' + error));
            return;
          }

          if (authCode) {
            try {
              console.log('\nGot authorization code!');
              console.log('Exchanging for tokens...\n');

              const tokens = await this.exchangeCodeForTokens(authCode);

              console.log('Saving tokens to Supabase...');
              await this.saveToSupabase(tokens);

              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: system-ui; text-align: center; padding: 50px; background: #1a1a2e; color: white;">
                    <h1 style="color: #4ade80;">Success!</h1>
                    <p>Brick is now authenticated as <strong>@${tokens.username}</strong></p>
                    <p style="color: #888;">You can close this window.</p>
                  </body>
                </html>
              `);

              server.close();
              resolve(tokens);

            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'text/html' });
              res.end(`
                <html>
                  <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>Token Exchange Failed</h1>
                    <p style="color: red;">${err.message}</p>
                  </body>
                </html>
              `);
              server.close();
              reject(err);
            }
          }
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      server.listen(3000, () => {
        console.log('Waiting for callback on http://localhost:3000...\n');
      });

      // 5 minute timeout
      setTimeout(() => {
        server.close();
        reject(new Error('Timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }
}

async function main() {
  try {
    const oauth = new TwitterOAuthSetup();
    const tokens = await oauth.authenticateInteractively();

    console.log('\n' + '='.repeat(50));
    console.log('  AUTHENTICATION SUCCESSFUL!');
    console.log('='.repeat(50));
    console.log('\n');
    console.log('  Account:  @' + tokens.username);
    console.log('  User ID:  ' + tokens.userId);
    console.log('  Expires:  ' + new Date(tokens.expiresAt).toLocaleString());
    console.log('\n');
    console.log('  Tokens saved to Supabase');
    console.log('  Brick can now use Twitter!\n');
    console.log('  Next: npm run test:live\n');

  } catch (error) {
    console.error('\nAuthentication failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure your Twitter app has "Read and write" permissions');
    console.error('2. Check callback URL is: http://localhost:3000/callback');
    console.error('3. Ensure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are correct\n');
    process.exit(1);
  }
}

main();
