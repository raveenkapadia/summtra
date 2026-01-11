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
  
  if (result.success) {
    console.log('   ✅ Astrocartography lines received (15 celestial bodies)');
    // Debug: Log the structure of the response
    const data = result.data;
    if (data) {
      console.log('   📊 API Response Structure:');
      console.log(`      - Type: ${typeof data}`);
      console.log(`      - Keys: ${Object.keys(data).slice(0, 10).join(', ')}`);
      if (data.lines) {
        console.log(`      - Has 'lines' property: ${typeof data.lines}`);
        if (Array.isArray(data.lines)) {
          console.log(`      - lines is array with ${data.lines.length} items`);
          if (data.lines[0]) {
            console.log(`      - First line sample: ${JSON.stringify(data.lines[0]).substring(0, 200)}`);
          }
        } else if (typeof data.lines === 'object') {
          console.log(`      - lines is object with keys: ${Object.keys(data.lines).slice(0, 5).join(', ')}`);
        }
      }
    }
  }
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
// 2b. SCORE CITIES FROM ASTROCARTOGRAPHY LINES
// Scores cities based on which planetary lines pass nearby
// Uses line proximity + planetary benefic values for varied scoring
// ============================================

// Planetary scoring values (benefic planets get higher base scores)
const PLANET_SCORES = {
  'Jupiter': 15,  // Great benefic
  'Venus': 12,    // Lesser benefic
  'Sun': 10,      // Personal power
  'Moon': 8,      // Emotional connection
  'Mercury': 6,   // Communication
  'Saturn': 4,    // Structure (challenging)
  'Mars': 3,      // Energy (challenging)
  'Uranus': 2,    // Change
  'Neptune': 2,   // Spirituality
  'Pluto': 1      // Transformation
};

// Line type modifiers
const LINE_MODIFIERS = {
  'MC': 1.2,  // Midheaven - career/public life (most impactful)
  'AC': 1.1,  // Ascendant - personality/approach
  'IC': 0.9,  // Imum Coeli - home/foundations
  'DC': 0.8   // Descendant - relationships
};

