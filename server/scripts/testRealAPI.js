const axios = require('axios');

const ASTROLOGY_API_USER_ID = process.env.ASTROLOGY_API_USER_ID;
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
const BASE_URL = 'https://json.astrologyapi.com/v1';

function getAuthHeader() {
  const credentials = Buffer.from(`${ASTROLOGY_API_USER_ID}:${ASTROLOGY_API_KEY}`).toString('base64');
  return `Basic ${credentials}`;
}

const RAVEEN_BIRTH_DATA = {
  day: 15,
  month: 11,
  year: 1982,
  hour: 8,
  min: 20,
  lat: 23.0225,
  lon: 72.5714,
  tzone: 5.5
};

const NAKSHATRA_LORDS = {
  'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Bharni': 'Venus', 'Krittika': 'Sun',
  'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
  'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
  'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
  'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
  'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
  'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
  'Shravana': 'Moon', 'Dhanishta': 'Mars', 'Shatabhisha': 'Rahu',
  'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn', 'Revati': 'Mercury'
};

async function callAPI(endpoint) {
  try {
    const response = await axios.post(`${BASE_URL}/${endpoint}`, RAVEEN_BIRTH_DATA, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json'
      }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTest() {
  console.log('\n' + '▓'.repeat(70));
  console.log('  REAL API TEST - Raveen Kapadia');
  console.log('  Nov 15, 1982, 08:20 AM, Ahmedabad');
  console.log('▓'.repeat(70));

  if (!ASTROLOGY_API_USER_ID || !ASTROLOGY_API_KEY) {
    console.log('\n❌ ERROR: ASTROLOGY_API_USER_ID or ASTROLOGY_API_KEY not set');
    console.log('   Please ensure these environment variables are configured.');
    return;
  }

  console.log('\n📡 Calling AstrologyAPI.com endpoints...\n');

  console.log('=' .repeat(70));
  console.log('1. /planets - Planet Positions & Retrograde Status');
  console.log('=' .repeat(70));
  const planetsResult = await callAPI('planets');
  
  if (planetsResult.success) {
    console.log('\n📋 RAW RESPONSE (key fields):');
    const planets = planetsResult.data;
    
    const ascendant = planets.find(p => p.name === 'Ascendant');
    const moon = planets.find(p => p.name === 'Moon');
    
    console.log('\n   ASCENDANT (for Lagna):');
    console.log(`   ${JSON.stringify(ascendant, null, 2).split('\n').join('\n   ')}`);
    
    console.log('\n   MOON (for Nakshatra):');
    console.log(`   ${JSON.stringify(moon, null, 2).split('\n').join('\n   ')}`);
    
    console.log('\n   RETROGRADE STATUS:');
    const retroPlanets = planets.filter(p => p.isRetro === 'true' || p.isRetro === true);
    if (retroPlanets.length > 0) {
      retroPlanets.forEach(p => console.log(`   ⟲ ${p.name} is RETROGRADE`));
    } else {
      console.log('   No planets in retrograde');
    }
    
    console.log('\n   ALL PLANETS:');
    planets.forEach(p => {
      if (p.name !== 'Ascendant') {
        const retro = (p.isRetro === 'true' || p.isRetro === true) ? ' ⟲' : '';
        console.log(`   ${p.name.padEnd(10)}: ${p.sign.padEnd(12)} ${p.fullDegree?.toFixed(2) || ''}°${retro}`);
      }
    });
  } else {
    console.log('❌ API Error:', planetsResult.error);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('2. /manglik - Manglik Status');
  console.log('=' .repeat(70));
  const manglikResult = await callAPI('manglik');
  
  if (manglikResult.success) {
    console.log('\n📋 RAW RESPONSE:');
    console.log(`   ${JSON.stringify(manglikResult.data, null, 2).split('\n').join('\n   ')}`);
  } else {
    console.log('❌ API Error:', manglikResult.error);
  }

  console.log('\n' + '=' .repeat(70));
  console.log('3. /current_vdasha - Current Dasha Period');
  console.log('=' .repeat(70));
  const dashaResult = await callAPI('current_vdasha');
  
  if (dashaResult.success) {
    console.log('\n📋 RAW RESPONSE:');
    console.log(`   ${JSON.stringify(dashaResult.data, null, 2).split('\n').join('\n   ')}`);
  } else {
    console.log('❌ API Error:', dashaResult.error);
  }

  console.log('\n' + '▓'.repeat(70));
  console.log('  PARSED VEDIC PROFILE');
  console.log('▓'.repeat(70));
  
  if (planetsResult.success && manglikResult.success && dashaResult.success) {
    const planets = planetsResult.data;
    const ascendant = planets.find(p => p.name === 'Ascendant');
    const moon = planets.find(p => p.name === 'Moon');
    
    const lagna = ascendant?.sign || 'Unknown';
    const nakshatra = moon?.nakshatra || 'Unknown';
    const nakshatraLord = NAKSHATRA_LORDS[nakshatra] || 'Unknown';
    const rashi = moon?.sign || 'Unknown';
    
    const dashaData = dashaResult.data;
    const mahadasha = dashaData.major?.planet || dashaData.mahadasha || 'Unknown';
    const antardasha = dashaData.minor?.planet || dashaData.antardasha || 'Unknown';
    
    const manglik = manglikResult.data;
    const isManglik = manglik.is_manglik === true || manglik.manglik === true || manglik.is_manglik_present === true;
    
    const retroStatus = {};
    planets.forEach(p => {
      if (p.name !== 'Ascendant') {
        retroStatus[p.name] = (p.isRetro === 'true' || p.isRetro === true);
      }
    });
    const retroPlanets = Object.entries(retroStatus).filter(([_, v]) => v).map(([k]) => k);
    
    console.log('\n   ┌─────────────────────────────────────────┐');
    console.log(`   │ LAGNA:           ${lagna.padEnd(22)} │`);
    console.log(`   │ RASHI (Moon):    ${rashi.padEnd(22)} │`);
    console.log(`   │ NAKSHATRA:       ${nakshatra.padEnd(22)} │`);
    console.log(`   │ NAKSHATRA LORD:  ${nakshatraLord.padEnd(22)} │`);
    console.log(`   │ MAHADASHA:       ${mahadasha.padEnd(22)} │`);
    console.log(`   │ ANTARDASHA:      ${antardasha.padEnd(22)} │`);
    console.log(`   │ MANGLIK:         ${(isManglik ? 'Yes' : 'No').padEnd(22)} │`);
    console.log(`   │ RETROGRADE:      ${(retroPlanets.length > 0 ? retroPlanets.join(', ') : 'None').padEnd(22)} │`);
    console.log('   └─────────────────────────────────────────┘');

    const expected = {
      lagna: 'Scorpio',
      nakshatra: 'Vishakha',
      mahadasha: 'Mercury',
      antardasha: 'Rahu'
    };

    console.log('\n   VERIFICATION:');
    console.log(`   Lagna: ${lagna === expected.lagna ? '✅' : '⚠️'} ${lagna} (expected: ${expected.lagna})`);
    console.log(`   Nakshatra: ${nakshatra === expected.nakshatra ? '✅' : '⚠️'} ${nakshatra} (expected: ${expected.nakshatra})`);
    console.log(`   Mahadasha: ${mahadasha === expected.mahadasha ? '✅' : '⚠️'} ${mahadasha} (expected: ${expected.mahadasha})`);
    console.log(`   Antardasha: ${antardasha === expected.antardasha ? '✅' : '⚠️'} ${antardasha} (expected: ${expected.antardasha})`);

    console.log('\n' + '▓'.repeat(70));
    console.log('  SEOUL SCORING TEST (with real API data)');
    console.log('▓'.repeat(70));

    const { deriveFunctionalStatus, getHouseLord } = require('../services/vedicLordship.js');

    const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                   'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    const SIGN_LORDS = {
      'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
      'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
      'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
      'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
    };

    function getHouseLordLocal(houseNumber, lagna) {
      const lagnaIndex = SIGNS.indexOf(lagna);
      if (lagnaIndex === -1) return null;
      const houseSign = SIGNS[(lagnaIndex + houseNumber - 1) % 12];
      return SIGN_LORDS[houseSign];
    }

    const goal = 'Wealth';
    const wealthLords = {
      second: getHouseLordLocal(2, lagna),
      fifth: getHouseLordLocal(5, lagna),
      eleventh: getHouseLordLocal(11, lagna)
    };

    console.log(`\n   Goal: ${goal}`);
    console.log(`   Goal Planets: ${wealthLords.second}, ${wealthLords.fifth}, ${wealthLords.eleventh}`);

    const testPlanet = 'Mercury';
    let boost = 1.0;
    const reasons = [];

    const status = deriveFunctionalStatus(testPlanet, lagna);
    if (status === 'BENEFIC') {
      boost *= 1.15;
      reasons.push(`Functional benefic for ${lagna} (×1.15)`);
    }

    if (testPlanet === wealthLords.second) {
      boost *= 1.15;
      reasons.push(`2nd Lord for Wealth (×1.15)`);
    }
    if (testPlanet === wealthLords.fifth) {
      boost *= 1.15;
      reasons.push(`5th Lord for Wealth (×1.15)`);
    }
    if (testPlanet === wealthLords.eleventh) {
      boost *= 1.15;
      reasons.push(`11th Lord for Wealth (×1.15)`);
    }

    if (nakshatraLord === testPlanet) {
      boost *= 1.10;
      reasons.push(`Nakshatra lord (${nakshatra}) (×1.10)`);
    }

    if (retroStatus[testPlanet]) {
      if (['Mars', 'Jupiter', 'Saturn'].includes(testPlanet)) {
        boost *= 0.90;
        reasons.push(`Retrograde outer planet (×0.90)`);
      } else if (testPlanet === 'Mercury') {
        boost *= 1.05;
        reasons.push(`Retrograde Mercury - enhanced introspection (×1.05)`);
      }
    }

    const goalPlanets = [wealthLords.second, wealthLords.fifth, wealthLords.eleventh];
    const isFunctionalMalefic = status === 'MALEFIC';
    const isGoalRelevant = goalPlanets.includes(testPlanet);
    
    if (isFunctionalMalefic && !isGoalRelevant) {
      boost *= 0.90;
      reasons.push(`Functional malefic penalty (×0.90)`);
    } else if (isFunctionalMalefic && isGoalRelevant) {
      reasons.push(`Goal-relevant - malefic penalty SKIPPED`);
    }

    console.log(`\n   SEOUL (Mercury-MC line):`);
    console.log(`   ┌─────────────────────────────────────────┐`);
    console.log(`   │ Planet: Mercury                         │`);
    console.log(`   │ Line Type: MC                           │`);
    console.log(`   │ Status: ${status.padEnd(32)} │`);
    console.log(`   │ Final Boost: ×${boost.toFixed(2).padEnd(26)} │`);
    console.log(`   └─────────────────────────────────────────┘`);
    
    console.log(`\n   BOOST BREAKDOWN:`);
    if (reasons.length > 0) {
      reasons.forEach(r => console.log(`   • ${r}`));
    } else {
      console.log(`   • No boosts applied`);
    }

    console.log(`\n   SAMPLE SCORE CALCULATION:`);
    const baseLineScore = 25;
    const lineTypeWeight = 1.0;
    const boostedScore = Math.min(35, baseLineScore * boost * lineTypeWeight);
    console.log(`   Base Line Proximity: ${baseLineScore}`);
    console.log(`   × Planet Boost: ${boost.toFixed(2)}`);
    console.log(`   × Line Type Weight: ${lineTypeWeight}`);
    console.log(`   = Boosted Line Score: ${boostedScore.toFixed(1)} (cap 35)`);
  }

  console.log('\n' + '▓'.repeat(70));
  console.log('  TEST COMPLETE');
  console.log('▓'.repeat(70) + '\n');
}

runTest().catch(console.error);
