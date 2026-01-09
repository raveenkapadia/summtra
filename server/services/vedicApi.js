import axios from 'axios';

const ASTROLOGY_API_USER_ID = process.env.ASTROLOGY_API_USER_ID;
const ASTROLOGY_API_KEY = process.env.ASTROLOGY_API_KEY;
const BASE_URL = 'https://json.astrologyapi.com/v1';

export const DASHA_MEANINGS = {
  'Sun': {
    theme: 'Authority, Recognition, Government',
    goodFor: ['Leadership roles', 'Government jobs', 'Public recognition'],
    caution: 'Ego conflicts possible',
    careerFit: 'Leadership, Politics, Management',
    relocationTip: 'Good for moves related to career authority'
  },
  'Moon': {
    theme: 'Emotions, Home, Mother, Travel',
    goodFor: ['Relocation', 'Real estate', 'Public-facing roles'],
    caution: 'Emotional decisions',
    careerFit: 'Healthcare, Hospitality, Public relations',
    relocationTip: 'Excellent period for relocation and settling'
  },
  'Mars': {
    theme: 'Energy, Action, Property, Courage',
    goodFor: ['Property purchase', 'New ventures', 'Technical fields'],
    caution: 'Aggression, rushed decisions',
    careerFit: 'Engineering, Sports, Military, Surgery',
    relocationTip: 'Good for bold moves, property buying'
  },
  'Mercury': {
    theme: 'Communication, Business, Learning',
    goodFor: ['Education', 'Business', 'Writing', 'IT'],
    caution: 'Overthinking, scattered focus',
    careerFit: 'IT, Business, Writing, Teaching',
    relocationTip: 'Good for education or business-related moves'
  },
  'Jupiter': {
    theme: 'Wisdom, Expansion, Luck, Teaching',
    goodFor: ['Higher education', 'Spiritual growth', 'Career expansion'],
    caution: 'Over-optimism, overcommitment',
    careerFit: 'Teaching, Law, Finance, Consulting',
    relocationTip: 'Excellent for career growth moves'
  },
  'Venus': {
    theme: 'Love, Luxury, Creativity, Comfort',
    goodFor: ['Relationships', 'Arts', 'Comfort', 'Luxury'],
    caution: 'Overspending, overindulgence',
    careerFit: 'Arts, Design, Entertainment, Luxury',
    relocationTip: 'Good for lifestyle and relationship moves'
  },
  'Saturn': {
    theme: 'Discipline, Hard work, Long-term gains',
    goodFor: ['Career building', 'Structured progress', 'Real estate'],
    caution: 'Delays, patience required',
    careerFit: 'Management, Law, Real Estate, Government',
    relocationTip: 'Good for permanent, long-term moves'
  },
  'Rahu': {
    theme: 'Ambition, Foreign, Unconventional',
    goodFor: ['Foreign travel', 'Tech careers', 'Breaking patterns'],
    caution: 'Confusion, shortcuts tempting',
    careerFit: 'Technology, Foreign companies, Research',
    relocationTip: 'Excellent for international moves'
  },
  'Ketu': {
    theme: 'Spirituality, Detachment, Past karma',
    goodFor: ['Spiritual pursuits', 'Research', 'Healing'],
    caution: 'Isolation, unexpected changes',
    careerFit: 'Research, Spirituality, Alternative medicine',
    relocationTip: 'Moves may feel destined or karmic'
  }
};

function getAuthHeader() {
  const auth = Buffer.from(`${ASTROLOGY_API_USER_ID}:${ASTROLOGY_API_KEY}`).toString('base64');
  return `Basic ${auth}`;
}

function formatBirthData(birthData) {
  const [day, month, year] = birthData.birthDate.split('/').map(Number);
  const [hour, min] = birthData.birthTime.split(':').map(Number);
  
  const longitude = parseFloat(birthData.longitude) || 77.2;
  const timezone = Math.round(longitude / 15 * 2) / 2;
  
  return {
    day,
    month,
    year,
    hour,
    min,
    lat: parseFloat(birthData.latitude),
    lon: longitude,
    tzone: timezone
  };
}

