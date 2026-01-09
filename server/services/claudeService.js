// ============================================
// SUMMITRA - Claude AI Interpretation Service (FULL VERSION)
// Generates interpretations for ALL API data
// ============================================

const Anthropic = require('@anthropic-ai/sdk');
const { trackExternalApiCall } = require('./apiTracker.js');

const getAnthropicClient = () => {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const originalCreate = client.messages.create.bind(client.messages);
  client.messages.create = async function(params) {
    const startTime = Date.now();
    try {
      const response = await originalCreate(params);
      const responseTime = Date.now() - startTime;
      trackExternalApiCall('/messages', 'POST', 200, responseTime, 'Claude');
      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      trackExternalApiCall('/messages', 'POST', error.status || 500, responseTime, 'Claude');
      throw error;
    }
  };
  
  return client;
};

// All 15 planets for interpretation
const ALL_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Chiron', 'Vertex', 'PartOfFortune'
];

const PLANET_SYMBOLS = {
  'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 'Mars': '♂',
  'Jupiter': '♃', 'Saturn': '♄', 'Uranus': '♅', 'Neptune': '♆', 'Pluto': '♇',
  'NorthNode': '☊', 'SouthNode': '☋', 'Chiron': '⚷', 'Vertex': 'Vx', 'PartOfFortune': '⊕'
};

const PLANET_MEANINGS = {
  'Sun': 'Identity, vitality, recognition, fame, leadership',
  'Moon': 'Emotions, home, comfort, intuition, nurturing',
  'Mercury': 'Communication, learning, business, networking',
  'Venus': 'Love, beauty, art, pleasure, relationships',
  'Mars': 'Energy, action, competition, courage, drive',
  'Jupiter': 'Luck, expansion, abundance, growth, opportunity',
  'Saturn': 'Discipline, career, structure, lessons, mastery',
  'Uranus': 'Innovation, change, freedom, technology, surprises',
  'Neptune': 'Spirituality, creativity, dreams, intuition, healing',
  'Pluto': 'Transformation, power, rebirth, depth, intensity',
  'NorthNode': 'Destiny, life purpose, growth direction',
  'SouthNode': 'Past life gifts, comfort zone, karma',
  'Chiron': 'Healing, teaching, wounds becoming wisdom',
  'Vertex': 'Fated encounters, destined meetings',
  'PartOfFortune': 'Prosperity, luck, material success'
};

const ZODIAC_SIGNS = [
  { name: 'Capricorn', symbol: '♑', start: [12, 22], end: [1, 19], element: 'Earth' },
  { name: 'Aquarius', symbol: '♒', start: [1, 20], end: [2, 18], element: 'Air' },
  { name: 'Pisces', symbol: '♓', start: [2, 19], end: [3, 20], element: 'Water' },
  { name: 'Aries', symbol: '♈', start: [3, 21], end: [4, 19], element: 'Fire' },
  { name: 'Taurus', symbol: '♉', start: [4, 20], end: [5, 20], element: 'Earth' },
  { name: 'Gemini', symbol: '♊', start: [5, 21], end: [6, 20], element: 'Air' },
  { name: 'Cancer', symbol: '♋', start: [6, 21], end: [7, 22], element: 'Water' },
  { name: 'Leo', symbol: '♌', start: [7, 23], end: [8, 22], element: 'Fire' },
  { name: 'Virgo', symbol: '♍', start: [8, 23], end: [9, 22], element: 'Earth' },
  { name: 'Libra', symbol: '♎', start: [9, 23], end: [10, 22], element: 'Air' },
  { name: 'Scorpio', symbol: '♏', start: [10, 23], end: [11, 21], element: 'Water' },
  { name: 'Sagittarius', symbol: '♐', start: [11, 22], end: [12, 21], element: 'Fire' }
];

