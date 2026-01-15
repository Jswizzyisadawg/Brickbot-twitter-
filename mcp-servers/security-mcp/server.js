#!/usr/bin/env node

/**
 * Security MCP Server
 *
 * Helps catch security risks when building applications:
 * - Dependency vulnerability scanning (npm audit, pip)
 * - Code pattern analysis (OWASP top 10)
 * - Secret detection
 * - Security best practices
 *
 * Built in-house. Your security co-pilot.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

// ============ Tool Detection ============

async function checkToolInstalled(tool) {
  try {
    await execAsync(`which ${tool}`);
    return true;
  } catch {
    return false;
  }
}

const server = new Server(
  {
    name: 'security-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ============ OWASP Top 10 Patterns ============

const SECURITY_PATTERNS = {
  injection: {
    name: 'Injection (A03:2021)',
    patterns: [
      { regex: /\$\{.*\}.*sql|sql.*\$\{/gi, desc: 'Potential SQL injection via template literals' },
      { regex: /exec\s*\(|spawn\s*\(|execSync/g, desc: 'Command execution - validate input' },
      { regex: /eval\s*\(/g, desc: 'eval() is dangerous - avoid if possible' },
      { regex: /new\s+Function\s*\(/g, desc: 'Dynamic function creation - potential injection' },
      { regex: /innerHTML\s*=|outerHTML\s*=/g, desc: 'innerHTML can lead to XSS' },
      { regex: /document\.write/g, desc: 'document.write can lead to XSS' },
      { regex: /\.query\s*\(\s*['"`].*\+|\.query\s*\(\s*`.*\$\{/g, desc: 'String concatenation in SQL query' },
    ]
  },
  authentication: {
    name: 'Broken Authentication (A07:2021)',
    patterns: [
      { regex: /password\s*[=:]\s*['"][^'"]{1,20}['"]/gi, desc: 'Hardcoded password detected' },
      { regex: /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/gi, desc: 'Hardcoded API key detected' },
      { regex: /secret\s*[=:]\s*['"][^'"]+['"]/gi, desc: 'Hardcoded secret detected' },
      { regex: /jwt\.sign\([^)]*expiresIn:\s*['"]?\d{4,}[dhms]?['"]?/gi, desc: 'Very long JWT expiration' },
      { regex: /bcrypt\.compare.*then.*==|===.*true/g, desc: 'Timing-safe comparison issue' },
    ]
  },
  exposure: {
    name: 'Sensitive Data Exposure (A02:2021)',
    patterns: [
      { regex: /console\.(log|info|debug)\s*\([^)]*password|token|secret|key/gi, desc: 'Logging sensitive data' },
      { regex: /localStorage\.setItem\s*\([^)]*token|password|secret/gi, desc: 'Storing sensitive data in localStorage' },
      { regex: /http:\/\/(?!localhost|127\.0\.0\.1)/g, desc: 'HTTP (not HTTPS) URL detected' },
    ]
  },
  xxe: {
    name: 'XML External Entities (A05:2021)',
    patterns: [
      { regex: /parseXML|DOMParser|xml2js/g, desc: 'XML parsing - ensure external entities disabled' },
      { regex: /<!ENTITY/g, desc: 'XML entity definition - potential XXE' },
    ]
  },
  accessControl: {
    name: 'Broken Access Control (A01:2021)',
    patterns: [
      { regex: /req\.params\.(id|userId).*without.*auth|without.*check/gi, desc: 'ID from params without auth check' },
      { regex: /isAdmin\s*=\s*req\.(body|query|params)/g, desc: 'Admin flag from user input' },
      { regex: /role\s*=\s*req\.(body|query|params)/g, desc: 'Role from user input' },
    ]
  },
  security_misconfiguration: {
    name: 'Security Misconfiguration (A05:2021)',
    patterns: [
      { regex: /cors\(\s*\)|origin:\s*['"]?\*/g, desc: 'Overly permissive CORS' },
      { regex: /helmet\s*\(\s*\{[^}]*contentSecurityPolicy:\s*false/g, desc: 'CSP disabled' },
      { regex: /NODE_ENV.*production.*console|console.*NODE_ENV/g, desc: 'Debug logging in production check' },
    ]
  },
  crypto: {
    name: 'Cryptographic Failures (A02:2021)',
    patterns: [
      { regex: /md5|sha1(?![\d])/gi, desc: 'Weak hash algorithm (use SHA-256+)' },
      { regex: /Math\.random\s*\(\s*\).*password|token|secret|key/gi, desc: 'Math.random for security (use crypto)' },
      { regex: /createCipher\(|createDecipher\(/g, desc: 'Deprecated crypto methods' },
    ]
  },
  ssrf: {
    name: 'Server-Side Request Forgery (A10:2021)',
    patterns: [
      { regex: /fetch\s*\(\s*req\.(body|query|params)|axios.*req\.(body|query|params)/g, desc: 'URL from user input - potential SSRF' },
      { regex: /request\s*\(\s*\{[^}]*url:\s*req\./g, desc: 'URL from request - validate carefully' },
    ]
  }
};

// ============ Secret Patterns ============

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', regex: /[A-Za-z0-9/+=]{40}/g },
  { name: 'GitHub Token', regex: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,}/g },
  { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z-]+/g },
  { name: 'Private Key', regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Generic API Key', regex: /api[_-]?key['":\s]*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi },
  { name: 'Generic Secret', regex: /secret['":\s]*[=:]\s*['"][a-zA-Z0-9]{20,}['"]/gi },
  { name: 'JWT Token', regex: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g },
  { name: 'Anthropic API Key', regex: /sk-ant-[a-zA-Z0-9-]+/g },
  { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{48}/g },
  { name: 'Stripe Key', regex: /sk_live_[a-zA-Z0-9]{24,}/g },
  { name: 'Supabase Key', regex: /sbp_[a-zA-Z0-9]{40}/g },
];

// ============ Real Tool Integrations ============

async function runSemgrep(targetPath, config = 'auto') {
  const installed = await checkToolInstalled('semgrep');
  if (!installed) {
    return { error: 'Semgrep not installed. Run: brew install semgrep', fallback: true };
  }

  try {
    const { stdout } = await execAsync(
      `semgrep --config ${config} --json --quiet "${targetPath}"`,
      { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
    );

    const results = JSON.parse(stdout);
    return {
      tool: 'semgrep',
      findings: results.results?.map(r => ({
        rule: r.check_id,
        severity: r.extra?.severity || 'WARNING',
        message: r.extra?.message || r.check_id,
        file: r.path,
        line: r.start?.line,
        code: r.extra?.lines || ''
      })) || [],
      errors: results.errors || []
    };
  } catch (error) {
    // Semgrep exits non-zero when findings exist
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        return {
          tool: 'semgrep',
          findings: results.results?.map(r => ({
            rule: r.check_id,
            severity: r.extra?.severity || 'WARNING',
            message: r.extra?.message || r.check_id,
            file: r.path,
            line: r.start?.line,
            code: r.extra?.lines || ''
          })) || [],
          errors: results.errors || []
        };
      } catch {
        return { error: error.message };
      }
    }
    return { error: error.message };
  }
}