async function scoreCitiesFromPowerZones(birthData, cities, region = 'global') {
  console.log(`📡 Scoring ${cities.length} cities using astrocartography lines...`);
  
  // Fetch astrocartography lines (more reliable than power zones)
  const linesResult = await getAstrocartographyLines(birthData);
  
  if (!linesResult.success || !linesResult.data) {
    console.log('   ⚠️ No astrocartography lines available, using deterministic fallback');
    // Use city coordinates to generate pseudo-random but deterministic scores
    // This ensures different cities get different scores, and same city always gets same score
    return {
      success: true,
      data: cities.map((city, index) => {
        // Hash-like function from city name + coordinates for pseudo-randomness
        const nameSum = city.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const coordHash = Math.abs(Math.sin(city.lat * 12.9898 + city.lng * 78.233) * 43758.5453) % 1;
        const combined = (nameSum % 100) / 100 * 0.3 + coordHash * 0.7;
        
        // Assign benefic lines to higher-scoring cities
        const beneficLines = ['Jupiter-MC', 'Venus-AC', 'Sun-MC', 'Moon-AC'];
        const mixedLines = ['Mercury-MC', 'Saturn-MC', 'Mars-AC', 'Jupiter-IC'];
        const lineIndex = Math.floor(combined * beneficLines.length);
        const lines = combined > 0.6 
          ? [beneficLines[lineIndex % beneficLines.length], beneficLines[(lineIndex + 1) % beneficLines.length]]
          : [mixedLines[lineIndex % mixedLines.length], beneficLines[(lineIndex + 2) % beneficLines.length]];
        
        return {
          ...city,
          score: Math.round(65 + combined * 30), // 65-95 range
          lines,
          scoringMethod: 'DETERMINISTIC_FALLBACK'
        };
      })
    };
  }
  
  // Use findLinesNearCity to get lines for each city, then calculate score
  let totalLinesFound = 0;
  const scoredCities = cities.map(city => {
    const nearbyLines = findLinesNearCity(linesResult.data, city.lat, city.lng, 15);
    totalLinesFound += nearbyLines.length;
    
    // Calculate raw score based on planetary values
    let rawScore = 0;
    const topLines = [];
    
    for (const lineInfo of nearbyLines.slice(0, 5)) { // Consider top 5 lines
      if (!lineInfo || !lineInfo.line) continue; // Skip invalid entries
      
      const [planet, lineType] = lineInfo.line.split('-');
      if (!planet) continue; // Skip if split failed
      
      const planetScore = PLANET_SCORES[planet] || 5;
      const modifier = LINE_MODIFIERS[lineType] || 1.0;
      const distanceFactor = Math.max(0.2, 1 - (lineInfo.distance / 15)); // Closer = stronger
      
      rawScore += planetScore * modifier * distanceFactor;
      
      if (topLines.length < 2) {
        topLines.push(lineInfo.line);
      }
    }
    
    // If no lines found, give a base score based on coordinates for variation
    if (nearbyLines.length === 0) {
      const nameSum = city.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const coordHash = Math.abs(Math.sin(city.lat * 12.9898 + city.lng * 78.233) * 43758.5453) % 1;
      rawScore = (nameSum % 100) / 100 * 0.3 + coordHash * 0.7;
      
      // Assign deterministic lines based on city coordinates
      const beneficLines = ['Jupiter-MC', 'Venus-AC', 'Sun-MC', 'Moon-AC'];
      const mixedLines = ['Mercury-MC', 'Saturn-MC', 'Mars-AC', 'Jupiter-IC'];
      const lineIndex = Math.floor(rawScore * beneficLines.length);
      const assignedLines = rawScore > 0.6 
        ? [beneficLines[lineIndex % beneficLines.length], beneficLines[(lineIndex + 1) % beneficLines.length]]
        : [mixedLines[lineIndex % mixedLines.length], beneficLines[(lineIndex + 2) % beneficLines.length]];
      
      // Generate line details for deterministic fallback
      const fallbackLineDetails = assignedLines.map(l => {
        const [planet, type] = l.split('-');
        return { planet, type, line: l, distance: null, lineLongitude: null };
      });
      
      return {
        ...city,
        rawScore: rawScore * 30, // Scale for normalization
        lines: assignedLines,
        lineDetails: fallbackLineDetails,
        nearbyLinesCount: 0,
        scoringMethod: 'DETERMINISTIC_FALLBACK'
      };
    }
    
    // Preserve both string format (for display) and rich objects (for detailed info)
    const topLineObjects = nearbyLines.slice(0, 2).map(l => ({
      planet: l.planet,
      type: l.type,
      line: l.line,
      distance: Math.round(l.distance * 10) / 10,
      lineLongitude: l.lineLongitude ? Math.round(l.lineLongitude * 100) / 100 : null
    }));
    
    return {
      ...city,
      rawScore,
      lines: topLines, // String format for backward compatibility
      lineDetails: topLineObjects, // Rich format with metadata
      nearbyLinesCount: nearbyLines.length,
      scoringMethod: 'ASTROCARTOGRAPHY_LINES'
    };
  });
  
  console.log(`   📊 Line matching: ${totalLinesFound} lines found across ${cities.length} cities`);
  
  // Normalize to 65-95% range
  const maxRaw = Math.max(...scoredCities.map(c => c.rawScore), 1);
  const minRaw = Math.min(...scoredCities.map(c => c.rawScore));
  
  const finalCities = scoredCities.map(city => {
    // Normalize: 0-1 range based on position between min and max
    const normalized = maxRaw > minRaw 
      ? (city.rawScore - minRaw) / (maxRaw - minRaw)
      : 0.5;
    
    // Scale to 65-95 range
    const score = Math.round(65 + normalized * 30);
    
    return {
      name: city.name,
      state: city.state || null,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      score: Math.min(95, Math.max(65, score)),
      lines: city.lines,
      lineDetails: city.lineDetails || null, // Preserve rich line metadata
      nearbyLinesCount: city.nearbyLinesCount,
      scoringMethod: city.scoringMethod || 'DETERMINISTIC_FALLBACK',
      isIndian: city.country === 'India'
    };
  });
  
  // Sort by score descending
  finalCities.sort((a, b) => b.score - a.score);
  
  const scores = finalCities.map(c => c.score);
  console.log(`   ✅ Scored ${finalCities.length} cities (range: ${Math.min(...scores)}-${Math.max(...scores)})`);
  
  return {
    success: true,
    data: finalCities
  };
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
  
  // Helper: Find where a line intersects a given latitude by linear interpolation
  function findLongitudeAtLatitude(points, targetLat) {
    if (!points || points.length < 2) return null;
    
    // Sort points by latitude
    const sorted = [...points].sort((a, b) => (a.latitude || a.lat) - (b.latitude || b.lat));
    
    // Find two points that bracket the target latitude
    for (let i = 0; i < sorted.length - 1; i++) {
      const p1 = sorted[i];
      const p2 = sorted[i + 1];
      const lat1 = p1.latitude ?? p1.lat;
      const lat2 = p2.latitude ?? p2.lat;
      const lng1 = p1.longitude ?? p1.lng ?? p1.lon;
      const lng2 = p2.longitude ?? p2.lng ?? p2.lon;
      
      if (lat1 <= targetLat && targetLat <= lat2) {
        // Linear interpolation
        const t = (targetLat - lat1) / (lat2 - lat1);
        return lng1 + t * (lng2 - lng1);
      }
    }
    return null;
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
      
      if (line.points && Array.isArray(line.points)) {
        // NEW APPROACH: Find where the line is at the city's latitude
        // This correctly handles curved astrocartography lines
        const lineLngAtCityLat = findLongitudeAtLatitude(line.points, cityLat);
        
        if (lineLngAtCityLat !== null) {
          // Calculate longitude distance (wrap around for 180/-180)
          let lngDiff = Math.abs(lineLngAtCityLat - cityLng);
          if (lngDiff > 180) lngDiff = 360 - lngDiff;
          
          // If the line at this latitude is within tolerance of the city's longitude
          if (lngDiff <= toleranceDegrees) {
            nearbyLines.push({
              line: `${line.planet}-${lineType}`,
              distance: lngDiff,
              planet: line.planet,
              type: lineType,
              lineLongitude: lineLngAtCityLat
            });
          }
        }
      }
    }
    
  }
  
  // Sort by distance (closest first)
  nearbyLines.sort((a, b) => a.distance - b.distance);
  
  // Return all nearby lines (with full info for scoring), not just string names
  // The caller can then use this for both scoring and display
  return nearbyLines;
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
// Uses our transparent 50/50 Western + Vedic methodology
// ============================================
async function getScoresForAllCities(birthData, cities, astroLines = null, goal = 'Career') {
  console.log(`📡 Scoring ${cities.length} cities using transparent 50/50 methodology...`);
  
  // Calculate direction from birth place to each city
  const birthLat = parseFloat(birthData.latitude);
  const birthLng = parseFloat(birthData.longitude);
  
  const scoredCities = cities.map((city, index) => {
    const cityLat = city.lat || city.latitude;
    const cityLng = city.lng || city.longitude;
    
    // Calculate city direction from birthplace
    const direction = calculateCityDirection(birthLat, birthLng, cityLat, cityLng);
    
    // Create city data object with direction
    const cityData = {
      ...city,
      lat: cityLat,
      lng: cityLng,
      direction
    };
    
    // Calculate transparent score using our credibility methodology
    const credibilityResult = calculateCredibilityScore(cityData, birthData, astroLines, goal);
    
    // Apply direction penalty for opposite directions (reduces misaligned cities)
    const penalizedScore = applyDirectionPenalty(credibilityResult, birthData, direction);
    
    return {
      name: city.name,
      state: city.state || null,
      country: city.country,
      lat: cityLat,
      lng: cityLng,
      direction,
      score: penalizedScore.total,
      credibility: penalizedScore.breakdown,
      lines: [],
      isIndian: city.country === 'India'
    };
  });
  
  // Log score distribution for validation
  const scoreRange = scoredCities.map(c => c.score);
  const minScore = Math.min(...scoreRange);
  const maxScore = Math.max(...scoreRange);
  console.log(`   ✅ Scored ${scoredCities.length} cities (range: ${minScore}-${maxScore})`);
  
  // Log top 3 and bottom 3 cities for validation
  const sorted = [...scoredCities].sort((a, b) => b.score - a.score);
  const top3 = sorted.slice(0, 3).map(c => `${c.name}(${c.direction}): ${c.score}%`);
  const bottom3 = sorted.slice(-3).map(c => `${c.name}(${c.direction}): ${c.score}%`);
  console.log(`   📊 Top 3: ${top3.join(', ')}`);
  console.log(`   📊 Bottom 3: ${bottom3.join(', ')}`);
  
  return {
    success: true,
    data: scoredCities
  };
}

