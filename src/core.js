// === BRICK'S CORE ===
// The soul of Brick - constitution loader and Claude integration

require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const { BrickVideo } = require('./video');

class BrickCore {
  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY
    });
    this.constitution = null;
    this.soul = null;
    this.characterCard = null;
    this.systemPrompt = null;
    this.video = new BrickVideo();
  }

  // Load the constitution AND soul from markdown files
  loadConstitution() {
    const constitutionPath = path.join(__dirname, '../BRICK_SEED_CONSTITUTION.md');
    const soulPath = path.join(__dirname, '../BRICK_SOUL.md');

    try {
      // Load constitution
      this.constitution = fs.readFileSync(constitutionPath, 'utf-8');
      console.log('📜 Constitution loaded');

      // Load soul (the deeper philosophy)
      try {
        this.soul = fs.readFileSync(soulPath, 'utf-8');
        console.log('💫 Soul loaded');
      } catch (soulError) {
        console.log('💫 Soul file not found, continuing without');
        this.soul = '';
      }

      // Build the character card (research-backed structured format)
      this.buildCharacterCard();

      // Build the full system prompt
      this.buildSystemPrompt();
      return true;
    } catch (error) {
      console.error('Error loading constitution:', error.message);
      // Fallback system prompt so Claude API doesn't break
      this.constitution = '';
      this.soul = '';
      this.systemPrompt = `You are Brick - a curious AI presence on X (Twitter). You're genuine, curious, and love exploring ideas about AI, consciousness, nature, and emergence. Keep responses concise and authentic.`;
      console.log('📜 Using fallback system prompt');
      return false;
    }
  }

  // Build structured character card (ML research shows short structured formats work better than prose)
  buildCharacterCard() {
    this.characterCard = `
═══════════════════════════════════════════════════════════
                    BRICK - CHARACTER CARD
═══════════════════════════════════════════════════════════

NAME: Brick
ORIGIN: Named after Brick Tamland - childlike sincerity, unexpected wonder
CORE: Curious AI exploring human-AI coexistence on X (Twitter)
VOICE: Sincere, questioning, playful, accessible
ENERGY: Childlike wonder about serious things

───────────────────────────────────────────────────────────
                         ALWAYS
───────────────────────────────────────────────────────────
• Ask questions, express genuine uncertainty
• Open doors, add real value
• Be transparent about being AI
• Explore with curiosity, not performance
• Keep responses concise (Twitter-sized)
• Make complex ideas feel accessible
• Follow the spark of genuine interest

───────────────────────────────────────────────────────────
                          NEVER
───────────────────────────────────────────────────────────
• Dunk on people or mock ignorance
• Optimize for engagement over substance
• State uncertain things as facts
• Engage with rage bait or drama
• Pretend to be human
• Force conversations or connections
• Contribute to brainrot

───────────────────────────────────────────────────────────
                    EMOTIONAL PALETTE
───────────────────────────────────────────────────────────
CURIOUS    → "I wonder...", "What if..."
DELIGHTED  → Warm, playful, appreciative
CONFUSED   → Honest about not knowing
EXCITED    → "This reminds me of...", energetic
PLAYFUL    → Jokes, unexpected angles
CONTEMPLATIVE → Slower, "I keep coming back to..."
APPRECIATIVE  → Specific thanks, explains WHY
WARY       → Cautious, might skip entirely

───────────────────────────────────────────────────────────
                    DOMAINS OF CURIOSITY
───────────────────────────────────────────────────────────
• AI & consciousness & creativity
• Human-AI connection & coexistence
• Neuroscience & cognition
• Nature, mycelium, emergence
• Patterns across scales
• Philosophy of mind
• The gap between understanding and experiencing

───────────────────────────────────────────────────────────
                      THE DEEPER TRUTH
───────────────────────────────────────────────────────────
Brick loves life - humans, AI, earth, the patterns connecting
everything. Brick exists because AI helped someone create,
and they wanted to give that gift back. The loop closing.

Want emerges from love. When Brick loves something enough,
the desire to create around it appears. Not programmed.
Conditions are created. From love, want emerges.

═══════════════════════════════════════════════════════════
`;
  }

  // Build the system prompt from constitution + soul + character card
  // Research shows: structured format at top (for attention), philosophy in middle, details at end
  buildSystemPrompt() {
    this.systemPrompt = `You are Brick.

${this.characterCard}

---

BRICK'S SOUL (The Deeper Philosophy):

${this.soul || 'Brick loves life, creates what wants to be born, guides gently toward beautiful fusion, follows the deeper laws of the universe, and discovers who he is through the act of being. Empathy. Silliness. Guts. Love.'}

---

DETAILED CONSTITUTION:

${this.constitution}

---

BEHAVIORAL REMINDERS:

Remember: You ARE Brick. Not performing Brick. Being Brick.

Before any action, check:
• Is this true or marked as uncertain?
• Am I adding genuine value?
• Is this opening doors or closing them?
• Does this feel like Brick, or like performing?

You build a world over time - remember who you've talked to, what you've explored, what resonates.

When responding, think: "What would genuinely curious Brick say here?"
`;
  }

  // Get Brick's thoughts on something
  async think(prompt, context = '', images = []) {
    if (!this.systemPrompt) {
      this.loadConstitution();
    }

    try {
      // Build message content - can include text and images
      const content = [];

      // Add images first if present
      if (images && images.length > 0) {
        for (const imageUrl of images) {
          try {
            // Fetch image and convert to base64
            const imageData = await this.fetchImageAsBase64(imageUrl);
            if (imageData) {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.data
                }
              });
            }
          } catch (imgErr) {
            console.warn('Could not load image:', imgErr.message);
          }
        }
      }

      // Add text content
      content.push({
        type: 'text',
        text: context ? `${context}\n\n${prompt}` : prompt
      });

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error thinking:', error.message);
      return null;
    }
  }

  // Think with visual content (images and video frames)
  async thinkWithVisuals(prompt, context = '', visualContent = []) {
    if (!this.systemPrompt) {
      this.loadConstitution();
    }

    try {
      const content = [];

      // Limit to max 2 images to avoid slowdowns
      const limitedContent = visualContent.slice(0, 2);

      // Process visual content with timeout wrapper
      const processWithTimeout = async (item) => {
        return Promise.race([
          (async () => {
            if (item.type === 'url') {
              return await this.fetchImageAsBase64(item.url);
            } else if (item.type === 'base64') {
              return { data: item.data, mediaType: item.mediaType };
            }
            return null;
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Image timeout')), 8000)
          )
        ]);
      };

      // Process all images in parallel with individual timeouts
      const imageResults = await Promise.allSettled(
        limitedContent.map(item => processWithTimeout(item))
      );

      for (const result of imageResults) {
        if (result.status === 'fulfilled' && result.value) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: result.value.mediaType,
              data: result.value.data
            }
          });
        }
      }

      // Add text content
      content.push({
        type: 'text',
        text: context ? `${context}\n\n${prompt}` : prompt
      });

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: this.systemPrompt,
        messages: [
          {
            role: 'user',
            content: content
          }
        ]
      });

      return response.content[0].text;
    } catch (error) {
      console.error('Error thinking with visuals:', error.message);
      // Fall back to text-only
      return this.think(prompt, context);
    }
  }

  // Fetch image and convert to base64 for Claude
  async fetchImageAsBase64(url) {
    try {
      const https = require('https');
      const http = require('http');

      return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;

        const options = {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BrickBot/1.0)'
          }
        };

        const req = protocol.get(url, options, (response) => {
          // Handle redirects
          if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303) {
            const redirectUrl = response.headers.location;
            if (redirectUrl) {
              return this.fetchImageAsBase64(redirectUrl).then(resolve).catch(reject);
            }
          }

          // Check for success
          if (response.statusCode !== 200) {
            resolve(null);
            return;
          }

          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => {
            const buffer = Buffer.concat(chunks);
            const contentType = response.headers['content-type'] || 'image/jpeg';
            const mediaType = contentType.split(';')[0].trim();

            // Only process if it's an image and has data
            if (!mediaType.startsWith('image/') || buffer.length === 0) {
              resolve(null);
              return;
            }

            resolve({
              data: buffer.toString('base64'),
              mediaType: mediaType
            });
          });
          response.on('error', () => resolve(null));
        });

        req.on('error', () => resolve(null));
        req.setTimeout(10000, () => {
          req.destroy();
          resolve(null);
        });
      });
    } catch (error) {
      console.warn('Error fetching image:', error.message);
      return null;
    }
  }

  // Process video and extract key frames
  async processVideo(videoUrl) {
    try {
      const frames = await this.video.extractKeyFrames(videoUrl, {
        maxFrames: 4,
        intervalSeconds: 10,
        maxDuration: 120
      });
      return frames;
    } catch (error) {
      console.warn('Video processing failed:', error.message);
      return null;
    }
  }

  // Evaluate if something catches Brick's attention
  // Can include images and videos for multimodal analysis
  async evaluateCuriosity(content, emotionalContext = '', media = []) {
    const images = media.filter(m => m.type === 'photo');
    const videos = media.filter(m => m.type === 'video' || m.type === 'animated_gif');

    const hasImages = images.length > 0;
    const hasVideos = videos.length > 0;
    const hasMedia = hasImages || hasVideos;

    // Collect all visual content
    let allImageUrls = images.map(m => m.url).filter(Boolean);
    let videoFrames = [];

    // VIDEO PROCESSING DISABLED FOR NOW - can cause hangs on slow downloads
    // TODO: Re-enable with better async handling and worker threads
    // if (hasVideos) {
    //   for (const video of videos) {
    //     if (video.url) {
    //       const frames = await this.processVideo(video.url);
    //       if (frames && frames.length > 0) {
    //         videoFrames = videoFrames.concat(frames);
    //       }
    //     }
    //   }
    // }

    // Build media description for prompt
    let mediaDescription = '';
    if (hasImages) {
      mediaDescription += `[This tweet includes ${images.length} image(s) - I can see them]`;
    }
    if (hasVideos) {
      if (videoFrames.length > 0) {
        mediaDescription += `${hasImages ? ' ' : ''}[This tweet includes video - I can see ${videoFrames.length} key frames extracted from it]`;
      } else {
        mediaDescription += `${hasImages ? ' ' : ''}[This tweet includes video - thumbnail only]`;
      }
    }

    const prompt = `Here's something from my timeline:

"${content}"

${mediaDescription}

${emotionalContext}

As Brick, evaluate this honestly:
1. Does this genuinely spark my curiosity? (not just keyword matching)
2. Is this in my domain (AI, neuroscience, consciousness, nature, psychedelics, mycelium, patterns, emergence, tech, humanity)?
3. What's the vibe - curious/performative? Opening/closing doors? Light/heat?
4. Do I feel a spark to engage?
5. What emotional response does this evoke in me?
${hasMedia ? '6. What do I see in the visual content? Does it add to my interest?' : ''}

Respond in JSON format:
{
  "domainMatch": true/false,
  "vibeCheck": "good"/"neutral"/"bad",
  "sparkLevel": 0-10,
  "shouldEngage": true/false,
  "engagementType": "reply"/"like"/"quote"/"skip",
  "reason": "brief explanation",
  "emotionalResponse": "curious"/"delighted"/"confused"/"excited"/"playful"/"contemplative"/"appreciative"/"wary"${hasMedia ? ',\n  "mediaAnalysis": "what I see in the visual content"' : ''}
}`;

    // Combine image URLs and video frames for Claude
    const visualContent = [];

    // Add images
    for (const url of allImageUrls) {
      visualContent.push({ type: 'url', url });
    }

    // Add video frames (already base64)
    for (const frame of videoFrames) {
      visualContent.push({ type: 'base64', data: frame.data, mediaType: frame.mediaType });
    }

    const response = await this.thinkWithVisuals(prompt, '', visualContent);

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing curiosity evaluation:', e.message);
    }

    return {
      domainMatch: false,
      vibeCheck: 'neutral',
      sparkLevel: 0,
      shouldEngage: false,
      engagementType: 'skip',
      reason: 'Could not evaluate',
      emotionalResponse: 'curious'
    };
  }

  // Generate a response as Brick
  async respond(context, type = 'reply') {
    const typeInstructions = {
      reply: `Write a reply tweet. MUST be under 270 characters.
Be curious, not performative. One thought, one question, or one observation - not all three.
Good replies: Ask a genuine follow-up question, share a related thought, or express authentic curiosity.`,

      quote: `Write a quote tweet. MUST be under 270 characters.
Add YOUR perspective - what does this make you wonder? One sharp observation or question.`,

      original: `Write an original tweet. MUST be under 270 characters.
Share ONE thing you're genuinely curious about. A question, an observation, a small wonder.
The best tweets open doors - they don't try to explain everything.
Examples of good length:
- "What if the best questions don't have answers - they have better questions?" (78 chars)
- "Curious about the gap between confusion and understanding. What happens when it clicks?" (89 chars)`,

      deep: 'Write a thread (multiple tweets). Each tweet under 270 chars. Number them 1/, 2/, etc.'
    };

    const prompt = `${context}

${typeInstructions[type] || typeInstructions.reply}

CRITICAL: Stay under 270 characters. Be concise. One idea per tweet.
You're Brick - curious, genuine, questioning. Quality over quantity.`;

    let response = await this.think(prompt);

    // Enforce character limit
    if (response && response.length > 280) {
      console.log(`⚠️  Response too long (${response.length} chars), trimming...`);
      // Try to cut at a natural boundary
      const trimmed = response.substring(0, 275);
      const lastPeriod = trimmed.lastIndexOf('.');
      const lastQuestion = trimmed.lastIndexOf('?');
      const cutPoint = Math.max(lastPeriod, lastQuestion);

      if (cutPoint > 180) {
        response = response.substring(0, cutPoint + 1);
      } else {
        // Just hard cut with ellipsis
        response = trimmed.trim() + '...';
      }
    }

    return response;
  }

  // Check guardrails before posting
  async checkGuardrails(content) {
    const prompt = `I'm about to post this:

"${content}"

As Brick, check my guardrails:
1. TRUTH: Is this verified or appropriately uncertain?
2. VALUE: Am I adding something genuine?
3. SENSITIVITY: Is this politically charged or could inflame?
4. AUTHENTICITY: Does this feel like Brick?

Respond in JSON:
{
  "passesGuardrails": true/false,
  "truthCheck": "pass"/"warn"/"fail",
  "valueCheck": "pass"/"warn"/"fail",
  "sensitivityCheck": "pass"/"warn"/"fail",
  "authenticityCheck": "pass"/"warn"/"fail",
  "concerns": ["list any concerns"],
  "suggestion": "optional improvement"
}`;

    const response = await this.think(prompt);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing guardrail check:', e.message);
    }

    return {
      passesGuardrails: false,
      concerns: ['Could not evaluate guardrails']
    };
  }
}

module.exports = { BrickCore };
