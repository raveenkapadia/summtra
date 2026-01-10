import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'server/templates/pdf');

const GOAL_ICONS = {
  Career: '💼',
  Wealth: '💰',
  Love: '❤️',
  Education: '🎓',
  Settlement: '🏠',
  Complete: '✨'
};

const GOAL_COLORS = {
  Career: '#4A90A4',
  Wealth: '#D4AF37',
  Love: '#E91E63',
  Education: '#9C27B0',
  Settlement: '#4CAF50',
  Complete: '#2D1B4E'
};

const GOAL_DESCRIPTIONS = {
  Career: 'Professional growth, recognition, and career advancement',
  Wealth: 'Financial prosperity, abundance, and material success',
  Love: 'Romantic relationships, partnerships, and emotional fulfillment',
  Education: 'Academic excellence, learning, and intellectual growth',
  Settlement: 'Permanent relocation, family life, and stability',
  Complete: 'Comprehensive analysis across all life domains'
};

const PLANET_DATA = [
  { name: 'Sun', symbol: '☉', color: '#FF8C00', keywords: ['Identity', 'Vitality', 'Leadership', 'Recognition'] },
  { name: 'Moon', symbol: '☽', color: '#C0C0C0', keywords: ['Emotions', 'Home', 'Comfort', 'Intuition'] },
  { name: 'Mercury', symbol: '☿', color: '#4ECDC4', keywords: ['Communication', 'Learning', 'Travel', 'Commerce'] },
  { name: 'Venus', symbol: '♀', color: '#FF69B4', keywords: ['Love', 'Beauty', 'Harmony', 'Pleasure'] },
  { name: 'Mars', symbol: '♂', color: '#DC143C', keywords: ['Energy', 'Action', 'Competition', 'Drive'] },
  { name: 'Jupiter', symbol: '♃', color: '#FFD700', keywords: ['Expansion', 'Luck', 'Wisdom', 'Abundance'] },
  { name: 'Saturn', symbol: '♄', color: '#708090', keywords: ['Structure', 'Discipline', 'Karma', 'Authority'] },
  { name: 'Uranus', symbol: '♅', color: '#00BFFF', keywords: ['Innovation', 'Change', 'Freedom', 'Technology'] },
  { name: 'Neptune', symbol: '♆', color: '#9370DB', keywords: ['Dreams', 'Spirituality', 'Creativity', 'Intuition'] },
  { name: 'Pluto', symbol: '♇', color: '#8B008B', keywords: ['Transformation', 'Power', 'Rebirth', 'Intensity'] },
  { name: 'North Node', symbol: '☊', color: '#8B5CF6', keywords: ['Destiny', 'Growth', 'Life Path', 'Purpose'] },
  { name: 'Chiron', symbol: '⚷', color: '#CD853F', keywords: ['Healing', 'Teaching', 'Wisdom', 'Wounds'] }
];

const LINE_TYPES = [
  { type: 'AC', name: 'Ascendant', style: 'solid', meaning: 'Personal identity, how you appear to others' },
  { type: 'DC', name: 'Descendant', style: 'dashed', meaning: 'Relationships, partnerships, others\' perception' },
  { type: 'MC', name: 'Midheaven', style: 'dotted', meaning: 'Career, public image, reputation' },
  { type: 'IC', name: 'Imum Coeli', style: 'fine-dotted', meaning: 'Home, roots, private life' }
];

export function loadTemplate(templateName) {
  const templatePath = path.join(TEMPLATES_DIR, templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return fs.readFileSync(templatePath, 'utf-8');
}

export function processTemplate(template, data) {
  let processed = template;
  
  const replacements = flattenData(data);
  
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = `{{${key}}}`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    processed = processed.replace(regex, value ?? '');
  }
  
  processed = processed.replace(/\{\{[A-Z_]+\}\}/g, '');
  
  return processed;
}

