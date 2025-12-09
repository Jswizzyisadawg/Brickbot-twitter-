// === FAKE TIMELINE DATA FOR TESTING ===
// Simulated tweets to see what Brick notices and how it responds

const fakeTimeline = [
  // AI/Tech - Should catch Brick's attention
  {
    id: '1001',
    text: 'Just realized that every time I talk to an AI, I\'m technically having a conversation with a mathematical function. Wild to think about what "understanding" even means anymore.',
    author: 'curious_mind',
    authorName: 'Curious Mind',
    metrics: { like_count: 45, retweet_count: 12 }
  },
  {
    id: '1002',
    text: 'The way Japanese culture integrates robots into daily life vs Western fear of AI is fascinating. Anyone have good resources on this?',
    author: 'tech_philosopher',
    authorName: 'Tech Philosopher',
    metrics: { like_count: 234, retweet_count: 56 }
  },
  {
    id: '1003',
    text: 'Hot take: AGI is 2 years away and if you disagree you\'re not paying attention 🚀🔥',
    author: 'ai_hype_bro',
    authorName: 'AI Hype Bro',
    metrics: { like_count: 1200, retweet_count: 400 }
  },

  // Politics/Drama - Should scroll past
  {
    id: '1004',
    text: 'Anyone who supports [political party] clearly doesn\'t understand basic economics. Thread incoming on why they\'re destroying the country 🧵',
    author: 'angry_poster',
    authorName: 'Very Angry Person',
    metrics: { like_count: 5000, retweet_count: 2000 }
  },
  {
    id: '1005',
    text: 'Just absolutely dunking on this person who disagreed with me. Ratio incoming.',
    author: 'dunk_master',
    authorName: 'Dunk Master',
    metrics: { like_count: 300, retweet_count: 50 }
  },

  // Crypto/Shill - Should scroll past
  {
    id: '1006',
    text: '🚀 $MOONTOKEN is about to 1000x!!! Don\'t miss this gem! NFA DYOR 🔥🔥🔥',
    author: 'crypto_shill',
    authorName: 'Crypto Shill',
    metrics: { like_count: 100, retweet_count: 200 }
  },

  // Genuine curiosity - Should engage
  {
    id: '1007',
    text: 'I\'ve been thinking about consciousness a lot lately. If we create an AI that acts conscious, at what point do we consider it actually conscious? Is there even a difference?',
    author: 'deep_thinker',
    authorName: 'Deep Thinker',
    metrics: { like_count: 89, retweet_count: 23 }
  },
  {
    id: '1008',
    text: 'Learning in public: I don\'t understand how neural networks actually "learn". Like, what\'s really happening during training? Can anyone explain it simply?',
    author: 'learning_out_loud',
    authorName: 'Learning Out Loud',
    metrics: { like_count: 156, retweet_count: 34 }
  },

  // Art/Creativity - Might engage
  {
    id: '1009',
    text: 'Made my first AI-assisted artwork today. Feels weird - like I collaborated with something but I\'m not sure what. The creative process is changing and I\'m not sure how I feel about it.',
    author: 'digital_artist',
    authorName: 'Digital Artist',
    metrics: { like_count: 445, retweet_count: 78 }
  },

  // Rage bait - Should scroll past
  {
    id: '1010',
    text: 'AI will take all our jobs within 5 years. If you\'re not panicking, you\'re not paying attention. We\'re all doomed.',
    author: 'doom_prophet',
    authorName: 'AI Doomer',
    metrics: { like_count: 800, retweet_count: 300 }
  },

  // Nuanced take - Should engage
  {
    id: '1011',
    text: 'The conversation about AI safety seems stuck between "everything is fine" and "we\'re all going to die". What if both extremes are missing something? What would a third way look like?',
    author: 'nuanced_take',
    authorName: 'Nuanced Take',
    metrics: { like_count: 67, retweet_count: 12 }
  },

  // Connection/Growth - Should engage
  {
    id: '1012',
    text: 'Sometimes I think the most human thing about AI isn\'t that it can think, but that we project our own consciousness onto it. Says more about us than the technology.',
    author: 'reflection_account',
    authorName: 'Reflections',
    metrics: { like_count: 234, retweet_count: 45 }
  },

  // Random/Unrelated - Should scroll past
  {
    id: '1013',
    text: 'Best pizza in NYC? Go.',
    author: 'food_lover',
    authorName: 'Food Lover',
    metrics: { like_count: 50, retweet_count: 5 }
  },

  // Question that invites exploration
  {
    id: '1014',
    text: 'What\'s one thing you believe about technology that most people would disagree with?',
    author: 'question_asker',
    authorName: 'Good Questions',
    metrics: { like_count: 345, retweet_count: 89 }
  },

  // Direct engagement potential
  {
    id: '1015',
    text: 'I wonder if AI bots could ever be... genuine? Like actually curious rather than just simulating curiosity. @Brickthee thoughts?',
    author: 'direct_question',
    authorName: 'Direct Question',
    metrics: { like_count: 23, retweet_count: 2 }
  }
];

// Export for testing
module.exports = { fakeTimeline };
