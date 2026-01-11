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

function generatePlanetaryLinesHTML(lines) {
  if (!lines || lines.length === 0) {
    return '<p>No planetary lines data available.</p>';
  }
  
  const grouped = {};
  lines.forEach(line => {
    const planet = line.planet || 'Unknown';
    if (!grouped[planet]) grouped[planet] = [];
    grouped[planet].push(line.line_type || line.type || 'AC');
  });
  
  return Object.entries(grouped).map(([planet, types]) => {
    const planetData = PLANET_DATA.find(p => p.name === planet) || { symbol: '?', color: '#888' };
    return `
      <div class="planet-line-item" style="border-left: 3px solid ${planetData.color}; padding-left: 10px; margin: 5px 0;">
        <span style="color: ${planetData.color}">${planetData.symbol}</span>
        <strong>${planet}</strong>: ${[...new Set(types)].join(', ')}
      </div>
    `;
  }).join('');
}

function flattenPowerZones(zones) {
  if (!zones) return [];
  if (Array.isArray(zones)) return zones;
  const india = zones.india || [];
  const international = zones.international || [];
  return [...india, ...international];
}

export function getPowerZonesCount(zones) {
  const flat = flattenPowerZones(zones);
  return flat.length;
}

function generatePowerZonesHTML(zones) {
  const flatZones = flattenPowerZones(zones);
  if (!flatZones || flatZones.length === 0) {
    return '<p>No power zones identified.</p>';
  }
  
  return flatZones.slice(0, 10).map(zone => {
    const color = zone.is_challenging ? '#DC143C' : '#4ADE80';
    const label = zone.is_challenging ? 'Challenging' : 'Favorable';
    return `
      <div class="power-zone-item" style="border-left: 3px solid ${color}; padding-left: 10px; margin: 5px 0;">
        <strong>${label}</strong> at ${zone.latitude?.toFixed(2)}°, ${zone.longitude?.toFixed(2)}°
        ${zone.category ? `<span class="zone-category">(${zone.category})</span>` : ''}
      </div>
    `;
  }).join('');
}

function generateTopCitiesHTML(cities) {
  if (!cities || cities.length === 0) {
    return '<p>No city recommendations available.</p>';
  }
  
  return cities.slice(0, 10).map((city, index) => {
    const scoreClass = city.score >= 85 ? 'excellent' : city.score >= 75 ? 'good' : city.score >= 65 ? 'moderate' : 'low';
    return `
      <div class="top-city-item ${scoreClass}" style="margin: 5px 0; padding: 5px;">
        <span class="rank">#${index + 1}</span>
        <strong>${city.name}</strong>, ${city.country || ''}
        <span class="score">${city.score}/100</span>
      </div>
    `;
  }).join('');
}

function generateLinePaths(planetaryLines) {
  if (!planetaryLines || planetaryLines.length === 0) {
    return `
      <div class="line-list-item">
        <span class="line-name">Jupiter-MC</span>
        <span class="line-region">Mongolia → Thailand</span>
      </div>
      <div class="line-list-item">
        <span class="line-name">Venus-AC</span>
        <span class="line-region">Iberian Peninsula → West Africa</span>
      </div>
      <div class="line-list-item">
        <span class="line-name">Sun-MC</span>
        <span class="line-region">East Asia → Australia</span>
      </div>
    `;
  }
  
  const processedLines = planetaryLines.slice(0, 7).map(line => {
    const planet = line.planet || 'Jupiter';
    const lineType = line.lineType || line.line_type || 'MC';
    
    let regionPath = 'Global influence';
    
    if (line.points && Array.isArray(line.points) && line.points.length > 1) {
      const firstPoint = line.points[0];
      const midPoint = line.points[Math.floor(line.points.length / 2)];
      const lastPoint = line.points[line.points.length - 1];
      
      const startLng = getPointLng(firstPoint);
      const midLng = getPointLng(midPoint);
      const endLng = getPointLng(lastPoint);
      
      const startRegion = getRegionFromLng(startLng);
      const midRegion = getRegionFromLng(midLng);
      const endRegion = getRegionFromLng(endLng);
      
      const regions = [startRegion];
      if (midRegion !== startRegion && midRegion !== endRegion) {
        regions.push(midRegion);
      }
      if (endRegion !== startRegion) {
        regions.push(endRegion);
      }
      
      regionPath = regions.join(' → ');
    }
    
    return `
      <div class="line-list-item">
        <span class="line-name">${planet}-${lineType}</span>
        <span class="line-region">${regionPath}</span>
      </div>
    `;
  });
  
  return processedLines.join('');
}

function getPointLng(point) {
  if (Array.isArray(point)) return point[0];
  if (point && typeof point === 'object') {
    return point.longitude ?? point.lng ?? point.lon ?? 0;
  }
  return 0;
}