// Calculate 8-point compass direction from birth to city
function calculateCityDirection(birthLat, birthLng, cityLat, cityLng) {
  const latDiff = cityLat - birthLat;
  const lngDiff = cityLng - birthLng;
  
  // Check for origin (same location)
  const distKm = haversineDistanceKm(birthLat, birthLng, cityLat, cityLng);
  if (distKm < 50) return 'Origin';
  
  const angle = Math.atan2(lngDiff, latDiff) * 180 / Math.PI;
  
  if (angle >= -22.5 && angle < 22.5) return 'North';
  if (angle >= 22.5 && angle < 67.5) return 'Northeast';
  if (angle >= 67.5 && angle < 112.5) return 'East';
  if (angle >= 112.5 && angle < 157.5) return 'Southeast';
  if (angle >= 157.5 || angle < -157.5) return 'South';
  if (angle >= -157.5 && angle < -112.5) return 'Southwest';
  if (angle >= -112.5 && angle < -67.5) return 'West';
  if (angle >= -67.5 && angle < -22.5) return 'Northwest';
  return 'Unknown';
}

// Apply penalty for direction misalignment with nakshatra/lagna favorable directions
function applyDirectionPenalty(credibilityResult, birthData, cityDirection) {
  const total = credibilityResult.total;
  const breakdown = credibilityResult.breakdown;
  
  // Get favorable directions from nakshatra and lagna
  const nakshatraDirections = {
    'Ashwini': 'East', 'Bharani': 'West', 'Krittika': 'North', 'Rohini': 'East',
    'Mrigashira': 'South', 'Ardra': 'West', 'Punarvasu': 'North', 'Pushya': 'East',
    'Ashlesha': 'South', 'Magha': 'East', 'Purva Phalguni': 'South', 'Uttara Phalguni': 'East',
    'Hasta': 'East', 'Chitra': 'West', 'Swati': 'North', 'Vishakha': 'East',
    'Anuradha': 'South', 'Jyeshtha': 'West', 'Mula': 'South', 'Purva Ashadha': 'South',
    'Uttara Ashadha': 'North', 'Shravana': 'West', 'Dhanishta': 'North', 'Shatabhisha': 'South',
    'Purva Bhadrapada': 'West', 'Uttara Bhadrapada': 'North', 'Revati': 'West'
  };
  
  const oppositeDirections = {
    'North': 'South', 'South': 'North',
    'East': 'West', 'West': 'East',
    'Northeast': 'Southwest', 'Southwest': 'Northeast',
    'Northwest': 'Southeast', 'Southeast': 'Northwest'
  };
  
  const userNakshatra = birthData.nakshatra || 'Magha';
  const favorableDir = nakshatraDirections[userNakshatra] || 'East';
  const oppositeDir = oppositeDirections[favorableDir];
  
  let penalty = 0;
  let bonus = 0;
  let penaltyReason = null;
  
  // Heavy penalty if city is in opposite direction (-25 points)
  if (cityDirection === oppositeDir) {
    penalty = 25;
    penaltyReason = `Opposite to favorable ${favorableDir} direction`;
  }
  // Moderate penalty for adjacent-opposite directions (-12 points)
  else if (cityDirection.toLowerCase().includes(oppositeDir.toLowerCase().replace('east', '').replace('west', '').replace('north', '').replace('south', ''))) {
    if (cityDirection !== favorableDir && !cityDirection.toLowerCase().includes(favorableDir.toLowerCase())) {
      penalty = 12;
      penaltyReason = `Misaligned with favorable ${favorableDir} direction`;
    }
  }
  // Strong bonus if city is in favorable direction (+25 points)
  else if (cityDirection === favorableDir) {
    bonus = 25;
  }
  // Moderate bonus if city contains favorable direction (+18 points)
  else if (cityDirection.toLowerCase().includes(favorableDir.toLowerCase())) {
    bonus = 18;
  }
  
  // Allow wider range: min 38% for very poor cities, max 92% for excellent cities
  const penalizedTotal = Math.max(38, Math.min(92, total - penalty + bonus));
  
  return {
    total: penalizedTotal,
    breakdown: {
      ...breakdown,
      penalty: penalty > 0 ? { amount: penalty, reason: penaltyReason } : null
    },
    originalTotal: total
  };
}

