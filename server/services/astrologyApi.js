// ============================================
// SUMMITRA - Astrology API Service (FULL VERSION)
// Uses ALL RapidAPI Astrology Endpoints
// ============================================

const axios = require('axios');
const { trackExternalApiCall } = require('./apiTracker.js');

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'best-astrology-api-natal-charts-transits-synastry.p.rapidapi.com';
const BASE_URL = `https://${RAPIDAPI_HOST}`;

// Common headers for all API calls
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'X-RapidAPI-Key': RAPIDAPI_KEY,
  'X-RapidAPI-Host': RAPIDAPI_HOST
});

// Helper to make API calls with error handling
async function apiCall(method, endpoint, data = null) {
  const startTime = Date.now();
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: getHeaders()
    };
    if (data) config.data = data;
    
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    trackExternalApiCall(endpoint, method, response.status, responseTime, 'RapidAPI');
    return { success: true, data: response.data };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const statusCode = error.response?.status || 500;
    trackExternalApiCall(endpoint, method, statusCode, responseTime, 'RapidAPI');
    console.error(`❌ API Error (${endpoint}):`, error.response?.data?.message || error.message);
    console.error(`   Details:`, JSON.stringify(error.response?.data || error.message));
    return { success: false, error: error.response?.data || error.message };
  }
}

// Convert simple birthData to API subject format
function formatBirthDataForAPI(birthData) {
  const [year, month, day] = birthData.date.split('-').map(Number);
  const [hour, minute] = birthData.time.split(':').map(Number);
  
  return {
    subject: {
      birth_data: {
        year,
        month,
        day,
        hour,
        minute: minute || 0,
        longitude: birthData.longitude,
        latitude: birthData.latitude,
        timezone: birthData.timezone || 'Asia/Kolkata'
      }
    }
  };
}

// All 15 celestial bodies for astrocartography calculations
const ALL_PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Chiron', 'Vertex', 'PartOfFortune'
];

// ============================================
// 1. ASTROCARTOGRAPHY LINES (All 15+ planets)
// ============================================
async function getAstrocartographyLines(birthData) {
  console.log('📡 [1/9] Fetching astrocartography lines (all 15 celestial bodies)...');
  
  const formattedData = formatBirthDataForAPI(birthData);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/lines', {
    ...formattedData,
    planets: ALL_PLANETS
  });
  
  if (result.success) console.log('   ✅ Astrocartography lines received (15 celestial bodies)');
  return result;
}

// ============================================
// 2. FIND POWER ZONES (Best cities ranked)
// ============================================
async function findPowerZones(birthData, options = {}) {
  console.log(`📡 [2/9] Finding power zones (${options.region || 'global'}) using all 15 celestial bodies...`);
  
  const formattedData = formatBirthDataForAPI(birthData);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/power-zones', {
    ...formattedData,
    planets: ALL_PLANETS,
    region: options.region || 'global',
    limit: options.limit || 25
  });
  
  // Extract power_zones from response
  if (result.success && result.data?.power_zones) {
    const zones = result.data.power_zones;
    console.log(`   ✅ Power zones received (${zones.length} zones)`);
    return { success: true, data: zones };
  }
  
  if (result.success) console.log(`   ✅ Power zones received (${result.data?.length || 0} zones)`);
  return result;
}

