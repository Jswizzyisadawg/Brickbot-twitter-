#!/usr/bin/env node

/**
 * Knowledge MCP Server
 *
 * Local knowledge management for persistent learning:
 * - Store and retrieve knowledge snippets
 * - Tag-based organization
 * - Semantic search via embeddings (optional)
 * - Export/import for backup
 *
 * Built in-house for security. Data stays local.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_FILE = path.join(__dirname, 'knowledge.json');

const server = new Server(
  {
    name: 'knowledge-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============ Knowledge Store ============

async function loadKnowledge() {
  try {
    const data = await fs.readFile(KNOWLEDGE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Initialize empty knowledge base
    return {
      entries: [],
      tags: {},
      meta: {
        created: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        version: 1
      }
    };
  }
}

async function saveKnowledge(knowledge) {
  knowledge.meta.lastUpdated = new Date().toISOString();
  await fs.writeFile(KNOWLEDGE_FILE, JSON.stringify(knowledge, null, 2));
}

function generateId() {
  return `k_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============ Core Functions ============

async function addKnowledge(content, tags = [], source = null, metadata = {}) {
  const knowledge = await loadKnowledge();

  const entry = {
    id: generateId(),
    content: content,
    tags: tags,
    source: source,
    metadata: metadata,
    created: new Date().toISOString(),
    accessed: 0
  };

  knowledge.entries.push(entry);

  // Update tag index
  for (const tag of tags) {
    if (!knowledge.tags[tag]) {
      knowledge.tags[tag] = [];
    }
    knowledge.tags[tag].push(entry.id);
  }

  await saveKnowledge(knowledge);
  return entry;
}

async function searchKnowledge(query, options = {}) {
  const knowledge = await loadKnowledge();
  const { tags, limit = 10, sortBy = 'relevance' } = options;

  let results = knowledge.entries;

  // Filter by tags if specified
  if (tags && tags.length > 0) {
    results = results.filter(entry =>
      tags.some(tag => entry.tags.includes(tag))
    );
  }

  // Simple text search (case-insensitive)
  if (query) {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    results = results.map(entry => {
      const contentLower = entry.content.toLowerCase();
      let score = 0;

      // Score based on term matches
      for (const term of queryTerms) {
        if (contentLower.includes(term)) {
          score += 1;
          // Bonus for exact phrase
          if (contentLower.includes(queryLower)) {
            score += 2;
          }
        }
      }

      // Bonus for tag matches
      for (const tag of entry.tags) {
        if (queryLower.includes(tag.toLowerCase())) {
          score += 1;
        }
      }

      return { ...entry, score };
    }).filter(entry => entry.score > 0);

    // Sort by relevance
    if (sortBy === 'relevance') {
      results.sort((a, b) => b.score - a.score);
    }
  }

  // Sort options
  if (sortBy === 'recent') {
    results.sort((a, b) => new Date(b.created) - new Date(a.created));
  } else if (sortBy === 'accessed') {
    results.sort((a, b) => b.accessed - a.accessed);
  }

  // Update access counts
  const resultIds = new Set(results.slice(0, limit).map(r => r.id));
  knowledge.entries = knowledge.entries.map(entry => {
    if (resultIds.has(entry.id)) {
      return { ...entry, accessed: entry.accessed + 1 };
    }
    return entry;
  });
  await saveKnowledge(knowledge);

  return results.slice(0, limit);
}

async function getByTags(tags, limit = 20) {
  const knowledge = await loadKnowledge();

  const results = knowledge.entries.filter(entry =>
    tags.every(tag => entry.tags.includes(tag))
  );

  return results.slice(0, limit);
}

async function listTags() {
  const knowledge = await loadKnowledge();

  return Object.entries(knowledge.tags).map(([tag, ids]) => ({
    tag,
    count: ids.length
  })).sort((a, b) => b.count - a.count);
}

async function deleteKnowledge(id) {
  const knowledge = await loadKnowledge();

  const index = knowledge.entries.findIndex(e => e.id === id);
  if (index === -1) {
    return { success: false, message: 'Entry not found' };
  }

  const entry = knowledge.entries[index];

  // Remove from tag index
  for (const tag of entry.tags) {
    if (knowledge.tags[tag]) {
      knowledge.tags[tag] = knowledge.tags[tag].filter(i => i !== id);
      if (knowledge.tags[tag].length === 0) {
        delete knowledge.tags[tag];
      }
    }
  }

  knowledge.entries.splice(index, 1);
  await saveKnowledge(knowledge);

  return { success: true, message: 'Entry deleted' };
}

async function getStats() {
  const knowledge = await loadKnowledge();

  return {
    totalEntries: knowledge.entries.length,
    totalTags: Object.keys(knowledge.tags).length,
    topTags: Object.entries(knowledge.tags)
      .map(([tag, ids]) => ({ tag, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recentEntries: knowledge.entries
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, 5)
      .map(e => ({ id: e.id, preview: e.content.substring(0, 100), tags: e.tags })),
    meta: knowledge.meta
  };
}

// ============ Tool Definitions ============

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_knowledge',
        description: 'Store a piece of knowledge for future reference. Use tags to organize.',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The knowledge to store (can be text, code, notes, etc.)'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for organization (e.g., ["ml", "transformers", "attention"])'
            },
            source: {
              type: 'string',
              description: 'Optional source URL or reference'
            },
            metadata: {
              type: 'object',
              description: 'Optional additional metadata'
            }
          },
          required: ['content']
        }
      },
      {
        name: 'search_knowledge',
        description: 'Search stored knowledge by text query and/or tags',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags'
            },
            limit: {
              type: 'number',
              description: 'Max results (default: 10)',
              default: 10
            },
            sortBy: {
              type: 'string',
              enum: ['relevance', 'recent', 'accessed'],
              description: 'Sort order (default: relevance)'
            }
          }
        }
      },
      {
        name: 'get_by_tags',
        description: 'Get all knowledge entries with specific tags',
        inputSchema: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags to filter by (entries must have ALL specified tags)'
            },
            limit: {
              type: 'number',
              description: 'Max results (default: 20)'
            }
          },
          required: ['tags']
        }
      },
      {
        name: 'list_tags',
        description: 'List all tags and their usage counts',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'delete_knowledge',
        description: 'Delete a knowledge entry by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'The entry ID to delete'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'knowledge_stats',
        description: 'Get statistics about the knowledge base',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  };
});

// ============ Tool Handlers ============

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'add_knowledge': {
        const entry = await addKnowledge(
          args.content,
          args.tags || [],
          args.source,
          args.metadata || {}
        );
        return {
          content: [{
            type: 'text',
            text: `Knowledge stored with ID: ${entry.id}\nTags: ${entry.tags.join(', ') || 'none'}`
          }]
        };
      }

      case 'search_knowledge': {
        const results = await searchKnowledge(args.query, {
          tags: args.tags,
          limit: args.limit,
          sortBy: args.sortBy
        });
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }]
        };
      }

      case 'get_by_tags': {
        const results = await getByTags(args.tags, args.limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
          }]
        };
      }

      case 'list_tags': {
        const tags = await listTags();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(tags, null, 2)
          }]
        };
      }

      case 'delete_knowledge': {
        const result = await deleteKnowledge(args.id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result)
          }]
        };
      }

      case 'knowledge_stats': {
        const stats = await getStats();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(stats, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

// ============ Start Server ============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Knowledge MCP server running');
}

main().catch(console.error);
