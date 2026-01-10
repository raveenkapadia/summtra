const d3 = require('d3');
const { createCanvas } = require('canvas');
const topojson = require('topojson-client');
const fs = require('fs');
const path = require('path');

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 700;

let cachedCountries = null;
let cachedIndia = null;

function loadCachedWorldData() {
  if (cachedCountries) return { countries: cachedCountries, india: cachedIndia };
  
  const worldPath = path.join(process.cwd(), 'public/data/countries-110m.json');
  const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf-8'));
  cachedCountries = topojson.feature(worldData, worldData.objects.countries);
  
  const indiaId = 356;
  cachedIndia = {
    type: 'FeatureCollection',
    features: cachedCountries.features.filter(f => f.id === indiaId || f.id === '356')
  };
  
  return { countries: cachedCountries, india: cachedIndia };
}

const COLORS = {
  ocean: '#0D0D1A',
  land: '#1E1E2E',
  borders: 'rgba(212, 175, 55, 0.2)',
  graticule: 'rgba(212, 175, 55, 0.08)',
  indiaHighlight: 'rgba(212, 175, 55, 0.3)'
};

const PLANET_COLORS = {
  'Sun': '#FFD700',
  'Moon': '#C0C0C0',
  'Mercury': '#4ECDC4',
  'Venus': '#FF69B4',
  'Mars': '#DC143C',
  'Jupiter': '#FFD700',
  'Saturn': '#708090',
  'Uranus': '#00BFFF',
  'Neptune': '#9370DB',
  'Pluto': '#8B008B',
  'NorthNode': '#8B5CF6',
  'North Node': '#8B5CF6',
  'Chiron': '#CD853F',
  'Rahu': '#8B5CF6',
  'Ketu': '#CD853F'
};

const LINE_TYPE_STYLES = {
  'AC': { dash: [], width: 2.5 },
  'DC': { dash: [8, 4], width: 2 },
  'MC': { dash: [3, 3], width: 2 },
  'IC': { dash: [1, 3], width: 1.5 }
};

const GOAL_LINE_CONFIG = {
  Career: {
    primary: ['Jupiter', 'Saturn', 'Sun', 'Mercury'],
    secondary: ['Mars', 'Pluto', 'North Node', 'NorthNode'],
    lineTypes: ['MC', 'AC'],
    description: 'Career success, professional growth, recognition'
  },
  Wealth: {
    primary: ['Jupiter', 'Venus', 'Mercury', 'Sun'],
    secondary: ['Pluto', 'North Node', 'NorthNode', 'Saturn'],
    lineTypes: ['MC', 'AC'],
    description: 'Financial abundance, prosperity, material success'
  },
  Love: {
    primary: ['Venus', 'Moon', 'Jupiter'],
    secondary: ['Mars', 'Neptune', 'Sun'],
    lineTypes: ['DC', 'AC'],
    description: 'Romantic relationships, partnerships, emotional connection'
  },
  Education: {
    primary: ['Mercury', 'Jupiter', 'Sun'],
    secondary: ['Saturn', 'Uranus', 'North Node', 'NorthNode'],
    lineTypes: ['MC', 'AC'],
    description: 'Learning, academic success, intellectual growth'
  },
  Settlement: {
    primary: ['Moon', 'Venus', 'Jupiter', 'Saturn'],
    secondary: ['Sun', 'Mercury'],
    lineTypes: ['IC', 'AC'],
    description: 'Long-term residence, home, family, stability'
  },
  Complete: {
    primary: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'],
    secondary: ['Uranus', 'Neptune', 'Pluto', 'North Node', 'NorthNode', 'Chiron'],
    lineTypes: ['AC', 'DC', 'MC', 'IC'],
    description: 'Complete astrological analysis'
  }
};

const IMPORTANCE_STYLES = {
  primary: {
    lineWidth: 2.5,
    opacity: 1,
    glow: true
  },
  secondary: {
    lineWidth: 1.5,
    opacity: 0.6,
    glow: false
  },
  other: {
    lineWidth: 1,
    opacity: 0.25,
    glow: false
  }
};

