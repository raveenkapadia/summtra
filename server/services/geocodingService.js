// ============================================
// SUMMITRA - Google Geocoding Service
// Converts city names to coordinates
// ============================================

const axios = require('axios');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * Convert city name to coordinates
 * @param {string} cityName - e.g., "Mumbai, India"
 * @returns {object} - { lat, lng, formattedAddress, timezone }
 */
async function geocodeCity(cityName) {
  try {
    console.log(`📍 Geocoding: ${cityName}`);
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          address: cityName,
          key: GOOGLE_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    const location = result.geometry.location;

    console.log(`✅ Found: ${result.formatted_address}`);
    console.log(`   Coordinates: ${location.lat}, ${location.lng}`);

    return {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      placeId: result.place_id
    };

  } catch (error) {
    console.error('❌ Geocoding error:', error.message);
    throw error;
  }
}

/**
 * Get timezone for coordinates
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string} - timezone ID e.g., "Asia/Kolkata"
 */
async function getTimezone(lat, lng) {
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/timezone/json',
      {
        params: {
          location: `${lat},${lng}`,
          timestamp: timestamp,
          key: GOOGLE_API_KEY
        }
      }
    );

    if (response.data.status !== 'OK') {
      console.log('⚠️ Timezone lookup failed, using default');
      return 'Asia/Kolkata';
    }

    console.log(`✅ Timezone: ${response.data.timeZoneId}`);
    return response.data.timeZoneId;

  } catch (error) {
    console.error('❌ Timezone error:', error.message);
    return 'Asia/Kolkata'; // Default fallback
  }
}

/**
 * Complete location lookup - city to coordinates + timezone
 */
async function getLocationData(cityName) {
  const coords = await geocodeCity(cityName);
  const timezone = await getTimezone(coords.lat, coords.lng);
  
  return {
    ...coords,
    timezone
  };
}

module.exports = {
  geocodeCity,
  getTimezone,
  getLocationData
};