async function callAstrologyApi(endpoint, birthData) {
  const formattedData = formatBirthData(birthData);
  
  try {
    const response = await axios.post(`${BASE_URL}/${endpoint}`, formattedData, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Language': 'en'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Vedic API error (${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
}

export async function getPlanets(birthData) {
  return callAstrologyApi('planets', birthData);
}

export async function getMahaDasha(birthData) {
  return callAstrologyApi('major_vdasha', birthData);
}

export async function getCurrentDasha(birthData) {
  return callAstrologyApi('current_vdasha', birthData);
}

export async function getDailyNakshatraPrediction(birthData) {
  return callAstrologyApi('daily_nakshatra_prediction', birthData);
}

const PLANET_API_NAMES = {
  'Sun': 'sun', 'Moon': 'moon', 'Mars': 'mars',
  'Mercury': 'mercury', 'Jupiter': 'jupiter', 'Venus': 'venus',
  'Saturn': 'saturn', 'Rahu': 'rahu', 'Ketu': 'ketu'
};

export async function getAntardashaTimeline(birthData, mahadashaPlanet) {
  const apiName = PLANET_API_NAMES[mahadashaPlanet];
  if (!apiName) {
    console.error('Unknown mahadasha planet:', mahadashaPlanet);
    return null;
  }
  
  const formattedData = formatBirthData(birthData);
  
  try {
    const response = await axios.post(`${BASE_URL}/sub_vdasha/${apiName}`, formattedData, {
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
        'Accept-Language': 'en'
      }
    });
    return response.data.sub_dasha || response.data;
  } catch (error) {
    console.error('Error fetching Antardasha timeline:', error.response?.data || error.message);
    return null;
  }
}

export async function getVedicProfile(birthData) {
  try {
    const planets = await getPlanets(birthData);
    
    const moon = planets.find(p => p.name === 'Moon');
    const sun = planets.find(p => p.name === 'Sun');
    const ascendant = planets.find(p => p.name === 'Ascendant');
    
    let currentDasha = null;
    try {
      currentDasha = await getCurrentDasha(birthData);
    } catch (e) {
      console.log('Current dasha not available, trying maha dasha');
      const mahaDasha = await getMahaDasha(birthData);
      if (mahaDasha && mahaDasha.length > 0) {
        const now = new Date();
        currentDasha = mahaDasha.find(d => {
          const startParts = d.start.split(/[-\s:]/);
          const endParts = d.end.split(/[-\s:]/);
          const start = new Date(startParts[2], startParts[1] - 1, startParts[0]);
          const end = new Date(endParts[2], endParts[1] - 1, endParts[0]);
          return now >= start && now <= end;
        });
      }
    }
    
    return {
      rashi: moon?.sign || null,
      rashiLord: moon?.signLord || null,
      nakshatra: moon?.nakshatra || null,
      nakshatraLord: moon?.nakshatraLord || null,
      nakshatraPada: moon?.nakshatra_pad || null,
      lagna: ascendant?.sign || null,
      lagnaLord: ascendant?.signLord || null,
      sunSign: sun?.sign || null,
      currentDashaLord: currentDasha?.planet || currentDasha?.major || null,
      currentDashaEnd: currentDasha?.end || null,
      planets: planets.map(p => ({
        name: p.name,
        sign: p.sign,
        house: p.house,
        nakshatra: p.nakshatra,
        isRetro: p.isRetro === 'true' || p.isRetro === true
      }))
    };
  } catch (error) {
    console.error('Error getting Vedic profile:', error);
    throw error;
  }
}

export function getDashaInsight(dashaLord, cityLines = []) {
  const dashaInfluence = {
    'Sun': { favorable: ['MC', 'AC'], description: 'Leadership, authority, recognition', element: 'fire' },
    'Moon': { favorable: ['AC', 'IC'], description: 'Emotional wellbeing, home, comfort', element: 'water' },
    'Mars': { favorable: ['MC', 'AC'], description: 'Energy, action, competition', element: 'fire' },
    'Mercury': { favorable: ['MC', 'AC'], description: 'Communication, business, learning', element: 'earth' },
    'Jupiter': { favorable: ['MC', 'AC'], description: 'Growth, wisdom, prosperity', element: 'ether' },
    'Venus': { favorable: ['AC', 'DC'], description: 'Love, beauty, relationships', element: 'water' },
    'Saturn': { favorable: ['MC', 'IC'], description: 'Discipline, stability, long-term gains', element: 'air' },
    'Rahu': { favorable: ['MC', 'AC'], description: 'Ambition, unconventional success', element: 'air' },
    'Ketu': { favorable: ['IC', 'DC'], description: 'Spiritual growth, detachment', element: 'fire' }
  };
  
  const influence = dashaInfluence[dashaLord];
  if (!influence) return { supports: null, dashaLord, reason: 'Unknown dasha lord', description: '' };
  
  if (cityLines && cityLines.length > 0) {
    const hasStrongLine = cityLines.some(line => {
      const planet = (line.planet || '').toLowerCase();
      const lineType = line.lineType || line.type || '';
      return planet === dashaLord.toLowerCase() && influence.favorable.includes(lineType);
    });
    
    return {
      supports: hasStrongLine,
      dashaLord,
      description: influence.description,
      reason: hasStrongLine 
        ? `${dashaLord} dasha aligns with planetary influence in this city`
        : `${dashaLord} dasha has neutral influence here`
    };
  }
  
  return {
    supports: true,
    dashaLord,
    description: influence.description,
    reason: `Currently in ${dashaLord} dasha period - ${influence.description}`
  };
}

export function getNakshatraDirection(nakshatra) {
  const nakshatraDirections = {
    'Ashwini': 'East',
    'Bharani': 'East',
    'Krittika': 'East',
    'Rohini': 'East',
    'Mrigashira': 'South',
    'Ardra': 'North',
    'Punarvasu': 'North',
    'Pushya': 'North',
    'Ashlesha': 'South',
    'Magha': 'South',
    'Purva Phalguni': 'South',
    'Uttara Phalguni': 'East',
    'Hasta': 'South',
    'Chitra': 'West',
    'Swati': 'North',
    'Vishakha': 'East',
    'Anuradha': 'South',
    'Jyeshtha': 'South',
    'Mula': 'West',
    'Purva Ashadha': 'South',
    'Uttara Ashadha': 'South',
    'Shravana': 'North',
    'Dhanishta': 'West',
    'Shatabhisha': 'South',
    'Purva Bhadrapada': 'West',
    'Uttara Bhadrapada': 'North',
    'Revati': 'West'
  };
  
  return nakshatraDirections[nakshatra] || null;
}

export function getDirectionFromBirthPlace(birthLat, birthLon, cityLat, cityLon) {
  const latDiff = cityLat - birthLat;
  const lonDiff = cityLon - birthLon;
  
  const angle = Math.atan2(lonDiff, latDiff) * (180 / Math.PI);
  
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

export function checkNakshatraDirectionMatch(nakshatra, birthLat, birthLon, cityLat, cityLon) {
  const favorableDirection = getNakshatraDirection(nakshatra);
  const actualDirection = getDirectionFromBirthPlace(birthLat, birthLon, cityLat, cityLon);
  
  if (!favorableDirection) {
    return { matches: null, reason: 'Nakshatra direction not available' };
  }
  
  const matches = actualDirection.includes(favorableDirection);
  
  return {
    matches,
    favorableDirection,
    actualDirection,
    reason: matches 
      ? `City is in your favorable ${favorableDirection} direction based on ${nakshatra} nakshatra`
      : `City is ${actualDirection}, your favorable direction is ${favorableDirection}`
  };
}
