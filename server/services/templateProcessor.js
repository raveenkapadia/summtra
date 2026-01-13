import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { getNakshatraLord } = require('./vedicApi.js');
const { getPersonalGoalPlanets } = require('./astrologyApi.js');

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
    
    // Bug 1 Fix: Extract planetary lines for display - use nearestLine as fallback
    let cityLines = (city.lines || []).map(l => 
      typeof l === 'string' ? l : `${l.planet}-${l.line_type || 'AC'}`
    ).slice(0, 2).join(', ');
    
    // If no lines array, use nearestLine from scoring data
    if (!cityLines && city.nearestLine) {
      cityLines = city.nearestLine;
    }
    
    // Final fallback
    if (!cityLines) cityLines = '—';
    
    return `
      <tr class="city-row ${scoreClass}">
        <td class="rank">${rank}</td>
        <td class="city-name">${city.name}</td>
        <td class="country">${city.country || ''}</td>
        <td class="score">${city.score}</td>
        <td class="planetary-lines">${cityLines}</td>
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
  const nakshatra = birthData.nakshatra || 'Calculating...';
  return {
    rashi: birthData.rashi || 'Calculating...',
    rashiLord: birthData.rashiLord || '',
    nakshatra: nakshatra,
    // Bug 3 Fix: Use getNakshatraLord() fallback when API doesn't return nakshatraLord
    nakshatraLord: birthData.nakshatraLord || getNakshatraLord(nakshatra) || '',
    nakshatraPada: birthData.nakshatraPada || '',
    lagna: birthData.lagna || 'Calculating...',
    lagnaLord: birthData.lagnaLord || '',
    sunSign: birthData.sunSign || '',
    currentDashaLord: birthData.currentDashaLord || '',
    currentDashaEnd: birthData.currentDashaEnd || '',
    // Bug 5 Fix: Add Antardasha info
    currentAntardasha: birthData.currentAntardasha || '',
    antardashaEnd: birthData.antardashaEnd || birthData.currentDashaEnd || ''
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
    // Bug 3 Fix: Use getNakshatraLord() fallback when API doesn't return nakshatraLord
    NAKSHATRA_LORD: birthData.nakshatraLord || getNakshatraLord(birthData.nakshatra) || '',
    NAKSHATRA_PADA: birthData.nakshatraPada || '',
    LAGNA: birthData.lagna || '',
    LAGNA_LORD: birthData.lagnaLord || '',
    SUN_SIGN: birthData.sunSign || '',
    MAHADASHA: birthData.currentDashaLord || '',
    CURRENT_DASHA_LORD: birthData.currentDashaLord || '',
    CURRENT_DASHA_END: birthData.currentDashaEnd || '',
    // Bug 5 Fix: Add Antardasha end date for period display
    ANTARDASHA: birthData.currentAntardasha || '',
    ANTARDASHA_END: birthData.antardashaEnd || birthData.currentDashaEnd || '',
    // Bug 4 Fix: Add Lagna-specific goal planets
    GOAL_PLANETS: getPersonalGoalPlanets(goals[0] || 'Wealth', birthData.lagna || 'Scorpio').join(', '),
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
  
  // Direction info
  const cityDirection = city.direction || 'N/A';
  const dirAdj = cred.breakdown?.directionAdjustment || {};
  
  // Check if credibilityData has valid breakdown data
  // Include check for lineProximity.score or boostedScore to ensure boost data is included
  const hasValidBreakdown = cred.breakdown && (
    western.total !== undefined || 
    vedic.total !== undefined || 
    typeof lineProx.score === 'number' || 
    typeof lineProx.boostedScore === 'number'
  );
  
  // Get original Western total (pre-penalty) for sub-score breakdown
  const westernOriginal = hasValidBreakdown ? (western.total ?? Math.round(score / 2)) : Math.round(score / 2);
  const vedicTotal = hasValidBreakdown ? (vedic.total ?? (score - westernOriginal)) : (score - westernOriginal);
  
  // Get adjusted Western total (post-penalty) for final calculation
  const westernAdjusted = hasValidBreakdown ? (western.adjustedTotal ?? westernOriginal) : westernOriginal;
  
  // Direction penalty info
  const hasPenalty = dirAdj.hasPenalty || (westernAdjusted < westernOriginal);
  const penaltyAmount = hasPenalty ? (westernOriginal - westernAdjusted) : 0;
  const multiplier = dirAdj.multiplier || 1.0;
  const penaltyPercentage = hasPenalty ? Math.round((1 - multiplier) * 100) : 0;
  
  // Bug 8 Option B: Show FINAL adjusted scores only
  // Sub-scores must add up to westernAdjusted (not westernOriginal)
  // Apply penalty ratio to scale down sub-components proportionally
  
  const rawBaseScore = hasValidBreakdown ? (lineProx.score ?? 0) : 0;
  const boostedLineScore = hasValidBreakdown ? (lineProx.boostedScore ?? rawBaseScore) : rawBaseScore;
  const boostReasons = hasValidBreakdown ? (lineProx.boostReasons || []) : [];
  
  // Calculate penalty ratio for proportional scaling
  const penaltyRatio = westernOriginal > 0 ? (westernAdjusted / westernOriginal) : 1;
  
  // Get raw Paran score
  const apiParanScore = hasValidBreakdown ? (western.parans?.score ?? null) : null;
  const rawParanScore = apiParanScore !== null ? Math.min(25, apiParanScore) : Math.max(0, Math.min(25, westernOriginal - boostedLineScore));
  
  // Bug 8: Scale sub-scores proportionally so they ADD UP to westernAdjusted
  const lineProximityScore = Math.round(Math.min(25, rawBaseScore) * penaltyRatio);
  const actualBoostPoints = Math.max(0, Math.round((boostedLineScore - rawBaseScore) * penaltyRatio));
  const paranScore = Math.round(rawParanScore * penaltyRatio);
  
  // Vedic scores remain unchanged (no penalty applied to Vedic)
  const nakshatraRashiScore = hasValidBreakdown ? (vedic.nakshatraRashi?.score ?? Math.round(vedicTotal * 0.4)) : Math.round(vedicTotal * 0.4);
  const lagnaVastuScore = hasValidBreakdown ? (vedic.lagnaVastu?.score ?? Math.round(vedicTotal * 0.3)) : Math.round(vedicTotal * 0.3);
  const dashaScore = hasValidBreakdown ? (vedic.dashaTiming?.score ?? (vedicTotal - nakshatraRashiScore - lagnaVastuScore)) : (vedicTotal - nakshatraRashiScore - lagnaVastuScore);
  
  // Build planet boost row HTML (only when there's an actual boost)
  let planetBoostRow = '';
  if (actualBoostPoints > 0) {
    const nearestLine = lineProx.nearestLine || '';
    let planetName = nearestLine.split('-')[0] || 'Planet';
    if (boostReasons.length > 0) {
      const firstReason = boostReasons[0] || '';
      const planetMatch = firstReason.match(/^(Jupiter|Venus|Mercury|Sun|Moon|Mars|Saturn)/);
      if (planetMatch) planetName = planetMatch[1];
    }
    planetBoostRow = `
      <div class="score-item" style="background: rgba(212, 175, 55, 0.15); border-radius: 4px; padding: 4px 8px; font-size: 10px;">
        <span>→ Planet Boost (${planetName})</span>
        <span style="color: #D4AF37;">+${actualBoostPoints}</span>
      </div>`;
  }
  
  // Per transparency rule: Direction penalty is baked into Western score, not shown separately
  // Remove the separate direction adjustment row - penalty already applied to westernAdjusted
  let directionAdjustmentRow = '';
  
  // Simple calculation display: Western (adjusted) + Vedic = Total
  // Direction penalty is already baked into westernAdjusted, so we use that
  const calcString = `${westernAdjusted} + ${vedicTotal} = ${score}%`;
  
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
    
    WESTERN_SCORE: westernAdjusted,
    LINE_PROXIMITY_SCORE: lineProximityScore,
    PLANET_BOOST_ROW: planetBoostRow,
    PARAN_SCORE: paranScore,
    VEDIC_SCORE: vedicTotal,
    NAKSHATRA_RASHI_SCORE: nakshatraRashiScore,
    LAGNA_VASTU_SCORE: lagnaVastuScore,
    DASHA_SCORE: dashaScore,
    
    DIRECTION_ADJUSTMENT_ROW: directionAdjustmentRow,
    SCORE_TOTAL_CALC: calcString,
    
    // Bug 4 Fix: Add Lagna-specific goal planets from baseData
    GOAL_PLANETS: baseData?.GOAL_PLANETS || getPersonalGoalPlanets(goal, baseData?.LAGNA || 'Scorpio').join(', '),
    // Bug 5 Fix: Add period ends info from baseData
    ANTARDASHA_END: baseData?.ANTARDASHA_END || baseData?.CURRENT_DASHA_END || '',
    PERIOD_ENDS: baseData?.ANTARDASHA_END || baseData?.CURRENT_DASHA_END || ''
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
    
    // FIX C: Prefer nearestLine (goal-filtered) over generic lines array
    // This ensures ranking table matches city page planetary line display
    let formattedLines = [];
    
    // Priority 1: Use nearestLine (goal-relevant, same as city page)
    if (city.nearestLine) {
      const [planet, type] = (city.nearestLine || '').split('-');
      const distKm = city.lineDistanceKm ? `${Math.round(city.lineDistanceKm)}km` : '';
      formattedLines = [formatPlanetLine(planet, type) + (distKm ? ` (${distKm})` : '')];
    }
    
    // Priority 2: Fall back to lines array if nearestLine not available
    if (formattedLines.length === 0) {
      const lines = city.lines || [];
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

// Bug 5: Static fallback planets (used when Lagna not available)
const GOAL_KEY_PLANETS = {
  Career: ['Sun', 'Saturn', 'Jupiter', 'Mercury'],
  Wealth: ['Jupiter', 'Venus', 'Mercury', 'Sun'],
  Love: ['Venus', 'Moon', 'Mars', 'Jupiter'],
  Education: ['Mercury', 'Jupiter', 'Moon', 'Sun'],
  Settlement: ['Moon', 'Venus', 'Saturn', 'Jupiter'],
  Complete: ['Sun', 'Moon', 'Jupiter', 'Venus']
};

// Bug 5: Lagna-based dynamic house lord derivation for goal planets
const GOAL_HOUSE_MAPPING = {
  Career: [10, 6, 2, 11],      // 10th (career), 6th (work), 2nd (income), 11th (gains)
  Wealth: [2, 11, 5, 9],       // 2nd (money), 11th (gains), 5th (speculation), 9th (fortune)
  Love: [7, 5, 1, 4],          // 7th (partner), 5th (romance), 1st (self), 4th (home)
  Education: [4, 5, 9, 1],     // 4th (learning), 5th (intelligence), 9th (higher ed), 1st (self)
  Settlement: [4, 7, 2, 12],   // 4th (home), 7th (partnership), 2nd (family), 12th (foreign)
  Complete: [1, 9, 10, 5]      // 1st, 9th, 10th, 5th (key houses)
};

const HOUSE_LORDS_BY_LAGNA = {
  Aries: ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'],
  Taurus: ['Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars'],
  Gemini: ['Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus'],
  Cancer: ['Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury'],
  Leo: ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon'],
  Virgo: ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun'],
  Libra: ['Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury'],
  Scorpio: ['Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus'],
  Sagittarius: ['Jupiter', 'Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars'],
  Capricorn: ['Saturn', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter'],
  Aquarius: ['Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
  Pisces: ['Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn']
};

// Extended house mapping for each goal - used when primary houses yield fewer than 4 unique planets
const GOAL_HOUSE_MAPPING_EXTENDED = {
  Career: [10, 6, 2, 11, 1, 7],      // Add 1st (self) and 7th (partnerships)
  Wealth: [2, 11, 5, 9, 1, 10],      // Add 1st (self) and 10th (profession for income)
  Love: [7, 5, 1, 4, 2, 11],         // Add 2nd (family) and 11th (desires)
  Education: [4, 5, 9, 1, 3, 10],    // Add 3rd (skills) and 10th (career application)
  Settlement: [4, 7, 2, 12, 1, 9],   // Add 1st (self) and 9th (fortune/long journeys)
  Complete: [1, 9, 10, 5, 2, 7]      // Add 2nd and 7th
};

function getPersonalGoalPlanetsForDisplay(goal, lagna) {
  if (!lagna || !HOUSE_LORDS_BY_LAGNA[lagna]) {
    return GOAL_KEY_PLANETS[goal] || GOAL_KEY_PLANETS.Complete;
  }
  
  // FIX A: Use extended house list to always derive 4 Lagna-relevant planets
  // This prevents Venus appearing for Scorpio+Wealth where it's NOT relevant
  const houses = GOAL_HOUSE_MAPPING_EXTENDED[goal] || GOAL_HOUSE_MAPPING_EXTENDED.Complete;
  const houseLords = HOUSE_LORDS_BY_LAGNA[lagna];
  const planets = new Set();
  
  // Iterate through extended house list until we have 4 unique planets
  for (const house of houses) {
    const lord = houseLords[house - 1];
    if (lord) planets.add(lord);
    if (planets.size >= 4) break;
  }
  
  const result = Array.from(planets);
  
  // Fallback only if extended houses still don't yield 4 planets (rare edge case)
  if (result.length < 4) {
    const fallback = GOAL_KEY_PLANETS[goal] || GOAL_KEY_PLANETS.Complete;
    for (const p of fallback) {
      if (result.length >= 4) break;
      if (!result.includes(p)) result.push(p);
    }
  }
  
  return result.slice(0, 4);
}

export function generateDividerPlanetData(goal, baseData) {
  const data = { ...baseData };
  
  // Bug 5 Fix: Use Lagna-derived house lords when available
  // Note: baseData may use either LAGNA or lagna (case-insensitive check)
  const lagna = baseData.LAGNA || baseData.lagna || null;
  const keyPlanets = getPersonalGoalPlanetsForDisplay(goal, lagna);
  
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
  // Bug 3 Fix: Use getNakshatraLord() fallback when API doesn't return nakshatraLord
  data.NAKSHATRA_LORD = birthData.nakshatraLord || getNakshatraLord(nakshatra) || '';
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

// Region groupings for finding similar alternatives
const REGION_GROUPS = {
  'India': ['West India', 'North India', 'South India', 'East India', 'Central India'],
  'Asia': ['East Asia', 'Southeast Asia', 'Middle East'],
  'Western': ['Europe', 'North America', 'South America'],
  'Pacific': ['Australia & Oceania'],
  'African': ['Africa']
};

function findRegionalAlternative(avoidCity, allRankedCities, bestCities) {
  const cityRegion = avoidCity.region;
  if (!cityRegion) return null;
  
  // 1. First try: Find best-scoring city from SAME region (excluding the avoid city)
  const sameRegionCity = allRankedCities.find(c => 
    c.region === cityRegion && 
    c.name !== avoidCity.name &&
    c.score > avoidCity.score
  );
  if (sameRegionCity) return sameRegionCity;
  
  // 2. Second try: For Indian cities, find from any Indian region
  if (cityRegion.includes('India')) {
    const anyIndianCity = allRankedCities.find(c =>
      c.country === 'India' &&
      c.name !== avoidCity.name &&
      c.score > avoidCity.score
    );
    if (anyIndianCity) return anyIndianCity;
  }
  
  // 3. Third try: Find from related region group
  let relatedGroup = null;
  for (const [groupName, regions] of Object.entries(REGION_GROUPS)) {
    if (regions.includes(cityRegion)) {
      relatedGroup = regions;
      break;
    }
  }
  
  if (relatedGroup) {
    const relatedCity = allRankedCities.find(c =>
      relatedGroup.includes(c.region) &&
      c.name !== avoidCity.name &&
      c.score > avoidCity.score
    );
    if (relatedCity) return relatedCity;
  }
  
  // 4. Fourth try: Same country
  const sameCountryCity = allRankedCities.find(c =>
    c.country === avoidCity.country &&
    c.name !== avoidCity.name &&
    c.score > avoidCity.score
  );
  if (sameCountryCity) return sameCountryCity;
  
  // 5. Fallback: First best city that's not the avoid city
  return bestCities.find(c => c.name !== avoidCity.name) || bestCities[0] || null;
}

export function prepareAvoidCityData(city, goal, bestCities, baseData, allRankedCities = []) {
  const data = { ...baseData };
  
  data.CITY_NAME = city.name || '';
  data.COUNTRY = city.country || '';
  data.SCORE = city.score || 0;
  data.GOAL = goal;
  
  const directions = ['North', 'South', 'East', 'West', 'Northeast', 'Northwest'];
  data.DIRECTION = city.direction || directions[Math.floor(Math.random() * directions.length)];
  
  // Smart regional alternative - find best-scoring city from same or related region
  const altCity = findRegionalAlternative(city, allRankedCities, bestCities);
  
  data.ALT_CITY = altCity?.name || 'a top-ranked city from this report';
  data.ALT_CITY_SCORE = altCity?.score || '';
  
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
