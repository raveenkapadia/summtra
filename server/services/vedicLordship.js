/**
 * VEDIC LORDSHIP SERVICE
 * Ssumitra Astrocartography - Lagna-Aware Scoring
 * 
 * Core functions for dynamic house lordship derivation.
 * Replaces ALL hardcoded benefic/malefic tables.
 * 
 * IMPLEMENTATION NOTE:
 * These functions work DYNAMICALLY for ANY user based on their unique Lagna.
 * Do NOT hardcode for specific examples.
 */

const SIGN_LORDS = {
  'Aries': 'Mars',
  'Taurus': 'Venus',
  'Gemini': 'Mercury',
  'Cancer': 'Moon',
  'Leo': 'Sun',
  'Virgo': 'Mercury',
  'Libra': 'Venus',
  'Scorpio': 'Mars',
  'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn',
  'Aquarius': 'Saturn',
  'Pisces': 'Jupiter'
};

const SIGNS_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const GOAL_HOUSES = {
  'career': [10, 6],
  'wealth': [2, 11, 5],
  'love': [7, 5],
  'health': [1, 6],
  'creativity': [5, 3],
  'family': [4, 2],
  'spiritual': [9, 12],
  'education': [4, 5, 9],
  'settlement': [4, 7, 12]
};

/**
 * Get the ruling planet (lord) of a zodiac sign
 * @param {string} sign - Zodiac sign name
 * @returns {string|null} - Planet name or null
 */
function getSignLord(sign) {
  if (!sign) return null;
  const normalized = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();
  return SIGN_LORDS[normalized] || null;
}

/**
 * Get the Lagna Lord (1st house lord) for a given Lagna
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {string|null} - Planet name or null
 */
function getLagnaLord(lagna) {
  return getSignLord(lagna);
}

/**
 * Get the sign occupying a specific house based on Lagna
 * @param {number} houseNumber - House number (1-12)
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {string|null} - Sign name or null
 */
function getHouseSign(houseNumber, lagna) {
  if (!lagna || houseNumber < 1 || houseNumber > 12) return null;
  
  const normalized = lagna.charAt(0).toUpperCase() + lagna.slice(1).toLowerCase();
  const lagnaIndex = SIGNS_ORDER.indexOf(normalized);
  if (lagnaIndex === -1) return null;
  
  const houseSignIndex = (lagnaIndex + houseNumber - 1) % 12;
  return SIGNS_ORDER[houseSignIndex];
}

/**
 * Get the lord of a specific house based on Lagna
 * @param {number} houseNumber - House number (1-12)
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {string|null} - Planet name or null
 */
function getHouseLord(houseNumber, lagna) {
  const houseSign = getHouseSign(houseNumber, lagna);
  return getSignLord(houseSign);
}

/**
 * Get all houses ruled by a planet for a given Lagna
 * @param {string} planet - Planet name
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {number[]} - Array of house numbers (1-12)
 */
function getHousesRuledBy(planet, lagna) {
  if (!planet || !lagna) return [];
  
  const houses = [];
  const normalizedPlanet = planet.charAt(0).toUpperCase() + planet.slice(1).toLowerCase();
  
  for (let h = 1; h <= 12; h++) {
    const lord = getHouseLord(h, lagna);
    if (lord === normalizedPlanet) {
      houses.push(h);
    }
  }
  
  return houses;
}

/**
 * Derive the functional status of a planet based on house lordships
 * 
 * Rules (in priority order):
 * 1. Lagna lord (1st house) is ALWAYS benefic
 * 2. Trikona lords (5, 9) are benefic
 * 3. Dusthana lords (6, 8, 12) are malefic UNLESS they also rule a trikona
 * 4. Kendra lords (4, 7, 10) are neutral (Kendradhipati dosha for natural benefics)
 * 5. Maraka lords (2, 11) are neutral
 * 
 * @param {string} planet - Planet name
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {string} - 'BENEFIC' | 'MALEFIC' | 'NEUTRAL'
 */
function deriveFunctionalStatus(planet, lagna) {
  if (!planet || !lagna) return 'NEUTRAL';
  
  const houses = getHousesRuledBy(planet, lagna);
  if (houses.length === 0) return 'NEUTRAL';
  
  const TRIKONA = [1, 5, 9];
  const DUSTHANA = [6, 8, 12];
  const KENDRA = [4, 7, 10];
  const MARAKA = [2, 11];
  
  const rulestrikona = houses.some(h => TRIKONA.includes(h));
  const rulesDusthana = houses.some(h => DUSTHANA.includes(h));
  const rulesKendra = houses.some(h => KENDRA.includes(h));
  const rulesMaraka = houses.some(h => MARAKA.includes(h));
  
  // Rule 1: Lagna lord is ALWAYS benefic
  if (houses.includes(1)) {
    return 'BENEFIC';
  }
  
  // Rule 2: Trikona lords (5, 9) are benefic
  // This overrides dusthana lordship (e.g., Saturn for Virgo rules 5th AND 6th)
  if (rulestrikona) {
    return 'BENEFIC';
  }
  
  // Rule 3: Dusthana lords are malefic (unless they rule trikona - already handled)
  if (rulesDusthana && !rulestrikona) {
    return 'MALEFIC';
  }
  
  // Rule 4: Kendra lords are neutral
  if (rulesKendra) {
    return 'NEUTRAL';
  }
  
  // Rule 5: Maraka lords are neutral
  if (rulesMaraka) {
    return 'NEUTRAL';
  }
  
  return 'NEUTRAL';
}

