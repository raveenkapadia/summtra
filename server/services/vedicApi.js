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

export const NAKSHATRA_DIRECTIONS = {
  'Ashwini': 'South',
  'Bharani': 'East',
  'Krittika': 'North',
  'Rohini': 'East',
  'Mrigashira': 'South',
  'Ardra': 'North',
  'Punarvasu': 'North',
  'Pushya': 'East',
  'Ashlesha': 'South',
  'Magha': 'East',
  'Purva Phalguni': 'South',
  'Uttara Phalguni': 'North',
  'Hasta': 'East',
  'Chitra': 'South',
  'Swati': 'Southwest',
  'Vishakha': 'East',
  'Anuradha': 'South',
  'Jyeshtha': 'South',
  'Mula': 'South',
  'Purva Ashadha': 'South',
  'Uttara Ashadha': 'North',
  'Shravana': 'North',
  'Dhanishta': 'East',
  'Shatabhisha': 'South',
  'Purva Bhadrapada': 'North',
  'Uttara Bhadrapada': 'North',
  'Revati': 'East'
};

export function getNakshatraDirection(nakshatra) {
  return NAKSHATRA_DIRECTIONS[nakshatra] || null;
}

export function checkNakshatraCityMatch(nakshatra, cityDirection) {
  if (!nakshatra || !cityDirection) {
    return { matches: null, icon: '?', reason: 'Missing nakshatra or direction data' };
  }
  
  const favorableDirection = NAKSHATRA_DIRECTIONS[nakshatra];
  if (!favorableDirection) {
    return { matches: null, icon: '?', reason: 'Nakshatra not recognized' };
  }
  
  // Exact match for primary direction
  const isExactMatch = cityDirection.toLowerCase() === favorableDirection.toLowerCase();
  
  // Partial match if city direction contains the favorable direction (e.g., Northeast contains North)
  const isPartialMatch = !isExactMatch && (
    cityDirection.toLowerCase().includes(favorableDirection.toLowerCase()) ||
    favorableDirection.toLowerCase().includes(cityDirection.toLowerCase())
  );
  
  return {
    matches: isExactMatch,
    partial: isPartialMatch,
    icon: isExactMatch ? '✅' : '⚠️',
    nakshatra,
    favorableDirection,
    cityDirection,
    reason: isExactMatch 
      ? `${cityDirection} matches ${nakshatra}'s favorable direction (${favorableDirection})`
      : isPartialMatch
        ? `${cityDirection} partially aligns with ${nakshatra}'s direction (${favorableDirection})`
        : `${cityDirection} differs from ${nakshatra}'s favorable direction (${favorableDirection})`
  };
}

