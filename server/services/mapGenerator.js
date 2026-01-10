const AstroMapRenderer = require('../map-renderer');
const LegendRenderer = require('../legend-renderer');
const { getCityView, getClusterView, REGIONAL_VIEWS } = require('../map-renderer');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../../temp/maps');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

class MapGenerator {
  constructor() {
    this.mapRenderer = new AstroMapRenderer();
    this.legendRenderer = new LegendRenderer();
  }

  async generateReportMaps(userData, astroData, options) {
    const { goal, scope, birthLocation } = options;
    const reportId = `report_${Date.now()}`;
    const maps = {};

    console.log(`\n🗺️  Generating maps for report ${reportId}...`);

    const lines = astroData.lines || [];
    const cities = astroData.topCities || astroData.cities || [];
    const powerZones = astroData.powerZones || [];

    maps.worldOverview = await this.generateMap(reportId, 'world_overview', {
      viewType: 'world',
      goal: 'Complete',
      lines,
      cities: cities.slice(0, 10),
      powerZones,
      birthLocation,
      highlightIndia: true
    });
    console.log('   ✅ World overview map generated');

    maps.worldGoalFiltered = await this.generateMap(reportId, 'world_goal', {
      viewType: 'world',
      goal,
      lines,
      cities: cities.slice(0, 10),
      powerZones,
      birthLocation,
      highlightIndia: true
    });
    console.log(`   ✅ ${goal} goal-filtered world map generated`);

    if (scope === 'india' || scope === 'both' || scope === 'complete') {
      const indiaCities = cities.filter(c => 
        c.country === 'India' || c.region?.includes('India')
      );

      maps.india = await this.generateMap(reportId, 'india', {
        viewType: 'india',
        goal,
        lines,
        cities: indiaCities.slice(0, 8),
        powerZones,
        birthLocation,
        highlightIndia: true
      });
      console.log('   ✅ India map generated');

      if (indiaCities.length >= 3) {
        const northCities = indiaCities.filter(c => 
          ['Delhi', 'Jaipur', 'Lucknow', 'Chandigarh', 'Varanasi', 'Amritsar'].includes(c.name)
        );
        if (northCities.length > 0) {
          maps.indiaNorth = await this.generateMap(reportId, 'india_north', {
            viewType: 'india_north',
            goal,
            lines,
            cities: northCities,
            powerZones,
            birthLocation
          });
          console.log('   ✅ North India map generated');
        }

        const southCities = indiaCities.filter(c => 
          ['Bangalore', 'Chennai', 'Hyderabad', 'Kochi', 'Thiruvananthapuram', 'Coimbatore'].includes(c.name)
        );
        if (southCities.length > 0) {
          maps.indiaSouth = await this.generateMap(reportId, 'india_south', {
            viewType: 'india_south',
            goal,
            lines,
            cities: southCities,
            powerZones,
            birthLocation
          });
          console.log('   ✅ South India map generated');
        }

        const westCities = indiaCities.filter(c => 
          ['Mumbai', 'Pune', 'Ahmedabad', 'Surat', 'Vadodara', 'Nagpur'].includes(c.name)
        );
        if (westCities.length > 0) {
          maps.indiaWest = await this.generateMap(reportId, 'india_west', {
            viewType: 'india_west',
            goal,
            lines,
            cities: westCities,
            powerZones,
            birthLocation
          });
          console.log('   ✅ West India map generated');
        }
      }
    }

    if (scope === 'international' || scope === 'both' || scope === 'complete') {
      const intlCities = cities.filter(c => c.country !== 'India');

      const europeCities = intlCities.filter(c => 
        ['UK', 'Germany', 'France', 'Netherlands', 'Switzerland', 'Sweden', 'Ireland'].includes(c.country)
      );
      if (europeCities.length > 0) {
        maps.europe = await this.generateMap(reportId, 'europe', {
          viewType: 'europe',
          goal,
          lines,
          cities: europeCities,
          powerZones,
          birthLocation
        });
        console.log('   ✅ Europe map generated');
      }

      const middleEastCities = intlCities.filter(c => 
        ['UAE', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman'].includes(c.country)
      );
      if (middleEastCities.length > 0) {
        maps.middleEast = await this.generateMap(reportId, 'middle_east', {
          viewType: 'middle_east',
          goal,
          lines,
          cities: middleEastCities,
          powerZones,
          birthLocation
        });
        console.log('   ✅ Middle East map generated');
      }

      const asiaCities = intlCities.filter(c => 
        ['Singapore', 'Malaysia', 'Thailand', 'Indonesia', 'Vietnam', 'Philippines'].includes(c.country)
      );
      if (asiaCities.length > 0) {
        maps.southeastAsia = await this.generateMap(reportId, 'southeast_asia', {
          viewType: 'southeast_asia',
          goal,
          lines,
          cities: asiaCities,
          powerZones,
          birthLocation
        });
        console.log('   ✅ Southeast Asia map generated');
      }
    }

    maps.cityMaps = {};
    const topCities = cities.slice(0, 6);

    for (const city of topCities) {
      const cityKey = city.name.toLowerCase().replace(/\s+/g, '_');
      maps.cityMaps[cityKey] = await this.generateCityMap(reportId, city, {
        goal,
        lines,
        powerZones,
        birthLocation
      });
    }
    console.log(`   ✅ ${topCities.length} city close-up maps generated`);

    maps.legend = await this.generateLegend(reportId);
    console.log('   ✅ Legend page generated');

    console.log(`\n🗺️  Total maps generated: ${Object.keys(maps).length + Object.keys(maps.cityMaps || {}).length}`);

    return { reportId, maps };
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
        showLabel: true
      }]
    });

    fs.writeFileSync(filepath, buffer);

    return {
      filename,
      filepath,
      base64: buffer.toString('base64'),
      dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
      cityName: city.name
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
module.exports.generateReportMaps = async function(userData, astroData, options) {
  const generator = new MapGenerator();
  return generator.generateReportMaps(userData, astroData, options);
};