function getRegionFromLng(lng) {
  if (lng >= -180 && lng < -120) return 'Pacific/Alaska';
  if (lng >= -120 && lng < -90) return 'Western Americas';
  if (lng >= -90 && lng < -60) return 'Central Americas';
  if (lng >= -60 && lng < -30) return 'Eastern Americas';
  if (lng >= -30 && lng < 0) return 'Atlantic';
  if (lng >= 0 && lng < 30) return 'Western Europe/Africa';
  if (lng >= 30 && lng < 60) return 'Eastern Europe/Middle East';
  if (lng >= 60 && lng < 90) return 'Central Asia/India';
  if (lng >= 90 && lng < 120) return 'Southeast Asia/China';
  if (lng >= 120 && lng < 150) return 'East Asia/Australia';
  if (lng >= 150 && lng <= 180) return 'Pacific/Oceania';
  return 'Global';
}

function generateParanTags(birthData) {
  const mahadasha = birthData.currentDashaLord || 'Jupiter';
  const rashi = birthData.rashi || 'Aries';
  
  const paranCombos = [
    { key: 'Jupiter ☌ Venus', label: 'Prosperity', active: true },
    { key: 'Sun ☌ Mercury', label: 'Recognition', active: mahadasha === 'Sun' || mahadasha === 'Mercury' },
    { key: 'Moon ☌ Venus', label: 'Harmony', active: true },
    { key: 'Mercury ☌ Jupiter', label: 'Wisdom', active: mahadasha === 'Jupiter' },
    { key: 'Venus ☌ Mars', label: 'Passion', active: false },
    { key: 'Saturn ☌ Jupiter', label: 'Foundation', active: mahadasha === 'Saturn' }
  ];
  
  return paranCombos
    .filter(p => p.active || Math.random() > 0.5)
    .slice(0, 4)
    .map(p => `<span class="paran-tag">${p.key} - ${p.label}</span>`)
    .join('');
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
    
    PLANETARY_LINES: generatePlanetaryLinesHTML(astroData?.planetaryLines || []),
    POWER_ZONES: generatePowerZonesHTML(astroData?.powerZones || []),
    TOP_CITIES: generateTopCitiesHTML(astroData?.topCities || []),
    PLANETARY_LINES_COUNT: (astroData?.planetaryLines || []).length,
    POWER_ZONES_COUNT: getPowerZonesCount(astroData?.powerZones),
    TOP_CITIES_COUNT: (astroData?.topCities || []).length,
    
    LINE_PATHS: generateLinePaths(astroData?.planetaryLines || []),
    SCOPE_LOWER: (scope || 'both').toLowerCase(),
    PARAN_TAGS: generateParanTags(birthData),
    
    PAGE_NUM: '{{PAGE_NUM}}',
    TOTAL_PAGES: '{{TOTAL_PAGES}}'
  };
}

