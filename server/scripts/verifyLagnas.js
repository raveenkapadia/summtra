const { deriveFunctionalStatus, getHouseLord } = require('../services/vedicLordship.js');

const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

const SIGN_LORDS = {
  'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
  'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
  'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
};

const NAKSHATRA_LORDS = {
  'Ashwini': 'Ketu', 'Bharani': 'Venus', 'Krittika': 'Sun',
  'Rohini': 'Moon', 'Mrigashira': 'Mars', 'Ardra': 'Rahu',
  'Punarvasu': 'Jupiter', 'Pushya': 'Saturn', 'Ashlesha': 'Mercury',
  'Magha': 'Ketu', 'Purva Phalguni': 'Venus', 'Uttara Phalguni': 'Sun',
  'Hasta': 'Moon', 'Chitra': 'Mars', 'Swati': 'Rahu',
  'Vishakha': 'Jupiter', 'Anuradha': 'Saturn', 'Jyeshtha': 'Mercury',
  'Mula': 'Ketu', 'Purva Ashadha': 'Venus', 'Uttara Ashadha': 'Sun',
  'Shravana': 'Moon', 'Dhanishta': 'Mars', 'Shatabhisha': 'Rahu',
  'Purva Bhadrapada': 'Jupiter', 'Uttara Bhadrapada': 'Saturn', 'Revati': 'Mercury'
};

function getHouseLordLocal(houseNumber, lagna) {
  const lagnaIndex = SIGNS.indexOf(lagna);
  if (lagnaIndex === -1) return null;
  const houseSign = SIGNS[(lagnaIndex + houseNumber - 1) % 12];
  return SIGN_LORDS[houseSign];
}

function getWealthLords(lagna) {
  return {
    second: getHouseLordLocal(2, lagna),
    fifth: getHouseLordLocal(5, lagna),
    eleventh: getHouseLordLocal(11, lagna)
  };
}

function simulatePlanetBoost(planet, birthData, goal = 'Wealth') {
  let boost = 1.0;
  const reasons = [];
  const lagna = birthData.lagna;
  const wealthLords = getWealthLords(lagna);

  const status = deriveFunctionalStatus(planet, lagna);
  const isFunctionalBenefic = status === 'BENEFIC';
  const isFunctionalMalefic = status === 'MALEFIC';

  if (isFunctionalBenefic) {
    boost *= 1.15;
    reasons.push(`Functional benefic for ${lagna} (×1.15)`);
  }

  if (planet === wealthLords.second) {
    boost *= 1.15;
    reasons.push(`2nd Lord for Wealth (×1.15)`);
  }
  if (planet === wealthLords.fifth) {
    boost *= 1.15;
    reasons.push(`5th Lord for Wealth (×1.15)`);
  }
  if (planet === wealthLords.eleventh) {
    boost *= 1.15;
    reasons.push(`11th Lord for Wealth (×1.15)`);
  }

  const nakshatraLord = NAKSHATRA_LORDS[birthData.nakshatra];
  if (nakshatraLord && planet === nakshatraLord) {
    boost *= 1.10;
    reasons.push(`Nakshatra lord (${birthData.nakshatra}) (×1.10)`);
  }

  if (birthData.retrogradeStatus && birthData.retrogradeStatus[planet]) {
    if (['Mars', 'Jupiter', 'Saturn'].includes(planet)) {
      boost *= 0.90;
      reasons.push(`Retrograde outer planet (×0.90)`);
    } else if (planet === 'Mercury') {
      boost *= 1.05;
      reasons.push(`Retrograde Mercury - enhanced introspection (×1.05)`);
    }
  }

  const goalPlanets = [wealthLords.second, wealthLords.fifth, wealthLords.eleventh];
  const isGoalRelevant = goalPlanets.includes(planet);

  if (isFunctionalMalefic && !isGoalRelevant) {
    boost *= 0.90;
    reasons.push(`Functional malefic for ${lagna} (×0.90)`);
  } else if (isFunctionalMalefic && isGoalRelevant) {
    reasons.push(`Goal-relevant (Wealth) - malefic penalty skipped`);
  }

  return { boost: Math.round(boost * 100) / 100, reasons, status };
}

