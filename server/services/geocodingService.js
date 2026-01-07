// ============================================
// SUMMITRA - Google Geocoding Service
// Converts city names to coordinates
// ============================================

const axios = require('axios');
const { trackExternalApiCall } = require('./apiTracker.js');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * Convert city name to coordinates
 * @param {string} cityName - e.g., "Mumbai, India"
 * @returns {object} - { lat, lng, formattedAddress, timezone }
 */
async function geocodeCity(cityName) {
  const startTime = Date.now();
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

    const responseTime = Date.now() - startTime;

    if (response.data.status !== 'OK') {
      trackExternalApiCall('/geocode', 'GET', 400, responseTime, 'Google');
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    trackExternalApiCall('/geocode', 'GET', 200, responseTime, 'Google');

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
    const responseTime = Date.now() - startTime;
    trackExternalApiCall('/geocode', 'GET', 500, responseTime, 'Google');
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
  const startTime = Date.now();
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

    const responseTime = Date.now() - startTime;

    if (response.data.status !== 'OK') {
      trackExternalApiCall('/timezone', 'GET', 400, responseTime, 'Google');
      console.log('⚠️ Timezone lookup failed, using default');
      return 'Asia/Kolkata';
    }

    trackExternalApiCall('/timezone', 'GET', 200, responseTime, 'Google');
    console.log(`✅ Timezone: ${response.data.timeZoneId}`);
    return response.data.timeZoneId;

  } catch (error) {
    const responseTime = Date.now() - startTime;
    trackExternalApiCall('/timezone', 'GET', 500, responseTime, 'Google');
    console.error('❌ Timezone error:', error.message);
    return 'Asia/Kolkata';
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

/**
 * Find nearest major international city to given coordinates
 * Uses a predefined list of major global cities
 */
function findNearestInternationalCity(lat, lng) {
  const majorInternationalCities = [
    // Europe
    { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
    { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
    { name: 'Berlin', country: 'Germany', lat: 52.5200, lng: 13.4050 },
    { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
    { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
    { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
    { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
    { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
    { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
    { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
    { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
    { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
    { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
    { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
    { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
    
    // Middle East
    { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
    { name: 'Abu Dhabi', country: 'UAE', lat: 24.4539, lng: 54.3773 },
    { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.5310 },
    { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
    { name: 'Tel Aviv', country: 'Israel', lat: 32.0853, lng: 34.7818 },
    { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
    
    // Asia Pacific
    { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
    { name: 'Hong Kong', country: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
    { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
    { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
    { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
    { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.1390, lng: 101.6869 },
    { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
    { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
    { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
    { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
    { name: 'Auckland', country: 'New Zealand', lat: -36.8509, lng: 174.7645 },
    { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
    { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
    { name: 'Taipei', country: 'Taiwan', lat: 25.0330, lng: 121.5654 },
    
    // North America
    { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
    { name: 'Los Angeles', country: 'USA', lat: 34.0522, lng: -118.2437 },
    { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 },
    { name: 'Chicago', country: 'USA', lat: 41.8781, lng: -87.6298 },
    { name: 'Miami', country: 'USA', lat: 25.7617, lng: -80.1918 },
    { name: 'Seattle', country: 'USA', lat: 47.6062, lng: -122.3321 },
    { name: 'Boston', country: 'USA', lat: 42.3601, lng: -71.0589 },
    { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
    { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
    { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
    { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
    
    // South America
    { name: 'São Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
    { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
    { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
    { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
    { name: 'Bogotá', country: 'Colombia', lat: 4.7110, lng: -74.0721 },
    { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
    
    // Africa
    { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
    { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
    { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
    { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
    { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
    { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898 },
    { name: 'Marrakech', country: 'Morocco', lat: 31.6295, lng: -7.9811 }
  ];

  // Calculate distance to each city and find nearest
  let nearestCity = majorInternationalCities[0];
  let minDistance = Infinity;

  for (const city of majorInternationalCities) {
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

module.exports = {
  geocodeCity,
  getTimezone,
  getLocationData,
  reverseGeocode,
  findNearestIndianCity,
  findNearestInternationalCity,
  mapZonesToIndianCities
};
