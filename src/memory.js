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
      // Mem0 API expects messages as array and snake_case params
      const messages = Array.isArray(content) ? content : [{ role: 'user', content }];
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

  // Search memories
  async recall(query, limit = 10) {
    if (!this.memory) return [];

    try {
      const results = await this.memory.search(query, {
        user_id: this.userId,
        limit
      });
      return results || [];
    } catch (error) {
      console.error('Error searching memory:', error.message);
      return [];
    }
  }

  // Get all memories (for reflection)
  async getAllMemories() {
    if (!this.memory) return [];

    try {
      const results = await this.memory.getAll({
        user_id: this.userId
      });
      return results || [];
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
}

module.exports = { BrickMemory };