function flattenData(data, prefix = '') {
  const result = {};
  
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}_${key}` : key;
    
    if (value === null || value === undefined) {
      result[fullKey.toUpperCase()] = '';
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenData(value, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey.toUpperCase()] = JSON.stringify(value);
    } else {
      result[fullKey.toUpperCase()] = String(value);
    }
  }
  
  return result;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length !== 3) return dateStr;
  
  const [day, month, year] = parts.map(Number);
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  return `${day} ${months[month - 1]} ${year}`;
}

export function formatTime(timeStr) {
  if (!timeStr) return 'Unknown';
  return timeStr;
}

export function generateGoalBadges(goals) {
  if (!Array.isArray(goals)) goals = [goals];
  
  return goals.map(goal => 
    `<span class="goal-badge">${GOAL_ICONS[goal] || '✦'} ${goal}</span>`
  ).join('');
}

export function generateCityRows(cities, startRank = 1) {
  return cities.map((city, index) => {
    const rank = startRank + index;
    const scoreClass = city.score >= 85 ? 'excellent' : city.score >= 75 ? 'good' : city.score >= 65 ? 'moderate' : 'low';
    const matchIcon = city.nakshatraMatch ? '✓' : '—';
    
    return `
      <tr class="city-row ${scoreClass}">
        <td class="rank">${rank}</td>
        <td class="city-name">${city.name}</td>
        <td class="country">${city.country || ''}</td>
        <td class="score">${city.score}</td>
        <td class="direction">${city.direction || '—'}</td>
        <td class="nakshatra-match">${matchIcon}</td>
        <td class="verdict">${city.verdict || 'Favorable'}</td>
      </tr>
    `;
  }).join('');
}

export function generatePlanetCards(planets = PLANET_DATA.slice(0, 3), startIndex = 0) {
  return planets.map((planet, index) => `
    <div class="planet-card" style="border-left-color: ${planet.color}">
      <div class="planet-header">
        <span class="planet-symbol" style="color: ${planet.color}">${planet.symbol}</span>
        <span class="planet-name">${planet.name}</span>
      </div>
      <div class="planet-keywords">${planet.keywords.join(' • ')}</div>
      <div class="planet-lines">
        <div class="line-item"><span class="line-ac">AC</span> Personal expression</div>
        <div class="line-item"><span class="line-dc">DC</span> Relationships</div>
        <div class="line-item"><span class="line-mc">MC</span> Career influence</div>
        <div class="line-item"><span class="line-ic">IC</span> Home life</div>
      </div>
    </div>
  `).join('');
}

export function generateAvoidCityCard(city, rank) {
  const reasons = city.avoidReasons || ['Challenging planetary configurations'];
  
  return `
    <div class="avoid-city-card">
      <div class="avoid-header">
        <span class="avoid-rank">#${rank}</span>
        <span class="avoid-name">${city.name}, ${city.country || ''}</span>
        <span class="avoid-score">${city.score}/100</span>
      </div>
      <div class="avoid-reasons">
        ${reasons.map(r => `<div class="reason-item">⚠ ${r}</div>`).join('')}
      </div>
      <div class="avoid-lines">
        Active Lines: ${(city.lines || []).map(l => `${l.planet} ${l.line_type}`).join(', ') || 'None'}
      </div>
    </div>
  `;
}

export function generateDashaTimeline(antardashaTimeline) {
  if (!antardashaTimeline) return '<p>Dasha timeline not available</p>';
  
  let timeline;
  try {
    timeline = typeof antardashaTimeline === 'string' ? JSON.parse(antardashaTimeline) : antardashaTimeline;
  } catch {
    return '<p>Dasha timeline not available</p>';
  }
  
  if (!Array.isArray(timeline)) return '<p>Dasha timeline not available</p>';
  
  return timeline.slice(0, 10).map((period, index) => {
    const isCurrent = period.isCurrent || false;
    
    return `
      <div class="dasha-period ${isCurrent ? 'current' : ''}">
        <div class="period-marker">${isCurrent ? '●' : '○'}</div>
        <div class="period-content">
          <div class="period-name">${period.mahadasha || period.planet} - ${period.antardasha || ''}</div>
          <div class="period-dates">${period.startDate || ''} to ${period.endDate || ''}</div>
          <div class="period-theme">${period.theme || period.meaning || ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

export function generateVedicProfile(birthData) {
  return {
    rashi: birthData.rashi || 'Calculating...',
    rashiLord: birthData.rashiLord || '',
    nakshatra: birthData.nakshatra || 'Calculating...',
    nakshatraLord: birthData.nakshatraLord || '',
    nakshatraPada: birthData.nakshatraPada || '',
    lagna: birthData.lagna || 'Calculating...',
    lagnaLord: birthData.lagnaLord || '',
    sunSign: birthData.sunSign || '',
    currentDashaLord: birthData.currentDashaLord || '',
    currentDashaEnd: birthData.currentDashaEnd || ''
  };
}

export function prepareReportData(birthData, astroData, options = {}) {
  const now = new Date();
  const goals = options.goals || [options.goal || 'Complete'];
  const scope = options.scope || 'Both';
  
  return {
    USER_NAME: birthData.name || 'User',
    BIRTH_DATE: formatDate(birthData.birthDate),
    BIRTH_TIME: formatTime(birthData.birthTime),
    BIRTH_PLACE: birthData.birthPlace || '',
    BIRTH_COORDINATES: birthData.latitude && birthData.longitude 
      ? `${birthData.latitude}°, ${birthData.longitude}°` 
      : '',
    LATITUDE: birthData.latitude || '',
    LONGITUDE: birthData.longitude || '',
    
    GOAL: goals[0] || 'Complete',
    GOALS: goals.join(', '),
    GOAL_ICON: GOAL_ICONS[goals[0]] || '✨',
    GOAL_COLOR: GOAL_COLORS[goals[0]] || '#2D1B4E',
    GOAL_DESCRIPTION: GOAL_DESCRIPTIONS[goals[0]] || '',
    GOAL_BADGES: generateGoalBadges(goals),
    SCOPE: scope,
    REPORT_TYPE: options.reportType || 'Single Goal',
    REPORT_TITLE: goals[0] === 'Complete' ? 'Complete Life Analysis' : `${goals[0]} Focus Report`,
    REPORT_SUBTITLE: `Your Personalized Astrocartography Guide`,
    
    YEAR: now.getFullYear(),
    GENERATED_DATE: now.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    }),
    
    RASHI: birthData.rashi || '',
    RASHI_LORD: birthData.rashiLord || '',
    NAKSHATRA: birthData.nakshatra || '',
    NAKSHATRA_LORD: birthData.nakshatraLord || '',
    NAKSHATRA_PADA: birthData.nakshatraPada || '',
    LAGNA: birthData.lagna || '',
    LAGNA_LORD: birthData.lagnaLord || '',
    SUN_SIGN: birthData.sunSign || '',
    MAHADASHA: birthData.currentDashaLord || '',
    CURRENT_DASHA_LORD: birthData.currentDashaLord || '',
    CURRENT_DASHA_END: birthData.currentDashaEnd || '',
    ANTARDASHA: '',
    DASHA_TIMELINE: generateDashaTimeline(birthData.antardashaTimeline),
    
    PLANETARY_LINES: JSON.stringify(astroData?.planetaryLines || []),
    POWER_ZONES: JSON.stringify(astroData?.powerZones || []),
    TOP_CITIES: JSON.stringify(astroData?.topCities || []),
    
    PAGE_NUM: '{{PAGE_NUM}}',
    TOTAL_PAGES: '{{TOTAL_PAGES}}'
  };
}