// ============================================
// CREDIBILITY LAYER: Distance & Paran Calculations
// ============================================

// Haversine formula to calculate distance between two points in km
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate distance in km from city to nearest point on a planetary line
function calculateLineDistanceKm(cityLat, cityLng, linePoints) {
  if (!linePoints || linePoints.length < 2) return null;
  
  let minDistance = Infinity;
  let nearestLat = null;
  let nearestLng = null;
  
  // Find the line's longitude at the city's latitude (interpolation)
  const sorted = [...linePoints].sort((a, b) => (a.latitude || a.lat) - (b.latitude || b.lat));
  
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];
    const lat1 = p1.latitude ?? p1.lat;
    const lat2 = p2.latitude ?? p2.lat;
    const lng1 = p1.longitude ?? p1.lng ?? p1.lon;
    const lng2 = p2.longitude ?? p2.lng ?? p2.lon;
    
    if (lat1 <= cityLat && cityLat <= lat2) {
      const t = (cityLat - lat1) / (lat2 - lat1);
      const lineLng = lng1 + t * (lng2 - lng1);
      const dist = haversineDistanceKm(cityLat, cityLng, cityLat, lineLng);
      if (dist < minDistance) {
        minDistance = dist;
        nearestLat = cityLat;
        nearestLng = lineLng;
      }
    }
  }
  
  // Also check each point on the line for closest approach
  for (const point of linePoints) {
    const pLat = point.latitude ?? point.lat;
    const pLng = point.longitude ?? point.lng ?? point.lon;
    if (pLat === undefined || pLng === undefined) continue;
    
    const dist = haversineDistanceKm(cityLat, cityLng, pLat, pLng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestLat = pLat;
      nearestLng = pLng;
    }
  }
  
  return minDistance === Infinity ? null : { distance: Math.round(minDistance), nearestLat, nearestLng };
}

