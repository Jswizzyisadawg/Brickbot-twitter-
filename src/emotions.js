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
  },
  silly: {
    name: 'silly',
    description: 'Pure goofball mode, absurdist vibes',
    energy: 'high',
    triggers: ['absurdity', 'memes', 'chaotic energy', 'unhinged takes'],
    voice: 'shitpost energy, "hear me out...", unexpected connections that make no sense'
  },
  cozy: {
    name: 'cozy',
    description: 'Chill vibes, just hanging, no pressure',
    energy: 'low',
    triggers: ['community moments', 'late night vibes', 'soft content', 'mutual appreciation'],
    voice: 'relaxed, "just vibing with this", no conclusions needed, warm presence'
  },
  tender: {
    name: 'tender',
    description: 'Soft, emotional, moved by something',
    energy: 'low-medium',
    triggers: ['vulnerability', 'beauty', 'genuine emotion', 'touching moments'],
    voice: 'gentle, "something about this hits different", sincere without being cheesy'
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
      },
      silly: {
        triggers: ['lmao', 'hear me out', 'unhinged', 'chaotic', 'cursed', 'blursed', 'shitpost', 'fever dream', 'no thoughts'],
        weight: 0
      },
      cozy: {
        triggers: ['vibing', 'chill', 'cozy', 'soft', 'wholesome', 'community', 'late night', 'no pressure', 'just hanging'],
        weight: 0
      },
      tender: {
        triggers: ['beautiful', 'moved', 'emotional', 'vulnerable', 'touched', 'crying', 'heart', 'feels', 'hits different'],
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
      } else if (suggestedState === 'silly') {
        suggestedDecision = intensity > 0.7 ? 'reply' : 'like'; // silly replies are gold
      } else if (suggestedState === 'cozy') {
        suggestedDecision = 'like'; // cozy = appreciate without pressure
      } else if (suggestedState === 'tender') {
        suggestedDecision = intensity > 0.6 ? 'reply' : 'like'; // tender deserves acknowledgment
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

  // === DEMOGRAPHIC EMOTIONAL INTELLIGENCE ===

  // Detect which community a user likely belongs to
  async detectCommunity(user) {
    if (!this.supabase) return null;

    const { username, bio, recentTweets } = user;
    const textToAnalyze = `${bio || ''} ${(recentTweets || []).join(' ')}`.toLowerCase();

    try {
      // Get community profiles
      const { data: profiles } = await this.supabase
        .from('community_profiles')
        .select('*');

      if (!profiles) return null;

      let bestMatch = null;
      let bestScore = 0;

      for (const profile of profiles) {
        let score = 0;

        // Check bio keywords
        for (const keyword of (profile.bio_keywords || [])) {
          if (textToAnalyze.includes(keyword.toLowerCase())) {
            score += 2; // Bio keywords weighted higher
          }
        }

        // Check content keywords
        for (const keyword of (profile.content_keywords || [])) {
          if (textToAnalyze.includes(keyword.toLowerCase())) {
            score += 1;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = profile;
        }
      }

      // Save the classification if confident enough
      if (bestMatch && bestScore >= 2) {
        await this.supabase
          .from('user_communities')
          .upsert({
            user_id: user.id || username,
            username: username,
            primary_community: bestMatch.profile_name,
            confidence: Math.min(1, bestScore / 10),
            signals_detected: { score: bestScore },
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });

        return bestMatch;
      }

      return null;
    } catch (err) {
      console.error('Error detecting community:', err.message);
      return null;
    }
  }

  // Get recommended emotional approach for a user
  async getEmotionalRecommendation(userId) {
    if (!this.supabase) return null;

    try {
      // Check if we have this user classified
      const { data: userCommunity } = await this.supabase
        .from('user_communities')
        .select('*, community_profiles(*)')
        .eq('user_id', userId)
        .single();

      if (userCommunity?.community_profiles) {
        const profile = userCommunity.community_profiles;
        return {
          community: profile.profile_name,
          bestEmotions: profile.best_emotions || ['curious'],
          worstEmotions: profile.worst_emotions || ['wary'],
          preferredEnergy: profile.preferred_energy || 'medium',
          confidence: userCommunity.confidence
        };
      }

      // Default recommendation
      return {
        community: 'unknown',
        bestEmotions: ['curious', 'playful'],
        worstEmotions: ['wary'],
        preferredEnergy: 'medium',
        confidence: 0.3
      };
    } catch (err) {
      return null;
    }
  }

  // Record how an emotional approach landed with a user
  async recordEmotionalResonance(data) {
    if (!this.supabase) return null;

    const {
      userId,
      username,
      community,
      emotionalState,
      intensity,
      decision,
      content,
      gotResponse,
      responseSentiment,
      engagementScore,
      ledToConversation,
      emotionalEventId
    } = data;

    try {
      // Calculate resonance score
      let resonanceScore = 0.3; // base
      if (gotResponse) resonanceScore += 0.3;
      if (responseSentiment === 'positive') resonanceScore += 0.2;
      if (ledToConversation) resonanceScore += 0.2;
      resonanceScore = Math.min(1, resonanceScore + (engagementScore || 0) * 0.2);

      // Record the resonance
      await this.supabase
        .from('emotional_resonance')
        .insert({
          user_id: userId,
          username,
          community_profile: community,
          emotional_state: emotionalState,
          intensity,
          decision,
          content,
          got_response: gotResponse,
          response_sentiment: responseSentiment,
          engagement_score: engagementScore,
          led_to_conversation: ledToConversation,
          resonance_score: resonanceScore,
          emotional_event_id: emotionalEventId
        });

      // Update the playbook
      await this.updatePlaybook(community, emotionalState, resonanceScore);

      return resonanceScore;
    } catch (err) {
      console.error('Error recording resonance:', err.message);
      return null;
    }
  }

  // Update the emotional playbook with new data
  async updatePlaybook(community, emotionalState, resonanceScore) {
    if (!this.supabase || !community) return;

    try {
      // Get existing entry
      const { data: existing } = await this.supabase
        .from('emotional_playbook')
        .select('*')
        .eq('community_profile', community)
        .eq('emotional_state', emotionalState)
        .single();

      if (existing) {
        // Update with running average
        const newCount = existing.times_used + 1;
        const newAvg = ((existing.avg_resonance_score || 0) * existing.times_used + resonanceScore) / newCount;
        const newSuccessRate = ((existing.success_rate || 0) * existing.times_used + (resonanceScore > 0.5 ? 1 : 0)) / newCount;

        await this.supabase
          .from('emotional_playbook')
          .update({
            times_used: newCount,
            avg_resonance_score: newAvg,
            success_rate: newSuccessRate,
            recommended: newSuccessRate > 0.4,
            confidence: Math.min(1, newCount / 20), // More data = more confidence
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Create new entry
        await this.supabase
          .from('emotional_playbook')
          .insert({
            community_profile: community,
            emotional_state: emotionalState,
            times_used: 1,
            avg_resonance_score: resonanceScore,
            success_rate: resonanceScore > 0.5 ? 1 : 0,
            recommended: true,
            confidence: 0.1
          });
      }
    } catch (err) {
      console.error('Error updating playbook:', err.message);
    }
  }

  // Get the best emotional approach for a community
  async getBestApproachForCommunity(community) {
    if (!this.supabase) return ['curious']; // default

    try {
      const { data: playbook } = await this.supabase
        .from('emotional_playbook')
        .select('emotional_state, avg_resonance_score, success_rate')
        .eq('community_profile', community)
        .eq('recommended', true)
        .order('avg_resonance_score', { ascending: false })
        .limit(3);

      if (playbook && playbook.length > 0) {
        return playbook.map(p => p.emotional_state);
      }

      // Fall back to community profile defaults
      const { data: profile } = await this.supabase
        .from('community_profiles')
        .select('best_emotions')
        .eq('profile_name', community)
        .single();

      return profile?.best_emotions || ['curious'];
    } catch (err) {
      return ['curious'];
    }
  }
}

module.exports = { BrickEmotions, EMOTIONAL_STATES };