async function runGitleaks(targetPath) {
  const installed = await checkToolInstalled('gitleaks');
  if (!installed) {
    return { error: 'Gitleaks not installed. Run: brew install gitleaks', fallback: true };
  }

  try {
    const { stdout } = await execAsync(
      `gitleaks detect --source "${targetPath}" --report-format json --no-git --quiet`,
      { timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
    );

    if (!stdout.trim()) {
      return { tool: 'gitleaks', findings: [] };
    }

    const results = JSON.parse(stdout);
    return {
      tool: 'gitleaks',
      findings: results.map(r => ({
        type: r.RuleID,
        description: r.Description,
        file: r.File,
        line: r.StartLine,
        secret: r.Secret ? `${r.Secret.substring(0, 4)}****` : 'REDACTED',
        severity: 'CRITICAL'
      }))
    };
  } catch (error) {
    // Gitleaks exits 1 when leaks found
    if (error.stdout) {
      try {
        const results = JSON.parse(error.stdout);
        return {
          tool: 'gitleaks',
          findings: results.map(r => ({
            type: r.RuleID,
            description: r.Description,
            file: r.File,
            line: r.StartLine,
            secret: r.Secret ? `${r.Secret.substring(0, 4)}****` : 'REDACTED',
            severity: 'CRITICAL'
          }))
        };
      } catch {
        // No findings or parse error
        return { tool: 'gitleaks', findings: [] };
      }
    }
    return { tool: 'gitleaks', findings: [] };
  }
}

async function runFullScan(targetPath) {
  const results = {
    semgrep: null,
    gitleaks: null,
    regexFallback: null
  };

  // Run Semgrep
  results.semgrep = await runSemgrep(targetPath);

  // Run Gitleaks
  results.gitleaks = await runGitleaks(targetPath);

  // If tools not available, fallback to regex
  if (results.semgrep?.fallback || results.gitleaks?.fallback) {
    results.regexFallback = await scanDirectory(targetPath);
  }

  return results;
}

// ============ Core Functions ============

async function scanCode(code, filename = 'unknown') {
  const findings = [];
  const lines = code.split('\n');

  // Check each security pattern category
  for (const [category, { name, patterns }] of Object.entries(SECURITY_PATTERNS)) {
    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

      lines.forEach((line, index) => {
        regex.lastIndex = 0;
        if (regex.test(line)) {
          findings.push({
            category: name,
            severity: getSeverity(category),
            line: index + 1,
            code: line.trim().substring(0, 100),
            issue: pattern.desc,
            file: filename
          });
        }
      });
    }
  }

  return findings;
}