export function getCityNakshatraInfo(nakshatra, birthLat, birthLon, cityLat, cityLon) {
  const direction = getDirectionFromBirthPlace(birthLat, birthLon, cityLat, cityLon);
  const match = checkNakshatraCityMatch(nakshatra, direction);
  
  return {
    direction,
    nakshatraMatch: match.icon,
    isMatch: match.matches,
    isPartial: match.partial,
    favorableDirection: match.favorableDirection,
    reason: match.reason
  };
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

export const LAGNA_FAVORABLE_DIRECTIONS = {
  'Aries': ['East', 'South', 'Southeast'],
  'Taurus': ['South', 'West', 'Southwest'],
  'Gemini': ['West', 'North', 'Northwest'],
  'Cancer': ['North', 'East', 'Northeast'],
  'Leo': ['East', 'South', 'Southeast'],
  'Virgo': ['South', 'West', 'Southwest'],
  'Libra': ['West', 'North', 'Northwest'],
  'Scorpio': ['North', 'East', 'Northeast'],
  'Sagittarius': ['East', 'South', 'Northeast'],
  'Capricorn': ['South', 'West', 'Southwest'],
  'Aquarius': ['West', 'North', 'Northwest'],
  'Pisces': ['North', 'East', 'Northeast']
};

export function checkVastuDirection(lagna, direction) {
  if (!lagna || !direction) {
    return { favorable: null, icon: '?', reason: 'Missing lagna or direction data' };
  }
  
  const favorableDirections = LAGNA_FAVORABLE_DIRECTIONS[lagna];
  if (!favorableDirections) {
    return { favorable: null, icon: '?', reason: 'Lagna not recognized' };
  }
  
  // Exact match for direction (case-insensitive)
  const isFavorable = favorableDirections.some(d => 
    direction.toLowerCase() === d.toLowerCase()
  );
  
  return {
    favorable: isFavorable,
    icon: isFavorable ? '✅' : '⚠️',
    direction,
    lagna,
    favorableDirections,
    reason: isFavorable 
      ? `${direction} is favorable for ${lagna} Lagna`
      : `${direction} is neutral for ${lagna} Lagna (favorable: ${favorableDirections.join(', ')})`
  };
}

export function getCityVastuInfo(lagna, birthLat, birthLon, cityLat, cityLon) {
  const direction = getDirectionFromBirthPlace(birthLat, birthLon, cityLat, cityLon);
  const vastu = checkVastuDirection(lagna, direction);
  
  return {
    direction,
    vastu: vastu.icon,
    vastuFavorable: vastu.favorable,
    vastuReason: vastu.reason
  };
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-\s:]/);
  if (parts.length >= 3) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts[2];
    return `${months[month]} ${year}`;
  }
  return dateStr;
}

function parseDateString(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-\s:]/);
  if (parts.length >= 3) {
    return new Date(parts[2], parseInt(parts[1]) - 1, parseInt(parts[0]));
  }
  return new Date(dateStr);
}

export function formatDashaTimeline(mahadasha, antardashaList, mahadashaMeaning = null) {
  if (!antardashaList || !Array.isArray(antardashaList)) {
    return { periods: [], current: null };
  }
  
  const today = new Date();
  let currentPeriod = null;
  
  const periods = antardashaList.map(period => {
    const start = parseDateString(period.start);
    const end = parseDateString(period.end);
    
    let status;
    if (end < today) status = 'past';
    else if (start <= today && end >= today) status = 'current';
    else status = 'future';
    
    const periodData = {
      name: `${mahadasha}-${period.planet}`,
      planet: period.planet,
      startDate: formatDate(period.start),
      endDate: formatDate(period.end),
      dates: `${formatDate(period.start)} - ${formatDate(period.end)}`,
      status,
      statusIcon: status === 'past' ? '✓' : status === 'current' ? '⬤' : '○',
      statusLabel: status === 'past' ? 'Past' : status === 'current' ? 'NOW' : 'Future',
      isCurrent: status === 'current',
      meaning: DASHA_MEANINGS[period.planet] || null
    };
    
    if (status === 'current') {
      currentPeriod = periodData;
    }
    
    return periodData;
  });
  
  return {
    mahadasha: {
      planet: mahadasha,
      meaning: DASHA_MEANINGS[mahadasha] || mahadashaMeaning,
      startDate: periods.length > 0 ? periods[0].startDate : null,
      endDate: periods.length > 0 ? periods[periods.length - 1].endDate : null
    },
    periods,
    current: currentPeriod
  };
}

