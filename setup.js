// === BRICK BOT - TWITTER OAUTH 2.0 PKCE SETUP ===
// Run this ONCE to authenticate Brick with Twitter v2 API
// This generates the access/refresh tokens for Twitter API calls

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// === CONFIGURATION ===
const CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/callback';
const PORT = 3000;

// === PKCE HELPERS ===
function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// === SETUP SERVER ===
const app = express();
let codeVerifier;
let server;

console.log('🧱 BRICK BOT - Twitter OAuth Setup Starting...');

// Validate environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing Twitter credentials in .env file!');
    console.error('Required: TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET');
    process.exit(1);
}

// === OAUTH FLOW ===
app.get('/start', (req, res) => {
    // Generate PKCE parameters
    codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');
    
    // Twitter OAuth 2.0 authorization URL
    const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', CALLBACK_URL);
    authUrl.searchParams.append('scope', 'tweet.read tweet.write users.read offline.access');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    console.log('🔗 Redirecting to Twitter for authorization...');
    res.redirect(authUrl.toString());
});

// === CALLBACK HANDLER ===
app.get('/callback', async (req, res) => {
    const { code, state, error } = req.query;
    
    if (error) {
        console.error('❌ Twitter authorization error:', error);
        res.send(`<h1>❌ Error: ${error}</h1><p>Check console for details.</p>`);
        return;
    }
    
    if (!code) {
        console.error('❌ No authorization code received');
        res.send('<h1>❌ No authorization code received</h1>');
        return;
    }
    
    try {
        console.log('🔄 Exchanging code for tokens...');
        
        // Exchange authorization code for tokens
        const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', 
            new URLSearchParams({
                code: code,
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                redirect_uri: CALLBACK_URL,
                code_verifier: codeVerifier
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
                }
            }
        );
        
        const { access_token, refresh_token, expires_in } = tokenResponse.data;
        
        if (!access_token || !refresh_token) {
            throw new Error('Missing tokens in response');
        }
        
        // Save tokens to .env file
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        // Read existing .env content
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }
        
        // Update or add Twitter tokens
        const tokenLines = [
            `TWITTER_ACCESS_TOKEN=${access_token}`,
            `TWITTER_REFRESH_TOKEN=${refresh_token}`,
            `TWITTER_TOKEN_EXPIRES=${Date.now() + (expires_in * 1000)}`
        ];
        
        // Remove existing token lines and add new ones
        envContent = envContent
            .split('\n')
            .filter(line => !line.startsWith('TWITTER_ACCESS_TOKEN') && 
                           !line.startsWith('TWITTER_REFRESH_TOKEN') && 
                           !line.startsWith('TWITTER_TOKEN_EXPIRES'))
            .join('\n');
        
        if (envContent && !envContent.endsWith('\n')) {
            envContent += '\n';
        }
        
        envContent += tokenLines.join('\n') + '\n';
        
        fs.writeFileSync(envPath, envContent);
        
        console.log('✅ Twitter OAuth setup complete!');
        console.log('🧱 Brick is now authenticated with Twitter v2 API');
        console.log('💾 Tokens saved to .env file');
        
        res.send(`
            <h1>🎉 Success!</h1>
            <h2>🧱 Brick Bot Twitter Setup Complete!</h2>
            <p>✅ Access token obtained and saved to .env</p>
            <p>✅ Refresh token saved for auto-renewal</p>
            <p>🚀 You can now close this window and run your bot!</p>
            <p><strong>Next steps:</strong></p>
            <ol>
                <li>Close this browser window</li>
                <li>Stop the setup server (Ctrl+C)</li>
                <li>Run your Brick bot with the new Twitter powers!</li>
            </ol>
            <style>
                body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                h1 { color: #1DA1F2; }
                h2 { color: #657786; }
            </style>
        `);
        
        // Auto-close server after 5 seconds
        setTimeout(() => {
            console.log('🔄 Setup complete. Closing server...');
            server.close();
            process.exit(0);
        }, 5000);
        
    } catch (error) {
        console.error('❌ Token exchange failed:', error.response?.data || error.message);
        res.send(`
            <h1>❌ Token Exchange Failed</h1>
            <p>Error: ${error.message}</p>
            <p>Check console for details.</p>
        `);
    }
});

// === START SERVER ===
server = app.listen(PORT, () => {
    console.log(`🚀 Setup server running on http://localhost:${PORT}`);
    console.log('📋 Instructions:');
    console.log('1. Your browser should open automatically');
    console.log('2. If not, go to: http://localhost:3000/start');
    console.log('3. Authorize Brick with Twitter');
    console.log('4. Tokens will be saved to .env automatically');
    console.log('');
    
    // Auto-open browser
    const startUrl = `http://localhost:${PORT}/start`;
    
    // Try to open browser
    const platform = process.platform;
    let command;
    
    if (platform === 'darwin') {
        command = `open "${startUrl}"`;
    } else if (platform === 'win32') {
        command = `start "${startUrl}"`;
    } else {
        command = `xdg-open "${startUrl}"`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log('⚠️  Could not auto-open browser. Please visit:');
            console.log(`   ${startUrl}`);
        } else {
            console.log('🌐 Browser opened automatically');
        }
    });
});

// === GRACEFUL SHUTDOWN ===
process.on('SIGINT', () => {
    console.log('\n🛑 Setup cancelled by user');
    server.close();
    process.exit(0);
});