function getZodiacSign(birthDate) {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  for (const sign of ZODIAC_SIGNS) {
    const [startMonth, startDay] = sign.start;
    const [endMonth, endDay] = sign.end;
    
    if (startMonth === 12 && endMonth === 1) {
      if ((month === 12 && day >= startDay) || (month === 1 && day <= endDay)) {
        return { ...sign, monthName: monthNames[month - 1] };
      }
    } else if ((month === startMonth && day >= startDay) || (month === endMonth && day <= endDay)) {
      return { ...sign, monthName: monthNames[month - 1] };
    }
  }
  return { name: 'Unknown', symbol: '?', element: 'Unknown', monthName: monthNames[month - 1] };
}

// ============================================
// INTERPRETATION GENERATORS
// ============================================

// Goal-specific focus areas for interpretations with score boosts
const GOAL_FOCUS = {
  'education': {
    theme: 'academic success, learning, and intellectual growth',
    keywords: 'studies, exams, research, knowledge, university, scholarship, teachers',
    planets: 'Mercury (communication & learning), Jupiter (wisdom & higher education)',
    scoreBoosts: {
      'Mercury-MC': 10,
      'Jupiter-MC': 10,
      'Mercury-AC': 8
    }
  },
  'career': {
    theme: 'professional success, job opportunities, and career advancement',
    keywords: 'promotion, leadership, business, income, recognition, achievements',
    planets: 'Sun (recognition & authority), Saturn (career & discipline), Mars (ambition & drive)',
    scoreBoosts: {
      'Sun-MC': 10,
      'Saturn-MC': 8,
      'Jupiter-MC': 8,
      'Mars-MC': 5
    }
  },
  'love': {
    theme: 'romantic relationships, finding a partner, and love life',
    keywords: 'soulmate, marriage, romance, connection, attraction, partnership',
    planets: 'Venus (love & beauty), Moon (emotions & nurturing), Neptune (spiritual connection)',
    scoreBoosts: {
      'Venus-AC': 10,
      'Venus-DC': 10,
      'Moon-AC': 8,
      'Moon-DC': 8
    }
  },
  'settlement': {
    theme: 'settling down, finding the right place to live, and overall life quality',
    keywords: 'home, comfort, community, stability, environment, opportunities',
    planets: 'Moon (home & comfort), Jupiter (luck & expansion), IC line (roots & foundation)',
    scoreBoosts: {
      'Moon-IC': 10,
      'Jupiter-IC': 8,
      'Venus-IC': 8
    }
  },
  'relocation': {
    theme: 'settling down, finding the right place to live, and overall life quality',
    keywords: 'home, comfort, community, stability, environment, opportunities',
    planets: 'Moon (home & comfort), Jupiter (luck & expansion), IC line (roots & foundation)',
    scoreBoosts: {
      'Moon-IC': 10,
      'Jupiter-IC': 8,
      'Venus-IC': 8
    }
  },
  'wealth': {
    theme: 'financial prosperity, abundance, and material success',
    keywords: 'money, investments, business, income, property, abundance, prosperity',
    planets: 'Jupiter (luck & expansion), Venus (money & luxury), Part of Fortune (prosperity)',
    scoreBoosts: {
      'Jupiter-MC': 10,
      'Sun-MC': 8,
      'Venus-MC': 8
    }
  },
  'complete': {
    theme: 'overall life success including career, love, wealth, and personal growth',
    keywords: 'holistic success, balance, all life areas, opportunities, potential',
    planets: 'All planetary influences for complete life transformation',
    scoreBoosts: {
      'Jupiter-MC': 5,
      'Venus-AC': 5,
      'Sun-MC': 5
    }
  }
};

/**
 * Apply goal-based score boost to a city based on its planetary lines
 * @param {number} baseScore - The original city score
 * @param {Array} lines - Array of planetary line strings (e.g., ['Jupiter-MC', 'Venus-AC'])
 * @param {string} goal - The selected goal (education, career, love, etc.)
 * @returns {number} - Adjusted score (capped at 100)
 */
