const AstroMapRenderer = require('../map-renderer');
const LegendRenderer = require('../legend-renderer');
const { getCityView, getClusterView, REGIONAL_VIEWS } = require('../map-renderer');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../../temp/maps');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const INDIA_REGIONS = [
  { key: 'india', name: 'India Overview', viewType: 'india' },
  { key: 'india_north', name: 'North India', viewType: 'india_north', regionName: 'North India' },
  { key: 'india_south', name: 'South India', viewType: 'india_south', regionName: 'South India' },
  { key: 'india_west', name: 'West India', viewType: 'india_west', regionName: 'West India' },
  { key: 'india_east', name: 'East India', viewType: 'india_east', regionName: 'East India' },
  { key: 'india_central', name: 'Central India', viewType: 'india_central', regionName: 'Central India' }
];

const INTERNATIONAL_REGIONS = [
  { key: 'world', name: 'World Overview', viewType: 'world' },
  { key: 'europe', name: 'Europe', viewType: 'europe', regionName: 'Europe' },
  { key: 'middle_east', name: 'Middle East', viewType: 'middle_east', regionName: 'Middle East' },
  { key: 'southeast_asia', name: 'Southeast Asia', viewType: 'southeast_asia', regionName: 'Southeast Asia' },
  { key: 'east_asia', name: 'East Asia', viewType: 'east_asia', regionName: 'East Asia' },
  { key: 'north_america', name: 'North America', viewType: 'north_america', regionName: 'North America' },
  { key: 'south_america', name: 'South America', viewType: 'south_america', regionName: 'South America' },
  { key: 'australia', name: 'Australia & Oceania', viewType: 'australia', regionName: 'Australia & Oceania' },
  { key: 'africa', name: 'Africa', viewType: 'africa', regionName: 'Africa' }
];

const ALL_GOALS = ['Career', 'Wealth', 'Love', 'Education', 'Settlement'];

const CITY_COUNTS = {
  single: {
    india: { best: 9, avoid: 5 },
    international: { best: 9, avoid: 5 },
    both: { best: 18, avoid: 10 }
  },
  complete: {
    india: { bestPerGoal: 9, avoidPerGoal: 5 },
    international: { bestPerGoal: 9, avoidPerGoal: 5 },
    both: { bestPerGoal: 18, avoidPerGoal: 10 }
  }
};

class MapGenerator {
  constructor() {
    this.mapRenderer = new AstroMapRenderer();
    this.legendRenderer = new LegendRenderer();
  }

  getRegionsForScope(scope) {
    if (scope === 'india') return INDIA_REGIONS;
    if (scope === 'international') return INTERNATIONAL_REGIONS;
    return [...INDIA_REGIONS, ...INTERNATIONAL_REGIONS];
  }

  getCityCounts(reportType, scope) {
    const type = reportType === 'complete' ? 'complete' : 'single';
    return CITY_COUNTS[type][scope] || CITY_COUNTS[type].both;
  }

  filterCitiesByScope(cities, scope) {
    if (scope === 'india') {
      return cities.filter(c => c.country === 'India');
    } else if (scope === 'international') {
      return cities.filter(c => c.country !== 'India');
    }
    return cities;
  }

  getTopCitiesForGoal(allCities, goal, scope, limit) {
    const filtered = this.filterCitiesByScope(allCities, scope);
    return filtered
      .sort((a, b) => {
        const scoreA = a.goalScores?.[goal] || a.score || 0;
        const scoreB = b.goalScores?.[goal] || b.score || 0;
        return scoreB - scoreA;
      })
      .slice(0, limit);
  }

  getAvoidCitiesForGoal(allCities, goal, scope, limit) {
    const filtered = this.filterCitiesByScope(allCities, scope);
    return filtered
      .sort((a, b) => {
        const scoreA = a.goalScores?.[goal] || a.score || 0;
        const scoreB = b.goalScores?.[goal] || b.score || 0;
        return scoreA - scoreB;
      })
      .slice(0, limit);
  }