export function prepareCityPageData(city, rank, goal, baseData, credibilityData = null) {
  const score = city.score || 0;
  const verdictLabel = score >= 70 ? 'Highly Favorable' : score >= 60 ? 'Favorable' : score >= 52 ? 'Moderate' : 'Challenging';
  const verdictPotential = score >= 70 ? 'excellent' : score >= 60 ? 'good' : score >= 52 ? 'moderate' : 'challenging';
  
  const fallbackInterpretation = generateFallbackInterpretation(city, goal, verdictPotential);
  const interpretation = city.aiInterpretation || city.analysis || city.interpretation || fallbackInterpretation;
  
  const cred = credibilityData || {};
  const western = cred.breakdown?.western || {};
  const vedic = cred.breakdown?.vedic || {};
  const lineProx = western.lineProximity || {};
  const parans = western.parans?.details || [];
  
  const paranTagsHtml = parans.map(p => 
    `<span class="paran-tag">${p.planets?.join(' ☌ ') || p.key} - ${p.interpretation || ''}</span>`
  ).join('') || '<span class="paran-tag">No strong parans</span>';
  
  // Direction info is for display only - the direction adjustment is already baked into 
  // city.score via applyDirectionPenalty() multiplier in astrologyApi.js
  const cityDirection = city.direction || 'N/A';
  const directionExplanation = `Direction from birthplace: ${cityDirection} (factored into Western score)`;
  
  // Check if credibilityData has valid breakdown data
  const hasValidBreakdown = cred.breakdown && (western.total !== undefined || vedic.total !== undefined);
  
  // Use pre-scaled values from credibilityData directly - pdfAssembler already scaled them
  // to ensure westernTotal + vedicTotal = city.score (direction is ALREADY factored into score)
  // If no breakdown data, split score 50/50 for display
  const westernTotal = hasValidBreakdown ? (western.total ?? Math.round(score / 2)) : Math.round(score / 2);
  const vedicTotal = hasValidBreakdown ? (vedic.total ?? (score - westernTotal)) : (score - westernTotal);
  
  // Sub-scores from credibilityData (already scaled by pdfAssembler)
  // If breakdown missing, distribute within category totals proportionally
  const lineProximityScore = hasValidBreakdown ? (lineProx.score ?? Math.round(westernTotal * 0.6)) : Math.round(westernTotal * 0.6);
  const paranScore = hasValidBreakdown ? (western.parans?.score ?? (westernTotal - lineProximityScore)) : (westernTotal - lineProximityScore);
  const nakshatraRashiScore = hasValidBreakdown ? (vedic.nakshatraRashi?.score ?? Math.round(vedicTotal * 0.4)) : Math.round(vedicTotal * 0.4);
  const lagnaVastuScore = hasValidBreakdown ? (vedic.lagnaVastu?.score ?? Math.round(vedicTotal * 0.3)) : Math.round(vedicTotal * 0.3);
  const dashaScore = hasValidBreakdown ? (vedic.dashaTiming?.score ?? (vedicTotal - nakshatraRashiScore - lagnaVastuScore)) : (vedicTotal - nakshatraRashiScore - lagnaVastuScore);
  
  // Calculated total should match city.score (direction already factored in via multiplier)
  const calculatedTotal = westernTotal + vedicTotal;
  
  // Build the calculation display string (no separate direction bonus - it's in the score)
  const calcString = `${westernTotal} + ${vedicTotal} = ${calculatedTotal}%`;
  
  return {
    ...baseData,
    CITY_NAME: city.name || '',
    CITY_COUNTRY: city.country || '',
    CITY_REGION: city.region || '',
    CITY_SCORE: score,
    CITY_RANK: rank,
    CITY_LATITUDE: Math.round(city.latitude || city.lat || 0),
    CITY_LONGITUDE: city.longitude || city.lng || '',
    CITY_DIRECTION: city.direction || '',
    CITY_NAKSHATRA_MATCH: city.nakshatraMatch ? 'Yes' : 'No',
    CITY_VERDICT: city.verdict || verdictLabel,
    CITY_SCORE_CLASS: verdictPotential,
    CITY_ANALYSIS: interpretation,
    CITY_INTERPRETATION: interpretation,
    CITY_ACTIVE_LINES: (city.lines || []).map(l => typeof l === 'string' ? l : `${l.planet} ${l.line_type}`).join(', '),
    CITY_PLANETARY_INFLUENCES: generateCityPlanetaryInfluences(city.lines || []),
    GOAL: goal,
    GOAL_ICON: GOAL_ICONS[goal] || '✨',
    GOAL_COLOR: GOAL_COLORS[goal] || '#2D1B4E',
    
    NEAREST_LINE: lineProx.nearestLine || (city.lines?.[0] ? (typeof city.lines[0] === 'string' ? city.lines[0] : `${city.lines[0].planet}-${city.lines[0].line_type}`) : 'Jupiter-MC'),
    LINE_DISTANCE_KM: lineProx.distanceKm || 350,
    LINE_DIRECTION: lineProx.direction || 'west',
    ORB_BARS: lineProx.orbBars || '███████░░░',
    ORB_STRENGTH: lineProx.orbStrength || 'Moderate',
    
    PARAN_TAGS: paranTagsHtml,
    
    WESTERN_SCORE: westernTotal,
    LINE_PROXIMITY_SCORE: lineProximityScore,
    PARAN_SCORE: paranScore,
    VEDIC_SCORE: vedicTotal,
    NAKSHATRA_RASHI_SCORE: nakshatraRashiScore,
    LAGNA_VASTU_SCORE: lagnaVastuScore,
    DASHA_SCORE: dashaScore,
    
    DIRECTION_BONUS: 0,
    DIRECTION_BONUS_DISPLAY: cityDirection,
    DIRECTION_EXPLANATION: directionExplanation,
    SCORE_TOTAL_CALC: calcString
  };
}

const LINE_MEANINGS = {
  'Sun-AC': 'Self-expression & Identity',
  'Sun-MC': 'Career Recognition',
  'Sun-DC': 'Partnerships',
  'Sun-IC': 'Home Foundation',
  'Moon-AC': 'Emotional Expression',
  'Moon-MC': 'Public Image',
  'Moon-DC': 'Emotional Bonds',
  'Moon-IC': 'Inner Security',
  'Mercury-AC': 'Communication',
  'Mercury-MC': 'Business Acumen',
  'Mercury-DC': 'Intellectual Connections',
  'Mercury-IC': 'Learning & Study',
  'Venus-AC': 'Personal Charm',
  'Venus-MC': 'Creative Success',
  'Venus-DC': 'Love & Romance',
  'Venus-IC': 'Domestic Harmony',
  'Mars-AC': 'Personal Drive',
  'Mars-MC': 'Career Ambition',
  'Mars-DC': 'Dynamic Partnerships',
  'Mars-IC': 'Home Energy',
  'Jupiter-AC': 'Personal Growth',
  'Jupiter-MC': 'Career Expansion',
  'Jupiter-DC': 'Beneficial Partnerships',
  'Jupiter-IC': 'Family Blessings',
  'Saturn-AC': 'Self-Discipline',
  'Saturn-MC': 'Career Authority',
  'Saturn-DC': 'Committed Partnerships',
  'Saturn-IC': 'Stable Foundation'
};