function applyGoalScoreBoost(baseScore, lines, goal) {
  const goalInfo = GOAL_FOCUS[goal] || GOAL_FOCUS['complete'];
  const scoreBoosts = goalInfo.scoreBoosts || {};
  
  let totalBoost = 0;
  for (const line of lines) {
    if (scoreBoosts[line]) {
      totalBoost += scoreBoosts[line];
    }
  }
  
  const adjustedScore = baseScore + totalBoost;
  return Math.min(100, Math.max(0, adjustedScore));
}

/**
 * Generate quick, personalized city interpretation (2-3 sentences)
 * Optimized for test-report endpoint - fast and lightweight
 * NOW CUSTOMIZED based on user's selected goal
 */
async function generateQuickCityInterpretation(cityData, userData) {
  const anthropic = getAnthropicClient();
  const zodiac = getZodiacSign(userData.birthDate);
  const goal = userData.reportGoal || 'complete';
  const goalInfo = GOAL_FOCUS[goal] || GOAL_FOCUS['complete'];
  
  const cityName = cityData.name || cityData.city;
  const country = cityData.country || cityData.state || '';
  const lines = cityData.lines || [];
  const score = cityData.score || 50;
  const category = cityData.category || 'general';
  
  const lineDetails = lines.map(line => {
    const parts = line.split('-');
    const planet = parts[0];
    const angle = parts[1] || '';
    const meaning = PLANET_MEANINGS[planet] || '';
    return `${line} (${meaning})`;
  }).join(', ');
  
  const prompt = `You are an expert astrocartographer writing a brief, personalized interpretation.

USER: ${userData.name}
ZODIAC: ${zodiac.name} (${zodiac.symbol}) - ${zodiac.element} sign, born in ${zodiac.monthName}
BIRTH DATE: ${userData.birthDate}

CITY: ${cityName}, ${country}
POWER SCORE: ${score}%
CATEGORY: ${category}
ACTIVE PLANETARY LINES: ${lineDetails || lines.join(', ')}

USER'S GOAL: ${goal.toUpperCase()}
FOCUS ON: ${goalInfo.theme}
KEY ASPECTS: ${goalInfo.keywords}
RELEVANT PLANETS: ${goalInfo.planets}

Write exactly 2-3 warm, encouraging sentences that:
1. Start with "As a ${zodiac.name} born in ${zodiac.monthName}..."
2. Explain specifically how their planetary lines (${lines.join(', ')}) affect their ${goal.toUpperCase()} prospects in ${cityName}
3. Mention specific ${goal}-related opportunities or gifts that await them there

IMPORTANT: Focus the interpretation specifically on ${goalInfo.theme}. Be specific about how the planetary lines support their ${goal} goals. Keep it personal and uplifting. NO bullet points, NO paragraphs - just 2-3 flowing sentences.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    });
    return response.content[0].text;
  } catch (error) {
    console.error(`Error generating interpretation for ${cityName}:`, error.message);
    return generateFallbackInterpretation(cityData, zodiac, goal);
  }
}

function generateFallbackInterpretation(cityData, zodiac, goal = 'complete') {
  const cityName = cityData.name || cityData.city || 'this location';
  const country = cityData.country || cityData.state || '';
  const lines = cityData.lines || [];
  const goalInfo = GOAL_FOCUS[goal] || GOAL_FOCUS['complete'];
  
  const lineDescriptions = lines.map(line => {
    const parts = line.split('-');
    const planet = parts[0];
    const angle = parts[1] || 'line';
    const meaning = PLANET_MEANINGS[planet] || 'unique energies';
    return { line, planet, angle, meaning };
  });
  
  // Goal-specific text
  const goalText = {
    'education': 'academic excellence and intellectual growth',
    'career': 'professional success and career advancement',
    'love': 'romantic connections and finding your soulmate',
    'relocation': 'settling down and building a happy life',
    'wealth': 'financial prosperity and abundance',
    'complete': 'overall life success and transformation'
  };
  
  if (lineDescriptions.length >= 2) {
    return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lineDescriptions[0].line} line in ${cityName} activates ${lineDescriptions[0].meaning.toLowerCase()}, while your ${lineDescriptions[1].line} line enhances ${lineDescriptions[1].meaning.toLowerCase()}. Together, these planetary alignments create an exceptional environment for ${goalText[goal] || 'personal growth and transformation'}.`;
  } else if (lineDescriptions.length === 1) {
    return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lineDescriptions[0].line} line in ${cityName} powerfully activates ${lineDescriptions[0].meaning.toLowerCase()}. This location offers you wonderful opportunities for ${goalText[goal] || 'personal growth'} that resonate deeply with your ${zodiac.element} nature.`;
  }
  
  return `As a ${zodiac.name} born in ${zodiac.monthName}, ${cityName}${country ? ', ' + country : ''} offers you powerful cosmic alignments that support ${goalText[goal] || 'personal growth and success'}. This location holds special potential aligned with your ${zodiac.element} nature.`;
}

/**
 * Generate interpretations for multiple cities in batch - PARALLEL execution
 * Returns cities with AI-generated interpretations
 */
async function generateCityInterpretations(cities, userData) {
  console.log(`🤖 Generating AI interpretations for ${cities.length} cities in PARALLEL...`);
  
  const zodiac = getZodiacSign(userData.birthDate);
  const goal = userData.reportGoal || 'complete';
  console.log(`   🎯 Goal: ${goal.toUpperCase()}`);
  
  // Process all cities in parallel for speed
  const results = await Promise.allSettled(
    cities.map(async (city) => {
      try {
        const interpretation = await generateQuickCityInterpretation(city, userData);
        return {
          ...city,
          aiInterpretation: interpretation
        };
      } catch (error) {
        console.error(`   ❌ ${city.name || city.city}: Failed to generate interpretation`);
        return {
          ...city,
          aiInterpretation: generateFallbackInterpretation(city, zodiac, goal)
        };
      }
    })
  );
  
  // Extract successful results
  const interpretedCities = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`   ✅ ${cities[index].name || cities[index].city}: AI interpretation generated`);
      return result.value;
    } else {
      console.error(`   ❌ ${cities[index].name || cities[index].city}: Promise rejected`);
      return {
        ...cities[index],
        aiInterpretation: generateFallbackInterpretation(cities[index], zodiac, goal)
      };
    }
  });
  
  console.log(`   ✅ All ${interpretedCities.length} interpretations complete!`);
  return interpretedCities;
}

/**
 * Generate personalized introduction
 */
async function generateIntroduction(userData, natalChart) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer creating a premium, personalized report.

USER: ${userData.name}
BIRTH: ${userData.birth.date} at ${userData.birth.time}
PLACE: ${userData.birth.city}, ${userData.birth.country}

NATAL CHART DATA:
${JSON.stringify(natalChart, null, 2)}

Write a warm, personalized introduction (3-4 paragraphs) that:
1. Welcomes ${userData.name} by name
2. Explains astrocartography in simple terms
3. Highlights 3 key features of their birth chart
4. Explains what makes their chart unique
5. Sets expectations for this premium report

Tone: Warm, professional, empowering. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate interpretation for ALL planetary lines (15 planets × 4 angles)
 */
async function generateAllLineInterpretations(astroLines, lineMeanings) {
  const anthropic = getAnthropicClient();
  const interpretations = {};
  
  const lineTypes = ['MC', 'IC', 'AC', 'DC'];
  const lineDescriptions = {
    'AC': 'Ascendant (Rising) - Affects identity, appearance, how others see you',
    'DC': 'Descendant (Setting) - Affects relationships, partnerships, marriage',
    'MC': 'Midheaven (Career Peak) - Affects career, public image, achievements',
    'IC': 'Imum Coeli (Foundation) - Affects home, family, emotional roots'
  };

  for (const planet of ALL_PLANETS) {
    interpretations[planet] = {};
    
    for (const lineType of lineTypes) {
      const baseMeaning = lineMeanings?.[planet]?.[lineType] || PLANET_MEANINGS[planet] || '';
      
      const prompt = `You are an expert astrocartographer. Write interpretation for:

PLANET: ${planet} (${PLANET_SYMBOLS[planet]})
PLANET MEANING: ${PLANET_MEANINGS[planet]}
LINE TYPE: ${lineType}
LINE DESCRIPTION: ${lineDescriptions[lineType]}
BASE MEANING: ${baseMeaning}

Write 2 paragraphs explaining:
1. What happens when you live on your ${planet}-${lineType} line
2. Best activities, careers, and life areas for this line
3. One potential challenge and how to work with it

Be specific and practical. NO bullet points.`;

      try {
        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          messages: [{ role: 'user', content: prompt }]
        });
        interpretations[planet][lineType] = response.content[0].text;
      } catch (error) {
        console.error(`Error generating ${planet}-${lineType} interpretation`);
        interpretations[planet][lineType] = `Your ${planet}-${lineType} line activates ${PLANET_MEANINGS[planet]?.toLowerCase() || 'unique energies'} in locations where it passes.`;
      }
    }
  }
  
  return interpretations;
}

/**
 * Generate city analysis with astrodynes data
 */
async function generateCityAnalysis(cityData, userData, goal, astrodyneScore) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer writing a detailed city analysis.

USER: ${userData.name}
CITY: ${cityData.name || cityData.city}
GOAL: ${goal}
POWER SCORE: ${astrodyneScore || cityData.score || cityData.power_score || 'High'}/100

ACTIVE PLANETARY LINES:
${JSON.stringify(cityData.lines || cityData.active_lines || [], null, 2)}

FULL CITY DATA:
${JSON.stringify(cityData, null, 2)}

Write a compelling analysis (4 paragraphs):
1. Why ${cityData.name || cityData.city} is excellent for ${goal}
2. Which planetary lines are active and their specific effects
3. What ${userData.name} can expect living here (career, relationships, finances)
4. Best timing and practical advice for moving here

Make it personal, specific, and actionable. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate paran crossing interpretation (POWERFUL!)
 */
async function generateParanInterpretation(paranData) {
  const anthropic = getAnthropicClient();
  
  const location = paranData.location || paranData.city || paranData.name || 'Unknown';
  const lines = paranData.lines || paranData.crossing_lines || [];
  
  const prompt = `You are an expert astrocartographer explaining a RARE and POWERFUL paran crossing.