  getCitiesForRegion(allCities, regionKey) {
    const regionMapping = {
      'india_north': 'North India',
      'india_south': 'South India',
      'india_west': 'West India',
      'india_east': 'East India',
      'india_central': 'Central India',
      'europe': 'Europe',
      'middle_east': 'Middle East',
      'southeast_asia': 'Southeast Asia',
      'east_asia': 'East Asia',
      'north_america': 'North America',
      'south_america': 'South America',
      'australia': 'Australia & Oceania',
      'africa': 'Africa'
    };
    
    if (regionKey === 'india') {
      return allCities.filter(c => c.country === 'India');
    }
    if (regionKey === 'world') {
      return allCities;
    }
    
    const regionName = regionMapping[regionKey];
    return allCities.filter(c => c.region === regionName);
  }

  async generateReportMaps(userData, astroData, options) {
    const { goal, scope, reportType = 'single', birthLocation } = options;
    const reportId = `report_${Date.now()}`;
    
    const maps = {
      overview: {},
      regional: {},
      cities: {},
      avoidCities: {},
      powerZones: {},
      legend: null
    };
    
    const goals = reportType === 'complete' ? ALL_GOALS : [goal || 'Career'];
    const regions = this.getRegionsForScope(scope || 'both');
    const cityCounts = this.getCityCounts(reportType, scope || 'both');
    
    const lines = astroData.lines || [];
    const cities = astroData.topCities || astroData.cities || [];
    const powerZones = astroData.powerZones || [];
    
    console.log(`\n🗺️  Generating maps for ${reportType} report, ${scope || 'both'} scope, goals: ${goals.join(', ')}`);
    console.log(`   Cities available: ${cities.length}, Regions: ${regions.length}`);
    
    for (const g of goals) {
      maps.overview[`${g}_all_lines`] = await this.generateMap(reportId, `${g}_all_lines`, {
        viewType: 'world',
        goal: 'Complete',
        lines,
        cities: [],
        powerZones: [],
        birthLocation,
        highlightIndia: true
      });
      
      const bestLimit = cityCounts.best || cityCounts.bestPerGoal || 9;
      maps.overview[`${g}_filtered`] = await this.generateMap(reportId, `${g}_filtered`, {
        viewType: 'world',
        goal: g,
        lines,
        cities: this.getTopCitiesForGoal(cities, g, scope || 'both', bestLimit),
        powerZones: powerZones.filter(z => z.category?.toLowerCase() === g.toLowerCase()),
        birthLocation,
        highlightIndia: true
      });
      
      maps.powerZones[g] = await this.generateMap(reportId, `${g}_power`, {
        viewType: 'world',
        goal: g,
        lines,
        cities: [],
        powerZones,
        birthLocation,
        highlightPowerZones: true,
        highlightIndia: true
      });
      
      console.log(`   ✅ Overview maps for ${g} generated`);
    }
    
    for (const g of goals) {
      maps.regional[g] = {};
      
      for (const region of regions) {
        const regionCities = this.getCitiesForRegion(cities, region.key);
        
        if (regionCities.length > 0 || region.key === 'world' || region.key === 'india') {
          maps.regional[g][region.key] = await this.generateMap(reportId, `${g}_${region.key}`, {
            viewType: region.viewType,
            goal: g,
            lines,
            cities: regionCities.map(c => ({ ...c, showLabel: true })),
            powerZones,
            birthLocation,
            highlightIndia: region.key === 'world'
          });
        }
      }
      
      console.log(`   ✅ Regional maps for ${g} generated (${Object.keys(maps.regional[g]).length} regions)`);
    }
    
    for (const g of goals) {
      maps.cities[g] = {};
      
      const bestLimit = cityCounts.best || cityCounts.bestPerGoal || 9;
      const topCities = this.getTopCitiesForGoal(cities, g, scope || 'both', bestLimit);
      
      for (const city of topCities) {
        const cityKey = city.name.toLowerCase().replace(/\s+/g, '_');
        maps.cities[g][cityKey] = await this.generateCityMap(reportId, city, {
          goal: g,
          lines,
          powerZones,
          birthLocation,
          isAvoidCity: false
        });
      }
      
      console.log(`   ✅ ${topCities.length} best city maps for ${g} generated`);
    }
    
    for (const g of goals) {
      maps.avoidCities[g] = {};
      
      const avoidLimit = cityCounts.avoid || cityCounts.avoidPerGoal || 5;
      const avoidCities = this.getAvoidCitiesForGoal(cities, g, scope || 'both', avoidLimit);
      
      for (const city of avoidCities) {
        const cityKey = city.name.toLowerCase().replace(/\s+/g, '_');
        maps.avoidCities[g][cityKey] = await this.generateCityMap(reportId, city, {
          goal: g,
          lines,
          powerZones,
          birthLocation,
          isAvoidCity: true
        });
      }
      
      console.log(`   ✅ ${avoidCities.length} avoid city maps for ${g} generated`);
    }
    
    maps.legend = await this.generateLegend(reportId);
    console.log('   ✅ Legend page generated');
    
    const mapCount = this.countMaps(maps);
    console.log(`\n🗺️  Total maps generated: ${mapCount}`);
    
    return { reportId, maps, mapCount };
  }
  