async function scanSecrets(code, filename = 'unknown') {
  const findings = [];
  const lines = code.split('\n');

  for (const { name, regex } of SECRET_PATTERNS) {
    lines.forEach((line, index) => {
      const pattern = new RegExp(regex.source, regex.flags);
      if (pattern.test(line)) {
        findings.push({
          type: name,
          severity: 'CRITICAL',
          line: index + 1,
          preview: maskSecret(line.trim()),
          file: filename
        });
      }
    });
  }

  return findings;
}

function maskSecret(line) {
  // Mask potential secrets in the preview
  return line.replace(/(['"])[^'"]{8,}(['"])/g, '$1****REDACTED****$2');
}

function getSeverity(category) {
  const severities = {
    injection: 'HIGH',
    authentication: 'CRITICAL',
    exposure: 'HIGH',
    xxe: 'MEDIUM',
    accessControl: 'HIGH',
    security_misconfiguration: 'MEDIUM',
    crypto: 'MEDIUM',
    ssrf: 'HIGH'
  };
  return severities[category] || 'MEDIUM';
}

async function runNpmAudit(projectPath) {
  try {
    const { stdout, stderr } = await execAsync('npm audit --json', {
      cwd: projectPath,
      timeout: 30000
    });

    const audit = JSON.parse(stdout);

    return {
      vulnerabilities: audit.metadata?.vulnerabilities || {},
      advisories: Object.values(audit.vulnerabilities || {}).map(v => ({
        name: v.name,
        severity: v.severity,
        title: v.via?.[0]?.title || 'Unknown',
        fixAvailable: v.fixAvailable
      }))
    };
  } catch (error) {
    // npm audit exits with non-zero if vulnerabilities found
    try {
      const audit = JSON.parse(error.stdout);
      return {
        vulnerabilities: audit.metadata?.vulnerabilities || {},
        advisories: Object.values(audit.vulnerabilities || {}).map(v => ({
          name: v.name,
          severity: v.severity,
          title: v.via?.[0]?.title || v.via?.[0] || 'Unknown',
          fixAvailable: v.fixAvailable
        }))
      };
    } catch {
      return { error: error.message };
    }
  }
}

async function scanDirectory(dirPath, extensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs']) {
  const allFindings = {
    security: [],
    secrets: []
  };

  async function scanRecursive(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip node_modules and hidden directories
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue;
        }
        await scanRecursive(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (extensions.includes(ext)) {
          try {
            const code = await fs.readFile(fullPath, 'utf-8');
            const relativePath = path.relative(dirPath, fullPath);

            const securityFindings = await scanCode(code, relativePath);
            const secretFindings = await scanSecrets(code, relativePath);

            allFindings.security.push(...securityFindings);
            allFindings.secrets.push(...secretFindings);
          } catch (error) {
            // Skip unreadable files
          }
        }
      }
    }
  }

  await scanRecursive(dirPath);
  return allFindings;
}