export function generateDashaTimelineHTML(timelineData) {
  if (!timelineData || !timelineData.periods || timelineData.periods.length === 0) {
    return '<p>Dasha timeline not available</p>';
  }
  
  const { mahadasha, periods, current } = timelineData;
  
  let html = `
    <div class="dasha-timeline">
      <h3>YOUR DASHA TIMELINE</h3>
      <div class="mahadasha-header">
        <strong>MAHADASHA: ${mahadasha.planet}</strong> (${mahadasha.startDate} → ${mahadasha.endDate})
        ${mahadasha.meaning ? `<br><em>Theme: ${mahadasha.meaning.theme}</em>` : ''}
      </div>
      
      <h4>ANTARDASHA PERIODS (Sub-Periods):</h4>
      <table class="antardasha-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Dates</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  periods.forEach(period => {
    const rowClass = period.isCurrent ? 'current-period' : period.status === 'past' ? 'past-period' : 'future-period';
    html += `
          <tr class="${rowClass}">
            <td>${period.name}</td>
            <td>${period.dates}</td>
            <td>${period.statusIcon} ${period.statusLabel}</td>
          </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
  `;
  
  if (current) {
    html += `
      <div class="current-dasha-highlight">
        <strong>CURRENT: ${current.name}</strong> (until ${current.endDate})
        ${current.meaning ? `
          <br>Theme: ${current.meaning.theme}
          <br>Best for: ${current.meaning.goodFor.join(', ')}
          <br>Relocation tip: ${current.meaning.relocationTip}
        ` : ''}
      </div>
    `;
  }
  
  html += '</div>';
  
  return html;
}

export function generateTimingSummary(vedicProfile, topCities, antardashaTimeline) {
  const currentMaha = vedicProfile?.currentDashaLord;
  const currentDashaEnd = vedicProfile?.currentDashaEnd;
  
  if (!currentMaha || !antardashaTimeline || !Array.isArray(antardashaTimeline)) {
    return null;
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  function formatDateStr(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split(/[-\s:]/);
    if (parts.length >= 3) {
      return `${months[parseInt(parts[1]) - 1]} ${parts[2]}`;
    }
    return dateStr;
  }
  
  function parseDateStr(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(/[-\s:]/);
    if (parts.length >= 3) {
      return new Date(parts[2], parseInt(parts[1]) - 1, parseInt(parts[0]));
    }
    return new Date(dateStr);
  }
  
  // Find current antardasha
  const now = new Date();
  const currentAntar = antardashaTimeline.find(period => {
    const start = parseDateStr(period.start);
    const end = parseDateStr(period.end);
    return start && end && now >= start && now <= end;
  });
  
  // Get upcoming periods
  const upcoming = antardashaTimeline
    .filter(p => {
      const start = parseDateStr(p.start);
      return start && start > now;
    })
    .slice(0, 3);
  
  // Match cities to periods
  const cityTimingMap = (topCities || []).map(city => {
    const cityLines = city.lines || [];
    const cityPlanets = cityLines.map(line => {
      if (typeof line === 'string') return line.split('-')[0];
      return line.planet || '';
    }).filter(Boolean);
    
    const bestPeriod = antardashaTimeline.find(period => {
      const start = parseDateStr(period.start);
      return start && start > now && cityPlanets.some(p => 
        p.toLowerCase() === period.planet.toLowerCase()
      );
    });
    
    return {
      city: city.name,
      lines: cityLines.map(l => typeof l === 'string' ? l : `${l.planet}-${l.lineType}`).join(', '),
      bestPeriod: bestPeriod ? {
        planet: bestPeriod.planet,
        dates: `${formatDateStr(bestPeriod.start)} - ${formatDateStr(bestPeriod.end)}`,
        label: `${currentMaha}-${bestPeriod.planet}`
      } : null,
      currentOkay: !bestPeriod
    };
  }).filter(c => c.bestPeriod || c.lines);
  
  return {
    mahadasha: {
      planet: currentMaha,
      meaning: DASHA_MEANINGS[currentMaha]
    },
    current: currentAntar ? {
      period: `${currentMaha}-${currentAntar.planet}`,
      dates: `${formatDateStr(currentAntar.start)} - ${formatDateStr(currentAntar.end)}`,
      planet: currentAntar.planet,
      meaning: DASHA_MEANINGS[currentAntar.planet]
    } : null,
    upcoming: upcoming.map(p => ({
      period: `${currentMaha}-${p.planet}`,
      planet: p.planet,
      dates: `${formatDateStr(p.start)} - ${formatDateStr(p.end)}`,
      meaning: DASHA_MEANINGS[p.planet]
    })),
    cityTimingMap
  };
}

export function generateTimingSummaryText(summary) {
  if (!summary) return 'Timing summary not available';
  
  let text = `
BEST RELOCATION WINDOWS FOR YOU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

  if (summary.current) {
    text += `CURRENT PERIOD: ${summary.current.period} (${summary.current.dates})
┌────────────────────────────────────────────────┐
│ Theme: ${summary.current.meaning?.theme || 'N/A'}
│ Best for: ${summary.current.meaning?.goodFor?.join(', ') || 'N/A'}
│ Favorable cities: Those with ${summary.current.planet}/${summary.mahadasha.planet} lines
└────────────────────────────────────────────────┘

`;
  }

  if (summary.upcoming && summary.upcoming.length > 0) {
    text += `UPCOMING FAVORABLE PERIODS:

`;
    summary.upcoming.forEach(p => {
      text += `⭐ ${p.period} (${p.dates})
   Theme: ${p.meaning?.theme || 'N/A'}
   Best for: ${p.meaning?.goodFor?.join(', ') || 'N/A'}
   Look for cities with: ${p.planet} lines
   
`;
    });
  }

  if (summary.cityTimingMap && summary.cityTimingMap.length > 0) {
    text += `YOUR TOP CITIES BY TIMING:
┌─────────────────────────────────────────────────┐
│ City          │ Lines          │ Best Period    │
├─────────────────────────────────────────────────┤
`;
    summary.cityTimingMap.forEach(c => {
      const cityPad = (c.city || '').substring(0, 12).padEnd(12);
      const linesPad = (c.lines || '').substring(0, 14).padEnd(14);
      const periodPad = c.bestPeriod ? `${c.bestPeriod.dates} ⭐` : 'Current okay';
      text += `│ ${cityPad} │ ${linesPad} │ ${periodPad}
`;
    });
    text += `└─────────────────────────────────────────────────┘
`;
  }

  return text;
}