PARAN CROSSING LOCATION: ${location}
LINES CROSSING: ${lines.join(' × ') || JSON.stringify(paranData)}

A paran is where two planetary lines intersect - this MULTIPLIES their energies and creates a supercharged location.

Write 3 paragraphs explaining:
1. What makes this specific paran crossing extraordinary
2. The combined effect of these planetary energies intersecting
3. Who should consider living here and what they'll experience
4. How rare this combination is (be specific)

Make it exciting and memorable. This is the "WOW" section of the report. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate relocation chart interpretation
 */
async function generateRelocationChartInterpretation(relocationChart, originalChart, cityName, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrologer interpreting a RELOCATION CHART.

USER: ${userData.name}
RELOCATING TO: ${cityName}

ORIGINAL BIRTH CHART:
${JSON.stringify(originalChart, null, 2)}

RELOCATION CHART (how chart shifts in ${cityName}):
${JSON.stringify(relocationChart, null, 2)}

A relocation chart shows how your birth chart "re-activates" when you move. Planets shift houses, changing which life areas they influence.

Write 3-4 paragraphs explaining:
1. How ${userData.name}'s chart shifts when relocating to ${cityName}
2. Which planets move to more powerful houses
3. New strengths that activate in this location
4. How this compares to their birth location

Be specific about house changes. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate location comparison
 */
async function generateLocationComparison(comparisonData, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer comparing multiple cities.

USER: ${userData.name}

LOCATION COMPARISON DATA:
${JSON.stringify(comparisonData, null, 2)}

Write a detailed comparison (4-5 paragraphs):
1. Overview of the cities being compared
2. Which city is BEST overall for ${userData.name} and why
3. Which city is best for CAREER vs RELATIONSHIPS vs WEALTH
4. Trade-offs between each location
5. Clear recommendation based on different life priorities

Create a useful comparison that helps them decide. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate timing recommendations from transits
 */
async function generateTimingRecommendations(transits, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrologer providing relocation timing advice.

USER: ${userData.name}
CURRENT DATE: ${new Date().toISOString().split('T')[0]}

CURRENT TRANSITS:
${JSON.stringify(transits, null, 2)}

Write detailed timing recommendations (4 paragraphs):
1. Best 2-3 windows for relocation in the next 12 months (be specific: month/year)
2. Periods to AVOID relocating and why
3. Different timing for career moves vs relationship moves
4. How to use retrograde periods wisely

Be specific with dates. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate challenging locations section
 */
async function generateChallengingLocations(astroLines, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer discussing challenging locations.

USER: ${userData.name}

ASTROCARTOGRAPHY DATA:
${JSON.stringify(astroLines, null, 2)}

Write about challenging locations (3 paragraphs):
1. Which locations have Saturn, Pluto, or Chiron lines prominent
2. What challenges might arise (be honest but not scary)
3. How to approach these locations if necessary - growth perspective

Frame challenges as opportunities. Be compassionate. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate action plan
 */
async function generateActionPlan(allData, userData, reportType) {
  const anthropic = getAnthropicClient();
  
  const topIndia = allData.powerZones?.india?.slice(0, 3) || [];
  const topIntl = allData.powerZones?.international?.slice(0, 3) || [];
  
  const prompt = `You are an expert astrocartographer creating a personalized action plan.

USER: ${userData.name}
REPORT TYPE: ${reportType}

TOP INDIA CITIES: ${topIndia.map(c => c.name || c.city).join(', ') || 'N/A'}
TOP INTERNATIONAL: ${topIntl.map(c => c.name || c.city).join(', ') || 'N/A'}

BEST CITY OVERALL: ${allData.powerZones?.india?.[0]?.name || allData.powerZones?.international?.[0]?.name || 'Analyzed in report'}

Create a personalized action plan (5 paragraphs):
1. Summary: #1 recommended city and WHY
2. If CAREER is priority → specific recommendation
3. If LOVE/RELATIONSHIPS is priority → specific recommendation  
4. If WEALTH is priority → specific recommendation
5. ONE action ${userData.name} can take THIS WEEK + empowering closing

Make it actionable and personal. NO bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

// ============================================
// MAIN: Generate ALL Interpretations
// ============================================

async function generateAllInterpretations(astrologyData, userData, reportType) {
  console.log('\n' + '═'.repeat(60));
  console.log('🤖 GENERATING AI INTERPRETATIONS (Claude)');
  console.log('═'.repeat(60) + '\n');
  
  const interpretations = {
    introduction: '',
    lineInterpretations: {},
    cityAnalyses: {
      career: [],
      love: [],
      wealth: [],
      health: [],
      creativity: [],
      family: []
    },
    paranInterpretations: [],
    relocationChartInterpretation: '',
    locationComparison: '',
    challengingLocations: '',
    timingRecommendations: '',
    actionPlan: ''
  };

  try {
    // 1. Introduction
    console.log('📝 Generating introduction...');
    interpretations.introduction = await generateIntroduction(userData, astrologyData.natalChart);

    // 2. ALL planetary line interpretations (15 planets × 4 angles = 60!)
    console.log('📝 Generating planetary line interpretations (15 planets)...');
    interpretations.lineInterpretations = await generateAllLineInterpretations(
      astrologyData.astroLines,
      astrologyData.lineMeanings
    );

    // 3. City analyses by goal
    console.log('📝 Generating city analyses...');
    const goals = ['career', 'love', 'wealth', 'health', 'creativity', 'family'];
    
    for (const goal of goals) {
      const indiaCities = astrologyData.optimalLocations?.[goal]?.india || [];
      const intlCities = astrologyData.optimalLocations?.[goal]?.international || [];
      
      const cities = reportType === 'combo' 
        ? [...indiaCities.slice(0, 3), ...intlCities.slice(0, 3)]
        : reportType === 'india'
          ? indiaCities.slice(0, 5)
          : intlCities.slice(0, 5);
      
      for (const city of cities) {
        if (city) {
          // Find astrodyne score if available
          const astrodyneScore = astrologyData.astrodynes?.find(
            a => a.name === city.name || a.city === city.city
          )?.score;
          
          const analysis = await generateCityAnalysis(city, userData, goal, astrodyneScore);
          interpretations.cityAnalyses[goal].push({ city, analysis });
        }
      }
    }

    // 4. Paran interpretations
    console.log('📝 Generating paran crossing interpretations...');
    const parans = astrologyData.paranMap?.crossings || astrologyData.paranMap?.parans || [];
    for (const paran of (Array.isArray(parans) ? parans : []).slice(0, 5)) {
      const interpretation = await generateParanInterpretation(paran);
      interpretations.paranInterpretations.push({ paran, interpretation });
    }

    // 5. Relocation chart interpretation
    if (astrologyData.topCityRelocationChart && astrologyData.natalChart) {
      console.log('📝 Generating relocation chart interpretation...');
      const topCityName = astrologyData.powerZones?.india?.[0]?.name || 
                          astrologyData.powerZones?.international?.[0]?.name || 'Top City';
      interpretations.relocationChartInterpretation = await generateRelocationChartInterpretation(
        astrologyData.topCityRelocationChart,
        astrologyData.natalChart,
        topCityName,
        userData
      );
    }

    // 6. Location comparison
    if (astrologyData.locationComparison) {
      console.log('📝 Generating location comparison...');
      interpretations.locationComparison = await generateLocationComparison(
        astrologyData.locationComparison,
        userData
      );
    }

    // 7. Challenging locations
    console.log('📝 Generating challenging locations...');
    interpretations.challengingLocations = await generateChallengingLocations(
      astrologyData.astroLines,
      userData
    );

    // 8. Timing recommendations
    console.log('📝 Generating timing recommendations...');
    interpretations.timingRecommendations = await generateTimingRecommendations(
      astrologyData.transits,
      userData
    );

    // 9. Action plan
    console.log('📝 Generating action plan...');
    interpretations.actionPlan = await generateActionPlan(
      astrologyData,
      userData,
      reportType
    );

    console.log('\n✅ All interpretations generated!\n');
    return interpretations;

  } catch (error) {
    console.error('❌ Error generating interpretations:', error.message);
    throw error;
  }
}

module.exports = {
  generateIntroduction,
  generateAllLineInterpretations,
  generateCityAnalysis,
  generateParanInterpretation,
  generateRelocationChartInterpretation,
  generateLocationComparison,
  generateTimingRecommendations,
  generateActionPlan,
  generateChallengingLocations,
  generateAllInterpretations,
  generateQuickCityInterpretation,
  generateCityInterpretations,
  getZodiacSign,
  applyGoalScoreBoost,
  ALL_PLANETS,
  PLANET_SYMBOLS,
  PLANET_MEANINGS,
  ZODIAC_SIGNS,
  GOAL_FOCUS
};