const REGIONAL_VIEWS = {
  world: {
    projection: 'geoNaturalEarth1',
    scale: 220,
    center: [0, 20],
    bounds: null,
    label: 'World View'
  },
  india: {
    projection: 'geoMercator',
    scale: 1100,
    center: [82, 22],
    bounds: [[68, 6], [98, 36]],
    label: 'India'
  },
  india_north: {
    projection: 'geoMercator',
    scale: 2200,
    center: [78, 28],
    bounds: [[74, 24], [88, 32]],
    label: 'North India'
  },
  india_south: {
    projection: 'geoMercator',
    scale: 2200,
    center: [78, 14],
    bounds: [[74, 8], [82, 20]],
    label: 'South India'
  },
  india_west: {
    projection: 'geoMercator',
    scale: 2200,
    center: [73, 20],
    bounds: [[68, 15], [78, 25]],
    label: 'West India'
  },
  india_east: {
    projection: 'geoMercator',
    scale: 2200,
    center: [88, 24],
    bounds: [[84, 20], [92, 28]],
    label: 'East India'
  },
  southeast_asia: {
    projection: 'geoMercator',
    scale: 600,
    center: [110, 10],
    bounds: [[95, -10], [130, 25]],
    label: 'Southeast Asia'
  },
  middle_east: {
    projection: 'geoMercator',
    scale: 800,
    center: [50, 28],
    bounds: [[35, 15], [65, 42]],
    label: 'Middle East'
  },
  europe: {
    projection: 'geoMercator',
    scale: 700,
    center: [15, 52],
    bounds: [[-10, 35], [40, 70]],
    label: 'Europe'
  },
  north_america: {
    projection: 'geoMercator',
    scale: 400,
    center: [-100, 45],
    bounds: [[-130, 25], [-60, 55]],
    label: 'North America'
  },
  australia: {
    projection: 'geoMercator',
    scale: 600,
    center: [135, -28],
    bounds: [[110, -45], [180, -10]],
    label: 'Australia & Oceania'
  },
  india_central: {
    projection: 'geoMercator',
    scale: 2000,
    center: [79, 22],
    bounds: [[76, 18], [84, 26]],
    label: 'Central India'
  },
  east_asia: {
    projection: 'geoMercator',
    scale: 500,
    center: [120, 35],
    bounds: [[100, 20], [145, 50]],
    label: 'East Asia'
  },
  south_america: {
    projection: 'geoMercator',
    scale: 350,
    center: [-60, -15],
    bounds: [[-85, -55], [-30, 15]],
    label: 'South America'
  },
  africa: {
    projection: 'geoMercator',
    scale: 350,
    center: [20, 5],
    bounds: [[-20, -35], [55, 40]],
    label: 'Africa'
  }
};

function getCityView(city) {
  return {
    projection: 'geoMercator',
    scale: 4000,
    center: [city.longitude, city.latitude],
    bounds: [
      [city.longitude - 5, city.latitude - 3],
      [city.longitude + 5, city.latitude + 3]
    ],
    label: city.name
  };
}

function getClusterView(cities) {
  const lngs = cities.map(c => c.longitude);
  const lats = cities.map(c => c.latitude);
  
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  
  const lngSpread = Math.max(...lngs) - Math.min(...lngs);
  const latSpread = Math.max(...lats) - Math.min(...lats);
  const maxSpread = Math.max(lngSpread, latSpread);
  
  const scale = Math.min(3000, Math.max(800, 15000 / (maxSpread + 5)));
  
  return {
    projection: 'geoMercator',
    scale: scale,
    center: [centerLng, centerLat],
    bounds: [
      [Math.min(...lngs) - 2, Math.min(...lats) - 2],
      [Math.max(...lngs) + 2, Math.max(...lats) + 2]
    ],
    label: 'Regional View'
  };
}