function generateFallbackInterpretation(city, goal, scoreClass) {
  const goalTexts = {
    'Career': 'professional growth and career advancement',
    'Wealth': 'financial prosperity and material success',
    'Love': 'romantic connections and meaningful relationships',
    'Education': 'academic excellence and intellectual development',
    'Settlement': 'settling down and building a stable home life',
    'Complete': 'overall life success and personal transformation'
  };
  
  const lines = city.lines || [];
  const lineDescriptions = lines.slice(0, 2).map(l => {
    let lineName;
    if (typeof l === 'string') {
      lineName = l;
    } else if (l && l.planet) {
      lineName = `${l.planet}-${l.line_type || l.type}`;
    } else {
      return null;
    }
    return LINE_MEANINGS[lineName] || null;
  }).filter(Boolean);
  
  const goalText = goalTexts[goal] || 'personal growth and success';
  const cityName = city.name || 'This location';
  const country = city.country || '';
  
  if (lineDescriptions.length >= 2) {
    return `${cityName}${country ? ', ' + country : ''} offers ${scoreClass.toLowerCase()} potential for ${goalText}. The planetary alignments here activate ${lineDescriptions[0].toLowerCase()} while also enhancing ${lineDescriptions[1].toLowerCase()}. This combination creates a supportive environment for achieving your goals in this domain.`;
  } else if (lineDescriptions.length === 1) {
    return `${cityName}${country ? ', ' + country : ''} shows ${scoreClass.toLowerCase()} compatibility for ${goalText}. The cosmic energies here particularly support ${lineDescriptions[0].toLowerCase()}, which aligns well with your aspirations in this area.`;
  }
  
  const directionText = city.direction ? ` Located to the ${city.direction} of your birthplace,` : '';
  return `${cityName}${country ? ', ' + country : ''} demonstrates ${scoreClass.toLowerCase()} potential for ${goalText}.${directionText} the planetary configurations at this location offer opportunities for growth and development in your chosen area of focus.`;
}