/**
 * Get the relevant planets for a life goal based on Lagna
 * Returns the lords of houses associated with that goal
 * 
 * @param {string} goal - Life goal (career, wealth, love, etc.)
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {string[]} - Array of planet names
 */
function getGoalPlanets(goal, lagna) {
  if (!goal || !lagna) return [];
  
  const normalizedGoal = goal.toLowerCase();
  const houses = GOAL_HOUSES[normalizedGoal];
  
  if (!houses) {
    console.warn(`Unknown goal: ${goal}. Using career houses as default.`);
    return getGoalPlanets('career', lagna);
  }
  
  const planets = new Set();
  for (const house of houses) {
    const lord = getHouseLord(house, lagna);
    if (lord) planets.add(lord);
  }
  
  return Array.from(planets);
}

/**
 * Check if a planet is a relevant house lord for a specific goal
 * 
 * @param {string} planet - Planet name
 * @param {string} goal - Life goal
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {boolean} - True if planet rules a goal-relevant house
 */
function isRelevantHouseLord(planet, goal, lagna) {
  if (!planet || !goal || !lagna) return false;
  
  const goalPlanets = getGoalPlanets(goal, lagna);
  const normalizedPlanet = planet.charAt(0).toUpperCase() + planet.slice(1).toLowerCase();
  
  return goalPlanets.includes(normalizedPlanet);
}

/**
 * Get complete lordship analysis for a planet
 * Useful for debugging and display
 * 
 * @param {string} planet - Planet name
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {object} - Complete analysis object
 */
function getPlanetAnalysis(planet, lagna) {
  const houses = getHousesRuledBy(planet, lagna);
  const status = deriveFunctionalStatus(planet, lagna);
  const lagnaLord = getLagnaLord(lagna);
  
  return {
    planet,
    lagna,
    lagnaLord,
    isLagnaLord: planet === lagnaLord,
    housesRuled: houses,
    houseTypes: houses.map(h => {
      if (h === 1) return `${h} (Lagna)`;
      if ([5, 9].includes(h)) return `${h} (Trikona)`;
      if ([4, 7, 10].includes(h)) return `${h} (Kendra)`;
      if ([6, 8, 12].includes(h)) return `${h} (Dusthana)`;
      if ([2, 11].includes(h)) return `${h} (Maraka)`;
      if (h === 3) return `${h} (Upachaya)`;
      return `${h}`;
    }),
    functionalStatus: status
  };
}

/**
 * Get all planet statuses for a Lagna (for debugging/display)
 * 
 * @param {string} lagna - Lagna/Ascendant sign
 * @returns {object[]} - Array of planet analysis objects
 */
function getAllPlanetStatuses(lagna) {
  const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
  
  return planets.map(planet => {
    const analysis = getPlanetAnalysis(planet, lagna);
    return {
      planet,
      houses: analysis.housesRuled.join(', ') || 'None (Rahu/Ketu)',
      status: analysis.functionalStatus,
      isLagnaLord: analysis.isLagnaLord
    };
  });
}

/**
 * Test function to verify all 12 Lagnas
 */
function testAllLagnas() {
  console.log('\n=== VEDIC LORDSHIP TEST: ALL 12 LAGNAS ===\n');
  
  for (const lagna of SIGNS_ORDER) {
    console.log(`\n--- ${lagna} Lagna ---`);
    const lagnaLord = getLagnaLord(lagna);
    console.log(`Lagna Lord: ${lagnaLord}`);
    
    const statuses = getAllPlanetStatuses(lagna);
    statuses.forEach(s => {
      const marker = s.isLagnaLord ? ' ★' : '';
      console.log(`  ${s.planet.padEnd(8)} Houses: ${(s.houses || '-').padEnd(6)} Status: ${s.status}${marker}`);
    });
  }
}

module.exports = {
  getSignLord,
  getLagnaLord,
  getHouseSign,
  getHouseLord,
  getHousesRuledBy,
  deriveFunctionalStatus,
  getGoalPlanets,
  isRelevantHouseLord,
  getPlanetAnalysis,
  getAllPlanetStatuses,
  testAllLagnas,
  SIGN_LORDS,
  SIGNS_ORDER,
  GOAL_HOUSES
};