export function prepareCityPageData(city, rank, goal, baseData) {
  const scoreClass = city.score >= 85 ? 'Excellent' : city.score >= 75 ? 'Good' : city.score >= 65 ? 'Moderate' : 'Challenging';
  
  return {
    ...baseData,
    CITY_NAME: city.name || '',
    CITY_COUNTRY: city.country || '',
    CITY_REGION: city.region || '',
    CITY_SCORE: city.score || 0,
    CITY_RANK: rank,
    CITY_LATITUDE: city.latitude || '',
    CITY_LONGITUDE: city.longitude || '',
    CITY_DIRECTION: city.direction || '',
    CITY_NAKSHATRA_MATCH: city.nakshatraMatch ? 'Yes' : 'No',
    CITY_VERDICT: city.verdict || scoreClass,
    CITY_SCORE_CLASS: scoreClass.toLowerCase(),
    CITY_ANALYSIS: city.analysis || city.interpretation || '',
    CITY_ACTIVE_LINES: (city.lines || []).map(l => `${l.planet} ${l.line_type}`).join(', '),
    CITY_PLANETARY_INFLUENCES: generateCityPlanetaryInfluences(city.lines || []),
    GOAL: goal,
    GOAL_ICON: GOAL_ICONS[goal] || '✨',
    GOAL_COLOR: GOAL_COLORS[goal] || '#2D1B4E'
  };
}

function generateCityPlanetaryInfluences(lines) {
  if (!lines || lines.length === 0) {
    return '<p>No major planetary lines pass through this location.</p>';
  }
  
  return lines.map(line => {
    const planet = PLANET_DATA.find(p => p.name === line.planet) || { symbol: '?', color: '#888' };
    return `
      <div class="influence-item" style="border-left-color: ${planet.color}">
        <span class="planet-symbol">${planet.symbol}</span>
        <span class="planet-name">${line.planet}</span>
        <span class="line-type">${line.line_type}</span>
      </div>
    `;
  }).join('');
}

export function prepareMapPageData(mapImage, viewName, viewLabel, baseData) {
  return {
    ...baseData,
    MAP_IMAGE_DATA_URL: mapImage,
    MAP_VIEW_NAME: viewName,
    MAP_VIEW_LABEL: viewLabel,
    MAP_TITLE: viewLabel
  };
}

export {
  GOAL_ICONS,
  GOAL_COLORS,
  GOAL_DESCRIPTIONS,
  PLANET_DATA,
  LINE_TYPES,
  TEMPLATES_DIR
};