export function generateTimingSummaryHTML(summary) {
  if (!summary) return '<p>Timing summary not available</p>';
  
  let html = `
    <div class="timing-summary">
      <h3>BEST RELOCATION WINDOWS FOR YOU</h3>
  `;

  if (summary.current) {
    html += `
      <div class="current-period-box">
        <h4>CURRENT PERIOD: ${summary.current.period}</h4>
        <div class="period-dates">${summary.current.dates}</div>
        <div class="period-details">
          <div><strong>Theme:</strong> ${summary.current.meaning?.theme || 'N/A'}</div>
          <div><strong>Best for:</strong> ${summary.current.meaning?.goodFor?.join(', ') || 'N/A'}</div>
          <div><strong>Favorable cities:</strong> Those with ${summary.current.planet}/${summary.mahadasha.planet} lines</div>
        </div>
      </div>
    `;
  }

  if (summary.upcoming && summary.upcoming.length > 0) {
    html += `<h4>UPCOMING FAVORABLE PERIODS:</h4>`;
    summary.upcoming.forEach(p => {
      html += `
        <div class="upcoming-period-card">
          <div class="period-star">⭐ ${p.period} (${p.dates})</div>
          <div class="period-theme">Theme: ${p.meaning?.theme || 'N/A'}</div>
          <div class="period-best">Best for: ${p.meaning?.goodFor?.join(', ') || 'N/A'}</div>
          <div class="period-cities">Look for cities with: ${p.planet} lines</div>
        </div>
      `;
    });
  }

  if (summary.cityTimingMap && summary.cityTimingMap.length > 0) {
    html += `
      <h4>YOUR TOP CITIES BY TIMING:</h4>
      <table class="city-timing-table">
        <thead>
          <tr><th>City</th><th>Lines</th><th>Best Period</th></tr>
        </thead>
        <tbody>
    `;
    summary.cityTimingMap.forEach(c => {
      html += `
        <tr>
          <td>${c.city}</td>
          <td>${c.lines}</td>
          <td>${c.bestPeriod ? `${c.bestPeriod.dates} ⭐` : 'Current okay'}</td>
        </tr>
      `;
    });
    html += `</tbody></table>`;
  }

  html += '</div>';
  return html;
}