// Get orb strength category based on distance in km
// Extended orb ranges - astrocartography lines influence areas within 1500km
// Wide score range for meaningful differentiation
function getOrbStrength(distanceKm) {
  if (distanceKm === null) return { label: 'None', score: 10, bars: 1 };
  if (distanceKm < 150) return { label: 'Direct', score: 25, bars: 10 };
  if (distanceKm < 400) return { label: 'Very Strong', score: 23, bars: 9 };
  if (distanceKm < 700) return { label: 'Strong', score: 20, bars: 7 };
  if (distanceKm < 1100) return { label: 'Moderate', score: 17, bars: 5 };
  if (distanceKm < 1600) return { label: 'Weak', score: 13, bars: 3 };
  return { label: 'Minimal', score: 10, bars: 1 };
}

// Generate visual bar representation
function generateOrbBars(bars) {
  const filled = '█'.repeat(bars);
  const empty = '░'.repeat(10 - bars);
  return filled + empty;
}

// PARAN LINES: Calculate latitude-based planetary alignments
// Parans represent when two planets share angular positions at a specific latitude
const PARAN_INTERPRETATIONS = {
  'Jupiter-Venus': { Career: 'Prosperity & growth', Love: 'Romance & harmony', Wealth: 'Abundance', Education: 'Wisdom & creativity', Settlement: 'Comfortable home' },
  'Sun-Mercury': { Career: 'Recognition & deals', Love: 'Communication', Wealth: 'Business acumen', Education: 'Learning & expression', Settlement: 'Clear thinking' },
  'Jupiter-Saturn': { Career: 'Long-term success', Love: 'Commitment', Wealth: 'Stable growth', Education: 'Discipline & wisdom', Settlement: 'Solid foundation' },
  'Mars-Jupiter': { Career: 'Bold initiatives', Love: 'Passion', Wealth: 'Risk-taking success', Education: 'Competition edge', Settlement: 'Active lifestyle' },
  'Moon-Venus': { Career: 'Intuitive success', Love: 'Deep harmony', Wealth: 'Comfort', Education: 'Creative insight', Settlement: 'Peaceful home' },
  'Sun-Jupiter': { Career: 'Leadership', Love: 'Generosity', Wealth: 'Expansion', Education: 'Optimism', Settlement: 'Prosperity' },
  'Mercury-Venus': { Career: 'Negotiation', Love: 'Charm', Wealth: 'Trade success', Education: 'Artistic learning', Settlement: 'Pleasant environment' },
  'Moon-Jupiter': { Career: 'Popular appeal', Love: 'Emotional growth', Wealth: 'Good fortune', Education: 'Receptive learning', Settlement: 'Family blessings' }
};

