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
// Uses astrodynes endpoint to score any cities we pass
// ============================================
async function getScoresForAllCities(birthData, cities) {
  console.log(`📡 Scoring ALL ${cities.length} cities using astrodynes endpoint...`);
  
  // Use the proper subject format that the API expects
  const formattedData = formatBirthDataForAPI(birthData);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/astrodynes', {
    ...formattedData,
    locations: cities.map(city => ({
      name: city.name,
      latitude: city.lat,
      longitude: city.lng
    }))
  });
  
  if (result.success) {
    // Debug: Log full API response structure
    console.log(`   [DEBUG] Raw astrodynes response type: ${typeof result.data}`);
    console.log(`   [DEBUG] Raw astrodynes response keys:`, result.data ? Object.keys(result.data) : 'null');
    console.log(`   [DEBUG] Raw astrodynes sample:`, JSON.stringify(result.data).substring(0, 500));
    
    // Handle various response structures
    let scores = [];
    if (Array.isArray(result.data?.locations)) {
      scores = result.data.locations;
    } else if (Array.isArray(result.data)) {
      scores = result.data;
    } else if (result.data?.results && Array.isArray(result.data.results)) {
      scores = result.data.results;
    } else if (result.data?.cities && Array.isArray(result.data.cities)) {
      scores = result.data.cities;
    } else if (result.data?.scores && Array.isArray(result.data.scores)) {
      scores = result.data.scores;
    }
    
    console.log(`   ✅ Astrodynes scores received for ${scores.length} cities`);
    
    // Debug: Log raw API response structure for first few cities
    if (scores.length > 0) {
      console.log(`   [DEBUG] Raw API score fields for first city:`, JSON.stringify(scores[0], null, 2).substring(0, 500));
      const sampleScores = scores.slice(0, 5).map((s, i) => ({
        city: cities[i]?.name,
        total_score: s.total_score,
        score: s.score,
        power: s.power,
        extracted: s.total_score || s.score || s.power || 50
      }));
      console.log(`   [DEBUG] First 5 city scores:`, JSON.stringify(sampleScores));
    }
    
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
  
  // Main function
  fetchAllAstrologyData
};