export function generateRecommendation(match, cityName) {
  if (match.matchLevel === 'EXCELLENT') {
    return `Excellent time to move! Your current Dasha aligns with ${cityName}'s planetary lines.`;
  } else if (match.matchLevel === 'GOOD') {
    return `Good timing for ${cityName}. Your Dasha partially aligns.`;
  } else if (match.upcomingMatches && match.upcomingMatches.length > 0) {
    const next = match.upcomingMatches[0];
    const parts = next.start?.split(/[-\s:]/);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startFormatted = parts ? `${months[parseInt(parts[1]) - 1]} ${parts[2]}` : next.start;
    return `Consider moving after ${startFormatted} when ${next.planet} Antardasha activates this city's ${next.planet} line.`;
  } else {
    return `Timing is neutral. Focus on astrocartography score for this city.`;
  }
}

export function generateTimingSection(city, vedicProfile, antardashaTimeline) {
  const currentMaha = vedicProfile?.currentDashaLord;
  const currentDashaEnd = vedicProfile?.currentDashaEnd;
  
  if (!currentMaha) {
    return null;
  }
  
  let currentAntar = null;
  if (antardashaTimeline && Array.isArray(antardashaTimeline)) {
    const now = new Date();
    const current = antardashaTimeline.find(period => {
      const parts = period.start?.split(/[-\s:]/);
      const endParts = period.end?.split(/[-\s:]/);
      if (parts && endParts && parts.length >= 3 && endParts.length >= 3) {
        const start = new Date(parts[2], parseInt(parts[1]) - 1, parseInt(parts[0]));
        const end = new Date(endParts[2], parseInt(endParts[1]) - 1, parseInt(endParts[0]));
        return now >= start && now <= end;
      }
      return false;
    });
    currentAntar = current?.planet;
  }
  
  const dashaInfo = {
    mahadasha: { planet: currentMaha },
    current: { planet: currentAntar }
  };
  
  const match = getDashaCityMatch(city, dashaInfo, antardashaTimeline || []);
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let currentDashaEndFormatted = currentDashaEnd;
  if (currentDashaEnd) {
    const parts = currentDashaEnd.split(/[-\s:]/);
    if (parts.length >= 3) {
      currentDashaEndFormatted = `${months[parseInt(parts[1]) - 1]} ${parts[2]}`;
    }
  }
  
  return {
    currentDasha: currentAntar ? `${currentMaha}-${currentAntar}` : currentMaha,
    currentDashaEnd: currentDashaEndFormatted,
    cityLines: (city.lines || []).join(', '),
    matchIcon: match.icon,
    matchLevel: match.matchLevel,
    matchMessage: match.message,
    upcomingWindows: match.upcomingMatches.map(m => {
      const parts = m.start?.split(/[-\s:]/);
      const endParts = m.end?.split(/[-\s:]/);
      return {
        planet: m.planet,
        startFormatted: parts ? `${months[parseInt(parts[1]) - 1]} ${parts[2]}` : m.start,
        endFormatted: endParts ? `${months[parseInt(endParts[1]) - 1]} ${endParts[2]}` : m.end
      };
    }),
    recommendation: generateRecommendation(match, city.name)
  };
}

