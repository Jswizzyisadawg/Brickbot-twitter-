#!/usr/bin/env node

/**
 * Docs MCP Server
 *
 * Fetches and caches documentation from:
 * - GitHub READMEs and docs
 * - Raw markdown files
 * - Package documentation
 *
 * Built in-house for security. Caches locally.
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
const CACHE_DIR = path.join(__dirname, 'cache');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const server = new Server(
  {
    name: 'docs-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============ Cache Management ============

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory exists
  }
}

function getCacheKey(url) {
  return Buffer.from(url).toString('base64').replace(/[/+=]/g, '_');
}

async function getFromCache(url) {
  await ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, getCacheKey(url) + '.json');

  try {
    const data = JSON.parse(await fs.readFile(cacheFile, 'utf-8'));

    if (Date.now() - data.timestamp < CACHE_DURATION) {
      return data.content;
    }
  } catch (error) {
    // Cache miss
  }

  return null;
}

async function saveToCache(url, content) {
  await ensureCacheDir();
  const cacheFile = path.join(CACHE_DIR, getCacheKey(url) + '.json');

  await fs.writeFile(cacheFile, JSON.stringify({
    url,
    timestamp: Date.now(),
    content
  }));
}

// ============ Fetching Functions ============

async function fetchGitHubReadme(owner, repo, branch = 'main') {
  // Try common README locations
  const readmeNames = ['README.md', 'readme.md', 'Readme.md', 'README.rst', 'README'];
  const branches = [branch, 'master'];

  for (const b of branches) {
    for (const readme of readmeNames) {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${b}/${readme}`;

      try {
        const cached = await getFromCache(url);
        if (cached) return cached;

        const response = await fetch(url);
        if (response.ok) {
          const content = await response.text();
          await saveToCache(url, content);
          return content;
        }
      } catch (error) {
        continue;
      }
    }
  }

  throw new Error(`README not found for ${owner}/${repo}`);
}

async function fetchGitHubFile(owner, repo, filepath, branch = 'main') {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filepath}`;

  const cached = await getFromCache(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`File not found: ${filepath}`);
  }

  const content = await response.text();
  await saveToCache(url, content);
  return content;
}

async function fetchGitHubDocs(owner, repo, docsPath = 'docs', branch = 'main') {
  // Fetch the docs directory listing via GitHub API
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${docsPath}?ref=${branch}`;

  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'docs-mcp/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Docs not found at ${docsPath}`);
  }

  const files = await response.json();

  // Filter for markdown files
  const markdownFiles = files
    .filter(f => f.type === 'file' && (f.name.endsWith('.md') || f.name.endsWith('.mdx')))
    .map(f => ({
      name: f.name,
      path: f.path,
      url: f.download_url
    }));

  return markdownFiles;
}

async function fetchRawUrl(url) {
  const cached = await getFromCache(url);
  if (cached) return cached;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${url}`);
  }

  const content = await response.text();
  await saveToCache(url, content);
  return content;
}

async function fetchNpmPackageInfo(packageName) {
  const url = `https://registry.npmjs.org/${packageName}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Package not found: ${packageName}`);
  }

  const data = await response.json();

  return {
    name: data.name,
    description: data.description,
    version: data['dist-tags']?.latest,
    homepage: data.homepage,
    repository: data.repository?.url,
    readme: data.readme?.substring(0, 5000) + '...' || 'No README available',
    keywords: data.keywords || []
  };
}

async function fetchPyPIPackageInfo(packageName) {
  const url = `https://pypi.org/pypi/${packageName}/json`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Package not found: ${packageName}`);
  }

  const data = await response.json();
  const info = data.info;

  return {
    name: info.name,
    description: info.summary,
    version: info.version,
    homepage: info.home_page || info.project_url,
    repository: info.project_urls?.['Source'] || info.project_urls?.['Repository'],
    readme: info.description?.substring(0, 5000) + '...' || 'No README available',
    keywords: info.keywords?.split(',').map(k => k.trim()) || []
  };
}

// ============ Tool Definitions ============

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'fetch_github_readme',
        description: 'Fetch the README from a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner (e.g., "anthropics")'
            },
            repo: {
              type: 'string',
              description: 'Repository name (e.g., "claude-code")'
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
              default: 'main'
            }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'fetch_github_file',
        description: 'Fetch a specific file from a GitHub repository',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner'
            },
            repo: {
              type: 'string',
              description: 'Repository name'
            },
            filepath: {
              type: 'string',
              description: 'Path to file (e.g., "src/index.js" or "docs/guide.md")'
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
              default: 'main'
            }
          },
          required: ['owner', 'repo', 'filepath']
        }
      },
      {
        name: 'list_github_docs',
        description: 'List all markdown files in a repository docs folder',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'Repository owner'
            },
            repo: {
              type: 'string',
              description: 'Repository name'
            },
            docsPath: {
              type: 'string',
              description: 'Path to docs folder (default: "docs")',
              default: 'docs'
            },
            branch: {
              type: 'string',
              description: 'Branch name (default: "main")',
              default: 'main'
            }
          },
          required: ['owner', 'repo']
        }
      },
      {
        name: 'fetch_url',
        description: 'Fetch content from any raw URL (markdown, text, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'URL to fetch'
            }
          },
          required: ['url']
        }
      },
      {
        name: 'npm_package_info',
        description: 'Get info and README for an npm package',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'npm package name (e.g., "react", "@anthropic-ai/sdk")'
            }
          },
          required: ['packageName']
        }
      },
      {
        name: 'pypi_package_info',
        description: 'Get info and description for a Python package',
        inputSchema: {
          type: 'object',
          properties: {
            packageName: {
              type: 'string',
              description: 'PyPI package name (e.g., "anthropic", "transformers")'
            }
          },
          required: ['packageName']
        }
      },
      {
        name: 'clear_cache',
        description: 'Clear the documentation cache',
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
      case 'fetch_github_readme': {
        const readme = await fetchGitHubReadme(args.owner, args.repo, args.branch);
        return {
          content: [{
            type: 'text',
            text: readme
          }]
        };
      }

      case 'fetch_github_file': {
        const content = await fetchGitHubFile(args.owner, args.repo, args.filepath, args.branch);
        return {
          content: [{
            type: 'text',
            text: content
          }]
        };
      }

      case 'list_github_docs': {
        const docs = await fetchGitHubDocs(args.owner, args.repo, args.docsPath, args.branch);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(docs, null, 2)
          }]
        };
      }

      case 'fetch_url': {
        const content = await fetchRawUrl(args.url);
        return {
          content: [{
            type: 'text',
            text: content
          }]
        };
      }

      case 'npm_package_info': {
        const info = await fetchNpmPackageInfo(args.packageName);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(info, null, 2)
          }]
        };
      }

      case 'pypi_package_info': {
        const info = await fetchPyPIPackageInfo(args.packageName);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(info, null, 2)
          }]
        };
      }

      case 'clear_cache': {
        await ensureCacheDir();
        const files = await fs.readdir(CACHE_DIR);
        for (const file of files) {
          await fs.unlink(path.join(CACHE_DIR, file));
        }
        return {
          content: [{
            type: 'text',
            text: `Cache cleared. Removed ${files.length} cached files.`
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
  console.error('Docs MCP server running');
}

main().catch(console.error);
