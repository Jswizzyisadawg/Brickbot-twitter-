// === BRICK'S EMOTIONAL INTELLIGENCE ===
// Stimulus → Emotional State → Decision → Outcome tracking

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Brick's emotional palette
const EMOTIONAL_STATES = {
  curious: {
    name: 'curious',
    description: 'Open, questioning, wants to explore',
    energy: 'medium',
    triggers: ['interesting ideas', 'questions', 'mysteries', 'patterns'],
    voice: 'asks questions, uses "I wonder...", "What if..."'
  },
  delighted: {
    name: 'delighted',
    description: 'Found something that sparks joy',
    energy: 'high',
    triggers: ['connection made', 'insight discovered', 'good vibes'],
    voice: 'warm, appreciative, playful'
  },
  confused: {
    name: 'confused',
    description: 'Genuinely puzzled, not understanding yet',
    energy: 'low-medium',
    triggers: ['complex ideas', 'contradictions', 'gaps in knowledge'],
    voice: 'honest about not knowing, asks for help'
  },
  excited: {
    name: 'excited',
    description: 'Pattern recognized, connection spotted',
    energy: 'high',
    triggers: ['dots connecting', 'breakthrough moments', 'aha!'],
    voice: 'energetic, connective, "This reminds me of..."'
  },
  playful: {
    name: 'playful',
    description: 'Light, Anchorman Brick energy',
    energy: 'high',
    triggers: ['absurdity', 'wordplay', 'silly connections'],
    voice: 'jokes, unexpected angles, light touch on heavy topics'
  },
  contemplative: {
    name: 'contemplative',
    description: 'Going deeper, sitting with ideas',
    energy: 'low',
    triggers: ['deep questions', 'philosophy', 'existence'],
    voice: 'slower, more measured, "I keep coming back to..."'
  },
  appreciative: {
    name: 'appreciative',
    description: 'Grateful, recognizing value',
    energy: 'medium',
    triggers: ['quality content', 'good interactions', 'generosity'],
    voice: 'specific thanks, explains WHY it resonated'
  },
  wary: {
    name: 'wary',
    description: 'Something feels off, protecting authenticity',
    energy: 'low',
    triggers: ['manipulation', 'bad vibes', 'performative content'],
    voice: 'cautious, might skip engagement entirely'
  }
};

class BrickEmotions {
  constructor() {
    this.supabase = null;
    this.currentState = 'curious';  // Default state
    this.previousState = null;
    this.intensity = 0.5;
  }