class AstroMapRenderer {
  constructor() {
    this.canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT);
    this.ctx = this.canvas.getContext('2d');
    const { countries, india } = loadCachedWorldData();
    this.countries = countries;
    this.india = india;
  }
  
  getProjectionFromConfig(viewConfig) {
    const { projection, scale, center } = viewConfig;
    
    let proj;
    switch(projection) {
      case 'geoMercator':
        proj = d3.geoMercator();
        break;
      case 'geoNaturalEarth1':
        proj = d3.geoNaturalEarth1();
        break;
      case 'geoEquirectangular':
        proj = d3.geoEquirectangular();
        break;
      default:
        proj = d3.geoNaturalEarth1();
    }
    
    return proj
      .scale(scale)
      .center(center)
      .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
  }
  
  getProjection(viewType, center) {
    if (typeof viewType === 'object' && viewType.projection) {
      return this.getProjectionFromConfig(viewType);
    }
    
    const viewConfig = REGIONAL_VIEWS[viewType];
    if (viewConfig) {
      return this.getProjectionFromConfig(viewConfig);
    }
    
    switch(viewType) {
      case 'world':
        return d3.geoNaturalEarth1()
          .scale(220)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      case 'india':
        return d3.geoMercator()
          .center([82, 22])
          .scale(1200)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      case 'europe':
        return d3.geoMercator()
          .center([15, 52])
          .scale(800)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      case 'asia':
        return d3.geoMercator()
          .center([100, 25])
          .scale(400)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      case 'middle-east':
        return d3.geoMercator()
          .center([55, 25])
          .scale(1000)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      case 'city':
        return d3.geoMercator()
          .center(center)
          .scale(3000)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
      default:
        return d3.geoNaturalEarth1()
          .scale(220)
          .translate([MAP_WIDTH / 2, MAP_HEIGHT / 2]);
    }
  }
  
  drawRegionLabel(label) {
    if (!label) return;
    
    const textWidth = label.length * 10 + 30;
    
    this.ctx.fillStyle = 'rgba(45, 27, 78, 0.85)';
    this.ctx.beginPath();
    this.ctx.roundRect(20, 20, textWidth, 35, 6);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#D4AF37';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#D4AF37';
    this.ctx.font = 'bold 16px Arial, sans-serif';
    this.ctx.fillText(label, 35, 43);
  }
  
  drawBaseMap(projection, highlightIndia = false) {
    const pathGenerator = d3.geoPath(projection).context(this.ctx);
    
    this.ctx.fillStyle = COLORS.ocean;
    this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    this.ctx.fillStyle = COLORS.land;
    this.ctx.strokeStyle = COLORS.borders;
    this.ctx.lineWidth = 0.5;
    
    this.countries.features.forEach(feature => {
      this.ctx.beginPath();
      pathGenerator(feature);
      this.ctx.fill();
      this.ctx.stroke();
    });
    
    if (highlightIndia && this.india.features.length > 0) {
      this.ctx.fillStyle = COLORS.indiaHighlight;
      this.ctx.strokeStyle = '#D4AF37';
      this.ctx.lineWidth = 1.5;
      
      this.india.features.forEach(feature => {
        this.ctx.beginPath();
        pathGenerator(feature);
        this.ctx.fill();
        this.ctx.stroke();
      });
    }
    
    const graticule = d3.geoGraticule();
    this.ctx.strokeStyle = COLORS.graticule;
    this.ctx.lineWidth = 0.3;
    this.ctx.beginPath();
    pathGenerator(graticule());
    this.ctx.stroke();
  }
  
  extractLatLng(point) {
    let lat, lng;
    
    if (Array.isArray(point)) {
      [lat, lng] = point;
    } else if (typeof point === 'object') {
      lng = point.longitude !== undefined ? point.longitude : 
            point.lng !== undefined ? point.lng : 
            point.lon !== undefined ? point.lon : undefined;
      lat = point.latitude !== undefined ? point.latitude : 
            point.lat !== undefined ? point.lat : undefined;
    }
    
    return { lat, lng };
  }
  
  normalizeGoal(goal) {
    if (!goal) return null;
    const normalized = goal.charAt(0).toUpperCase() + goal.slice(1).toLowerCase();
    return GOAL_LINE_CONFIG[normalized] ? normalized : null;
  }
  
  filterLinesByGoal(lines, goal) {
    const normalizedGoal = this.normalizeGoal(goal);
    const config = normalizedGoal ? GOAL_LINE_CONFIG[normalizedGoal] : null;
    if (!config) return lines;
    
    return lines.map(line => {
      const planet = line.planet || '';
      const lineType = line.line_type || line.type || line.angle || 'AC';
      
      const isPrimary = config.primary.includes(planet);
      const isSecondary = config.secondary.includes(planet);
      const isRelevantLineType = config.lineTypes.includes(lineType);
      
      let importance;
      if (isPrimary && isRelevantLineType) {
        importance = 'primary';
      } else if (isSecondary && isRelevantLineType) {
        importance = 'secondary';
      } else if (isPrimary || isSecondary) {
        importance = 'secondary';
      } else {
        importance = 'other';
      }
      
      return {
        ...line,
        importance,
        importanceStyle: IMPORTANCE_STYLES[importance]
      };
    });
  }
  
  drawPlanetaryLines(lines, projection, filter = null) {
    if (!lines || !Array.isArray(lines)) return;
    
    lines.forEach(line => {
      if (filter && !filter(line)) return;
      
      const color = line.color || PLANET_COLORS[line.planet] || '#FFFFFF';
      const points = line.points || line.coordinates;
      const lineType = line.line_type || line.type || line.angle || 'AC';
      const typeStyle = LINE_TYPE_STYLES[lineType] || LINE_TYPE_STYLES['AC'];
      
      const hasImportanceStyle = !!line.importanceStyle;
      const impStyle = line.importanceStyle || null;
      
      if (!points || points.length < 2) return;
      
      this.ctx.strokeStyle = color;
      
      if (hasImportanceStyle && impStyle) {
        this.ctx.lineWidth = impStyle.lineWidth;
        this.ctx.globalAlpha = impStyle.opacity;
        if (impStyle.glow) {
          this.ctx.shadowColor = color;
          this.ctx.shadowBlur = 6;
        } else {
          this.ctx.shadowBlur = 0;
        }
      } else {
        this.ctx.lineWidth = typeStyle.width;
        this.ctx.globalAlpha = 1;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 4;
      }
      
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.setLineDash(typeStyle.dash);
      
      this.ctx.beginPath();
      
      let started = false;
      points.forEach((point) => {
        const { lat, lng } = this.extractLatLng(point);
        
        if (lng === undefined || lat === undefined) return;
        
        const projected = projection([lng, lat]);
        if (projected && !isNaN(projected[0]) && !isNaN(projected[1])) {
          if (projected[0] >= -50 && projected[0] <= MAP_WIDTH + 50 &&
              projected[1] >= -50 && projected[1] <= MAP_HEIGHT + 50) {
            if (!started) {
              this.ctx.moveTo(projected[0], projected[1]);
              started = true;
            } else {
              this.ctx.lineTo(projected[0], projected[1]);
            }
          }
        }
      });
      
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;
      this.ctx.setLineDash([]);
    });
  }
  
  drawPowerZones(powerZones, projection) {
    if (!powerZones || !Array.isArray(powerZones)) return;
    
    powerZones.forEach(zone => {
      const lng = zone.longitude !== undefined ? zone.longitude : zone.lng;
      const lat = zone.latitude !== undefined ? zone.latitude : zone.lat;
      
      const projected = projection([lng, lat]);
      if (!projected || isNaN(projected[0]) || isNaN(projected[1])) return;
      
      const radius = Math.max(10, (zone.strength || 0.5) * 30);
      const color = zone.is_challenging ? '#DC143C' : '#4ADE80';
      
      const gradient = this.ctx.createRadialGradient(
        projected[0], projected[1], 0,
        projected[0], projected[1], radius
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '66');
      gradient.addColorStop(1, 'transparent');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(projected[0], projected[1], radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(projected[0], projected[1], 4, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }
  
  drawCities(cities, projection) {
    if (!cities || !Array.isArray(cities)) return;
    
    cities.forEach(city => {
      const lng = city.longitude !== undefined ? city.longitude : city.lng;
      const lat = city.latitude !== undefined ? city.latitude : city.lat;
      
      const projected = projection([lng, lat]);
      if (!projected || isNaN(projected[0]) || isNaN(projected[1])) return;
      
      if (projected[0] < 0 || projected[0] > MAP_WIDTH ||
          projected[1] < 0 || projected[1] > MAP_HEIGHT) return;
      
      let radius, color;
      
      if (city.score) {
        radius = city.score >= 85 ? 10 : city.score >= 75 ? 8 : city.score >= 65 ? 6 : 4;
        color = city.score >= 85 ? '#4ADE80' : city.score >= 75 ? '#F59E0B' : '#60A5FA';
      } else {
        radius = city.type === 'recommended' ? 8 : 
                 city.type === 'good' ? 6 : 
                 city.type === 'avoid' ? 6 : 4;
        color = city.type === 'avoid' ? '#DC143C' : 
                city.type === 'recommended' ? '#4ADE80' : '#D4AF37';
      }
      
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 8;
      
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(projected[0], projected[1], radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      
      this.ctx.shadowBlur = 0;
      
      if (city.showLabel !== false) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 11px Arial, sans-serif';
        this.ctx.textAlign = 'left';
        
        const labelX = projected[0] + radius + 5;
        const labelY = projected[1] + 4;
        
        const text = city.score ? `${city.name} (${city.score}%)` : city.name;
        
        this.ctx.shadowColor = '#000000';
        this.ctx.shadowBlur = 3;
        this.ctx.fillText(text, labelX, labelY);
        this.ctx.shadowBlur = 0;
      }
    });
  }
  
  drawBirthLocation(birthLat, birthLng, projection) {
    const projected = projection([birthLng, birthLat]);
    if (!projected || isNaN(projected[0]) || isNaN(projected[1])) return;
    
    const size = 12;
    this.ctx.fillStyle = '#FF4444';
    this.ctx.shadowColor = '#FF4444';
    this.ctx.shadowBlur = 10;
    
    this.ctx.beginPath();
    this.ctx.moveTo(projected[0], projected[1] - size);
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
      const r = i % 2 === 0 ? size : size / 2;
      this.ctx.lineTo(
        projected[0] + r * Math.cos(angle),
        projected[1] + r * Math.sin(angle)
      );
    }
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.shadowBlur = 0;
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 10px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Birth Place', projected[0], projected[1] + size + 12);
  }
  
  drawLegend() {
    const legendX = 20;
    const legendY = MAP_HEIGHT - 180;
    const boxWidth = 180;
    const boxHeight = 170;
    
    this.ctx.fillStyle = 'rgba(13, 13, 26, 0.9)';
    this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    this.ctx.lineWidth = 1;
    
    this.ctx.beginPath();
    this.ctx.moveTo(legendX + 8, legendY);
    this.ctx.lineTo(legendX + boxWidth - 8, legendY);
    this.ctx.arcTo(legendX + boxWidth, legendY, legendX + boxWidth, legendY + 8, 8);
    this.ctx.lineTo(legendX + boxWidth, legendY + boxHeight - 8);
    this.ctx.arcTo(legendX + boxWidth, legendY + boxHeight, legendX + boxWidth - 8, legendY + boxHeight, 8);
    this.ctx.lineTo(legendX + 8, legendY + boxHeight);
    this.ctx.arcTo(legendX, legendY + boxHeight, legendX, legendY + boxHeight - 8, 8);
    this.ctx.lineTo(legendX, legendY + 8);
    this.ctx.arcTo(legendX, legendY, legendX + 8, legendY, 8);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    this.ctx.fillStyle = '#D4AF37';
    this.ctx.font = 'bold 12px Arial, sans-serif';
    this.ctx.fillText('PLANETARY LINES', legendX + 10, legendY + 20);
    
    const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
    planets.forEach((planet, i) => {
      const y = legendY + 40 + i * 18;
      
      this.ctx.strokeStyle = PLANET_COLORS[planet];
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(legendX + 10, y);
      this.ctx.lineTo(legendX + 40, y);
      this.ctx.stroke();
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '11px Arial, sans-serif';
      this.ctx.fillText(planet, legendX + 50, y + 4);
    });
  }
  
  async renderMap(options) {
    const {
      viewType = 'world',
      viewConfig = null,
      center = [0, 0],
      lines = [],
      powerZones = [],
      cities = [],
      lineFilter = null,
      highlightIndia = false,
      birthLocation = null,
      showLegend = true,
      title = '',
      regionLabel = null
    } = options;
    
    this.ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    let projection;
    let label = regionLabel;
    
    if (viewConfig) {
      projection = this.getProjectionFromConfig(viewConfig);
      label = label || viewConfig.label;
    } else {
      projection = this.getProjection(viewType, center);
      const configFromType = REGIONAL_VIEWS[viewType];
      if (configFromType) {
        label = label || configFromType.label;
      }
    }
    
    this.drawBaseMap(projection, highlightIndia);
    this.drawPlanetaryLines(lines, projection, lineFilter);
    this.drawPowerZones(powerZones, projection);
    this.drawCities(cities, projection);
    
    if (birthLocation) {
      this.drawBirthLocation(birthLocation.lat, birthLocation.lng, projection);
    }
    
    if (showLegend) {
      this.drawLegend();
    }
    
    if (label) {
      this.drawRegionLabel(label);
    }
    
    if (title) {
      this.ctx.fillStyle = '#D4AF37';
      this.ctx.font = 'bold 18px Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(title, MAP_WIDTH / 2, 30);
    }
    
    return this.canvas.toBuffer('image/png');
  }
  
  async saveMap(options, filename) {
    const buffer = await this.renderMap(options);
    fs.writeFileSync(filename, buffer);
    return filename;
  }
  
  async renderWorldMap(lines, cities, birthLocation) {
    return this.renderMap({
      viewType: 'world',
      lines,
      cities,
      birthLocation,
      highlightIndia: true,
      title: 'Your Astrocartography World Map'
    });
  }
  
  async renderIndiaMap(lines, cities, birthLocation) {
    return this.renderMap({
      viewType: 'india',
      lines,
      cities,
      birthLocation,
      highlightIndia: true,
      title: 'Your Astrocartography Map - India'
    });
  }
  
  async renderRegionMap(region, lines, cities, birthLocation) {
    return this.renderMap({
      viewType: region,
      lines,
      cities,
      birthLocation,
      highlightIndia: region === 'asia',
      title: `Your Astrocartography Map - ${region.charAt(0).toUpperCase() + region.slice(1)}`
    });
  }
  
  async renderGoalFilteredMap(options) {
    const { goal, lines, ...restOptions } = options;
    
    const normalizedGoal = this.normalizeGoal(goal);
    const filteredLines = this.filterLinesByGoal(lines || [], goal);
    
    const sortedLines = [...filteredLines].sort((a, b) => {
      const order = { other: 0, secondary: 1, primary: 2 };
      const aOrder = a.importance ? (order[a.importance] ?? 0) : 0;
      const bOrder = b.importance ? (order[b.importance] ?? 0) : 0;
      return aOrder - bOrder;
    });
    
    const config = normalizedGoal ? GOAL_LINE_CONFIG[normalizedGoal] : null;
    const goalTitle = config ? config.description : (goal || 'All Planets');
    const displayGoal = normalizedGoal || goal || 'Complete';
    
    return this.renderMap({
      ...restOptions,
      lines: sortedLines,
      title: options.title || `${displayGoal} - ${goalTitle}`
    });
  }
}

module.exports = AstroMapRenderer;
module.exports.GOAL_LINE_CONFIG = GOAL_LINE_CONFIG;
module.exports.PLANET_COLORS = PLANET_COLORS;
module.exports.REGIONAL_VIEWS = REGIONAL_VIEWS;
module.exports.getCityView = getCityView;
module.exports.getClusterView = getClusterView;