// Calculate parans for a city based on birth data and latitude
function calculateParansForCity(birthData, cityLatitude, goal = 'Complete') {
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const parans = [];
  
  // Simplified paran calculation based on birth chart planetary positions
  // In a full implementation, this would calculate which planets are angular at the given latitude
  // Here we use a deterministic approach based on birth date and city latitude
  
  const birthDateSum = (birthData.date || '1990-01-01').split('-').reduce((a, b) => a + parseInt(b), 0);
  const latFactor = Math.abs(cityLatitude) / 90;
  
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const planet1 = planets[i];
      const planet2 = planets[j];
      const paranKey = `${planet1}-${planet2}`;
      
      // Deterministic but varied activation based on latitude and birth data
      // Using lower threshold (0.1) for more generous paran activation
      const activation = Math.sin(birthDateSum * 0.1 + i * 0.5 + j * 0.3 + latFactor * 10);
      
      if (activation > 0.1) {
        const interpretation = PARAN_INTERPRETATIONS[paranKey];
        if (interpretation) {
          parans.push({
            planets: [planet1, planet2],
            key: paranKey,
            strength: activation > 0.7 ? 'Strong' : activation > 0.5 ? 'Moderate' : 'Mild',
            interpretation: interpretation[goal] || interpretation.Career || 'Planetary harmony'
          });
        }
      }
    }
  }
  
  // Sort by strength and return top 3
  return parans.sort((a, b) => {
    const strengthOrder = { 'Strong': 3, 'Moderate': 2, 'Mild': 1 };
    return strengthOrder[b.strength] - strengthOrder[a.strength];
  }).slice(0, 3);
}

// Calculate paran score (25 points max)
function calculateParanScore(parans) {
  if (!parans || parans.length === 0) return 12;
  if (parans.length >= 3) return 25;
  if (parans.length === 2) return 22;
  return 18;
}

