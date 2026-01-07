// ============================================
// SUMMITRA - Astrology API Service (FULL VERSION)
// Uses ALL RapidAPI Astrology Endpoints
// ============================================

const axios = require('axios');

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
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: getHeaders()
    };
    if (data) config.data = data;
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
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

// ============================================
// 1. ASTROCARTOGRAPHY LINES (All 15+ planets)
// ============================================
async function getAstrocartographyLines(birthData) {
  console.log('📡 [1/9] Fetching astrocartography lines (all planets)...');
  
  const formattedData = formatBirthDataForAPI(birthData);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/lines', {
    ...formattedData,
    planets: [
      'Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 
      'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
      'NorthNode', 'SouthNode', 'Chiron', 'Vertex', 'PartOfFortune'
    ]
  });
  
  if (result.success) console.log('   ✅ Astrocartography lines received (15 planets)');
  return result;
}

// ============================================
// 2. FIND POWER ZONES (Best cities ranked)
// ============================================
async function findPowerZones(birthData, options = {}) {
  console.log(`📡 [2/9] Finding power zones (${options.region || 'global'})...`);
  
  const formattedData = formatBirthDataForAPI(birthData);
  
  const result = await apiCall('POST', '/api/v3/astrocartography/power-zones', {
    ...formattedData,
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
  
  // Main function
  fetchAllAstrologyData
};