export function getDashaCityMatch(city, dashaInfo, antardashaTimeline) {
  const cityLines = city.lines || [];
  
  const cityPlanets = cityLines.map(line => {
    if (typeof line === 'string') {
      return line.split('-')[0];
    }
    return line.planet || '';
  }).filter(Boolean);
  
  const currentMaha = dashaInfo?.mahadasha?.planet || dashaInfo?.currentDashaLord;
  const currentAntar = dashaInfo?.current?.planet || dashaInfo?.antardasha?.planet;
  
  const mahaMatch = cityPlanets.some(p => p.toLowerCase() === (currentMaha || '').toLowerCase());
  const antarMatch = currentAntar && cityPlanets.some(p => p.toLowerCase() === currentAntar.toLowerCase());
  
  const upcomingMatches = (antardashaTimeline || [])
    .filter(period => {
      const parts = period.start?.split(/[-\s:]/);
      if (parts && parts.length >= 3) {
        const startDate = new Date(parts[2], parseInt(parts[1]) - 1, parseInt(parts[0]));
        return startDate > new Date();
      }
      return false;
    })
    .filter(period => cityPlanets.some(p => p.toLowerCase() === period.planet.toLowerCase()))
    .slice(0, 2);
  
  let matchLevel, icon, message;
  
  if (mahaMatch && antarMatch) {
    matchLevel = 'EXCELLENT';
    icon = '⭐⭐⭐';
    message = `Perfect timing! Both ${currentMaha} and ${currentAntar} lines active.`;
  } else if (mahaMatch || antarMatch) {
    matchLevel = 'GOOD';
    icon = '⭐⭐';
    const matchedPlanet = mahaMatch ? currentMaha : currentAntar;
    message = `Good timing - ${matchedPlanet} line matches your current Dasha.`;
  } else if (upcomingMatches.length > 0) {
    matchLevel = 'FUTURE';
    icon = '⭐';
    const nextMatch = upcomingMatches[0];
    const parts = nextMatch.start?.split(/[-\s:]/);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startFormatted = parts ? `${months[parseInt(parts[1]) - 1]} ${parts[2]}` : nextMatch.start;
    message = `Better timing: ${currentMaha}-${nextMatch.planet} period (${startFormatted})`;
  } else {
    matchLevel = 'NEUTRAL';
    icon = '○';
    message = 'Timing is neutral - no Dasha-line alignment.';
  }
  
  return {
    matchLevel,
    icon,
    message,
    currentMatch: { mahaMatch, antarMatch },
    upcomingMatches: upcomingMatches.map(m => ({
      planet: m.planet,
      start: m.start,
      end: m.end
    }))
  };
}

export function generateDashaTimelineText(timelineData) {
  if (!timelineData || !timelineData.periods || timelineData.periods.length === 0) {
    return 'Dasha timeline not available';
  }
  
  const { mahadasha, periods, current } = timelineData;
  
  let text = `
YOUR DASHA TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MAHADASHA: ${mahadasha.planet} (${mahadasha.startDate} → ${mahadasha.endDate})
${mahadasha.meaning ? `Theme: ${mahadasha.meaning.theme}` : ''}

ANTARDASHA PERIODS (Sub-Periods):
┌──────────────────┬─────────────────┬──────────┐
│ Period           │ Dates           │ Status   │
├──────────────────┼─────────────────┼──────────┤
`;
  
  periods.forEach(period => {
    const paddedName = period.name.padEnd(16);
    const paddedDates = period.dates.padEnd(15);
    const statusText = `${period.statusIcon} ${period.statusLabel}`.padEnd(8);
    text += `│ ${paddedName} │ ${paddedDates} │ ${statusText} │\n`;
  });
  
  text += `└──────────────────┴─────────────────┴──────────┘

`;
  
  if (current) {
    text += `CURRENT: ${current.name} (until ${current.endDate})
${current.meaning ? `Theme: ${current.meaning.theme}
Best for: ${current.meaning.goodFor.join(', ')}
Relocation tip: ${current.meaning.relocationTip}` : ''}
`;
  }
  
  return text;
}