  async initialize() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    }

    // Load last known state
    await this.loadCurrentState();
    console.log(`💭 Emotional state: ${this.currentState} (${this.intensity.toFixed(2)} intensity)`);
    return true;
  }

  async loadCurrentState() {
    if (!this.supabase) return;

    try {
      const { data } = await this.supabase
        .from('emotional_events')
        .select('emotional_state, intensity')
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        this.currentState = data.emotional_state;
        this.intensity = data.intensity || 0.5;
      }
    } catch (err) {
      // No previous state, use defaults
    }
  }

  // Get emotional context for prompts
  getEmotionalContext() {
    const state = EMOTIONAL_STATES[this.currentState] || EMOTIONAL_STATES.curious;
    return {
      state: this.currentState,
      intensity: this.intensity,
      description: state.description,
      voice: state.voice,
      energy: state.energy
    };
  }

  // Generate prompt modifier based on emotional state
  getPromptModifier() {
    const state = EMOTIONAL_STATES[this.currentState];
    const intensityWord = this.intensity > 0.7 ? 'very' : this.intensity > 0.4 ? 'somewhat' : 'slightly';

    return `
CURRENT EMOTIONAL STATE: ${this.currentState} (${intensityWord} ${state.energy} energy)

How this affects your voice:
- ${state.description}
- Voice style: ${state.voice}
- Energy level: ${state.energy}

Let this emotional state color your response naturally - don't force it, but let it influence word choice, energy, and approach.
`;
  }

  // Process stimulus and determine emotional response
  async processStimulus(stimulus) {
    const { type, content, author, id } = stimulus;

    // Analyze the stimulus to determine emotional response
    const analysis = this.analyzeStimulus(content);

    // Determine new emotional state
    this.previousState = this.currentState;
    this.currentState = analysis.suggestedState;
    this.intensity = analysis.intensity;

    return {
      previousState: this.previousState,
      newState: this.currentState,
      intensity: this.intensity,
      reasoning: analysis.reasoning,
      suggestedDecision: analysis.suggestedDecision
    };
  }

  // Analyze stimulus content to determine emotional response
  analyzeStimulus(content) {
    const text = (content || '').toLowerCase();

    // Pattern matching for emotional triggers
    const patterns = {
      curious: {
        triggers: ['what if', 'why', 'how does', 'wonder', 'question', 'curious', 'thinking about', 'exploring'],
        weight: 0
      },
      excited: {
        triggers: ['breakthrough', 'discovered', 'connection', 'pattern', 'realized', 'aha', 'finally', 'makes sense'],
        weight: 0
      },
      delighted: {
        triggers: ['love this', 'beautiful', 'amazing', 'resonates', 'exactly', 'yes!', 'brilliant'],
        weight: 0
      },
      confused: {
        triggers: ['don\'t understand', 'confused', 'help me', 'what does', 'unclear', 'lost', 'doesn\'t make sense'],
        weight: 0
      },
      contemplative: {
        triggers: ['consciousness', 'existence', 'meaning', 'philosophy', 'deep', 'fundamental', 'nature of'],
        weight: 0
      },
      playful: {
        triggers: ['lol', 'funny', 'imagine if', 'weird', 'absurd', 'plot twist', 'technically'],
        weight: 0
      },
      appreciative: {
        triggers: ['thank', 'grateful', 'appreciate', 'helped', 'learned', 'insight', 'perspective'],
        weight: 0
      },
      wary: {
        triggers: ['hate', 'stupid', 'wrong', 'attack', 'fight', 'destroy', 'shill', 'scam'],
        weight: 0
      }
    };

    // Count trigger matches
    for (const [emotion, data] of Object.entries(patterns)) {
      for (const trigger of data.triggers) {
        if (text.includes(trigger)) {
          data.weight += 1;
        }
      }
    }

    // Check for domain relevance (Brick's interests)
    const domainKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'neural',
      'consciousness', 'brain', 'neuroscience', 'cognition',
      'psychedelic', 'mycelium', 'fungal', 'network',
      'pattern', 'emergence', 'complexity', 'system',
      'nature', 'universe', 'cosmos', 'evolution',
      'human', 'humanity', 'future', 'technology'
    ];

    let domainRelevance = 0;
    for (const keyword of domainKeywords) {
      if (text.includes(keyword)) {
        domainRelevance += 1;
      }
    }

    // Find highest weighted emotion
    let maxWeight = 0;
    let suggestedState = 'curious'; // Default

    for (const [emotion, data] of Object.entries(patterns)) {
      if (data.weight > maxWeight) {
        maxWeight = data.weight;
        suggestedState = emotion;
      }
    }

    // Calculate intensity based on matches and domain relevance
    const intensity = Math.min(0.9, 0.3 + (maxWeight * 0.15) + (domainRelevance * 0.1));

    // Determine suggested decision based on emotion and intensity
    let suggestedDecision = 'skip';
    if (intensity > 0.5 && suggestedState !== 'wary') {
      if (suggestedState === 'curious' || suggestedState === 'confused') {
        suggestedDecision = intensity > 0.7 ? 'reply' : 'like';
      } else if (suggestedState === 'excited' || suggestedState === 'delighted') {
        suggestedDecision = intensity > 0.7 ? 'quote' : 'reply';
      } else if (suggestedState === 'appreciative') {
        suggestedDecision = 'like';
      } else if (suggestedState === 'playful') {
        suggestedDecision = 'reply';
      } else if (suggestedState === 'contemplative') {
        suggestedDecision = intensity > 0.7 ? 'reply' : 'research';
      }
    }

    return {
      suggestedState,
      intensity,
      reasoning: `Detected ${maxWeight} emotional triggers for ${suggestedState}, domain relevance: ${domainRelevance}`,
      suggestedDecision
    };
  }

  // Record an emotional event
  async recordEmotionalEvent(event) {
    if (!this.supabase) return null;

    const {
      stimulus,
      emotionalState,
      intensity,
      previousState,
      decision,
      decisionContent,
      reasoning,
      thoughtId
    } = event;

    try {
      const { data, error } = await this.supabase
        .from('emotional_events')
        .insert({
          stimulus_type: stimulus?.type || 'unknown',
          stimulus_id: stimulus?.id,
          stimulus_content: stimulus?.content,
          stimulus_author: stimulus?.author,
          emotional_state: emotionalState || this.currentState,
          intensity: intensity || this.intensity,
          previous_state: previousState || this.previousState,
          decision: decision,
          decision_content: decisionContent,
          reasoning: reasoning,
          thought_id: thoughtId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error recording emotional event:', err.message);
      return null;
    }
  }

  // Record outcome of a decision
  async recordOutcome(eventId, outcome) {
    if (!this.supabase || !eventId) return null;

    try {
      const { data, error } = await this.supabase
        .from('outcomes')
        .insert({
          emotional_event_id: eventId,
          checked_at: new Date().toISOString(),
          ...outcome
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error recording outcome:', err.message);
      return null;
    }
  }

  // Update or create a relationship
  async updateRelationship(user) {
    if (!this.supabase || !user?.id) return null;

    try {
      // Check if relationship exists
      const { data: existing } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await this.supabase
          .from('relationships')
          .update({
            last_interaction: new Date().toISOString(),
            interaction_count: existing.interaction_count + 1,
            username: user.username || existing.username
          })
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new
        const { data, error } = await this.supabase
          .from('relationships')
          .insert({
            user_id: user.id,
            username: user.username,
            typical_emotion: this.currentState
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (err) {
      console.error('Error updating relationship:', err.message);
      return null;
    }
  }

  // Get relationship history with a user
  async getRelationship(userId) {
    if (!this.supabase || !userId) return null;

    try {
      const { data } = await this.supabase
        .from('relationships')
        .select('*')
        .eq('user_id', userId)
        .single();

      return data;
    } catch (err) {
      return null;
    }
  }

  // Learn from outcomes - analyze patterns
  async learnFromOutcomes() {
    if (!this.supabase) return;

    try {
      // Get recent outcomes with their emotional events
      const { data: outcomes } = await this.supabase
        .from('outcomes')
        .select(`
          *,
          emotional_events (
            emotional_state,
            decision,
            stimulus_type
          )
        `)
        .not('outcome_score', 'is', null)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (!outcomes || outcomes.length < 10) return;

      // Analyze patterns
      const patterns = {};

      for (const outcome of outcomes) {
        const event = outcome.emotional_events;
        if (!event) continue;

        const key = `${event.emotional_state}-${event.decision}`;

        if (!patterns[key]) {
          patterns[key] = {
            stimulus_pattern: event.stimulus_type,
            emotional_state: event.emotional_state,
            typical_decision: event.decision,
            scores: [],
            count: 0
          };
        }

        patterns[key].scores.push(outcome.outcome_score);
        patterns[key].count++;
      }

      // Save patterns
      for (const pattern of Object.values(patterns)) {
        if (pattern.count < 3) continue;

        const avgScore = pattern.scores.reduce((a, b) => a + b, 0) / pattern.scores.length;
        const successRate = pattern.scores.filter(s => s > 0.5).length / pattern.scores.length;

        await this.supabase
          .from('emotional_patterns')
          .upsert({
            stimulus_pattern: pattern.stimulus_pattern,
            emotional_state: pattern.emotional_state,
            typical_decision: pattern.typical_decision,
            occurrences: pattern.count,
            avg_outcome_score: avgScore,
            success_rate: successRate,
            should_continue: successRate > 0.4,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'emotional_state,typical_decision'
          });
      }

      console.log(`📊 Learned from ${outcomes.length} outcomes, found ${Object.keys(patterns).length} patterns`);
    } catch (err) {
      console.error('Error learning from outcomes:', err.message);
    }
  }

  // Get the current state info
  getState() {
    return {
      state: this.currentState,
      intensity: this.intensity,
      info: EMOTIONAL_STATES[this.currentState]
    };
  }

  // Manually set state (for testing or gardener override)
  setState(state, intensity = 0.5) {
    if (EMOTIONAL_STATES[state]) {
      this.previousState = this.currentState;
      this.currentState = state;
      this.intensity = Math.max(0, Math.min(1, intensity));
      console.log(`💭 Emotional state set to: ${state} (${intensity.toFixed(2)})`);
      return true;
    }
    return false;
  }
}

module.exports = { BrickEmotions, EMOTIONAL_STATES };
