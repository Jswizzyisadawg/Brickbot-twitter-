// === BRICK'S RESEARCH MODULE ===
// Web search, fact verification, and source grounding via Tavily

require('dotenv').config();
const axios = require('axios');

class BrickResearch {
  constructor() {
    this.apiKey = process.env.TAVILY_API_KEY;
    this.baseUrl = 'https://api.tavily.com';
  }

  async initialize() {
    if (!this.apiKey) {
      console.warn('Tavily API key not configured - research disabled');
      return false;
    }
    console.log('🔍 Brick research module initialized');
    return true;
  }

  // === MAIN SEARCH ===

  async search(query, options = {}) {
    if (!this.apiKey) {
      return { success: false, error: 'Research not configured' };
    }

    try {
      const response = await axios.post(`${this.baseUrl}/search`, {
        api_key: this.apiKey,
        query,
        search_depth: options.depth || 'basic', // 'basic' or 'advanced'
        include_answer: true,
        include_raw_content: false,
        max_results: options.maxResults || 5,
        include_domains: options.includeDomains || [],
        exclude_domains: options.excludeDomains || []
      });

      const results = response.data;

      return {
        success: true,
        query,
        answer: results.answer,
        sources: results.results?.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content,
          score: r.score
        })) || [],
        confidence: this.calculateConfidence(results),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Research error:', error.message);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }

  // === FACT VERIFICATION ===

  async verifyFact(claim) {
    // Search for the claim
    const results = await this.search(`fact check: ${claim}`, {
      depth: 'advanced',
      maxResults: 5
    });

    if (!results.success) {
      return {
        verified: false,
        confidence: 0,
        reason: 'Could not verify - research failed'
      };
    }

    // Analyze sources for agreement
    const analysis = await this.analyzeSourceAgreement(claim, results.sources);

    return {
      claim,
      verified: analysis.agreement > 0.6,
      confidence: analysis.agreement,
      supporting_sources: analysis.supportingSources,
      contradicting_sources: analysis.contradictingSources,
      summary: results.answer,
      recommendation: this.getVerificationRecommendation(analysis)
    };
  }

  analyzeSourceAgreement(claim, sources) {
    // Simple heuristic - in production you'd use NLP
    let supporting = [];
    let contradicting = [];

    const claimWords = claim.toLowerCase().split(' ').filter(w => w.length > 4);

    for (const source of sources) {
      const snippetLower = source.snippet.toLowerCase();
      const matchCount = claimWords.filter(w => snippetLower.includes(w)).length;
      const matchRatio = matchCount / claimWords.length;

      // Check for negation words near matches
      const hasNegation = /\b(not|never|false|incorrect|wrong|myth|debunk)\b/i.test(source.snippet);

      if (matchRatio > 0.3) {
        if (hasNegation) {
          contradicting.push(source);
        } else {
          supporting.push(source);
        }
      }
    }

    const total = supporting.length + contradicting.length;
    const agreement = total > 0 ? supporting.length / total : 0.5;

    return {
      agreement,
      supportingSources: supporting,
      contradictingSources: contradicting
    };
  }

  getVerificationRecommendation(analysis) {
    if (analysis.agreement > 0.8) {
      return 'Likely true - multiple sources agree';
    } else if (analysis.agreement > 0.6) {
      return 'Possibly true - some support, express uncertainty';
    } else if (analysis.agreement > 0.4) {
      return 'Uncertain - sources mixed, avoid stating as fact';
    } else {
      return 'Likely false or contested - do not state as fact';
    }
  }

  // === TOPIC RESEARCH ===

  async researchTopic(topic, depth = 'basic') {
    const queries = [
      topic,
      `${topic} latest developments`,
      `${topic} different perspectives`
    ];

    const allResults = [];

    for (const query of queries) {
      const result = await this.search(query, { depth });
      if (result.success) {
        allResults.push(result);
      }
      // Small delay between searches
      await new Promise(r => setTimeout(r, 500));
    }

    // Deduplicate sources
    const seenUrls = new Set();
    const uniqueSources = [];

    for (const result of allResults) {
      for (const source of result.sources) {
        if (!seenUrls.has(source.url)) {
          seenUrls.add(source.url);
          uniqueSources.push(source);
        }
      }
    }

    return {
      topic,
      summary: allResults[0]?.answer || 'Could not generate summary',
      sources: uniqueSources,
      sourceCount: uniqueSources.length,
      confidence: this.calculateOverallConfidence(allResults),
      queries: queries,
      timestamp: new Date().toISOString()
    };
  }

  // === CONFIDENCE CALCULATIONS ===

  calculateConfidence(results) {
    if (!results.results || results.results.length === 0) {
      return 0;
    }

    // Factors: number of sources, quality scores, answer presence
    const sourceCount = Math.min(results.results.length / 5, 1); // Max at 5 sources
    const avgScore = results.results.reduce((a, b) => a + (b.score || 0.5), 0) / results.results.length;
    const hasAnswer = results.answer ? 0.2 : 0;

    return Math.round((sourceCount * 0.4 + avgScore * 0.4 + hasAnswer) * 100) / 100;
  }

  calculateOverallConfidence(allResults) {
    if (allResults.length === 0) return 0;
    const avg = allResults.reduce((a, b) => a + b.confidence, 0) / allResults.length;
    return Math.round(avg * 100) / 100;
  }

  // === FORMATTED OUTPUT FOR BRICK ===

  formatForBrick(researchResult) {
    if (!researchResult.success && researchResult.error) {
      return `Research failed: ${researchResult.error}`;
    }

    let output = `**Research: ${researchResult.query || researchResult.topic}**\n\n`;
    output += `Summary: ${researchResult.summary || researchResult.answer}\n\n`;
    output += `Confidence: ${Math.round(researchResult.confidence * 100)}%\n\n`;

    if (researchResult.sources && researchResult.sources.length > 0) {
      output += `Sources (${researchResult.sources.length}):\n`;
      for (const source of researchResult.sources.slice(0, 3)) {
        output += `- ${source.title}: ${source.snippet?.substring(0, 100)}...\n`;
      }
    }

    return output;
  }

  // === QUICK HELPERS ===

  async quickSearch(query) {
    const result = await this.search(query, { depth: 'basic', maxResults: 3 });
    return {
      answer: result.answer,
      confidence: result.confidence,
      topSource: result.sources?.[0]
    };
  }

  async shouldResearch(topic, sparkLevel) {
    // Decide if this topic warrants deep research
    // High spark + complex topic = research
    if (sparkLevel >= 7) {
      const complexityIndicators = [
        'how', 'why', 'research', 'study', 'evidence',
        'history', 'future', 'compared', 'versus', 'debate'
      ];

      const topicLower = topic.toLowerCase();
      const isComplex = complexityIndicators.some(w => topicLower.includes(w));

      return isComplex || sparkLevel >= 9;
    }

    return false;
  }
}

module.exports = { BrickResearch };
