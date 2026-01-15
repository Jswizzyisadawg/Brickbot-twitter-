// === WEEKLY DIGEST GENERATOR ===
// Creates readable reports for Jace to stay in the loop
// Powered by LOADING--Brickthee's pattern analysis

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

class WeeklyDigest {
  constructor() {
    this.supabase = null;
    this.reportsDir = path.join(__dirname, '../reports');
  }

  async initialize() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    // Ensure reports directory exists
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }

    return true;
  }

  // Get date range for current week
  getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      start: weekStart,
      end: weekEnd,
      startISO: weekStart.toISOString(),
      endISO: weekEnd.toISOString()
    };
  }

  // Fetch all data for the week
  async fetchWeekData() {
    if (!this.supabase) return null;

    const { startISO, endISO } = this.getWeekRange();

    try {
      // Get brick_log entries
      const { data: logs } = await this.supabase
        .from('brick_log')
        .select('*')
        .gte('timestamp', startISO)
        .lte('timestamp', endISO)
        .order('timestamp', { ascending: false });

      // Get cycle logs
      const { data: cycles } = await this.supabase
        .from('cycle_log')
        .select('*')
        .gte('started_at', startISO)
        .lte('started_at', endISO);

      // Get patterns
      const { data: patterns } = await this.supabase
        .from('pattern_library')
        .select('*')
        .eq('active', true)
        .order('occurrence_count', { ascending: false })
        .limit(20);

      // Get pending forgetting items
      const { data: forgetting } = await this.supabase
        .from('forgetting_queue')
        .select('*')
        .eq('status', 'pending');

      // Get relationships
      const { data: relationships } = await this.supabase
        .from('relationships')
        .select('*')
        .order('last_interaction', { ascending: false })
        .limit(20);

      return { logs, cycles, patterns, forgetting, relationships };
    } catch (error) {
      console.error('Error fetching week data:', error.message);
      return null;
    }
  }

  // Calculate metrics from logs
  calculateMetrics(logs) {
    if (!logs || logs.length === 0) {
      return {
        total_interactions: 0,
        genuine_connections: 0,
        skip_rate: '0%',
        avg_alignment: 0,
        avg_authenticity: 0,
        actions_breakdown: {}
      };
    }

    const total = logs.length;
    const skips = logs.filter(l => l.brick_action === 'skip').length;
    const genuine = logs.filter(l =>
      l.outcome_led_to_conversation || l.integration_score > 0.7
    ).length;

    const alignmentSum = logs
      .filter(l => l.constitutional_alignment != null)
      .reduce((sum, l) => sum + l.constitutional_alignment, 0);
    const alignmentCount = logs.filter(l => l.constitutional_alignment != null).length;

    const authenticitySum = logs
      .filter(l => l.authenticity_score != null)
      .reduce((sum, l) => sum + l.authenticity_score, 0);
    const authenticityCount = logs.filter(l => l.authenticity_score != null).length;

    // Actions breakdown
    const actions = {};
    logs.forEach(l => {
      const action = l.brick_action || 'unknown';
      actions[action] = (actions[action] || 0) + 1;
    });

    return {
      total_interactions: total,
      genuine_connections: genuine,
      skip_rate: `${Math.round((skips / total) * 100)}%`,
      avg_alignment: alignmentCount > 0 ? Math.round((alignmentSum / alignmentCount) * 100) / 100 : 0,
      avg_authenticity: authenticityCount > 0 ? Math.round((authenticitySum / authenticityCount) * 100) / 100 : 0,
      actions_breakdown: actions
    };
  }

  // Analyze relationships
  analyzeRelationships(logs, relationships) {
    const userEngagement = {};

    // Count engagements per user from logs
    logs.forEach(l => {
      if (l.target_user) {
        if (!userEngagement[l.target_user]) {
          userEngagement[l.target_user] = {
            count: 0,
            total_alignment: 0,
            conversations: 0,
            last_seen: l.timestamp
          };
        }
        userEngagement[l.target_user].count++;
        userEngagement[l.target_user].total_alignment += l.constitutional_alignment || 0.5;
        if (l.outcome_led_to_conversation) {
          userEngagement[l.target_user].conversations++;
        }
      }
    });

    // Find strongest
    const strongest = Object.entries(userEngagement)
      .map(([user, data]) => ({
        user,
        vibe_score: data.count > 0 ? data.total_alignment / data.count : 0.5,
        interactions: data.count,
        conversations: data.conversations
      }))
      .sort((a, b) => b.vibe_score - a.vibe_score)
      .slice(0, 5);

    // Find growing (from relationships table)
    const growing = relationships
      ?.filter(r => r.vibe_score > 0.6)
      .slice(0, 5)
      .map(r => ({
        user: r.username,
        vibe_score: r.vibe_score,
        interactions: r.interaction_count
      })) || [];

    // Find cooling (no interaction in 7+ days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const cooling = relationships
      ?.filter(r => new Date(r.last_interaction) < sevenDaysAgo)
      .slice(0, 5)
      .map(r => ({
        user: r.username,
        days_since: Math.floor((Date.now() - new Date(r.last_interaction)) / (24 * 60 * 60 * 1000))
      })) || [];

    return { strongest, growing, cooling };
  }

  // Analyze patterns
  analyzePatterns(logs, patterns) {
    const whatsWorking = [];
    const whatsNot = [];

    // From pattern library
    patterns?.forEach(p => {
      if (p.pattern_type === 'resonance' || p.impact_score > 0.7) {
        whatsWorking.push(p.pattern_description || p.pattern_name);
      } else if (p.pattern_type === 'failure' || p.impact_score < 0.3) {
        whatsNot.push(p.pattern_description || p.pattern_name);
      }
    });

    // Analyze from logs
    const highScoreLogs = logs.filter(l => l.integration_score > 0.7);
    const lowScoreLogs = logs.filter(l => l.integration_score < 0.3);

    // Extract common themes from high-scoring interactions
    if (highScoreLogs.length > 0) {
      const triggers = highScoreLogs
        .map(l => l.curiosity_trigger)
        .filter(Boolean);
      if (triggers.length > 0) {
        whatsWorking.push(`Curiosity triggers: ${triggers.slice(0, 3).join(', ')}`);
      }
    }

    // Extract anti-patterns from low-scoring
    if (lowScoreLogs.length > 0) {
      whatsNot.push(`${lowScoreLogs.length} low-integration interactions this week`);
    }

    return { whatsWorking: [...new Set(whatsWorking)], whatsNot: [...new Set(whatsNot)] };
  }

  // Assess drift
  assessDrift(logs) {
    if (!logs || logs.length < 5) return 'unknown';

    const alignmentScores = logs
      .filter(l => l.constitutional_alignment != null)
      .map(l => l.constitutional_alignment);

    if (alignmentScores.length < 5) return 'unknown';

    const avg = alignmentScores.reduce((a, b) => a + b, 0) / alignmentScores.length;
    const lowCount = alignmentScores.filter(s => s < 0.5).length;
    const lowRate = lowCount / alignmentScores.length;

    if (avg < 0.5 || lowRate > 0.3) return 'high';
    if (avg < 0.7 || lowRate > 0.15) return 'medium';
    return 'low';
  }

  // Generate markdown report
  generateMarkdown(data, metrics, relationships, patterns, drift, forgetting) {
    const { start, end } = this.getWeekRange();
    const dateRange = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;

    let md = `# Brick Weekly Digest

## ${dateRange}

---

## Overview

| Metric | Value |
|--------|-------|
| Total Interactions | ${metrics.total_interactions} |
| Genuine Connections | ${metrics.genuine_connections} |
| Skip Rate | ${metrics.skip_rate} |
| Avg Alignment | ${metrics.avg_alignment} |
| Avg Authenticity | ${metrics.avg_authenticity} |
| Drift Level | **${drift.toUpperCase()}** |

### Actions Breakdown

`;

    Object.entries(metrics.actions_breakdown).forEach(([action, count]) => {
      md += `- ${action}: ${count}\n`;
    });

    md += `

---

## What's Working

`;
    patterns.whatsWorking.forEach(p => {
      md += `- ${p}\n`;
    });

    if (patterns.whatsWorking.length === 0) {
      md += `- *No clear patterns detected yet*\n`;
    }

    md += `

## What's Not Working

`;
    patterns.whatsNot.forEach(p => {
      md += `- ${p}\n`;
    });

    if (patterns.whatsNot.length === 0) {
      md += `- *No clear anti-patterns detected*\n`;
    }

    md += `

---

## Relationships

### Strongest Connections

`;
    relationships.strongest.forEach(r => {
      md += `- **@${r.user}** - Vibe: ${Math.round(r.vibe_score * 100)}%, ${r.interactions} interactions\n`;
    });

    if (relationships.strongest.length === 0) {
      md += `- *No strong connections this week*\n`;
    }

    md += `

### Growing

`;
    relationships.growing.forEach(r => {
      md += `- @${r.user} - Vibe: ${Math.round(r.vibe_score * 100)}%\n`;
    });

    if (relationships.growing.length === 0) {
      md += `- *No notable growth*\n`;
    }

    md += `

### Cooling Off

`;
    relationships.cooling.forEach(r => {
      md += `- @${r.user} - ${r.days_since} days since last interaction\n`;
    });

    if (relationships.cooling.length === 0) {
      md += `- *All relationships active*\n`;
    }

    md += `

---

## Forgetting Queue (Requires Your Approval)

`;

    if (forgetting && forgetting.length > 0) {
      forgetting.forEach(f => {
        md += `### Item: ${f.id}\n`;
        md += `- **Reason**: ${f.reason}\n`;
        md += `- **Type**: ${f.target_type}\n`;
        md += `- **Status**: ${f.status}\n\n`;
        md += `To approve forgetting, respond with: \`APPROVE_FORGET: ${f.id}\`\n\n`;
      });
    } else {
      md += `*Nothing flagged for forgetting this week*\n`;
    }

    md += `

---

## Drift Assessment

**Current Level: ${drift.toUpperCase()}**

`;

    if (drift === 'high') {
      md += `> **WARNING**: Brick may be drifting from its constitutional values. Review recent interactions and consider recalibration.\n`;
    } else if (drift === 'medium') {
      md += `> **NOTICE**: Some drift detected. Keep an eye on alignment scores.\n`;
    } else {
      md += `> Brick is operating within constitutional bounds.\n`;
    }

    md += `

---

## Recommendations

Based on this week's patterns, LOADING--Brickthee suggests:

1. Continue engaging with topics that showed high alignment
2. Review any flagged items in the forgetting queue
3. Consider reaching out to cooling relationships if they matter

---

*Report generated: ${new Date().toISOString()}*
*Powered by LOADING--Brickthee*
`;

    return md;
  }

  // Generate and save the digest
  async generate() {
    console.log('📊 Generating weekly digest...');

    const data = await this.fetchWeekData();

    if (!data) {
      console.error('Could not fetch data for digest');
      return null;
    }

    const metrics = this.calculateMetrics(data.logs || []);
    const relationships = this.analyzeRelationships(data.logs || [], data.relationships);
    const patterns = this.analyzePatterns(data.logs || [], data.patterns);
    const drift = this.assessDrift(data.logs);

    const markdown = this.generateMarkdown(
      data,
      metrics,
      relationships,
      patterns,
      drift,
      data.forgetting
    );

    // Save to file
    const { start } = this.getWeekRange();
    const filename = `weekly-digest-${start.toISOString().split('T')[0]}.md`;
    const filepath = path.join(this.reportsDir, filename);

    fs.writeFileSync(filepath, markdown);
    console.log(`📄 Digest saved to: ${filepath}`);

    // Also save to Supabase
    if (this.supabase) {
      try {
        await this.supabase
          .from('weekly_digests')
          .insert({
            week_start: start.toISOString().split('T')[0],
            week_end: this.getWeekRange().end.toISOString().split('T')[0],
            total_interactions: metrics.total_interactions,
            genuine_connections: metrics.genuine_connections,
            skip_rate: parseFloat(metrics.skip_rate) / 100,
            avg_alignment: metrics.avg_alignment,
            avg_authenticity: metrics.avg_authenticity,
            whats_working: patterns.whatsWorking,
            whats_not: patterns.whatsNot,
            strongest_relationships: relationships.strongest,
            growing_relationships: relationships.growing,
            cooling_relationships: relationships.cooling,
            drift_level: drift,
            proposed_forgetting: data.forgetting,
            report_markdown: markdown
          });
        console.log('📤 Digest saved to Supabase');
      } catch (error) {
        console.error('Error saving digest to Supabase:', error.message);
      }
    }

    return { filepath, markdown, metrics, drift };
  }

  // Process forgetting approval
  async approveForgetting(itemId) {
    if (!this.supabase) return false;

    try {
      // Get the item
      const { data: item } = await this.supabase
        .from('forgetting_queue')
        .select('*')
        .eq('id', itemId)
        .single();

      if (!item) {
        console.error('Forgetting item not found');
        return false;
      }

      // Archive the data before deleting
      const { data: target } = await this.supabase
        .from(item.target_type)
        .select('*')
        .eq('id', item.target_id)
        .single();

      // Update queue status and archive
      await this.supabase
        .from('forgetting_queue')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'jace',
          archived_data: target
        })
        .eq('id', itemId);

      // Update the brick_log memory tier
      if (item.target_type === 'brick_log') {
        await this.supabase
          .from('brick_log')
          .update({
            memory_tier: 'forgotten',
            reviewed_by_human: true
          })
          .eq('id', item.target_id);
      }

      // Execute the forgetting
      await this.supabase
        .from('forgetting_queue')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString()
        })
        .eq('id', itemId);

      console.log(`🗑️ Approved forgetting: ${itemId}`);
      return true;
    } catch (error) {
      console.error('Error approving forgetting:', error.message);
      return false;
    }
  }
}

// CLI runner
if (require.main === module) {
  const digest = new WeeklyDigest();
  digest.initialize().then(() => {
    digest.generate().then(result => {
      if (result) {
        console.log('\n=== DIGEST GENERATED ===\n');
        console.log(result.markdown);
      }
    });
  });
}

module.exports = { WeeklyDigest };