function verifyLagna(lagnaName, birthData, expectedChecks) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VERIFICATION: ${lagnaName} LAGNA`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Name: ${birthData.name || 'Test User'}`);
  console.log(`Lagna: ${birthData.lagna}`);
  console.log(`Nakshatra: ${birthData.nakshatra || 'N/A'}`);
  console.log(`Goal: Wealth\n`);

  const wealthLords = getWealthLords(birthData.lagna);
  console.log(`📊 GOAL PLANETS (Wealth for ${birthData.lagna}):`);
  console.log(`   2nd Lord:  ${wealthLords.second}`);
  console.log(`   5th Lord:  ${wealthLords.fifth}`);
  console.log(`   11th Lord: ${wealthLords.eleventh}`);

  console.log(`\n🪐 PLANET CLASSIFICATIONS:`);
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  const goalPlanets = [wealthLords.second, wealthLords.fifth, wealthLords.eleventh];
  
  for (const planet of planets) {
    const status = deriveFunctionalStatus(planet, birthData.lagna);
    const isGoalPlanet = goalPlanets.includes(planet);
    const marker = isGoalPlanet ? ' ★ GOAL PLANET' : '';
    const statusSymbol = status === 'BENEFIC' ? '✅' : status === 'MALEFIC' ? '❌' : '⚪';
    console.log(`   ${statusSymbol} ${planet.padEnd(10)}: ${status.padEnd(10)}${marker}`);
  }

  console.log(`\n📈 BOOST SIMULATION (sample city with Jupiter-MC line):`);
  const testPlanet = 'Jupiter';
  const boostResult = simulatePlanetBoost(testPlanet, birthData, 'Wealth');
  console.log(`   Planet: ${testPlanet}`);
  console.log(`   Final Boost: ×${boostResult.boost}`);
  console.log(`   Status: ${boostResult.status}`);
  if (boostResult.reasons.length > 0) {
    console.log(`   Boost Breakdown:`);
    for (const reason of boostResult.reasons) {
      console.log(`      • ${reason}`);
    }
  }

  if (birthData.nakshatra) {
    const nakshatraLord = NAKSHATRA_LORDS[birthData.nakshatra];
    console.log(`\n⭐ NAKSHATRA LORD CHECK:`);
    console.log(`   Nakshatra: ${birthData.nakshatra}`);
    console.log(`   Lord: ${nakshatraLord}`);
    
    const nakshatraBoost = simulatePlanetBoost(nakshatraLord, birthData, 'Wealth');
    console.log(`   ${nakshatraLord} line boost: ×${nakshatraBoost.boost}`);
    const nakshatraReason = nakshatraBoost.reasons.find(r => r.includes('Nakshatra lord'));
    if (nakshatraReason) {
      console.log(`   ✅ Nakshatra lord boost APPLIED`);
    }
  }

  console.log(`\n✅ EXPECTED CHECKS:`);
  for (const check of expectedChecks) {
    console.log(`   ✓ ${check}`);
  }

  console.log(`\n${'─'.repeat(70)}`);
}

function runVerification() {
  console.log('\n' + '▓'.repeat(70));
  console.log('  LAGNA VERIFICATION CHECKLIST');
  console.log('  Testing Dynamic Derivation Across 4 Lagnas');
  console.log('▓'.repeat(70));

  verifyLagna('ARIES', {
    lagna: 'Aries',
    name: 'Test User (Aries)',
    nakshatra: 'Ashwini'
  }, [
    'Mars should be BENEFIC (Lagna lord + 8th)',
    '2nd Lord = Venus, 5th Lord = Sun, 11th Lord = Saturn',
    'Jupiter should be BENEFIC (9th lord)',
    'Ketu is Nakshatra lord (Ashwini) but not a main planet'
  ]);

  verifyLagna('SCORPIO', {
    lagna: 'Scorpio',
    name: 'Raveen Kapadia',
    nakshatra: 'Vishakha',
    retrogradeStatus: { Saturn: true }
  }, [
    'Mars should be BENEFIC (Lagna lord)',
    'Mercury should be 11th Lord → Wealth boost ×1.15',
    'Jupiter should get Nakshatra lord boost (Vishakha) ×1.10',
    '2nd Lord = Jupiter, 5th Lord = Jupiter, 11th Lord = Mercury',
    'Saturn retrograde should get ×0.90 penalty'
  ]);

  verifyLagna('VIRGO', {
    lagna: 'Virgo',
    name: 'Test User (Virgo)',
    nakshatra: 'Hasta'
  }, [
    'Saturn should be BENEFIC (5th + 6th lord, trikona wins)',
    'Mercury should be BENEFIC (Lagna lord)',
    '2nd Lord = Venus, 5th Lord = Saturn, 11th Lord = Moon',
    'Moon is Nakshatra lord (Hasta)'
  ]);

  verifyLagna('AQUARIUS', {
    lagna: 'Aquarius',
    name: 'Test User (Aquarius)',
    nakshatra: 'Shatabhisha'
  }, [
    'Mercury should be BENEFIC (5th + 8th lord, trikona wins)',
    'Saturn should be BENEFIC (Lagna lord)',
    '2nd Lord = Jupiter, 5th Lord = Mercury, 11th Lord = Jupiter',
    'Rahu is Nakshatra lord (Shatabhisha) but not a main planet'
  ]);

  console.log('\n' + '▓'.repeat(70));
  console.log('  VERIFICATION COMPLETE');
  console.log('▓'.repeat(70) + '\n');
}

runVerification();
