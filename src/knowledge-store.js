// === BRICK'S KNOWLEDGE STORE ===
// Vector database for Brick's learned knowledge
// Uses Supabase pgvector for semantic search

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');

class BrickKnowledgeStore {
  constructor() {
    this.supabase = null;
    this.anthropic = null;
  }

  async initialize() {
    // Initialize Supabase
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    } else {
      throw new Error('Supabase credentials not configured');
    }

    // Initialize Anthropic for embeddings (we'll use Claude to summarize for embedding)
    if (process.env.CLAUDE_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY
      });
    }

    console.log('📚 Knowledge store initialized');
    return true;
  }

  // Generate embedding using OpenAI (most common for vector search)
  // Or we can use a simpler hash-based approach for now
  async generateEmbedding(text) {
    // For now, we'll use a simple approach:
    // Store the text and use Supabase full-text search
    // Later we can add proper embeddings with OpenAI or Voyage

    // Simple keyword extraction for searchability
    const keywords = this.extractKeywords(text);
    return {
      text: text,
      keywords: keywords,
      hash: this.simpleHash(text)
    };
  }

  // Extract keywords for search
  extractKeywords(text) {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall',
      'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
      'into', 'through', 'during', 'before', 'after', 'above', 'below',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
      'we', 'us', 'you', 'your', 'i', 'me', 'my', 'he', 'she', 'his', 'her',
      'just', 'very', 'really', 'so', 'too', 'also', 'only', 'even', 'still'
    ]);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));

    // Count frequency
    const freq = {};
    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1;
    }

    // Return top keywords
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([word]) => word);
  }

  // Simple hash for deduplication
  simpleHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Store a piece of knowledge
  async store(knowledge) {
    if (!this.supabase) return null;

    const {
      text,
      author,
      source,  // 'scraped', 'discovered', 'conversation'
      domain,
      qualityScore,
      metadata = {}
    } = knowledge;

    try {
      const embedding = await this.generateEmbedding(text);

      const { data, error } = await this.supabase
        .from('brick_knowledge')
        .upsert({
          content_hash: embedding.hash,
          content: text,
          author: author,
          source: source,
          domain: domain,
          keywords: embedding.keywords,
          quality_score: qualityScore || 50,
          metadata: metadata,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'content_hash'
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Error storing knowledge:', error.message);
      return null;
    }
  }

  // Store multiple pieces of knowledge (batch)
  async storeBatch(knowledgeArray) {
    let stored = 0;
    let failed = 0;

    for (const knowledge of knowledgeArray) {
      const result = await this.store(knowledge);
      if (result) {
        stored++;
      } else {
        failed++;
      }

      // Small delay to avoid rate limits
      if (stored % 10 === 0) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    console.log(`📚 Stored ${stored} pieces of knowledge (${failed} failed)`);
    return { stored, failed };
  }

  // Search for relevant knowledge
  async search(query, options = {}) {
    if (!this.supabase) return [];

    const {
      limit = 10,
      domain = null,
      minQuality = 30,
      source = null
    } = options;

    try {
      // Extract keywords from query
      const keywords = this.extractKeywords(query);

      // Build search query
      let queryBuilder = this.supabase
        .from('brick_knowledge')
        .select('*')
        .gte('quality_score', minQuality)
        .order('quality_score', { ascending: false })
        .limit(limit);

      // Filter by domain if specified
      if (domain) {
        queryBuilder = queryBuilder.eq('domain', domain);
      }

      // Filter by source if specified
      if (source) {
        queryBuilder = queryBuilder.eq('source', source);
      }

      // Use full-text search on keywords
      if (keywords.length > 0) {
        // Search for any matching keywords
        queryBuilder = queryBuilder.contains('keywords', [keywords[0]]);
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Re-rank by keyword overlap
      const ranked = (data || []).map(item => {
        const overlap = keywords.filter(k => item.keywords?.includes(k)).length;
        return {
          ...item,
          relevanceScore: overlap / Math.max(keywords.length, 1)
        };
      }).sort((a, b) => b.relevanceScore - a.relevanceScore);

      return ranked;

    } catch (error) {
      console.error('Error searching knowledge:', error.message);
      return [];
    }
  }

  // Get knowledge by domain
  async getByDomain(domain, limit = 20) {
    if (!this.supabase) return [];

    try {
      const { data, error } = await this.supabase
        .from('brick_knowledge')
        .select('*')
        .eq('domain', domain)
        .order('quality_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting knowledge by domain:', error.message);
      return [];
    }
  }

  // Get random knowledge for inspiration
  async getRandom(count = 5) {
    if (!this.supabase) return [];

    try {
      // Get total count
      const { count: total } = await this.supabase
        .from('brick_knowledge')
        .select('*', { count: 'exact', head: true });

      if (!total || total === 0) return [];

      // Get random items
      const randomOffset = Math.floor(Math.random() * Math.max(1, total - count));

      const { data, error } = await this.supabase
        .from('brick_knowledge')
        .select('*')
        .range(randomOffset, randomOffset + count - 1);

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error getting random knowledge:', error.message);
      return [];
    }
  }

  // Get stats about the knowledge base
  async getStats() {
    if (!this.supabase) return null;

    try {
      const { count: total } = await this.supabase
        .from('brick_knowledge')
        .select('*', { count: 'exact', head: true });

      // Get domain breakdown
      const { data: domains } = await this.supabase
        .from('brick_knowledge')
        .select('domain')
        .not('domain', 'is', null);

      const domainCounts = {};
      for (const item of (domains || [])) {
        domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
      }

      return {
        totalKnowledge: total || 0,
        byDomain: domainCounts
      };

    } catch (error) {
      console.error('Error getting stats:', error.message);
      return null;
    }
  }

  // Format knowledge for injection into prompts
  formatForPrompt(knowledgeItems, maxLength = 2000) {
    if (!knowledgeItems || knowledgeItems.length === 0) {
      return '';
    }

    let output = '\n--- RELEVANT KNOWLEDGE ---\n';
    let currentLength = output.length;

    for (const item of knowledgeItems) {
      const entry = `\n@${item.author} (${item.domain}): "${item.content}"\n`;

      if (currentLength + entry.length > maxLength) break;

      output += entry;
      currentLength += entry.length;
    }

    output += '--- END KNOWLEDGE ---\n';
    return output;
  }
}

module.exports = { BrickKnowledgeStore };
