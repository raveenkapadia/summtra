// ============================================
// SUMMITRA - Claude AI Interpretation Service
// Generates personalized astrology interpretations
// ============================================

const Anthropic = require('@anthropic-ai/sdk');

const getAnthropicClient = () => {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
};

// ============================================
// INTERPRETATION GENERATORS
// ============================================

/**
 * Generate introduction and birth chart summary
 */
async function generateIntroduction(userData, natalChart) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert Vedic and Western astrologer creating a personalized astrocartography report.

USER DETAILS:
- Name: ${userData.name}
- Birth Date: ${userData.birth.date}
- Birth Time: ${userData.birth.time}
- Birth Place: ${userData.birth.city}, ${userData.birth.country}

NATAL CHART DATA:
${JSON.stringify(natalChart, null, 2)}

Write a warm, personalized introduction (2-3 paragraphs) that:
1. Welcomes them by name
2. Briefly explains what astrocartography is and why it matters
3. Highlights 2-3 key features of their birth chart (dominant planets, elements, etc.)
4. Sets expectations for what they'll discover in this report

Keep the tone warm, professional, and empowering. Avoid overly technical jargon.
Do NOT use bullet points - write in flowing paragraphs.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate interpretation for a single planetary line
 */
async function generateLineInterpretation(planet, lineType, baseMeaning) {
  const anthropic = getAnthropicClient();
  
  const lineDescriptions = {
    'AC': 'Ascendant - Where the planet was rising. Affects identity, appearance, first impressions.',
    'DC': 'Descendant - Where the planet was setting. Affects relationships, partnerships, marriage.',
    'MC': 'Midheaven - Highest point in sky. Affects career, public image, achievements.',
    'IC': 'Imum Coeli - Lowest point. Affects home, family, emotional foundations.'
  };
  
  const prompt = `You are an expert astrocartographer. Write a detailed interpretation for this planetary line:

PLANET: ${planet}
LINE TYPE: ${lineType} (${lineDescriptions[lineType] || lineType})
BASE MEANING: ${baseMeaning || 'Standard interpretation'}

Write 2-3 paragraphs explaining:
1. What this planetary energy represents
2. How it manifests when living near this line
3. Best activities/goals for locations on this line
4. Potential challenges to be aware of

Keep it practical and actionable. No bullet points - flowing prose only.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate detailed city analysis
 */
async function generateCityAnalysis(cityData, userData, goal) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer writing a personalized city analysis.

USER: ${userData.name}
CITY: ${cityData.name || cityData.city || 'Unknown City'}
GOAL CATEGORY: ${goal}
POWER SCORE: ${cityData.score || cityData.power_score || 'N/A'}/100

PLANETARY LINES ACTIVE IN THIS CITY:
${JSON.stringify(cityData.lines || cityData.active_lines || [], null, 2)}

CITY DATA:
${JSON.stringify(cityData, null, 2)}

Write a compelling analysis (3-4 paragraphs) that:
1. Explains why this city is favorable for ${goal}
2. Describes which planetary lines are active and what they bring
3. Gives specific, practical advice for thriving in this city
4. Mentions any considerations or timing factors

Make it personal and actionable. Reference the user by name once.
No bullet points - flowing paragraphs only.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate paran crossing interpretation
 */
async function generateParanInterpretation(paranData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer explaining a powerful paran crossing.

PARAN CROSSING DATA:
- Location: ${paranData.location || paranData.city || 'Unknown Location'}
- Lines Crossing: ${paranData.lines?.join(' × ') || JSON.stringify(paranData)}
- Combined Energy: ${paranData.combined_meaning || 'Multiple planetary energies converging'}

FULL DATA:
${JSON.stringify(paranData, null, 2)}

Write 2-3 paragraphs explaining:
1. What makes this paran crossing special (where 2+ lines intersect)
2. The combined energies and what they create together
3. Who would benefit most from this location
4. How rare/powerful this combination is

Make it exciting but grounded. No bullet points.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate timing recommendations based on transits
 */
async function generateTimingRecommendations(transits, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrologer providing relocation timing advice.

USER: ${userData.name}
CURRENT DATE: ${new Date().toISOString().split('T')[0]}

CURRENT TRANSITS:
${JSON.stringify(transits, null, 2)}

Write timing recommendations (3-4 paragraphs) covering:
1. The next 12 months - identify 2-3 favorable windows for relocation
2. Any periods to avoid or approach with caution
3. Specific months that are best for different types of moves (career vs personal)
4. General advice on using transits to time their move

Be specific with dates/months. No bullet points - flowing paragraphs.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate action plan and recommendations
 */
async function generateActionPlan(allData, userData, reportType) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer creating a personalized action plan.

USER: ${userData.name}
REPORT TYPE: ${reportType}

TOP POWER ZONES:
India: ${JSON.stringify(allData.powerZones?.india?.slice?.(0, 5) || [], null, 2)}
International: ${JSON.stringify(allData.powerZones?.international?.slice?.(0, 5) || [], null, 2)}

TOP CITIES BY GOAL:
Career: ${JSON.stringify(allData.optimalLocations?.career || {}, null, 2)}
Love: ${JSON.stringify(allData.optimalLocations?.love || {}, null, 2)}
Wealth: ${JSON.stringify(allData.optimalLocations?.wealth || {}, null, 2)}

Create a personalized action plan (4-5 paragraphs) that:
1. Summarizes their #1 recommended city overall and why
2. Gives priority-based recommendations (if career is priority → X, if love → Y)
3. Suggests a practical next step they can take THIS WEEK
4. Provides encouragement and reminds them that astrocartography is guidance, not destiny
5. Ends with an empowering closing message

Make it actionable and personal. No bullet points - flowing paragraphs.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

/**
 * Generate challenging locations section
 */
async function generateChallengingLocations(astroLines, userData) {
  const anthropic = getAnthropicClient();
  
  const prompt = `You are an expert astrocartographer explaining challenging planetary lines.

USER: ${userData.name}

ASTROCARTOGRAPHY LINES DATA:
${JSON.stringify(astroLines, null, 2)}

Identify locations where Saturn, Pluto, or other challenging planets are prominent.

Write 2-3 paragraphs that:
1. Explain which cities/regions have challenging planetary influences
2. Describe what challenges might arise (without being scary)
3. Offer a balanced perspective - challenges can lead to growth
4. Suggest how to approach these locations if they must go there

Be honest but compassionate. Frame challenges as growth opportunities.
No bullet points - flowing paragraphs only.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }]
  });

  return response.content[0].text;
}