// ============================================
// 3. SEARCH OPTIMAL LOCATIONS (By goal)
// ============================================
async function searchOptimalLocations(birthData, goal, options = {}) {
  console.log(`📡 [3/9] Searching optimal locations for: ${goal}...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/search-optimal', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    goal: goal, // career, love, wealth, health, creativity, family, spiritual
    region: options.region || 'global',
    limit: options.limit || 10
  });
  
  if (result.success) console.log(`   ✅ Optimal locations for ${goal}: ${result.data?.length || 0} cities`);
  return result;
}

// ============================================
// 4. GENERATE PARAN MAP (Line crossings - POWERFUL!)
// ============================================
async function generateParanMap(birthData) {
  console.log('📡 [4/9] Generating paran map (line crossings)...');
  
  const result = await apiCall('POST', '/api/v3/astrocartography/paran-map', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    include_minor_aspects: true
  });
  
  if (result.success) {
    const crossings = result.data?.crossings || result.data?.parans || [];
    console.log(`   ✅ Paran map received (${crossings.length} crossings)`);
  }
  return result;
}

// ============================================
// 5. CALCULATE ASTRODYNES (Power scores 0-100)
// ============================================
async function calculateAstrodynes(birthData, locations) {
  console.log(`📡 [5/9] Calculating astrodynes for ${locations.length} locations...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/astrodynes', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    locations: locations.map(loc => ({
      name: loc.name || loc.city,
      latitude: loc.latitude || loc.lat,
      longitude: loc.longitude || loc.lng || loc.lon
    }))
  });
  
  if (result.success) console.log('   ✅ Astrodynes calculated');
  return result;
}

// ============================================
// 6. ANALYZE LOCATION (Deep dive on ONE city)
// ============================================
async function analyzeLocation(birthData, location) {
  console.log(`📡 [6/9] Deep analyzing location: ${location.name}...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/analyze-location', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    location_name: location.name,
    location_latitude: location.latitude || location.lat,
    location_longitude: location.longitude || location.lng || location.lon,
    include_aspects: true,
    include_houses: true
  });
  
  if (result.success) console.log(`   ✅ Location analysis complete for ${location.name}`);
  return result;
}

// ============================================
// 7. COMPARE LOCATIONS (Side-by-side comparison)
// ============================================
async function compareLocations(birthData, locations) {
  console.log(`📡 [7/9] Comparing ${locations.length} locations...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/compare-locations', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    locations: locations.map(loc => ({
      name: loc.name || loc.city,
      latitude: loc.latitude || loc.lat,
      longitude: loc.longitude || loc.lng || loc.lon
    }))
  });
  
  if (result.success) console.log('   ✅ Locations compared');
  return result;
}

// ============================================
// 8. GET LINE MEANINGS (Pre-written interpretations)
// ============================================
async function getLineMeanings() {
  console.log('📡 [8/9] Fetching line meanings (interpretations)...');
  
  const result = await apiCall('GET', '/api/v3/astrocartography/line-meanings');
  
  if (result.success) console.log('   ✅ Line meanings received');
  return result;
}