function generateCityPlanetaryInfluences(lines) {
  if (!lines || lines.length === 0) {
    return '<div class="line-item"><span class="line-name">No major lines nearby</span></div>';
  }
  
  return lines.slice(0, 4).map(line => {
    let planetName, lineType, lineName;
    if (typeof line === 'string') {
      const parts = line.split('-');
      planetName = parts[0];
      lineType = parts[1] || '';
      lineName = line;
    } else {
      planetName = line.planet;
      lineType = line.line_type || line.type;
      lineName = `${planetName}-${lineType}`;
    }
    const planet = PLANET_DATA.find(p => p.name === planetName) || { symbol: '?', color: '#888' };
    const planetLower = planetName.toLowerCase();
    const meaning = LINE_MEANINGS[lineName] || `${planetName} influence`;
    
    return `
      <div class="line-item">
        <div class="line-dot ${planetLower}-dot" style="background: ${planet.color};"></div>
        <span class="line-name">${lineName}</span>
        <span class="line-meaning">${meaning}</span>
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

export function generateRankingTableData(pageCities, baseData, startRank = 1, allCitiesCount = null) {
  const data = { ...baseData };
  
  for (let i = 0; i < 9; i++) {
    const slotNum = i + 1;
    const city = pageCities[i] || {};
    const hasCity = Boolean(city.name);
    const rank = startRank + i;
    const score = city.score || 0;
    
    data[`CITY${slotNum}_NAME`] = city.name || '';
    data[`CITY${slotNum}_COUNTRY`] = city.country || '';
    data[`CITY${slotNum}_SCORE`] = hasCity ? score : '';
    data[`CITY${slotNum}_DIRECTION`] = hasCity ? (city.direction || '') : '';
    data[`CITY${slotNum}_RANK`] = hasCity ? rank : '';
    data[`CITY${slotNum}_RANK_CLASS`] = hasCity ? (rank <= 3 ? 'top3' : 'regular') : 'regular';
    data[`CITY${slotNum}_SCORE_CLASS`] = hasCity ? (score >= 70 ? 'score-excellent' : score >= 60 ? 'score-good' : 'score-moderate') : '';
    
    const lines = city.lines || [];
    let formattedLines = [];
    
    if (lines.length > 0) {
      formattedLines = lines.slice(0, 3).map(l => {
        if (typeof l === 'string') {
          const [planet, type] = l.split('-');
          return formatPlanetLine(planet, type);
        } else if (l && l.planet) {
          return formatPlanetLine(l.planet, l.line_type || l.type);
        }
        return '';
      }).filter(Boolean);
    }
    
    if (formattedLines.length === 0 && city.nearestLine) {
      const [planet, type] = (city.nearestLine || '').split('-');
      const distKm = city.lineDistanceKm || '';
      formattedLines = [`${formatPlanetLine(planet, type)} (${distKm}km)`];
    }
    
    if (formattedLines.length === 0) {
      formattedLines = ['—'];
    }
    
    data[`CITY${slotNum}_LINE1`] = formattedLines[0] || '—';
    data[`CITY${slotNum}_LINE2`] = formattedLines[1] || '';
    data[`CITY${slotNum}_LINE3`] = formattedLines[2] || '';
  }
  
  const totalCount = allCitiesCount || pageCities.length;
  const scores = pageCities.filter(c => c.score).map(c => c.score || 0);
  data.TOTAL_CITIES = totalCount;
  data.AVG_SCORE = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;
  data.TOP_SCORE = scores.length > 0 ? Math.max(...scores) : 0;
  const citiesWithLines = pageCities.filter(c => c.lines && c.lines.length > 0).length;
  data.POWER_ZONES = citiesWithLines > 0 ? citiesWithLines : Math.min(pageCities.length, 5);
  data.TABLE_TITLE = `Top ${totalCount} Cities`;
  
  return data;
}

function formatPlanetLine(planet, type) {
  if (!planet) return '';
  const planetObj = PLANET_DATA.find(p => p.name === planet);
  const symbol = planetObj ? planetObj.symbol : '';
  const lineLabel = LINE_TYPES.find(l => l.type === type);
  const lineName = lineLabel ? lineLabel.name : type || '';
  return `${symbol} ${planet} ${lineName}`.trim();
}

const GOAL_KEY_PLANETS = {
  Career: ['Sun', 'Saturn', 'Jupiter', 'Mercury'],
  Wealth: ['Jupiter', 'Venus', 'Mercury', 'Sun'],
  Love: ['Venus', 'Moon', 'Mars', 'Jupiter'],
  Education: ['Mercury', 'Jupiter', 'Moon', 'Sun'],
  Settlement: ['Moon', 'Venus', 'Saturn', 'Jupiter'],
  Complete: ['Sun', 'Moon', 'Jupiter', 'Venus']
};

export function generateDividerPlanetData(goal, baseData) {
  const data = { ...baseData };
  const keyPlanets = GOAL_KEY_PLANETS[goal] || GOAL_KEY_PLANETS.Complete;
  
  for (let i = 0; i < 4; i++) {
    const num = i + 1;
    const planetName = keyPlanets[i];
    const planet = PLANET_DATA.find(p => p.name === planetName) || { name: planetName, symbol: '?', color: '#888' };
    
    data[`PLANET${num}_NAME`] = planet.name;
    data[`PLANET${num}_SYMBOL`] = planet.symbol;
    data[`PLANET${num}_COLOR`] = planet.color;
  }
  
  const bestCities = baseData.BEST_CITIES_COUNT || 12;
  const avoidCities = baseData.AVOID_CITIES_COUNT || 5;
  const powerZones = baseData.POWER_ZONES_COUNT || 4;
  
  data.BEST_CITIES_COUNT = bestCities;
  data.AVOID_CITIES_COUNT = avoidCities;
  data.POWER_ZONES_COUNT = powerZones;
  
  return data;
}

const RASHI_TRAITS = {
  Aries: ['Courageous', 'Dynamic', 'Independent', 'Pioneering', 'Competitive', 'Bold', 'Energetic', 'Assertive'],
  Taurus: ['Patient', 'Reliable', 'Practical', 'Devoted', 'Stable', 'Sensual', 'Determined', 'Grounded'],
  Gemini: ['Adaptable', 'Curious', 'Communicative', 'Witty', 'Versatile', 'Quick-minded', 'Social', 'Intellectual'],
  Cancer: ['Intuitive', 'Protective', 'Nurturing', 'Emotional', 'Loyal', 'Caring', 'Empathetic', 'Traditional'],
  Leo: ['Confident', 'Creative', 'Generous', 'Warmhearted', 'Charismatic', 'Ambitious', 'Dramatic', 'Loyal'],
  Virgo: ['Analytical', 'Practical', 'Diligent', 'Modest', 'Reliable', 'Precise', 'Helpful', 'Organized'],
  Libra: ['Diplomatic', 'Harmonious', 'Fair-minded', 'Social', 'Gracious', 'Romantic', 'Cooperative', 'Idealistic'],
  Scorpio: ['Resourceful', 'Powerful', 'Passionate', 'Determined', 'Brave', 'Intense', 'Perceptive', 'Strategic'],
  Sagittarius: ['Optimistic', 'Adventurous', 'Independent', 'Philosophical', 'Honest', 'Enthusiastic', 'Generous', 'Open-minded'],
  Capricorn: ['Responsible', 'Disciplined', 'Ambitious', 'Patient', 'Practical', 'Cautious', 'Persistent', 'Traditional'],
  Aquarius: ['Progressive', 'Original', 'Independent', 'Humanitarian', 'Inventive', 'Idealistic', 'Intellectual', 'Friendly'],
  Pisces: ['Intuitive', 'Compassionate', 'Artistic', 'Gentle', 'Wise', 'Musical', 'Imaginative', 'Spiritual']
};

const NAKSHATRA_TRAITS = {
  Ashwini: ['Swift', 'Healing', 'Energetic', 'Pioneering'],
  Bharani: ['Creative', 'Patient', 'Nurturing', 'Transformative'],
  Krittika: ['Sharp', 'Purifying', 'Determined', 'Authoritative'],
  Rohini: ['Creative', 'Artistic', 'Charming', 'Grounded'],
  Mrigashira: ['Curious', 'Seeking', 'Gentle', 'Restless'],
  Ardra: ['Transformative', 'Intense', 'Intellectual', 'Passionate'],
  Punarvasu: ['Renewing', 'Wise', 'Harmonious', 'Prosperous'],
  Pushya: ['Nourishing', 'Protective', 'Auspicious', 'Spiritual'],
  Ashlesha: ['Mystical', 'Perceptive', 'Hypnotic', 'Intense'],
  Magha: ['Royal', 'Ancestral', 'Authoritative', 'Traditional'],
  PurvaPhalguni: ['Creative', 'Romantic', 'Luxurious', 'Artistic'],
  UttaraPhalguni: ['Generous', 'Helpful', 'Patronizing', 'Friendly'],
  Hasta: ['Skillful', 'Crafty', 'Clever', 'Resourceful'],
  Chitra: ['Brilliant', 'Artistic', 'Beautiful', 'Creative'],
  Swati: ['Independent', 'Diplomatic', 'Flexible', 'Scattered'],
  Vishakha: ['Determined', 'Goal-oriented', 'Ambitious', 'Transformative'],
  Anuradha: ['Devoted', 'Friendly', 'Successful', 'Secretive'],
  Jyeshtha: ['Protective', 'Elder', 'Authoritative', 'Resourceful'],
  Moola: ['Investigative', 'Root-seeking', 'Destructive', 'Transformative'],
  PurvaAshadha: ['Invincible', 'Proud', 'Independent', 'Philosophical'],
  UttaraAshadha: ['Universal', 'Victorious', 'Penetrating', 'Righteous'],
  Shravana: ['Listening', 'Learning', 'Connected', 'Traditional'],
  Dhanishta: ['Wealthy', 'Musical', 'Ambitious', 'Versatile'],
  Shatabhisha: ['Healing', 'Secretive', 'Independent', 'Mysterious'],
  PurvaBhadrapada: ['Intense', 'Transformative', 'Fiery', 'Passionate'],
  UttaraBhadrapada: ['Deep', 'Wise', 'Controlling', 'Spiritual'],
  Revati: ['Nurturing', 'Protective', 'Wealthy', 'Safe']
};

export function generateVedicTraitsData(birthData, baseData) {
  const data = { ...baseData };
  
  const rashi = birthData.rashi || 'Aries';
  const nakshatra = birthData.nakshatra || 'Ashwini';
  
  const rashiTraits = RASHI_TRAITS[rashi] || RASHI_TRAITS.Aries;
  const nakshatraName = nakshatra.replace(/\s/g, '');
  const nakshatraTraits = NAKSHATRA_TRAITS[nakshatraName] || ['Intuitive', 'Spiritual', 'Wise', 'Balanced'];
  
  const allTraits = [...rashiTraits.slice(0, 4), ...nakshatraTraits.slice(0, 4)];
  
  for (let i = 0; i < 8; i++) {
    data[`TRAIT_${i + 1}`] = allTraits[i] || 'Balanced';
  }
  
  data.RASHI = birthData.rashi || '';
  data.RASHI_HINDI = getRashiHindi(rashi);
  data.RASHI_LORD = birthData.rashiLord || getRashiLord(rashi);
  data.RASHI_MEANING = getRashiMeaning(rashi);
  
  data.NAKSHATRA = birthData.nakshatra || '';
  data.NAKSHATRA_LORD = birthData.nakshatraLord || '';
  data.NAKSHATRA_MEANING = getNakshatraMeaning(nakshatra);
  data.NAKSHATRA_DEITY = birthData.nakshatraDeity || getNakshatraDeity(nakshatra);
  data.NAKSHATRA_DIRECTION = birthData.nakshatraDirection || 'East';
  data.NAKSHATRA_ELEMENT = birthData.nakshatraElement || 'Fire';
  data.NAKSHATRA_QUALITY = birthData.nakshatraQuality || 'Movable';
  data.NAKSHATRA_SYMBOL = birthData.nakshatraSymbol || '✦';
  data.PADA = birthData.nakshatraPada || birthData.pada || '1';
  
  data.LAGNA = birthData.lagna || '';
  data.LAGNA_HINDI = getRashiHindi(birthData.lagna || '');
  data.LAGNA_LORD = birthData.lagnaLord || getRashiLord(birthData.lagna || '');
  data.LAGNA_MEANING = getLagnaMeaning(birthData.lagna || '');
  
  return data;
}

function getRashiHindi(rashi) {
  const hindiNames = {
    Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क',
    Leo: 'सिंह', Virgo: 'कन्या', Libra: 'तुला', Scorpio: 'वृश्चिक',
    Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन'
  };
  return hindiNames[rashi] || '';
}

function getRashiLord(rashi) {
  const lords = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter'
  };
  return lords[rashi] || '';
}

function getRashiMeaning(rashi) {
  const meanings = {
    Aries: 'Your Moon in Aries gives you a bold, pioneering spirit with strong instincts and emotional courage.',
    Taurus: 'Your Moon in Taurus provides emotional stability, love of comfort, and a grounded approach to life.',
    Gemini: 'Your Moon in Gemini makes you intellectually curious, communicative, and emotionally adaptable.',
    Cancer: 'Your Moon in Cancer heightens intuition, nurturing abilities, and deep emotional connections.',
    Leo: 'Your Moon in Leo brings warmth, creativity, and a generous heart seeking recognition.',
    Virgo: 'Your Moon in Virgo gives analytical thinking, attention to detail, and desire to serve.',
    Libra: 'Your Moon in Libra creates harmony-seeking nature, diplomatic skills, and relationship focus.',
    Scorpio: 'Your Moon in Scorpio intensifies emotions, gives penetrating insight, and transformative power.',
    Sagittarius: 'Your Moon in Sagittarius brings optimism, philosophical nature, and love of freedom.',
    Capricorn: 'Your Moon in Capricorn provides discipline, ambition, and practical emotional expression.',
    Aquarius: 'Your Moon in Aquarius makes you independent, humanitarian, and emotionally progressive.',
    Pisces: 'Your Moon in Pisces heightens intuition, compassion, and artistic sensitivity.'
  };
  return meanings[rashi] || 'Your moon sign influences your emotional nature and inner self.';
}

function getNakshatraMeaning(nakshatra) {
  return `Your birth star ${nakshatra} shapes your personality, destiny patterns, and the way you connect with different places on Earth.`;
}

function getNakshatraDeity(nakshatra) {
  const deities = {
    Ashwini: 'Ashwini Kumaras', Bharani: 'Yama', Krittika: 'Agni', Rohini: 'Brahma',
    Mrigashira: 'Soma', Ardra: 'Rudra', Punarvasu: 'Aditi', Pushya: 'Brihaspati'
  };
  return deities[nakshatra] || 'Cosmic Forces';
}

function getLagnaMeaning(lagna) {
  const meanings = {
    Aries: 'Aries rising gives you a dynamic, assertive personality with natural leadership abilities.',
    Taurus: 'Taurus rising provides a stable, reliable demeanor with appreciation for beauty and comfort.',
    Gemini: 'Gemini rising makes you adaptable, curious, and skilled in communication.',
    Cancer: 'Cancer rising gives a nurturing appearance and strong connection to home and family.',
    Leo: 'Leo rising brings charisma, confidence, and a natural presence that draws attention.',
    Virgo: 'Virgo rising provides a modest, helpful demeanor with attention to detail.',
    Libra: 'Libra rising creates a charming, diplomatic appearance with focus on relationships.',
    Scorpio: 'Scorpio rising gives an intense, magnetic presence with perceptive abilities.',
    Sagittarius: 'Sagittarius rising brings an optimistic, adventurous demeanor.',
    Capricorn: 'Capricorn rising provides a serious, responsible appearance with ambition.',
    Aquarius: 'Aquarius rising makes you appear unique, progressive, and humanitarian.',
    Pisces: 'Pisces rising gives a gentle, dreamy appearance with artistic sensitivity.'
  };
  return meanings[lagna] || 'Your ascendant shapes how others perceive you and your approach to life.';
}

// Smart regional mapping for avoid city alternatives
const CITY_REGIONS = {
  // North America
  'Toronto': 'North America', 'Vancouver': 'North America', 'San Francisco': 'North America',
  'Los Angeles': 'North America', 'New York': 'North America', 'Chicago': 'North America',
  'Miami': 'North America', 'Seattle': 'North America', 'Boston': 'North America',
  // Oceania
  'Auckland': 'Oceania', 'Sydney': 'Oceania', 'Melbourne': 'Oceania', 'Brisbane': 'Oceania',
  'Perth': 'Oceania', 'Wellington': 'Oceania',
  // Europe
  'London': 'Europe', 'Paris': 'Europe', 'Amsterdam': 'Europe', 'Berlin': 'Europe',
  'Lisbon': 'Europe', 'Barcelona': 'Europe', 'Rome': 'Europe', 'Vienna': 'Europe',
  'Prague': 'Europe', 'Zurich': 'Europe', 'Stockholm': 'Europe', 'Dublin': 'Europe',
  // Middle East
  'Dubai': 'Middle East', 'Abu Dhabi': 'Middle East', 'Doha': 'Middle East', 
  'Muscat': 'Middle East', 'Riyadh': 'Middle East', 'Kuwait City': 'Middle East',
  // Africa
  'Marrakech': 'Africa', 'Casablanca': 'Africa', 'Cape Town': 'Africa', 
  'Johannesburg': 'Africa', 'Cairo': 'Africa', 'Nairobi': 'Africa',
  // East Asia
  'Tokyo': 'East Asia', 'Seoul': 'East Asia', 'Hong Kong': 'East Asia', 
  'Shanghai': 'East Asia', 'Beijing': 'East Asia', 'Taipei': 'East Asia',
  // Southeast Asia
  'Singapore': 'Southeast Asia', 'Bangkok': 'Southeast Asia', 'Kuala Lumpur': 'Southeast Asia',
  'Jakarta': 'Southeast Asia', 'Manila': 'Southeast Asia', 'Ho Chi Minh City': 'Southeast Asia',
  'Bali': 'Southeast Asia'
};

const REGION_ALTERNATIVES = {
  'North America': ['San Francisco', 'Los Angeles', 'Vancouver', 'New York', 'Toronto'],
  'Oceania': ['Sydney', 'Melbourne', 'Brisbane', 'Auckland', 'Wellington'],
  'Europe': ['London', 'Amsterdam', 'Paris', 'Berlin', 'Barcelona'],
  'Middle East': ['Dubai', 'Abu Dhabi', 'Doha', 'Muscat'],
  'Africa': ['Cape Town', 'Dubai', 'Doha'],
  'East Asia': ['Tokyo', 'Singapore', 'Hong Kong', 'Seoul'],
  'Southeast Asia': ['Singapore', 'Bangkok', 'Kuala Lumpur', 'Bali', 'Tokyo']
};

export function prepareAvoidCityData(city, goal, bestCities, baseData) {
  const data = { ...baseData };
  
  data.CITY_NAME = city.name || '';
  data.COUNTRY = city.country || '';
  data.SCORE = city.score || 0;
  data.GOAL = goal;
  
  const directions = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest'];
  data.DIRECTION = city.direction || directions[Math.floor(Math.random() * directions.length)];
  
  // Smart regional alternative - find from same region first
  const cityRegion = CITY_REGIONS[city.name];
  let altCity = null;
  
  if (cityRegion) {
    // Try to find a best city from the same region
    const regionAlts = REGION_ALTERNATIVES[cityRegion] || [];
    altCity = bestCities.find(c => 
      regionAlts.includes(c.name) && c.name !== city.name
    );
    
    // If no regional match in best cities, use predefined regional alternatives
    if (!altCity) {
      const altName = regionAlts.find(name => name !== city.name);
      if (altName) {
        altCity = { name: altName };
      }
    }
  }
  
  // Fallback: same country or first best city
  if (!altCity) {
    altCity = bestCities.find(c => c.country === city.country && c.name !== city.name) || bestCities[0] || {};
  }
  
  data.ALT_CITY = altCity.name || 'a top-ranked city from this report';
  
  // Strip markdown formatting from interpretation text
  let interpretation = city.avoidInterpretation || `This location may present some challenges for your ${goal} goals. Consider alternative cities from this report for better alignment with your objectives.`;
  interpretation = interpretation
    .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
    .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
    .replace(/__(.*?)__/g, '$1')      // Remove __underline__
    .replace(/_(.*?)_/g, '$1');       // Remove _italic_
  data.AVOID_INTERPRETATION = interpretation;
  
  return data;
}

export {
  GOAL_ICONS,
  GOAL_COLORS,
  GOAL_DESCRIPTIONS,
  PLANET_DATA,
  LINE_TYPES,
  TEMPLATES_DIR,
  GOAL_KEY_PLANETS,
  RASHI_TRAITS,
  NAKSHATRA_TRAITS
};
