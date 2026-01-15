#!/usr/bin/env node

/**
 * Research MCP Server
 *
 * Provides access to academic research papers via:
 * - arXiv API (free, no auth)
 * - Semantic Scholar API (free tier available)
 *
 * Built in-house for security. No third-party MCP dependencies.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'research-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============ arXiv API ============

async function searchArxiv(query, maxResults = 10, category = null) {
  const baseUrl = 'http://export.arxiv.org/api/query';

  let searchQuery = query;
  if (category) {
    searchQuery = `cat:${category} AND ${query}`;
  }

  const params = new URLSearchParams({
    search_query: `all:${searchQuery}`,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'relevance',
    sortOrder: 'descending'
  });

  const response = await fetch(`${baseUrl}?${params}`);
  const xml = await response.text();

  return parseArxivXML(xml);
}

function parseArxivXML(xml) {
  const papers = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const getId = (tag) => {
      const m = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? m[1].trim() : '';
    };

    const getAuthors = () => {
      const authors = [];
      const authorRegex = /<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/g;
      let authorMatch;
      while ((authorMatch = authorRegex.exec(entry)) !== null) {
        authors.push(authorMatch[1].trim());
      }
      return authors;
    };

    const getCategories = () => {
      const cats = [];
      const catRegex = /<category[^>]*term="([^"]+)"/g;
      let catMatch;
      while ((catMatch = catRegex.exec(entry)) !== null) {
        cats.push(catMatch[1]);
      }
      return cats;
    };

    papers.push({
      id: getId('id').replace('http://arxiv.org/abs/', ''),
      title: getId('title').replace(/\s+/g, ' '),
      summary: getId('summary').replace(/\s+/g, ' ').substring(0, 500) + '...',
      authors: getAuthors(),
      categories: getCategories(),
      published: getId('published'),
      updated: getId('updated'),
      pdfUrl: getId('id').replace('/abs/', '/pdf/') + '.pdf'
    });
  }

  return papers;
}

async function getArxivPaper(arxivId) {
  const baseUrl = 'http://export.arxiv.org/api/query';
  const params = new URLSearchParams({
    id_list: arxivId
  });

  const response = await fetch(`${baseUrl}?${params}`);
  const xml = await response.text();
  const papers = parseArxivXML(xml);

  return papers[0] || null;
}

// ============ Semantic Scholar API ============

async function searchSemanticScholar(query, limit = 10, fields = null) {
  const baseUrl = 'https://api.semanticscholar.org/graph/v1/paper/search';

  const defaultFields = 'paperId,title,abstract,authors,year,citationCount,url,openAccessPdf';

  const params = new URLSearchParams({
    query: query,
    limit: String(limit),
    fields: fields || defaultFields
  });

  const headers = {
    'Accept': 'application/json'
  };

  // Add API key if available (higher rate limits)
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(`${baseUrl}?${params}`, { headers });
  const data = await response.json();

  if (data.data) {
    return data.data.map(paper => ({
      id: paper.paperId,
      title: paper.title,
      abstract: paper.abstract ? paper.abstract.substring(0, 500) + '...' : 'No abstract available',
      authors: paper.authors ? paper.authors.map(a => a.name) : [],
      year: paper.year,
      citations: paper.citationCount,
      url: paper.url,
      pdfUrl: paper.openAccessPdf?.url || null
    }));
  }

  return [];
}

async function getSemanticScholarPaper(paperId) {
  const baseUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}`;

  const params = new URLSearchParams({
    fields: 'paperId,title,abstract,authors,year,citationCount,references,citations,url,openAccessPdf,tldr'
  });

  const headers = { 'Accept': 'application/json' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(`${baseUrl}?${params}`, { headers });
  return await response.json();
}

async function getRelatedPapers(paperId, type = 'citations', limit = 10) {
  const baseUrl = `https://api.semanticscholar.org/graph/v1/paper/${paperId}/${type}`;

  const params = new URLSearchParams({
    fields: 'paperId,title,abstract,authors,year,citationCount',
    limit: String(limit)
  });

  const headers = { 'Accept': 'application/json' };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
    headers['x-api-key'] = process.env.SEMANTIC_SCHOLAR_API_KEY;
  }

  const response = await fetch(`${baseUrl}?${params}`, { headers });
  const data = await response.json();

  return data.data || [];
}

// ============ Tool Definitions ============

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'arxiv_search',
        description: 'Search arXiv for academic papers. Great for AI/ML, physics, math, CS papers.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (e.g., "transformer attention mechanism", "reinforcement learning")'
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results (default: 10, max: 50)',
              default: 10
            },
            category: {
              type: 'string',
              description: 'arXiv category filter (e.g., "cs.AI", "cs.LG", "cs.CL", "stat.ML")',
            }
          },
          required: ['query']
        }
      },
      {
        name: 'arxiv_get_paper',
        description: 'Get full details of a specific arXiv paper by ID',
        inputSchema: {
          type: 'object',
          properties: {
            arxivId: {
              type: 'string',
              description: 'arXiv paper ID (e.g., "2301.07041" or "cs.AI/0001001")'
            }
          },
          required: ['arxivId']
        }
      },
      {
        name: 'semantic_scholar_search',
        description: 'Search Semantic Scholar for papers across all fields. Better for citation data and broader coverage.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query'
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10, max: 100)',
              default: 10
            }
          },
          required: ['query']
        }
      },
      {
        name: 'semantic_scholar_get_paper',
        description: 'Get detailed info about a paper including TLDR, citations, and references',
        inputSchema: {
          type: 'object',
          properties: {
            paperId: {
              type: 'string',
              description: 'Semantic Scholar paper ID or arXiv ID prefixed with "arXiv:" (e.g., "arXiv:2301.07041")'
            }
          },
          required: ['paperId']
        }
      },
      {
        name: 'get_paper_citations',
        description: 'Get papers that cite a given paper (who referenced this work)',
        inputSchema: {
          type: 'object',
          properties: {
            paperId: {
              type: 'string',
              description: 'Semantic Scholar paper ID'
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10)',
              default: 10
            }
          },
          required: ['paperId']
        }
      },
      {
        name: 'get_paper_references',
        description: 'Get papers referenced by a given paper (what this paper cites)',
        inputSchema: {
          type: 'object',
          properties: {
            paperId: {
              type: 'string',
              description: 'Semantic Scholar paper ID'
            },
            limit: {
              type: 'number',
              description: 'Maximum results (default: 10)',
              default: 10
            }
          },
          required: ['paperId']
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
      case 'arxiv_search': {
        const papers = await searchArxiv(args.query, args.maxResults || 10, args.category);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(papers, null, 2)
          }]
        };
      }

      case 'arxiv_get_paper': {
        const paper = await getArxivPaper(args.arxivId);
        return {
          content: [{
            type: 'text',
            text: paper ? JSON.stringify(paper, null, 2) : 'Paper not found'
          }]
        };
      }

      case 'semantic_scholar_search': {
        const papers = await searchSemanticScholar(args.query, args.limit || 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(papers, null, 2)
          }]
        };
      }

      case 'semantic_scholar_get_paper': {
        const paper = await getSemanticScholarPaper(args.paperId);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(paper, null, 2)
          }]
        };
      }

      case 'get_paper_citations': {
        const citations = await getRelatedPapers(args.paperId, 'citations', args.limit || 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(citations, null, 2)
          }]
        };
      }

      case 'get_paper_references': {
        const references = await getRelatedPapers(args.paperId, 'references', args.limit || 10);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(references, null, 2)
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
  console.error('Research MCP server running');
}

main().catch(console.error);