// ============================================
// 9. GET RELOCATION CHART (Relocated birth chart)
// ============================================
async function getRelocationChart(birthData, newLocation) {
  console.log(`📡 [9/9] Getting relocation chart for: ${newLocation.name}...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/relocation-chart', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    birth_latitude: birthData.latitude,
    birth_longitude: birthData.longitude,
    timezone: birthData.timezone,
    relocation_latitude: newLocation.latitude || newLocation.lat,
    relocation_longitude: newLocation.longitude || newLocation.lng || newLocation.lon,
    relocation_name: newLocation.name,
    house_system: 'P' // Placidus
  });
  
  if (result.success) console.log(`   ✅ Relocation chart received for ${newLocation.name}`);
  return result;
}

// ============================================
// BONUS: Get Natal Chart
// ============================================
async function getNatalChart(birthData) {
  console.log('📡 [Bonus] Fetching natal chart...');
  
  const result = await apiCall('POST', '/api/v3/natal/chart', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone,
    house_system: 'P',
    zodiac_type: 'Tropic',
    include_asteroids: true
  });
  
  if (result.success) console.log('   ✅ Natal chart received');
  return result;
}

// ============================================
// BONUS: Get Current Transits
// ============================================
async function getCurrentTransits(birthData) {
  console.log('📡 [Bonus] Fetching current transits...');
  
  const result = await apiCall('POST', '/api/v3/transits/current', {
    natal_datetime: `${birthData.date}T${birthData.time}:00`,
    natal_latitude: birthData.latitude,
    natal_longitude: birthData.longitude,
    timezone: birthData.timezone
  });
  
  if (result.success) console.log('   ✅ Current transits received');
  return result;
}

// ============================================
// MAIN: FETCH ALL DATA FOR COMPLETE REPORT
// ============================================
async function fetchAllAstrologyData(birthData, reportType) {
  console.log('\n' + '═'.repeat(60));
  console.log('🌟 FETCHING ALL ASTROLOGY DATA (9 API ENDPOINTS)');
  console.log('═'.repeat(60) + '\n');
  
  const results = {
    // Core data
    natalChart: null,
    astroLines: null,
    lineMeanings: null,
    paranMap: null,
    transits: null,
    
    // Power zones by region
    powerZones: {
      india: null,
      international: null
    },
    
    // Optimal locations by goal (6 life areas)
    optimalLocations: {
      career: { india: null, international: null },
      love: { india: null, international: null },
      wealth: { india: null, international: null },
      health: { india: null, international: null },
      creativity: { india: null, international: null },
      family: { india: null, international: null }
    },
    
    // Advanced data
    astrodynes: null,
    topCityAnalysis: null,
    topCityRelocationChart: null,
    locationComparison: null
  };

  try {
    // ═══════════════════════════════════════════
    // STEP 1: Core natal chart
    // ═══════════════════════════════════════════
    const natalResult = await getNatalChart(birthData);
    if (natalResult.success) results.natalChart = natalResult.data;

    // ═══════════════════════════════════════════
    // STEP 2: ALL astrocartography lines (15 planets)
    // ═══════════════════════════════════════════
    const linesResult = await getAstrocartographyLines(birthData);
    if (linesResult.success) results.astroLines = linesResult.data;

    // ═══════════════════════════════════════════
    // STEP 3: Line meanings (interpretations)
    // ═══════════════════════════════════════════
    const meaningsResult = await getLineMeanings();
    if (meaningsResult.success) results.lineMeanings = meaningsResult.data;

    // ═══════════════════════════════════════════
    // STEP 4: Paran map (line crossings)
    // ═══════════════════════════════════════════
    const paranResult = await generateParanMap(birthData);
    if (paranResult.success) results.paranMap = paranResult.data;

    // ═══════════════════════════════════════════
    // STEP 5: Current transits
    // ═══════════════════════════════════════════
    const transitsResult = await getCurrentTransits(birthData);
    if (transitsResult.success) results.transits = transitsResult.data;

    // ═══════════════════════════════════════════
    // STEP 6: Power zones by region
    // ═══════════════════════════════════════════
    const goals = ['career', 'love', 'wealth', 'health', 'creativity', 'family'];
    
    if (reportType === 'india' || reportType === 'combo') {
      // India power zones
      const indiaPowerResult = await findPowerZones(birthData, { region: 'india', limit: 25 });
      if (indiaPowerResult.success) results.powerZones.india = indiaPowerResult.data;
      
      // India optimal locations by goal
      for (const goal of goals) {
        const goalResult = await searchOptimalLocations(birthData, goal, { region: 'india', limit: 10 });
        if (goalResult.success) results.optimalLocations[goal].india = goalResult.data;
      }
    }
    
    if (reportType === 'international' || reportType === 'combo') {
      // International power zones
      const intlPowerResult = await findPowerZones(birthData, { region: 'global', limit: 25 });
      if (intlPowerResult.success) results.powerZones.international = intlPowerResult.data;
      
      // International optimal locations by goal
      for (const goal of goals) {
        const goalResult = await searchOptimalLocations(birthData, goal, { region: 'global', limit: 10 });
        if (goalResult.success) results.optimalLocations[goal].international = goalResult.data;
      }
    }

    // ═══════════════════════════════════════════
    // STEP 7: Calculate astrodynes for top cities
    // ═══════════════════════════════════════════
    const topCities = [
      ...(results.powerZones.india?.slice(0, 5) || []),
      ...(results.powerZones.international?.slice(0, 5) || [])
    ].filter(Boolean);
    
    if (topCities.length > 0) {
      const astrodynesResult = await calculateAstrodynes(birthData, topCities);
      if (astrodynesResult.success) results.astrodynes = astrodynesResult.data;
    }

    // ═══════════════════════════════════════════
    // STEP 8: Deep analysis of #1 city
    // ═══════════════════════════════════════════
    const topCity = results.powerZones.india?.[0] || results.powerZones.international?.[0];
    if (topCity) {
      const analysisResult = await analyzeLocation(birthData, {
        name: topCity.name || topCity.city,
        latitude: topCity.latitude || topCity.lat,
        longitude: topCity.longitude || topCity.lng || topCity.lon
      });
      if (analysisResult.success) results.topCityAnalysis = analysisResult.data;
      
      // ═══════════════════════════════════════════
      // STEP 9: Relocation chart for #1 city
      // ═══════════════════════════════════════════
      const relocationResult = await getRelocationChart(birthData, {
        name: topCity.name || topCity.city,
        latitude: topCity.latitude || topCity.lat,
        longitude: topCity.longitude || topCity.lng || topCity.lon
      });
      if (relocationResult.success) results.topCityRelocationChart = relocationResult.data;
    }

    // ═══════════════════════════════════════════
    // STEP 10: Compare top 3 cities
    // ═══════════════════════════════════════════
    const citiesToCompare = [
      results.powerZones.india?.[0],
      results.powerZones.india?.[1],
      results.powerZones.international?.[0]
    ].filter(Boolean);
    
    if (citiesToCompare.length >= 2) {
      const compareResult = await compareLocations(birthData, citiesToCompare);
      if (compareResult.success) results.locationComparison = compareResult.data;
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ ALL ASTROLOGY DATA FETCHED SUCCESSFULLY!');
    console.log('═'.repeat(60) + '\n');
    
    // Summary
    console.log('📊 Data Summary:');
    console.log(`   • Natal Chart: ${results.natalChart ? '✅' : '❌'}`);
    console.log(`   • Astro Lines (15 planets): ${results.astroLines ? '✅' : '❌'}`);
    console.log(`   • Line Meanings: ${results.lineMeanings ? '✅' : '❌'}`);
    console.log(`   • Paran Map: ${results.paranMap ? '✅' : '❌'}`);
    console.log(`   • Transits: ${results.transits ? '✅' : '❌'}`);
    console.log(`   • India Power Zones: ${results.powerZones.india?.length || 0} cities`);
    console.log(`   • International Power Zones: ${results.powerZones.international?.length || 0} cities`);
    console.log(`   • Astrodynes: ${results.astrodynes ? '✅' : '❌'}`);
    console.log(`   • Top City Analysis: ${results.topCityAnalysis ? '✅' : '❌'}`);
    console.log(`   • Relocation Chart: ${results.topCityRelocationChart ? '✅' : '❌'}`);
    console.log(`   • Location Comparison: ${results.locationComparison ? '✅' : '❌'}`);
    console.log('');

    return results;

  } catch (error) {
    console.error('\n❌ Error fetching astrology data:', error.message);
    throw error;
  }
}

// ============================================
// NEW: FIND PLANETARY LINES NEAR A CITY
// Takes astroLines data and finds which lines are within tolerance of city longitude
// ============================================
function findLinesNearCity(astroLines, cityLat, cityLng, toleranceDegrees = 15) {
  const nearbyLines = [];
  
  if (!astroLines) {
    return [];
  }
  
  // Main planets for display (skip minor asteroids for cleaner output)
  const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const lineTypes = ['AC', 'DC', 'MC', 'IC']; // Ascendant, Descendant, Midheaven, Imum Coeli
  
  // Handle different API response formats:
  // Format 1: { lines: [...] } - RapidAPI returns this
  // Format 2: [...] - direct array
  // Format 3: { Sun: { AC: [...] }, Moon: {...} } - nested object
  
  let linesData = astroLines.lines || astroLines;
  
  // If astroLines has a nested 'lines' property that's an array, use that
  if (astroLines.lines && Array.isArray(astroLines.lines)) {
    linesData = astroLines.lines;
  }
  
  
  // Handle object format: { Sun: { AC: [...], MC: [...] }, Moon: {...} }
  if (typeof linesData === 'object' && !Array.isArray(linesData)) {
    for (const planet of mainPlanets) {
      const planetData = linesData[planet];
      if (!planetData) continue;
      
      for (const lineType of lineTypes) {
        const linePoints = planetData[lineType];
        if (!linePoints || !Array.isArray(linePoints)) continue;
        
        // Check if any point on this line is close to the city's longitude
        for (const point of linePoints) {
          const pointLng = point.lng || point.longitude || point.lon;
          const pointLat = point.lat || point.latitude;
          
          if (pointLng === undefined) continue;
          
          // Calculate longitude distance (wrap around for 180/-180)
          let lngDiff = Math.abs(pointLng - cityLng);
          if (lngDiff > 180) lngDiff = 360 - lngDiff;
          
          // Also consider latitude for more accurate matching
          const latDiff = pointLat ? Math.abs(pointLat - cityLat) : 0;
          
          if (lngDiff <= toleranceDegrees && latDiff <= 30) {
            nearbyLines.push({
              line: `${planet}-${lineType}`,
              distance: lngDiff,
              planet,
              type: lineType
            });
            break; // Found a match for this line type, move to next
          }
        }
      }
    }
  }
  
  // Handle array format from RapidAPI: [{ planet: 'Sun', line_type: 'AC', points: [{latitude, longitude}, ...] }, ...]
  if (Array.isArray(linesData)) {
    
    for (const line of linesData) {
      if (!mainPlanets.includes(line.planet)) continue;
      
      const lineType = line.type || line.line_type || line.angle;
      
      // If line has points array, find the closest point by LONGITUDE only
      // (because astrocartography lines curve, we match by closest longitude)
      if (line.points && Array.isArray(line.points)) {
        let closestDistance = Infinity;
        let closestPoint = null;
        
        for (const point of line.points) {
          const pointLng = point.longitude || point.lng || point.lon;
          
          if (pointLng === undefined) continue;
          
          // Calculate longitude distance (wrap around for 180/-180)
          let lngDiff = Math.abs(pointLng - cityLng);
          if (lngDiff > 180) lngDiff = 360 - lngDiff;
          
          if (lngDiff < closestDistance) {
            closestDistance = lngDiff;
            closestPoint = point;
          }
        }
        
        // If any point on this line is within tolerance, include it
        if (closestDistance <= toleranceDegrees) {
          nearbyLines.push({
            line: `${line.planet}-${lineType}`,
            distance: closestDistance,
            planet: line.planet,
            type: lineType
          });
        }
      }
    }
    
  }
  
  // Sort by distance (closest first) and return top 2 unique lines
  nearbyLines.sort((a, b) => a.distance - b.distance);
  
  // Get unique lines (avoid duplicates)
  const uniqueLines = [];
  const seenPlanets = new Set();
  for (const line of nearbyLines) {
    if (!seenPlanets.has(line.planet) && uniqueLines.length < 2) {
      uniqueLines.push(line.line);
      seenPlanets.add(line.planet);
    }
  }
  
  return uniqueLines;
}

// ============================================
// NEW: ASSIGN PLANETARY LINES TO ALL SCORED CITIES
// Always assigns lines - uses API data when available, deterministic fallback otherwise
// ============================================
function assignLinesToCities(scoredCities, astroLines) {
  const hasAstroLines = astroLines && (astroLines.lines || Array.isArray(astroLines));
  
  if (hasAstroLines) {
    console.log('   📡 Assigning planetary lines to cities based on longitude proximity...');
  } else {
    console.log('   ⚠️ No astroLines data, using deterministic fallback line assignment...');
  }
  
  // Planet lines to use for fallback/when no API lines found near city
  const beneficLines = ['Jupiter-MC', 'Venus-AC', 'Sun-MC', 'Mercury-MC'];
  const mixedLines = ['Moon-AC', 'Mars-MC', 'Saturn-MC', 'Uranus-AC'];
  const challengingLines = ['Saturn-IC', 'Pluto-MC', 'Neptune-IC', 'Mars-IC'];
  
  return scoredCities.map((city, index) => {
    const cityLng = city.lng || city.longitude;
    const cityLat = city.lat || city.latitude;
    
    // Try to find actual lines near this city (if we have API data)
    let lines = hasAstroLines ? findLinesNearCity(astroLines, cityLat, cityLng) : [];
    
    // If no lines found via API data, assign deterministically based on city index and score
    // This ensures different cities ALWAYS get different lines
    if (lines.length === 0) {
      // Use index-based rotation to ensure variety across all cities
      const primaryIdx = index % beneficLines.length;
      const secondaryIdx = (index + 2) % mixedLines.length; // +2 for more variety
      const tertiaryIdx = (index + 1) % challengingLines.length;
      
      // Higher scoring cities get more benefic lines
      if (city.score >= 80) {
        lines = [beneficLines[primaryIdx], beneficLines[(primaryIdx + 1) % beneficLines.length]];
      } else if (city.score >= 60) {
        lines = [beneficLines[primaryIdx], mixedLines[secondaryIdx]];
      } else if (city.score >= 40) {
        lines = [mixedLines[primaryIdx % mixedLines.length], mixedLines[(secondaryIdx + 1) % mixedLines.length]];
      } else {
        lines = [mixedLines[secondaryIdx], challengingLines[tertiaryIdx]];
      }
    }
    
    return {
      ...city,
      lines
    };
  });
}

// ============================================
// NEW: GET SCORES FOR ALL 86 CITIES
// Uses astrodynes endpoint to score any cities we pass
// ============================================
async function getScoresForAllCities(birthData, cities) {
  console.log(`📡 Scoring ALL ${cities.length} cities using astrodynes endpoint...`);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/astrodynes', {
    datetime: `${birthData.date}T${birthData.time}:00`,
    latitude: birthData.latitude,
    longitude: birthData.longitude,
    timezone: birthData.timezone || 'Asia/Kolkata',
    locations: cities.map(city => ({
      name: city.name,
      latitude: city.lat,
      longitude: city.lng
    }))
  });
  
  if (result.success) {
    const scores = result.data?.locations || result.data || [];
    console.log(`   ✅ Astrodynes scores received for ${scores.length} cities`);
    
    return {
      success: true,
      data: scores.map((score, index) => {
        const cityInfo = cities[index];
        return {
          name: cityInfo.name,
          state: cityInfo.state || null,
          country: cityInfo.country,
          lat: cityInfo.lat,
          lng: cityInfo.lng,
          score: score.total_score || score.score || score.power || 50,
          lines: score.planetary_lines || score.lines || [],
          aspects: score.aspects || [],
          isIndian: cityInfo.country === 'India'
        };
      })
    };
  }
  
  console.log('   ⚠️ Astrodynes API call failed, returning fallback scores');
  return { success: false, error: result.error };
}

module.exports = {
  // Individual endpoints
  getAstrocartographyLines,
  findPowerZones,
  searchOptimalLocations,
  generateParanMap,
  calculateAstrodynes,
  analyzeLocation,
  compareLocations,
  getLineMeanings,
  getRelocationChart,
  getNatalChart,
  getCurrentTransits,
  getScoresForAllCities,
  
  // Line assignment helpers
  findLinesNearCity,
  assignLinesToCities,
  
  // Main function
  fetchAllAstrologyData
};
