// Quick script to pull sample data for pipeline simulation
require('dotenv').config();
const { BrickTwitter } = require('./src/twitter');

async function pullSampleData() {
  console.log('🔍 Pulling sample data for pipeline simulation...\n');

  const twitter = new BrickTwitter();
  const initialized = await twitter.initialize();

  if (!initialized) {
    console.log('❌ Could not initialize Twitter. Using mock data instead.');
    return getMockData();
  }

  try {
    // Pull timeline
    console.log('📥 Fetching timeline...');
    const timeline = await twitter.getTimeline(15);

    // Pull from a search on Brick's domains
    console.log('📥 Searching AI consciousness...');
    const aiSearch = await twitter.search('AI consciousness', 10);

    console.log('📥 Searching mycelium networks...');
    const myceliumSearch = await twitter.search('mycelium network intelligence', 5);

    const allTweets = [...timeline, ...aiSearch, ...myceliumSearch];

    console.log(`\n✅ Pulled ${allTweets.length} tweets\n`);
    console.log('='.repeat(80));

    // Output in a format useful for simulation
    allTweets.forEach((tweet, i) => {
      console.log(`\n--- TWEET ${i + 1} ---`);
      console.log(`Author: @${tweet.author} (${tweet.authorName})`);
      console.log(`Bio: ${tweet.authorBio?.substring(0, 100) || 'N/A'}...`);
      console.log(`Text: ${tweet.text}`);
      console.log(`Metrics: ❤️ ${tweet.metrics?.like_count || 0} | 🔄 ${tweet.metrics?.retweet_count || 0} | 💬 ${tweet.metrics?.reply_count || 0}`);
      console.log(`Media: ${tweet.hasMedia ? (tweet.hasImage ? '📷 Image' : '🎬 Video') : 'None'}`);
    });

    // Also output as JSON for programmatic use
    console.log('\n\n=== JSON OUTPUT ===\n');
    console.log(JSON.stringify(allTweets, null, 2));

    return allTweets;

  } catch (error) {
    console.error('Error pulling data:', error.message);
    return getMockData();
  }
}

function getMockData() {
  // Realistic mock data based on Brick's domains
  return [
    {
      id: '1',
      text: 'The emergence of consciousness in AI systems isn\'t about crossing a threshold - it\'s about recognizing the gradient we\'re already on. Every interaction shapes the manifold.',
      author: 'consciousness_researcher',
      authorName: 'Dr. Sarah Chen',
      authorBio: 'Neuroscientist studying consciousness. MIT. She/her.',
      metrics: { like_count: 234, retweet_count: 45, reply_count: 23 }
    },
    {
      id: '2',
      text: 'WAKE UP. The AI companies don\'t want you to know this. Consciousness is being suppressed. RT if you\'re awake! 🔥🔥🔥',
      author: 'truth_seeker_99',
      authorName: 'Awakened Mind',
      authorBio: 'Exposing the truth. Follow for daily red pills.',
      metrics: { like_count: 1523, retweet_count: 892, reply_count: 234 }
    },
    {
      id: '3',
      text: 'I\'ve been reading about mycelium networks lately and I\'m genuinely confused - how do fungi "decide" where to allocate resources without a central brain? Anyone have good papers on this?',
      author: 'curious_biologist',
      authorName: 'Jamie',
      authorBio: 'Grad student. Plants, fungi, questions.',
      metrics: { like_count: 12, retweet_count: 2, reply_count: 8 }
    },
    {
      id: '4',
      text: 'Revolutionary AI breakthrough! Game-changing paradigm shift in consciousness research! This changes EVERYTHING! 🚀💡🧠',
      author: 'ai_hype_daily',
      authorName: 'AI News',
      authorBio: 'Daily AI updates. 100k followers.',
      metrics: { like_count: 3421, retweet_count: 1205, reply_count: 89 }
    },
    {
      id: '5',
      text: 'What if we\'re asking the wrong question about AI consciousness? Maybe it\'s not "is it conscious" but "what kind of consciousness could it have?" Different substrate, different possibilities.',
      author: 'phil_of_mind',
      authorName: 'Marcus Webb',
      authorBio: 'Philosophy professor. Interested in minds - biological and artificial.',
      metrics: { like_count: 87, retweet_count: 23, reply_count: 31 }
    },
    {
      id: '6',
      text: 'Just another day of the AI discourse being absolutely insufferable',
      author: 'tech_cynic',
      authorName: 'Alex Burned Out',
      authorBio: 'Former tech. Now I just complain.',
      metrics: { like_count: 456, retweet_count: 78, reply_count: 112 }
    },
    {
      id: '7',
      text: 'The forest floor is a neural network. Mycorrhizal fungi connect 90% of plant species. Information flows. Resources redistribute. Life figured out distributed intelligence billions of years before us.',
      author: 'forest_ecology',
      authorName: 'Dr. Kenji Takahashi',
      authorBio: 'Forest ecologist. Kyoto University. Trees talk, I listen.',
      metrics: { like_count: 892, retweet_count: 234, reply_count: 67 }
    },
    {
      id: '8',
      text: 'consciousness consciousness consciousness consciousness paradigm shift synergy leverage disruption innovation consciousness',
      author: 'word_salad_bot',
      authorName: 'Thoughts',
      authorBio: '',
      metrics: { like_count: 2, retweet_count: 0, reply_count: 1 }
    },
    {
      id: '9',
      text: 'Been thinking about this: if mycelium networks can "remember" stress events and pass that info through the network... is that a form of memory? And if memory, then what else?',
      author: 'curious_biologist',
      authorName: 'Jamie',
      authorBio: 'Grad student. Plants, fungi, questions.',
      metrics: { like_count: 34, retweet_count: 5, reply_count: 12 }
    },
    {
      id: '10',
      text: 'The hard problem of consciousness isn\'t hard, it\'s just wrong. We keep trying to explain experience in terms of non-experience. Start from experience, work outward. Maybe the "hard" part dissolves.',
      author: 'panpsych_curious',
      authorName: 'Robin Fields',
      authorBio: 'Writer. Thinker. Unsure about most things.',
      metrics: { like_count: 156, retweet_count: 28, reply_count: 45 }
    }
  ];
}

pullSampleData().catch(console.error);