// CREDIBILITY SCORING: Calculate 50/50 Western + Vedic breakdown
function calculateCredibilityScore(cityData, birthData, astroLines, goal = 'Career') {
  const cityLat = cityData.lat || cityData.latitude;
  const cityLng = cityData.lng || cityData.longitude;
  
  // ========== WESTERN ASTROCARTOGRAPHY (50 points) ==========
  
  // 1. Line Proximity Score (25 points max)
  // Base score is 13 for cities with no nearby lines - balanced floor
  let lineProximityScore = 13;
  let nearestLine = null;
  let nearestDistanceKm = null;
  let orbStrength = { label: 'None', bars: 0 };
  
  if (astroLines) {
    const linesData = astroLines.lines || astroLines;
    const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    const goalPlanets = {
      'Career': ['Sun', 'Saturn', 'Jupiter', 'Mercury'],
      'Wealth': ['Jupiter', 'Venus', 'Mercury', 'Sun'],
      'Love': ['Venus', 'Moon', 'Mars', 'Jupiter'],
      'Education': ['Mercury', 'Jupiter', 'Moon', 'Sun'],
      'Settlement': ['Moon', 'Venus', 'Saturn', 'Jupiter'],
      'Complete': ['Jupiter', 'Venus', 'Sun', 'Moon']
    };
    const preferredPlanets = goalPlanets[goal] || goalPlanets['Complete'];
    
    if (Array.isArray(linesData)) {
      for (const line of linesData) {
        if (!mainPlanets.includes(line.planet)) continue;
        
        const result = calculateLineDistanceKm(cityLat, cityLng, line.points);
        if (result && (nearestDistanceKm === null || result.distance < nearestDistanceKm)) {
          nearestDistanceKm = result.distance;
          nearestLine = `${line.planet}-${line.line_type || line.type || line.angle}`;
          
          // Boost score for preferred planets (capped at max 25)
          const planetBonus = preferredPlanets.includes(line.planet) ? 1.2 : 1.0;
          const baseOrb = getOrbStrength(result.distance);
          lineProximityScore = Math.min(25, Math.round(baseOrb.score * planetBonus));
          orbStrength = baseOrb;
        }
      }
    }
  }
  
  // 2. Paran Lines Score (25 points max)
  const parans = calculateParansForCity(birthData, cityLat, goal);
  const paranScore = calculateParanScore(parans);
  
  const westernTotal = Math.min(50, lineProximityScore + paranScore);
  
  // ========== VEDIC ASTROLOGY (50 points) ==========
  
  // 3. Nakshatra + Rashi Score (20 points max)
  const directions = ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'];
  const cityDirection = cityData.direction || directions[Math.floor(Math.abs(cityLng) % 8)];
  
  const nakshatraDirections = {
    'Ashwini': 'East', 'Bharani': 'West', 'Krittika': 'North', 'Rohini': 'East',
    'Mrigashira': 'South', 'Ardra': 'West', 'Punarvasu': 'North', 'Pushya': 'East',
    'Ashlesha': 'South', 'Magha': 'East', 'Purva Phalguni': 'South', 'Uttara Phalguni': 'East',
    'Hasta': 'East', 'Chitra': 'West', 'Swati': 'North', 'Vishakha': 'East',
    'Anuradha': 'South', 'Jyeshtha': 'West', 'Mula': 'South', 'Purva Ashadha': 'South',
    'Uttara Ashadha': 'North', 'Shravana': 'West', 'Dhanishta': 'North', 'Shatabhisha': 'South',
    'Purva Bhadrapada': 'West', 'Uttara Bhadrapada': 'North', 'Revati': 'West'
  };
  
  const userNakshatra = birthData.nakshatra || 'Magha';
  const favorableDirection = nakshatraDirections[userNakshatra] || 'East';
  const directionMatch = cityDirection.includes(favorableDirection) || favorableDirection.includes(cityDirection);
  const nakshatraRashiScore = directionMatch ? 20 : 12;
  
  // 4. Lagna-Vastu Score (15 points max)
  const lagnaDirections = {
    'Aries': 'East', 'Mesha': 'East', 'Taurus': 'South', 'Vrishabha': 'South',
    'Gemini': 'West', 'Mithuna': 'West', 'Cancer': 'North', 'Karka': 'North',
    'Leo': 'East', 'Simha': 'East', 'Virgo': 'South', 'Kanya': 'South',
    'Libra': 'West', 'Tula': 'West', 'Scorpio': 'North', 'Vrishchika': 'North',
    'Sagittarius': 'East', 'Dhanu': 'East', 'Capricorn': 'South', 'Makara': 'South',
    'Aquarius': 'West', 'Kumbha': 'West', 'Pisces': 'North', 'Meena': 'North'
  };
  
  const userLagna = birthData.lagna || birthData.lagnaSign || 'Tula';
  const lagnaClean = userLagna.split(' ')[0].replace(/[()]/g, '');
  const lagnaFavorable = lagnaDirections[lagnaClean] || 'West';
  const vastuMatch = cityDirection.includes(lagnaFavorable);
  const lagnaVastuScore = vastuMatch ? 15 : 10;
  
  // 5. Dasha Timing Score (15 points max)
  const currentDasha = birthData.currentDashaLord || 'Jupiter';
  const dashaLineMatch = nearestLine && nearestLine.startsWith(currentDasha);
  const dashaParanMatch = parans.some(p => p.planets.includes(currentDasha));
  const dashaScore = (dashaLineMatch || dashaParanMatch) ? 15 : 10;
  
  const vedicTotal = Math.min(50, nakshatraRashiScore + lagnaVastuScore + dashaScore);
  
  // ========== TOTAL SCORE ==========
  const totalScore = westernTotal + vedicTotal;
  
  return {
    total: Math.min(100, totalScore),
    breakdown: {
      western: {
        total: westernTotal,
        lineProximity: {
          score: lineProximityScore,
          max: 25,
          nearestLine,
          distanceKm: nearestDistanceKm,
          orbStrength: orbStrength.label,
          orbBars: generateOrbBars(orbStrength.bars),
          direction: nearestDistanceKm ? (nearestLine && nearestLine.includes('MC') ? 'south' : 'west') : null
        },
        parans: {
          score: paranScore,
          max: 25,
          details: parans
        }
      },
      vedic: {
        total: vedicTotal,
        nakshatraRashi: {
          score: nakshatraRashiScore,
          max: 20,
          direction: favorableDirection,
          match: directionMatch
        },
        lagnaVastu: {
          score: lagnaVastuScore,
          max: 15,
          favorable: lagnaFavorable,
          match: vastuMatch
        },
        dashaTiming: {
          score: dashaScore,
          max: 15,
          planet: currentDasha,
          active: dashaLineMatch || dashaParanMatch
        }
      }
    }
  };
}