// ============================================
// MAIN FUNCTION: Generate All Interpretations
// ============================================

/**
 * Generate all interpretations for the report
 */
async function generateAllInterpretations(astrologyData, userData, reportType) {
  console.log('\n🤖 Starting Claude AI interpretations...\n');
  
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
    challengingLocations: '',
    timingRecommendations: '',
    actionPlan: ''
  };

  try {
    // 1. Generate introduction
    console.log('📝 Generating introduction...');
    interpretations.introduction = await generateIntroduction(userData, astrologyData.natalChart);

    // 2. Generate line interpretations for major planets
    const majorPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const lineTypes = ['MC', 'AC', 'DC', 'IC'];
    
    console.log('📝 Generating planetary line interpretations...');
    for (const planet of majorPlanets) {
      interpretations.lineInterpretations[planet] = {};
      for (const lineType of lineTypes) {
        const baseMeaning = astrologyData.lineMeanings?.[planet]?.[lineType] || '';
        interpretations.lineInterpretations[planet][lineType] = 
          await generateLineInterpretation(planet, lineType, baseMeaning);
      }
    }

    // 3. Generate city analyses for each goal
    const goals = ['career', 'love', 'wealth', 'health', 'creativity', 'family'];
    console.log('📝 Generating city analyses...');
    
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
          const analysis = await generateCityAnalysis(city, userData, goal);
          interpretations.cityAnalyses[goal].push({
            city: city,
            analysis: analysis
          });
        }
      }
    }

    // 4. Generate paran interpretations
    console.log('📝 Generating paran crossing interpretations...');
    const parans = astrologyData.paranMap?.crossings || astrologyData.paranMap?.parans || [];
    for (const paran of (Array.isArray(parans) ? parans : []).slice(0, 5)) {
      const paranInterpretation = await generateParanInterpretation(paran);
      interpretations.paranInterpretations.push({
        paran: paran,
        interpretation: paranInterpretation
      });
    }

    // 5. Generate challenging locations section
    console.log('📝 Generating challenging locations...');
    interpretations.challengingLocations = await generateChallengingLocations(
      astrologyData.astroLines, 
      userData
    );

    // 6. Generate timing recommendations
    console.log('📝 Generating timing recommendations...');
    interpretations.timingRecommendations = await generateTimingRecommendations(
      astrologyData.transits,
      userData
    );

    // 7. Generate action plan
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
  generateLineInterpretation,
  generateCityAnalysis,
  generateParanInterpretation,
  generateTimingRecommendations,
  generateActionPlan,
  generateChallengingLocations,
  generateAllInterpretations
};
