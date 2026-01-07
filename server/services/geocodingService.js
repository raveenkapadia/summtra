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

/**
 * Reverse geocode coordinates to get city name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {object} - { cityName, state, country, formattedAddress }
 */
async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get(
      'https://maps.googleapis.com/maps/api/geocode/json',
      {
        params: {
          latlng: `${lat},${lng}`,
          key: GOOGLE_API_KEY,
          result_type: 'locality|administrative_area_level_2|administrative_area_level_1'
        }
      }
    );

    if (response.data.status !== 'OK' || !response.data.results.length) {
      return null;
    }

    const result = response.data.results[0];
    
    // Extract city, state, country from address components
    let cityName = '';
    let state = '';
    let country = '';
    
    for (const component of result.address_components) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
      }
      if (component.types.includes('administrative_area_level_2') && !cityName) {
        cityName = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.long_name;
      }
      if (component.types.includes('country')) {
        country = component.long_name;
      }
    }

    return {
      cityName: cityName || state || 'Unknown',
      state,
      country,
      formattedAddress: result.formatted_address
    };

  } catch (error) {
    console.error('❌ Reverse geocoding error:', error.message);
    return null;
  }
}

/**
 * Find nearest major Indian city to given coordinates
 * Uses a predefined list of major Indian cities to find the closest one
 */
function findNearestIndianCity(lat, lng) {
  const majorIndianCities = [
    { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi', state: 'Delhi', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
    { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867 },
    { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567 },
    { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
    { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462 },
    { name: 'Chandigarh', state: 'Punjab', lat: 30.7333, lng: 76.7794 },
    { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126 },
    { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673 },
    { name: 'Goa', state: 'Goa', lat: 15.2993, lng: 74.1240 },
    { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739 },
    { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125 },
    { name: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394 },
    { name: 'Rishikesh', state: 'Uttarakhand', lat: 30.0869, lng: 78.2676 },
    { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723 },
    { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734 },
    { name: 'Darjeeling', state: 'West Bengal', lat: 27.0410, lng: 88.2663 },
    { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081 },
    { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311 },
    { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882 },
    { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577 },
    { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366 },
    { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558 },
    { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185 },
    { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
    { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 }
  ];

  // Calculate distance to each city and find nearest
  let nearestCity = majorIndianCities[0];
  let minDistance = Infinity;

  for (const city of majorIndianCities) {
    const distance = Math.sqrt(
      Math.pow(lat - city.lat, 2) + Math.pow(lng - city.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestCity = city;
    }
  }

  return nearestCity;
}

/**
 * Get Indian cities based on planetary power zones
 * Maps power zone coordinates to nearest major Indian cities
 */
function mapZonesToIndianCities(zones) {
  const usedCities = new Set();
  const mappedCities = [];

  for (const zone of zones) {
    // Find nearest Indian city to this zone's coordinates
    const nearestCity = findNearestIndianCity(zone.latitude || 0, zone.longitude || 0);
    
    // Avoid duplicates - if city already used, skip or find alternative
    if (!usedCities.has(nearestCity.name)) {
      usedCities.add(nearestCity.name);
      mappedCities.push({
        ...zone,
        name: nearestCity.name,
        state: nearestCity.state,
        country: 'India',
        originalCoordinates: { lat: zone.latitude, lng: zone.longitude },
        mappedCoordinates: { lat: nearestCity.lat, lng: nearestCity.lng }
      });
    }
  }

  return mappedCities;
}

module.exports = {
  geocodeCity,
  getTimezone,
  getLocationData,
  reverseGeocode,
  findNearestIndianCity,
  mapZonesToIndianCities
};