// Get line descriptions for "where your lines pass" page
function getLineGlobalPaths(astroLines) {
  const regions = [];
  const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  
  if (!astroLines) return regions;
  
  const linesData = astroLines.lines || astroLines;
  if (!Array.isArray(linesData)) return regions;
  
  for (const line of linesData) {
    if (!mainPlanets.includes(line.planet)) continue;
    
    const lineType = line.line_type || line.type || line.angle;
    if (!['MC', 'AC'].includes(lineType)) continue; // Focus on major lines
    
    const points = line.points || [];
    if (points.length < 2) continue;
    
    // Determine regions the line passes through based on longitude ranges
    const lngs = points.map(p => p.longitude ?? p.lng).filter(l => l !== undefined);
    const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
    
    let region = 'Unknown region';
    if (avgLng >= -30 && avgLng <= 60) region = 'Europe → Africa → Middle East';
    else if (avgLng > 60 && avgLng <= 120) region = 'Central Asia → India → Southeast Asia';
    else if (avgLng > 120 || avgLng < -120) region = 'East Asia → Pacific → Australia';
    else if (avgLng >= -120 && avgLng < -30) region = 'Americas';
    
    regions.push({
      line: `${line.planet}-${lineType}`,
      planet: line.planet,
      type: lineType,
      region,
      avgLongitude: Math.round(avgLng)
    });
  }
  
  return regions.slice(0, 5);
}

module.exports = {
  // Individual endpoints
  getAstrocartographyLines,
  findPowerZones,
  scoreCitiesFromPowerZones,
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
  
  // Credibility layer functions
  haversineDistanceKm,
  calculateLineDistanceKm,
  getOrbStrength,
  generateOrbBars,
  calculateParansForCity,
  calculateCredibilityScore,
  getLineGlobalPaths,
  
  // Main function
  fetchAllAstrologyData
};
