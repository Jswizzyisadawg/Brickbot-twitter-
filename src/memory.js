// === BRICK'S MEMORY ===
// Persistent memory layer using Mem0

require('dotenv').config();
const { MemoryClient } = require('mem0ai');

class BrickMemory {
  constructor() {
    this.memory = null;
    this.userId = 'brick';
  }

  async initialize() {
    // Check for Mem0 API key
    if (process.env.MEM0_API_KEY) {
      try {
        this.memory = new MemoryClient({
          apiKey: process.env.MEM0_API_KEY
        });
        console.log('🧠 Brick memory initialized (Mem0 Platform)');
      } catch (error) {
        console.warn('⚠️ Mem0 init failed:', error.message);
        this.memory = null;
      }
    } else {
      console.log('🧠 Brick memory not configured (no API key)');
    }
  }

  // Store a memory from an interaction
  async remember(content, metadata = {}) {
    if (!this.memory) {
      console.warn('Memory not initialized');
      return null;
    }

    try {
      // Mem0 API expects messages as array with role/content objects
      let messages;
      if (Array.isArray(content)) {
        messages = content;
      } else if (typeof content === 'string') {
        messages = [{ role: 'user', content: content }];
      } else {
        messages = [{ role: 'user', content: String(content) }];
      }

      const result = await this.memory.add(messages, {
        user_id: this.userId,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
      return result;
    } catch (error) {
      console.error('Error storing memory:', error.message);
      return null;
    }
  }

  // Remember a conversation with context
  async rememberConversation(messages, metadata = {}) {
    if (!this.memory) return null;

    try {
      // Ensure messages is properly formatted
      const formattedMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];
      const result = await this.memory.add(formattedMessages, {
        user_id: this.userId,
        metadata: {
          type: 'conversation',
          timestamp: new Date().toISOString(),
          ...metadata
        }
      });
      return result;
    } catch (error) {
      console.error('Error storing conversation:', error.message);
      return null;
    }
  }

  // Remember a person Brick interacted with
  async rememberPerson(username, context) {
    return this.remember(
      `I interacted with @${username}. ${context}`,
      { type: 'person', username }
    );
  }

  // Remember a topic Brick explored
  async rememberTopic(topic, insight) {
    return this.remember(
      `I explored the topic "${topic}". ${insight}`,
      { type: 'topic', topic }
    );
  }

  // Remember a post Brick made
  async rememberPost(content, response = null) {
    return this.remember(
      `I posted: "${content}"${response ? ` It received: ${response}` : ''}`,
      { type: 'post' }
    );
  }

  // Calculate recency score (exponential decay)
  // Memories from today = 1.0, memories from a week ago ≈ 0.5, month ago ≈ 0.1
  calculateRecencyScore(timestamp) {
    if (!timestamp) return 0.5; // Default for memories without timestamps

    const now = Date.now();
    const memoryTime = new Date(timestamp).getTime();
    const ageInDays = (now - memoryTime) / (1000 * 60 * 60 * 24);

    // Decay factor: 0.9^days (half-life ~7 days)
    const decayRate = 0.9;
    return Math.pow(decayRate, ageInDays);
  }

  // Search memories with recency weighting
  async recall(query, limit = 10) {
    if (!this.memory) return [];

    try {
      // Mem0 search requires query as first param, options as second
      // Request more than needed so we can re-rank
      const results = await this.memory.search(query, {
        user_id: this.userId,
        limit: limit * 2
      });

      // Handle both array and object responses
      let memories = [];
      if (Array.isArray(results)) {
        memories = results;
      } else if (results?.results) {
        memories = results.results;
      }

      // Add recency scoring and re-rank
      const scoredMemories = memories.map(m => {
        const recency = this.calculateRecencyScore(m.metadata?.timestamp);
        const relevance = m.score || 0.5; // Mem0's relevance score

        return {
          ...m,
          recencyScore: recency,
          relevanceScore: relevance,
          // Combined score: 70% relevance, 30% recency
          combinedScore: (relevance * 0.7) + (recency * 0.3)
        };
      });

      // Sort by combined score and return top results
      return scoredMemories
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

    } catch (error) {
      console.error('Error searching memory:', error.message);
      return [];
    }
  }

  // Recall with pure recency (for "what did I do recently?" queries)
  async recallRecent(limit = 10) {
    if (!this.memory) return [];

    try {
      const allMemories = await this.getAllMemories();

      // Sort by timestamp (most recent first)
      return allMemories
        .filter(m => m.metadata?.timestamp)
        .sort((a, b) => {
          const timeA = new Date(a.metadata.timestamp).getTime();
          const timeB = new Date(b.metadata.timestamp).getTime();
          return timeB - timeA;
        })
        .slice(0, limit);

    } catch (error) {
      console.error('Error getting recent memories:', error.message);
      return [];
    }
  }

  // Get all memories (for reflection)
  async getAllMemories() {
    if (!this.memory) return [];

    try {
      // Mem0 getAll with explicit user_id
      const results = await this.memory.getAll({
        user_id: this.userId,
        page: 1,
        page_size: 100
      });
      // Handle both array and object responses
      if (Array.isArray(results)) {
        return results;
      } else if (results?.results) {
        return results.results;
      }
      return [];
    } catch (error) {
      console.error('Error getting memories:', error.message);
      return [];
    }
  }

  // Reflect on what Brick has learned
  async reflect() {
    const memories = await this.getAllMemories();

    const topics = memories.filter(m => m.metadata?.type === 'topic');
    const people = memories.filter(m => m.metadata?.type === 'person');
    const posts = memories.filter(m => m.metadata?.type === 'post');

    return {
      totalMemories: memories.length,
      topicsExplored: topics.length,
      peopleConnected: people.length,
      postsMade: posts.length,
      memories
    };
  }

  // Get memory health stats (for monitoring)
  async getMemoryHealth() {
    const memories = await this.getAllMemories();

    if (memories.length === 0) {
      return {
        total: 0,
        status: 'empty',
        message: 'No memories stored yet'
      };
    }

    // Calculate age distribution
    const now = Date.now();
    const ages = memories
      .filter(m => m.metadata?.timestamp)
      .map(m => (now - new Date(m.metadata.timestamp).getTime()) / (1000 * 60 * 60 * 24));

    const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    const maxAge = ages.length > 0 ? Math.max(...ages) : 0;

    // Count by type
    const byType = {};
    for (const m of memories) {
      const type = m.metadata?.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    }

    // Calculate overall recency health
    const avgRecency = memories
      .map(m => this.calculateRecencyScore(m.metadata?.timestamp))
      .reduce((a, b) => a + b, 0) / memories.length;

    // Determine status
    let status = 'healthy';
    let message = 'Memory is fresh and active';

    if (avgRecency < 0.3) {
      status = 'stale';
      message = 'Many memories are old - consider more active engagement';
    } else if (memories.length > 500) {
      status = 'bloated';
      message = 'Memory is getting large - consider pruning old entries';
    }

    return {
      total: memories.length,
      byType,
      avgAgeDays: Math.round(avgAge * 10) / 10,
      maxAgeDays: Math.round(maxAge * 10) / 10,
      avgRecencyScore: Math.round(avgRecency * 100) / 100,
      status,
      message
    };
  }

  // Format memories for injection into prompts (with recency indication)
  formatForPrompt(memories, maxLength = 1500) {
    if (!memories || memories.length === 0) {
      return '';
    }

    let output = '\n--- RELEVANT MEMORIES ---\n';
    let currentLength = output.length;

    for (const m of memories) {
      const recencyLabel = m.recencyScore > 0.7 ? '(recent)' : m.recencyScore < 0.3 ? '(older)' : '';
      const entry = `• ${m.memory} ${recencyLabel}\n`;

      if (currentLength + entry.length > maxLength) break;

      output += entry;
      currentLength += entry.length;
    }

    output += '--- END MEMORIES ---\n';
    return output;
  }
}

module.exports = { BrickMemory };