function generateSecurityReport(findings) {
  const { security, secrets } = findings;

  const bySeverity = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  security.forEach(f => {
    bySeverity[f.severity] = bySeverity[f.severity] || [];
    bySeverity[f.severity].push(f);
  });

  secrets.forEach(f => {
    bySeverity.CRITICAL.push(f);
  });

  let report = '# Security Scan Report\n\n';

  report += '## Summary\n';
  report += `- Critical: ${bySeverity.CRITICAL.length}\n`;
  report += `- High: ${bySeverity.HIGH.length}\n`;
  report += `- Medium: ${bySeverity.MEDIUM.length}\n`;
  report += `- Low: ${bySeverity.LOW.length}\n\n`;

  if (bySeverity.CRITICAL.length > 0) {
    report += '## 🚨 Critical Issues\n\n';
    bySeverity.CRITICAL.forEach(f => {
      report += `### ${f.file}:${f.line}\n`;
      report += `- **Issue**: ${f.issue || f.type}\n`;
      report += `- **Code**: \`${f.code || f.preview}\`\n\n`;
    });
  }

  if (bySeverity.HIGH.length > 0) {
    report += '## ⚠️ High Severity\n\n';
    bySeverity.HIGH.forEach(f => {
      report += `- **${f.file}:${f.line}** - ${f.issue} (${f.category})\n`;
    });
    report += '\n';
  }

  if (bySeverity.MEDIUM.length > 0) {
    report += '## 📋 Medium Severity\n\n';
    bySeverity.MEDIUM.forEach(f => {
      report += `- **${f.file}:${f.line}** - ${f.issue} (${f.category})\n`;
    });
    report += '\n';
  }

  return report;
}

// ============ Security Best Practices ============

const BEST_PRACTICES = {
  authentication: [
    'Use bcrypt or argon2 for password hashing (cost factor 10+)',
    'Implement rate limiting on login endpoints',
    'Use secure session management (httpOnly, secure, sameSite cookies)',
    'Implement MFA for sensitive operations',
    'Use short-lived JWTs with refresh token rotation'
  ],
  api: [
    'Validate all input on the server side',
    'Use parameterized queries for database access',
    'Implement proper CORS configuration',
    'Use HTTPS everywhere',
    'Add security headers (Helmet.js for Node)',
    'Rate limit API endpoints',
    'Log security events for monitoring'
  ],
  secrets: [
    'Never commit secrets to version control',
    'Use environment variables or secret managers',
    'Rotate secrets regularly',
    'Use .gitignore and .env.example patterns',
    'Consider using tools like git-secrets or pre-commit hooks'
  ],
  dependencies: [
    'Run npm audit / pip audit regularly',
    'Keep dependencies updated',
    'Use lockfiles (package-lock.json, pnpm-lock.yaml)',
    'Review new dependencies before adding',
    'Consider using Snyk or Dependabot'
  ],
  frontend: [
    'Sanitize user input before rendering',
    'Use Content Security Policy headers',
    'Avoid innerHTML, use textContent or frameworks',
    'Validate and sanitize file uploads',
    'Implement CSRF protection'
  ]
};

// ============ Tool Definitions ============

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'scan_code',
        description: 'Scan code for security vulnerabilities (OWASP top 10 patterns)',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to scan'
            },
            filename: {
              type: 'string',
              description: 'Optional filename for context'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'scan_secrets',
        description: 'Scan code for hardcoded secrets, API keys, tokens',
        inputSchema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to scan'
            },
            filename: {
              type: 'string',
              description: 'Optional filename for context'
            }
          },
          required: ['code']
        }
      },
      {
        name: 'scan_directory',
        description: 'Recursively scan a directory for security issues and secrets',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Directory path to scan'
            },
            extensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'File extensions to scan (default: .js, .ts, .jsx, .tsx, .mjs)'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'npm_audit',
        description: 'Run npm audit on a project to check for vulnerable dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: {
              type: 'string',
              description: 'Path to the npm project (containing package.json)'
            }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'security_checklist',
        description: 'Get a security best practices checklist for a specific area',
        inputSchema: {
          type: 'object',
          properties: {
            area: {
              type: 'string',
              enum: ['authentication', 'api', 'secrets', 'dependencies', 'frontend', 'all'],
              description: 'Security area to get checklist for'
            }
          },
          required: ['area']
        }
      },
      {
        name: 'explain_vulnerability',
        description: 'Explain a security vulnerability and how to fix it',
        inputSchema: {
          type: 'object',
          properties: {
            vulnerability: {
              type: 'string',
              description: 'The vulnerability type (e.g., "SQL injection", "XSS", "CSRF")'
            }
          },
          required: ['vulnerability']
        }
      },
      {
        name: 'semgrep_scan',
        description: 'Run Semgrep static analysis (catches logic bugs, security issues). More accurate than regex patterns.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to file or directory to scan'
            },
            config: {
              type: 'string',
              description: 'Semgrep config (default: "auto" for auto-detected rules, or "p/security-audit", "p/owasp-top-ten")',
              default: 'auto'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'gitleaks_scan',
        description: 'Run Gitleaks to detect hardcoded secrets (API keys, passwords, tokens). More accurate than regex.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to directory to scan'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'full_security_scan',
        description: 'Run ALL security tools (Semgrep + Gitleaks + regex fallback). Comprehensive pre-push check.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to directory to scan'
            }
          },
          required: ['path']
        }
      }
    ]
  };
});

