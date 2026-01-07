// ============================================
// SUMMITRA - Astrology API Service
// Calls RapidAPI Astrology Endpoints
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

// ============================================
// API ENDPOINTS
// ============================================

/**
 * Get all astrocartography lines for a birth chart
 */
async function getAstrocartographyLines(birthData) {
  try {
    console.log('📡 Calling getAstrocartographyLines...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/lines`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone
      }
    });
    
    console.log('✅ Astrocartography lines received');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting astrocartography lines:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Find power zones - best cities for the user
 */
async function findPowerZones(birthData, options = {}) {
  try {
    console.log('📡 Calling findPowerZones...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/power-zones`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        region: options.region || 'global',
        limit: options.limit || 20
      }
    });
    
    console.log('✅ Power zones received');
    return response.data;
  } catch (error) {
    console.error('❌ Error finding power zones:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Search optimal locations by goal (career, love, wealth, health, creativity, family)
 */
async function searchOptimalLocations(birthData, goal, options = {}) {
  try {
    console.log(`📡 Calling searchOptimalLocations for goal: ${goal}...`);
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/search-optimal`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        goal: goal,
        region: options.region || 'global',
        limit: options.limit || 10
      }
    });
    
    console.log(`✅ Optimal locations for ${goal} received`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error searching optimal locations for ${goal}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Generate paran map - where planetary lines intersect
 */
async function generateParanMap(birthData) {
  try {
    console.log('📡 Calling generateParanMap...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/paran-map`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone
      }
    });
    
    console.log('✅ Paran map received');
    return response.data;
  } catch (error) {
    console.error('❌ Error generating paran map:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Calculate astrodynes (power scores) for specific locations
 */
async function calculateAstrodynes(birthData, locations) {
  try {
    console.log('📡 Calling calculateAstrodynes...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/astrodynes`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        locations: locations
      }
    });
    
    console.log('✅ Astrodynes calculated');
    return response.data;
  } catch (error) {
    console.error('❌ Error calculating astrodynes:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Deep analysis of a specific location
 */
async function analyzeLocation(birthData, location) {
  try {
    console.log(`📡 Calling analyzeLocation for ${location.name}...`);
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/analyze-location`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        location_name: location.name
      }
    });
    
    console.log(`✅ Location analysis for ${location.name} received`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error analyzing location ${location.name}:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get pre-built line meanings/interpretations
 */
async function getLineMeanings() {
  try {
    console.log('📡 Calling getLineMeanings...');
    
    const response = await axios({
      method: 'GET',
      url: `${BASE_URL}/api/v3/astrocartography/line-meanings`,
      headers: getHeaders()
    });
    
    console.log('✅ Line meanings received');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting line meanings:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Compare multiple locations
 */
async function compareLocations(birthData, locations) {
  try {
    console.log('📡 Calling compareLocations...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/astrocartography/compare-locations`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        locations: locations
      }
    });
    
    console.log('✅ Locations compared');
    return response.data;
  } catch (error) {
    console.error('❌ Error comparing locations:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get natal chart data
 */
async function getNatalChart(birthData) {
  try {
    console.log('📡 Calling getNatalChart...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/natal/chart`,
      headers: getHeaders(),
      data: {
        datetime: `${birthData.date}T${birthData.time}:00`,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
        timezone: birthData.timezone,
        house_system: 'W',
        zodiac_type: 'Tropic'
      }
    });
    
    console.log('✅ Natal chart received');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting natal chart:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get current transits
 */
async function getCurrentTransits(birthData) {
  try {
    console.log('📡 Calling getCurrentTransits...');
    
    const response = await axios({
      method: 'POST',
      url: `${BASE_URL}/api/v3/transits/current`,
      headers: getHeaders(),
      data: {
        natal_datetime: `${birthData.date}T${birthData.time}:00`,
        natal_latitude: birthData.latitude,
        natal_longitude: birthData.longitude,
        timezone: birthData.timezone
      }
    });
    
    console.log('✅ Current transits received');
    return response.data;
  } catch (error) {
    console.error('❌ Error getting transits:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================
// MAIN FUNCTION: Fetch All Data for Report
// ============================================

/**
 * Fetch all astrology data needed for the report
 */
async function fetchAllAstrologyData(birthData, reportType) {
  console.log('\n🌟 Starting to fetch all astrology data...\n');
  
  const results = {
    natalChart: null,
    astroLines: null,
    lineMeanings: null,
    paranMap: null,
    transits: null,
    powerZones: {
      india: null,
      international: null
    },
    optimalLocations: {
      career: { india: null, international: null },
      love: { india: null, international: null },
      wealth: { india: null, international: null },
      health: { india: null, international: null },
      creativity: { india: null, international: null },
      family: { india: null, international: null }
    },
    topCityAnalysis: null
  };

  try {
    // 1. Get basic chart data
    results.natalChart = await getNatalChart(birthData);
    
    // 2. Get astrocartography lines
    results.astroLines = await getAstrocartographyLines(birthData);
    
    // 3. Get line meanings (interpretations)
    try {
      results.lineMeanings = await getLineMeanings();
    } catch (e) {
      console.log('⚠️ Line meanings not available, continuing...');
      results.lineMeanings = {};
    }
    
    // 4. Get paran crossings
    try {
      results.paranMap = await generateParanMap(birthData);
    } catch (e) {
      console.log('⚠️ Paran map not available, continuing...');
      results.paranMap = { crossings: [] };
    }
    
    // 5. Get current transits (for timing recommendations)
    try {
      results.transits = await getCurrentTransits(birthData);
    } catch (e) {
      console.log('⚠️ Transits not available, continuing...');
      results.transits = {};
    }

    // 6. Get power zones and optimal locations based on report type
    const goals = ['career', 'love', 'wealth', 'health', 'creativity', 'family'];
    
    if (reportType === 'india' || reportType === 'combo') {
      // India data
      try {
        results.powerZones.india = await findPowerZones(birthData, { region: 'india', limit: 20 });
      } catch (e) {
        console.log('⚠️ India power zones not available');
      }
      
      for (const goal of goals) {
        try {
          results.optimalLocations[goal].india = await searchOptimalLocations(
            birthData, 
            goal, 
            { region: 'india', limit: 10 }
          );
        } catch (e) {
          console.log(`⚠️ India ${goal} locations not available`);
        }
      }
    }
    
    if (reportType === 'international' || reportType === 'combo') {
      // International data
      try {
        results.powerZones.international = await findPowerZones(birthData, { region: 'global', limit: 20 });
      } catch (e) {
        console.log('⚠️ International power zones not available');
      }
      
      for (const goal of goals) {
        try {
          results.optimalLocations[goal].international = await searchOptimalLocations(
            birthData, 
            goal, 
            { region: 'global', limit: 10 }
          );
        } catch (e) {
          console.log(`⚠️ International ${goal} locations not available`);
        }
      }
    }

    // 7. Deep analysis of top city
    const topCity = results.powerZones.india?.[0] || results.powerZones.international?.[0];
    if (topCity) {
      try {
        results.topCityAnalysis = await analyzeLocation(birthData, {
          name: topCity.name || topCity.city,
          latitude: topCity.latitude,
          longitude: topCity.longitude
        });
      } catch (e) {
        console.log('⚠️ Top city analysis not available');
      }
    }

    console.log('\n✅ All astrology data fetched successfully!\n');
    return results;

  } catch (error) {
    console.error('\n❌ Error fetching astrology data:', error.message);
    throw error;
  }
}

module.exports = {
  getAstrocartographyLines,
  findPowerZones,
  searchOptimalLocations,
  generateParanMap,
  calculateAstrodynes,
  analyzeLocation,
  getLineMeanings,
  compareLocations,
  getNatalChart,
  getCurrentTransits,
  fetchAllAstrologyData
};
