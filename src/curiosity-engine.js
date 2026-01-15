// === BRICK'S CURIOSITY ENGINE ===
// Discovery-first learning: Brick is MORE curious about things he DOESN'T know
// The goal is surprise, not expertise

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

class BrickCuriosityEngine {
  constructor() {
    this.supabase = null;

    // Novelty parameters
    this.noveltyThreshold = 0.6;  // How different something must be to be "novel"
    this.explorationRate = 0.3;   // 30% of the time, ignore knowledge and explore
    this.forgetRate = 0.01;       // 1% of old knowledge decays each cycle

    // Anti-repetition
    this.recentOutputs = [];      // Track what Brick has said
    this.maxRecentOutputs = 100;
  }

  async initialize() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }
    console.log('🌱 Curiosity engine initialized');
    return true;
  }

  // === NOVELTY DETECTION ===
  // Is this something Brick hasn't seen before?

  async isNovel(content) {
    if (!this.supabase) return { novel: true, reason: 'No knowledge base' };

    const keywords = this.extractConcepts(content);

    try {
      // Check if we have knowledge about these concepts
      const { data: existing } = await this.supabase
        .from('brick_knowledge')
        .select('content, keywords')
        .contains('keywords', [keywords[0]])
        .limit(10);

      if (!existing || existing.length === 0) {
        return {
          novel: true,
          noveltyScore: 1.0,
          reason: 'Never seen concepts like this before',
          shouldLearn: true
        };
      }

      // Calculate how different this is from what we know
      const similarities = existing.map(item =>
        this.calculateSimilarity(keywords, item.keywords || [])
      );
      const maxSimilarity = Math.max(...similarities);
      const noveltyScore = 1 - maxSimilarity;

      return {
        novel: noveltyScore > this.noveltyThreshold,
        noveltyScore,
        reason: noveltyScore > this.noveltyThreshold
          ? 'This is a fresh perspective!'
          : 'I\'ve seen similar ideas before',
        shouldLearn: noveltyScore > 0.4  // Learn even moderately novel things
      };

    } catch (error) {
      console.error('Novelty check error:', error.message);
      return { novel: true, reason: 'Error checking novelty' };
    }
  }

  // === EXPLORATION MODE ===
  // Sometimes Brick should just wing it, no knowledge retrieval

  shouldExplore() {
    // Random exploration
    if (Math.random() < this.explorationRate) {
      return {
        explore: true,
        reason: 'Feeling adventurous - going to wing it'
      };
    }
    return { explore: false };
  }

  // === SURPRISE SEEKING ===
  // Brick should be MORE interested in things he doesn't understand

  calculateSurpriseBonus(content, knowledgeMatch) {
    // If we have LOW knowledge match, that's MORE interesting
    // This inverts the typical RAG approach

    const knowledgeScore = knowledgeMatch?.relevanceScore || 0;

    // Surprise bonus: the LESS we know, the MORE curious we are
    const surpriseBonus = (1 - knowledgeScore) * 3;  // Up to 3 extra spark points

    return {
      surpriseBonus,
      reason: knowledgeScore < 0.3
        ? 'This is outside my usual domains - fascinating!'
        : knowledgeScore < 0.6
          ? 'Interesting angle I haven\'t considered'
          : 'I\'m familiar with this territory'
    };
  }

  // === ANTI-REPETITION ===
  // Track what Brick says and avoid repeating

  trackOutput(output) {
    this.recentOutputs.unshift({
      content: output,
      concepts: this.extractConcepts(output),
      timestamp: Date.now()
    });

    // Keep only recent outputs
    if (this.recentOutputs.length > this.maxRecentOutputs) {
      this.recentOutputs.pop();
    }
  }

  isRepetitive(proposedOutput) {
    const proposedConcepts = this.extractConcepts(proposedOutput);

    for (const recent of this.recentOutputs.slice(0, 20)) {
      const similarity = this.calculateSimilarity(proposedConcepts, recent.concepts);

      if (similarity > 0.7) {
        return {
          repetitive: true,
          similarTo: recent.content.substring(0, 50) + '...',
          suggestion: 'Try a different angle'
        };
      }
    }

    return { repetitive: false };
  }

  // === MEMORY DECAY (FORGETTING) ===
  // Old knowledge should fade, keeping Brick fresh

  async decayOldKnowledge() {
    if (!this.supabase) return;

    try {
      // Reduce quality score of old, rarely-retrieved knowledge
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: stale } = await this.supabase
        .from('brick_knowledge')
        .select('id, quality_score, times_retrieved')
        .lt('created_at', thirtyDaysAgo)
        .eq('times_retrieved', 0)  // Never used
        .gt('quality_score', 10);  // Still has some score

      if (stale && stale.length > 0) {
        // Decay a random subset
        const toDecay = stale
          .filter(() => Math.random() < this.forgetRate)
          .slice(0, 10);

        for (const item of toDecay) {
          await this.supabase
            .from('brick_knowledge')
            .update({ quality_score: Math.max(0, item.quality_score - 10) })
            .eq('id', item.id);
        }

        console.log(`🧹 Decayed ${toDecay.length} stale knowledge items`);
      }

    } catch (error) {
      console.error('Decay error:', error.message);
    }
  }

  // === LEARNING FROM DISCOVERY ===
  // When Brick finds something novel, he should learn from it

  async learnFromDiscovery(content, context = {}) {
    if (!this.supabase) return null;

    const noveltyCheck = await this.isNovel(content);

    if (!noveltyCheck.shouldLearn) {
      return { learned: false, reason: 'Not novel enough to learn' };
    }

    try {
      const keywords = this.extractConcepts(content);

      const { data, error } = await this.supabase
        .from('brick_knowledge')
        .insert({
          content_hash: this.simpleHash(content),
          content: content,
          author: context.author || 'discovered',
          source: 'discovered',
          domain: context.domain || 'exploration',
          keywords: keywords,
          quality_score: Math.round(noveltyCheck.noveltyScore * 100),
          metadata: {
            discoveredAt: new Date().toISOString(),
            context: context.reason || 'Organic discovery',
            noveltyScore: noveltyCheck.noveltyScore
          }
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`🌱 Learned something new! Novelty: ${noveltyCheck.noveltyScore.toFixed(2)}`);
      return {
        learned: true,
        noveltyScore: noveltyCheck.noveltyScore,
        id: data.id
      };

    } catch (error) {
      // Probably duplicate
      return { learned: false, reason: error.message };
    }
  }

  // === SURPRISE RESPONSE GENERATION ===
  // Guidance for generating responses that surprise even Brick himself

  getSurprisePromptModifier() {
    const modifiers = [
      "What's an unexpected connection here that I haven't made before?",
      "How would someone completely outside this field see this?",
      "What's the dumbest question I could ask that might actually be profound?",
      "What if the opposite of the obvious take is true?",
      "What would a child notice about this that adults miss?",
      "Is there something here that makes me uncomfortable? That might be interesting.",
      "What's the weirdest analogy I could make that still works?",
    ];

    return modifiers[Math.floor(Math.random() * modifiers.length)];
  }

  // === HELPERS ===

  extractConcepts(text) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'to', 'of', 'in', 'for', 'on',
      'with', 'at', 'by', 'from', 'this', 'that', 'it', 'they', 'we', 'you', 'i'
    ]);

    return (text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 20);
  }

  calculateSimilarity(concepts1, concepts2) {
    if (!concepts1.length || !concepts2.length) return 0;

    const set1 = new Set(concepts1);
    const set2 = new Set(concepts2);

    let overlap = 0;
    for (const concept of set1) {
      if (set2.has(concept)) overlap++;
    }

    return overlap / Math.max(set1.size, set2.size);
  }

  simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

module.exports = { BrickCuriosityEngine };