// ============ Vulnerability Explanations ============

const VULNERABILITY_EXPLANATIONS = {
  'sql injection': {
    what: 'Attacker inserts malicious SQL through user input, manipulating database queries.',
    example: `// VULNERABLE\ndb.query("SELECT * FROM users WHERE id = " + userId);\n\n// SAFE\ndb.query("SELECT * FROM users WHERE id = ?", [userId]);`,
    fix: 'Use parameterized queries or prepared statements. Never concatenate user input into queries.',
    severity: 'CRITICAL'
  },
  'xss': {
    what: 'Cross-Site Scripting allows attackers to inject malicious scripts into web pages viewed by users.',
    example: `// VULNERABLE\nelement.innerHTML = userInput;\n\n// SAFE\nelement.textContent = userInput;\n// Or use a framework that auto-escapes`,
    fix: 'Sanitize all user input. Use textContent instead of innerHTML. Implement CSP headers.',
    severity: 'HIGH'
  },
  'csrf': {
    what: 'Cross-Site Request Forgery tricks users into performing unwanted actions on authenticated sites.',
    example: `// VULNERABLE - no CSRF token\napp.post('/transfer', (req, res) => {\n  transfer(req.body.to, req.body.amount);\n});\n\n// SAFE - with CSRF token\napp.post('/transfer', csrfProtection, (req, res) => {...});`,
    fix: 'Use CSRF tokens. Implement SameSite cookies. Verify Origin/Referer headers.',
    severity: 'HIGH'
  },
  'command injection': {
    what: 'Attacker injects OS commands through user input that gets executed on the server.',
    example: `// VULNERABLE\nexec("ls " + userInput);\n\n// SAFE\nexecFile("ls", [sanitizedInput]);`,
    fix: 'Avoid exec(). Use execFile() with arguments array. Validate and sanitize all input.',
    severity: 'CRITICAL'
  },
  'path traversal': {
    what: 'Attacker accesses files outside intended directory using ../ sequences.',
    example: `// VULNERABLE\nfs.readFile("/uploads/" + filename);\n\n// SAFE\nconst safePath = path.join("/uploads", path.basename(filename));`,
    fix: 'Use path.basename() to strip directory components. Validate paths are within allowed directory.',
    severity: 'HIGH'
  },
  'ssrf': {
    what: 'Server-Side Request Forgery tricks server into making requests to unintended locations.',
    example: `// VULNERABLE\nfetch(req.body.url);\n\n// SAFE\nconst parsed = new URL(req.body.url);\nif (ALLOWED_HOSTS.includes(parsed.host)) {...}`,
    fix: 'Whitelist allowed hosts/IPs. Block internal/private IP ranges. Validate URL schemes.',
    severity: 'HIGH'
  }
};