  countMaps(maps) {
    let count = 0;
    count += Object.keys(maps.overview).length;
    count += Object.values(maps.regional).reduce((sum, goalMaps) => sum + Object.keys(goalMaps).length, 0);
    count += Object.values(maps.cities).reduce((sum, goalMaps) => sum + Object.keys(goalMaps).length, 0);
    count += Object.values(maps.avoidCities).reduce((sum, goalMaps) => sum + Object.keys(goalMaps).length, 0);
    count += Object.keys(maps.powerZones).length;
    count += maps.legend ? 1 : 0;
    return count;
  }

  async generateMap(reportId, mapName, options) {
    const filename = `${reportId}_${mapName}.png`;
    const filepath = path.join(TEMP_DIR, filename);

    const buffer = await this.mapRenderer.renderGoalFilteredMap(options);
    fs.writeFileSync(filepath, buffer);

    return {
      filename,
      filepath,
      base64: buffer.toString('base64'),
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`
    };
  }

  async generateCityMap(reportId, city, options) {
    const cityLat = city.latitude || city.lat;
    const cityLng = city.longitude || city.lng;
    
    const viewConfig = getCityView({
      ...city,
      latitude: cityLat,
      longitude: cityLng
    });

    const filename = `${reportId}_city_${city.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    const filepath = path.join(TEMP_DIR, filename);

    const buffer = await this.mapRenderer.renderGoalFilteredMap({
      ...options,
      viewConfig,
      cities: [{
        ...city,
        latitude: cityLat,
        longitude: cityLng,
        type: options.isAvoidCity ? 'avoid' : 'recommended',
        showLabel: true
      }]
    });

    fs.writeFileSync(filepath, buffer);

    return {
      filename,
      filepath,
      base64: buffer.toString('base64'),
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      cityName: city.name,
      isAvoidCity: options.isAvoidCity || false
    };
  }

  async generateLegend(reportId) {
    const filename = `${reportId}_legend.png`;
    const filepath = path.join(TEMP_DIR, filename);

    const buffer = this.legendRenderer.render();
    fs.writeFileSync(filepath, buffer);

    return {
      filename,
      filepath,
      base64: buffer.toString('base64'),
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`
    };
  }

  cleanupTempFiles(reportId) {
    try {
      const files = fs.readdirSync(TEMP_DIR);
      files.forEach(file => {
        if (file.startsWith(reportId)) {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        }
      });
      console.log(`   🧹 Cleaned up temp files for ${reportId}`);
    } catch (error) {
      console.error('Error cleaning up temp files:', error.message);
    }
  }
}

module.exports = MapGenerator;
module.exports.INDIA_REGIONS = INDIA_REGIONS;
module.exports.INTERNATIONAL_REGIONS = INTERNATIONAL_REGIONS;
module.exports.CITY_COUNTS = CITY_COUNTS;
module.exports.ALL_GOALS = ALL_GOALS;
module.exports.generateReportMaps = async function(userData, astroData, options) {
  const generator = new MapGenerator();
  return generator.generateReportMaps(userData, astroData, options);
};
