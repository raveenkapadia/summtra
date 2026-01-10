const d3 = require('d3');
const { createCanvas } = require('canvas');
const topojson = require('topojson-client');
const fs = require('fs');
const path = require('path');

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 700;

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

const LINE_STYLES = {
  'AC': { dash: [], width: 2.5 },
  'DC': { dash: [8, 4], width: 2 },
  'MC': { dash: [3, 3], width: 2 },
  'IC': { dash: [1, 3], width: 1.5 }
};

class AstroMapRenderer {
  constructor() {
    this.canvas = createCanvas(MAP_WIDTH, MAP_HEIGHT);
    this.ctx = this.canvas.getContext('2d');
    this.countries = null;
    this.india = null;
  }
  
  loadWorldData() {
    if (this.countries) return;
    
    const worldPath = path.join(process.cwd(), 'public/data/countries-110m.json');
    const worldData = JSON.parse(fs.readFileSync(worldPath, 'utf-8'));
    this.countries = topojson.feature(worldData, worldData.objects.countries);
    
    const indiaId = 356;
    this.india = {
      type: 'FeatureCollection',
      features: this.countries.features.filter(f => f.id === indiaId || f.id === '356')
    };
  }
  
  getProjection(viewType, center) {
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
  
  drawBaseMap(projection, highlightIndia = false) {
    this.loadWorldData();
    
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
  
  drawPlanetaryLines(lines, projection, filter = null) {
    if (!lines || !Array.isArray(lines)) return;
    
    lines.forEach(line => {
      if (filter && !filter(line)) return;
      
      const color = line.color || PLANET_COLORS[line.planet] || '#FFFFFF';
      const points = line.points || line.coordinates;
      const lineType = line.line_type || line.type || line.angle || 'AC';
      const style = LINE_STYLES[lineType] || LINE_STYLES['AC'];
      
      if (!points || points.length < 2) return;
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = style.width;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.setLineDash(style.dash);
      
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 4;
      
      this.ctx.beginPath();
      
      let started = false;
      points.forEach((point) => {
        const lng = point.longitude !== undefined ? point.longitude : point.lng;
        const lat = point.latitude !== undefined ? point.latitude : point.lat;
        
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
      center = [0, 0],
      lines = [],
      powerZones = [],
      cities = [],
      lineFilter = null,
      highlightIndia = false,
      birthLocation = null,
      showLegend = true,
      title = ''
    } = options;
    
    this.ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    
    const projection = this.getProjection(viewType, center);
    
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
}

module.exports = AstroMapRenderer;