// ============ Tool Handlers ============

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'scan_code': {
        const findings = await scanCode(args.code, args.filename || 'input');
        if (findings.length === 0) {
          return {
            content: [{ type: 'text', text: '✅ No security issues detected in the provided code.' }]
          };
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(findings, null, 2) }]
        };
      }

      case 'scan_secrets': {
        const findings = await scanSecrets(args.code, args.filename || 'input');
        if (findings.length === 0) {
          return {
            content: [{ type: 'text', text: '✅ No secrets detected in the provided code.' }]
          };
        }
        return {
          content: [{ type: 'text', text: '🚨 SECRETS DETECTED:\n' + JSON.stringify(findings, null, 2) }]
        };
      }

      case 'scan_directory': {
        const findings = await scanDirectory(args.path, args.extensions);
        const report = generateSecurityReport(findings);
        return {
          content: [{ type: 'text', text: report }]
        };
      }

      case 'npm_audit': {
        const result = await runNpmAudit(args.projectPath);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      case 'security_checklist': {
        if (args.area === 'all') {
          return {
            content: [{ type: 'text', text: JSON.stringify(BEST_PRACTICES, null, 2) }]
          };
        }
        const checklist = BEST_PRACTICES[args.area];
        if (!checklist) {
          return {
            content: [{ type: 'text', text: `Unknown area. Available: ${Object.keys(BEST_PRACTICES).join(', ')}` }]
          };
        }
        return {
          content: [{ type: 'text', text: `## ${args.area.toUpperCase()} Security Checklist\n\n${checklist.map(item => `- [ ] ${item}`).join('\n')}` }]
        };
      }

      case 'explain_vulnerability': {
        const vuln = args.vulnerability.toLowerCase();
        const explanation = VULNERABILITY_EXPLANATIONS[vuln];

        if (!explanation) {
          const available = Object.keys(VULNERABILITY_EXPLANATIONS).join(', ');
          return {
            content: [{ type: 'text', text: `I have detailed explanations for: ${available}\n\nFor other vulnerabilities, I can still help - just ask!` }]
          };
        }

        const response = `
## ${args.vulnerability.toUpperCase()}

**Severity**: ${explanation.severity}

### What is it?
${explanation.what}

### Example
\`\`\`javascript
${explanation.example}
\`\`\`

### How to fix
${explanation.fix}
`;
        return {
          content: [{ type: 'text', text: response }]
        };
      }

      case 'semgrep_scan': {
        const result = await runSemgrep(args.path, args.config || 'auto');
        if (result.error && !result.fallback) {
          return {
            content: [{ type: 'text', text: `❌ Semgrep error: ${result.error}` }],
            isError: true
          };
        }
        if (result.fallback) {
          return {
            content: [{ type: 'text', text: `⚠️ ${result.error}\n\nFalling back to regex scan...` }]
          };
        }
        if (result.findings?.length === 0) {
          return {
            content: [{ type: 'text', text: '✅ Semgrep: No issues found!' }]
          };
        }
        return {
          content: [{ type: 'text', text: `🔍 Semgrep found ${result.findings.length} issue(s):\n\n${JSON.stringify(result.findings, null, 2)}` }]
        };
      }

      case 'gitleaks_scan': {
        const result = await runGitleaks(args.path);
        if (result.error && !result.fallback) {
          return {
            content: [{ type: 'text', text: `❌ Gitleaks error: ${result.error}` }],
            isError: true
          };
        }
        if (result.fallback) {
          return {
            content: [{ type: 'text', text: `⚠️ ${result.error}\n\nFalling back to regex scan...` }]
          };
        }
        if (result.findings?.length === 0) {
          return {
            content: [{ type: 'text', text: '✅ Gitleaks: No secrets detected!' }]
          };
        }
        return {
          content: [{ type: 'text', text: `🚨 Gitleaks found ${result.findings.length} secret(s):\n\n${JSON.stringify(result.findings, null, 2)}` }]
        };
      }

      case 'full_security_scan': {
        const results = await runFullScan(args.path);

        let report = '# Full Security Scan Report\n\n';

        // Semgrep results
        report += '## Semgrep (Static Analysis)\n';
        if (results.semgrep?.error) {
          report += `⚠️ ${results.semgrep.error}\n\n`;
        } else if (results.semgrep?.findings?.length === 0) {
          report += '✅ No issues found\n\n';
        } else if (results.semgrep?.findings) {
          report += `Found ${results.semgrep.findings.length} issue(s):\n`;
          results.semgrep.findings.forEach(f => {
            report += `- **${f.severity}** ${f.file}:${f.line} - ${f.message}\n`;
          });
          report += '\n';
        }

        // Gitleaks results
        report += '## Gitleaks (Secret Detection)\n';
        if (results.gitleaks?.error) {
          report += `⚠️ ${results.gitleaks.error}\n\n`;
        } else if (results.gitleaks?.findings?.length === 0) {
          report += '✅ No secrets detected\n\n';
        } else if (results.gitleaks?.findings) {
          report += `🚨 Found ${results.gitleaks.findings.length} secret(s):\n`;
          results.gitleaks.findings.forEach(f => {
            report += `- **${f.type}** ${f.file}:${f.line} - ${f.secret}\n`;
          });
          report += '\n';
        }

        // Regex fallback results
        if (results.regexFallback) {
          report += '## Regex Fallback Scan\n';
          const { security, secrets } = results.regexFallback;
          if (security.length === 0 && secrets.length === 0) {
            report += '✅ No issues found\n\n';
          } else {
            if (secrets.length > 0) {
              report += `🚨 Potential secrets: ${secrets.length}\n`;
            }
            if (security.length > 0) {
              report += `⚠️ Security patterns: ${security.length}\n`;
            }
          }
        }

        return {
          content: [{ type: 'text', text: report }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    };
  }
});

// ============ Start Server ============

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Security MCP server running');
}

main().catch(console.error);
