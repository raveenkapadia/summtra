import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { 
  loadTemplate, 
  processTemplate, 
  prepareReportData,
  prepareCityPageData,
  prepareMapPageData,
  generateCityRows,
  generatePlanetCards,
  generateAvoidCityCard,
  generateRankingTableData,
  generateDividerPlanetData,
  generateVedicTraitsData,
  prepareAvoidCityData,
  PLANET_DATA
} from './templateProcessor.js';

const AstroMapRenderer = require('../map-renderer.js');
const claudeService = require('./claudeService.js');
const astrologyApi = require('./astrologyApi.js');
const vedicApi = require('./vedicApi.js');
const { INDIAN_CITIES, INTERNATIONAL_CITIES } = require('./geocodingService.js');

const GOALS_ORDER = ['Career', 'Wealth', 'Love', 'Education', 'Settlement'];

const REGIONAL_VIEWS_INDIA = ['india', 'india_north', 'india_south', 'india_west', 'india_east', 'india_central'];
const REGIONAL_VIEWS_INTERNATIONAL = ['europe', 'middle_east', 'southeast_asia', 'east_asia', 'australia', 'north_america', 'south_america', 'africa', 'world'];

export class PDFAssembler {
  constructor(birthData, astroData, options = {}) {
    this.birthData = birthData;
    this.astroData = astroData;
    this.options = options;
    this.goal = options.goal || 'Complete';
    this.scope = options.scope || 'Both';
    this.reportType = this.goal === 'Complete' ? 'Complete' : 'Single';
    
    this.baseData = prepareReportData(birthData, astroData, {
      goal: this.goal,
      goals: this.goal === 'Complete' ? GOALS_ORDER : [this.goal],
      scope: this.scope,
      reportType: this.reportType
    });
    
    this.pages = [];
    this.pageNumber = 0;
    this.mapRenderer = new AstroMapRenderer();
  }
  
  async assemble() {
    console.log(`\n📚 Assembling ${this.reportType} Report for ${this.scope}...`);
    
    await this.addCoverPage();
    await this.addIntroPage();
    await this.addHowToReadPage();
    await this.addUnderstandingLinesPage();
    await this.addLegendPage();
    
    await this.addMapPages();
    
    await this.addPlanetaryLinesPages();
    
    if (this.goal === 'Complete') {
      for (const goal of GOALS_ORDER) {
        await this.addGoalSection(goal);
      }
    } else {
      await this.addGoalSection(this.goal);
    }
    
    await this.addVedicProfilePage();
    await this.addDashaTimelinePage();
    await this.addGlossaryPages();
    
    this.updatePageNumbers();
    
    console.log(`✅ Assembled ${this.pages.length} pages`);
    return this.pages;
  }
  
  async addCoverPage() {
    const template = loadTemplate('cover-page-v2.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'cover' });
  }
  
  async addIntroPage() {
    const template = loadTemplate('intro-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'intro' });
  }
  
  async addHowToReadPage() {
    const template = loadTemplate('how-to-read-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'howtoread' });
  }
  
  async addUnderstandingLinesPage() {
    try {
      const template = loadTemplate('understanding-lines-page.html');
      const html = processTemplate(template, this.baseData);
      this.pages.push({ html, type: 'understanding-lines' });
      console.log('   📖 Added Understanding Your Lines page');
    } catch (err) {
      console.warn(`   ⚠️ Understanding Lines page not found, skipping: ${err.message}`);
    }
  }
  
  async addLegendPage() {
    const template = loadTemplate('legend-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'legend' });
  }
  
  async addMapPages() {
    const template = loadTemplate('map-page.html');
    
    const lines = this.astroData?.planetaryLines || [];
    const cities = this.astroData?.topCities || [];
    const birthLocation = {
      latitude: parseFloat(this.birthData.latitude) || 0,
      longitude: parseFloat(this.birthData.longitude) || 0
    };
    
    try {
      const worldBuffer = await this.mapRenderer.renderMap({
        viewType: 'world',
        lines,
        cities,
        birthLocation,
        goal: this.goal === 'Complete' ? null : this.goal
      });
      const worldMap = `data:image/png;base64,${worldBuffer.toString('base64')}`;
      const worldData = prepareMapPageData(worldMap, 'world', 'World Overview', this.baseData);
      this.pages.push({ html: processTemplate(template, worldData), type: 'map' });
    } catch (err) {
      console.warn(`   ⚠️ Skipping world map: ${err.message}`);
    }
    
    let regionalViews = [];
    if (this.scope === 'India') {
      regionalViews = REGIONAL_VIEWS_INDIA;
    } else if (this.scope === 'International') {
      // Filter out 'world' since we already added World Overview above
      regionalViews = REGIONAL_VIEWS_INTERNATIONAL.filter(v => v !== 'world');
    } else {
      regionalViews = [...REGIONAL_VIEWS_INDIA, ...REGIONAL_VIEWS_INTERNATIONAL.filter(v => v !== 'world')];
    }
    
    for (const view of regionalViews) {
      try {
        const mapBuffer = await this.mapRenderer.renderMap({
          viewType: view,
          lines,
          cities,
          birthLocation,
          goal: this.goal === 'Complete' ? null : this.goal
        });
        const mapImage = `data:image/png;base64,${mapBuffer.toString('base64')}`;
        const viewLabel = this.getViewLabel(view);
        const mapData = prepareMapPageData(mapImage, view, viewLabel, this.baseData);
        this.pages.push({ html: processTemplate(template, mapData), type: 'map' });
      } catch (err) {
        console.warn(`   ⚠️ Skipping map view ${view}: ${err.message}`);
      }
    }
    
    console.log(`   📍 Added ${this.pages.filter(p => p.type === 'map').length} map pages`);
  }
  
  getViewLabel(view) {
    const labels = {
      world: 'World Overview',
      india: 'India',
      india_north: 'North India',
      india_south: 'South India',
      india_west: 'West India',
      india_east: 'East India',
      india_central: 'Central India',
      europe: 'Europe',
      middle_east: 'Middle East',
      southeast_asia: 'Southeast Asia',
      east_asia: 'East Asia',
      australia: 'Australia & Oceania',
      north_america: 'North America',
      south_america: 'South America',
      africa: 'Africa'
    };
    return labels[view] || view;
  }
  
  async addPlanetaryLinesPages() {
    const template = loadTemplate('planetary-lines-page.html');
    
    const planetsPerPage = 3;
    const totalPages = Math.ceil(PLANET_DATA.length / planetsPerPage);
    
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * planetsPerPage;
      const pagePlanets = PLANET_DATA.slice(startIdx, startIdx + planetsPerPage);
      
      const pageData = {
        ...this.baseData,
        PLANET_CARDS: generatePlanetCards(pagePlanets, startIdx),
        PLANETS_PAGE: i + 1,
        PLANETS_TOTAL_PAGES: totalPages
      };
      
      // Add numbered planet placeholders for each planet on this page
      pagePlanets.forEach((planet, idx) => {
        const num = idx + 1;
        pageData[`PLANET${num}_NAME`] = planet.name;
        pageData[`PLANET${num}_SYMBOL`] = planet.symbol;
        pageData[`PLANET${num}_CLASS`] = `planet-${planet.name.toLowerCase()}`;
        pageData[`PLANET${num}_HEADLINE`] = `${planet.name} lines influence your ${planet.keywords[0]?.toLowerCase() || 'life'}`;
        pageData[`PLANET${num}_KEY1`] = planet.keywords[0] || '';
        pageData[`PLANET${num}_KEY2`] = planet.keywords[1] || '';
        pageData[`PLANET${num}_KEY3`] = planet.keywords[2] || '';
        pageData[`PLANET${num}_KEY4`] = planet.keywords[3] || '';
        pageData[`PLANET${num}_DESC`] = `When ${planet.name} lines pass through a location, they enhance ${planet.keywords.join(', ').toLowerCase()}.`;
        pageData[`PLANET${num}_LINE_CLASS`] = `line-${planet.name.toLowerCase()}`;
      });
      
      this.pages.push({ html: processTemplate(template, pageData), type: 'planets' });
    }
    
    console.log(`   🪐 Added ${totalPages} planetary lines pages`);
  }
  
  async addGoalSection(goal) {
    await this.addGoalDividerPage(goal);
    await this.addCityRankingPages(goal);
    await this.addBestCityPages(goal);
    await this.addAvoidCityPages(goal);
  }
  
  async addGoalDividerPage(goal) {
    const template = loadTemplate('goal-divider-page.html');
    
    const cities = this.getCitiesForGoal(goal, 'best');
    const avoidCities = this.getCitiesForGoal(goal, 'avoid');
    
    const baseWithCounts = {
      ...this.baseData,
      BEST_CITIES_COUNT: cities.length,
      AVOID_CITIES_COUNT: avoidCities.length,
      POWER_ZONES_COUNT: cities.filter(c => c.lines && c.lines.length > 0).length
    };
    
    const goalData = generateDividerPlanetData(goal, baseWithCounts);
    goalData.SECTION_GOAL = goal;
    goalData.GOAL = goal;
    goalData.GOAL_ICON = this.getGoalIcon(goal);
    goalData.GOAL_COLOR = this.getGoalColor(goal);
    goalData.GOAL_DESCRIPTION = this.getGoalDescription(goal);
    
    this.pages.push({ html: processTemplate(template, goalData), type: 'divider' });
  }
  
  getGoalIcon(goal) {
    const icons = { Career: '💼', Wealth: '💰', Love: '❤️', Education: '🎓', Settlement: '🏠', Complete: '✨' };
    return icons[goal] || '✦';
  }
  
  getGoalColor(goal) {
    const colors = { Career: '#4A90A4', Wealth: '#D4AF37', Love: '#E91E63', Education: '#9C27B0', Settlement: '#4CAF50', Complete: '#2D1B4E' };
    return colors[goal] || '#2D1B4E';
  }
  
  getGoalDescription(goal) {
    const desc = {
      Career: 'Professional growth, recognition, and career advancement',
      Wealth: 'Financial prosperity, abundance, and material success',
      Love: 'Romantic relationships, partnerships, and emotional fulfillment',
      Education: 'Academic excellence, learning, and intellectual growth',
      Settlement: 'Permanent relocation, family life, and stability',
      Complete: 'Comprehensive analysis across all life domains'
    };
    return desc[goal] || '';
  }
  
  async addCityRankingPages(goal) {
    const template = loadTemplate('city-ranking-table.html');
    const allBestCities = this.getCitiesForGoal(goal, 'best');
    
    const citiesPerPage = 9;
    const totalPages = Math.ceil(allBestCities.length / citiesPerPage);
    
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * citiesPerPage;
      const startRank = startIdx + 1;
      const pageCities = allBestCities.slice(startIdx, startIdx + citiesPerPage);
      
      const pageData = generateRankingTableData(pageCities, this.baseData, startRank, allBestCities.length);
      pageData.GOAL = goal;
      pageData.GOAL_ICON = this.getGoalIcon(goal);
      pageData.SCOPE = this.scope;
      pageData.CITY_ROWS = generateCityRows(pageCities, startRank);
      pageData.RANKING_PAGE = i + 1;
      pageData.RANKING_TOTAL_PAGES = totalPages;
      
      this.pages.push({ html: processTemplate(template, pageData), type: 'ranking' });
    }
    
    console.log(`   📊 Added ${totalPages} ranking pages for ${goal}`);
  }
  
  getCitiesForGoal(goal, type = 'best') {
    const allCities = this.astroData?.topCities || [];
    
    let filteredCities = allCities;
    if (this.scope === 'India') {
      filteredCities = allCities.filter(c => c.country === 'India');
    } else if (this.scope === 'International') {
      filteredCities = allCities.filter(c => c.country !== 'India');
    }
    
    const sorted = [...filteredCities].sort((a, b) => {
      const scoreA = a.goalScores?.[goal] || a.score || 0;
      const scoreB = b.goalScores?.[goal] || b.score || 0;
      return scoreB - scoreA;
    });
    
    const bestCount = this.scope === 'Both' ? 18 : 12;
    const avoidCount = this.scope === 'Both' ? 10 : 5;
    
    if (type === 'best') {
      return sorted.slice(0, bestCount);
    } else {
      return sorted.slice(-avoidCount).reverse();
    }
  }
  
  async addBestCityPages(goal) {
    const template = loadTemplate('city-page.html');
    const mapTemplate = loadTemplate('map-page.html');
    const cities = this.getCitiesForGoal(goal, 'best');
    
    const lines = this.astroData?.planetaryLines || [];
    const birthLocation = {
      latitude: parseFloat(this.birthData.latitude) || 0,
      longitude: parseFloat(this.birthData.longitude) || 0
    };
    
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const credibilityData = this.calculateCredibilityData(city, lines, goal, this.birthData);
      const cityData = prepareCityPageData(city, i + 1, goal, this.baseData, credibilityData);
      this.pages.push({ html: processTemplate(template, cityData), type: 'city-best' });
      
      if (i < 6) {
        try {
          const cityRegion = this.getCityRegionView(city);
          const mapBuffer = await this.mapRenderer.renderMap({
            viewType: cityRegion,
            lines,
            cities: [{ ...city, showLabel: true, isHighlighted: true }],
            birthLocation,
            goal,
            highlightCity: city.name
          });
          const mapImage = `data:image/png;base64,${mapBuffer.toString('base64')}`;
          const mapData = prepareMapPageData(mapImage, cityRegion, `${city.name} Region`, this.baseData);
          this.pages.push({ html: processTemplate(mapTemplate, mapData), type: 'city-map' });
        } catch (err) {
          console.warn(`   ⚠️ Skipping city map for ${city.name}: ${err.message}`);
        }
      }
    }
    
    console.log(`   🌟 Added ${cities.length} best city pages for ${goal} (with ${Math.min(6, cities.length)} maps)`);
  }
  
  getCityRegionView(city) {
    const regionMap = {
      'North India': 'india_north',
      'South India': 'india_south',
      'West India': 'india_west',
      'East India': 'india_east',
      'Central India': 'india_central',
      'Europe': 'europe',
      'Middle East': 'middle_east',
      'Southeast Asia': 'southeast_asia',
      'East Asia': 'east_asia',
      'North America': 'north_america',
      'South America': 'south_america',
      'Australia & Oceania': 'australia',
      'Africa': 'africa'
    };
    return regionMap[city.region] || (city.country === 'India' ? 'india' : 'world');
  }
  
  calculateCredibilityData(city, lines, goal, birthData = null) {
    const cityLat = city.latitude || city.lat || 0;
    const cityLng = city.longitude || city.lng || 0;
    const totalScore = city.score || 75;
    
    const nearestLine = this.findNearestLine(cityLat, cityLng, lines);
    const distanceKm = nearestLine.distanceKm;
    const orbData = this.getOrbData(distanceKm);
    const paranLines = this.calculateParanLines(cityLat, goal);
    
    const rawLineProximity = Math.max(0, Math.round(25 * (1 - distanceKm / 700)));
    const rawParanScore = Math.min(25, Math.round(5 * paranLines.length));
    const rawWesternTotal = rawLineProximity + rawParanScore;
    
    const birthNakshatra = birthData?.nakshatra || '';
    const birthRashi = birthData?.rashi || '';
    const birthLagna = birthData?.lagna || '';
    const currentDasha = birthData?.currentDashaLord || '';
    
    const nakshatraMatch = birthNakshatra ? this.getNakshatraAffinityScore(birthNakshatra, city, goal) : 12;
    const rashiMatch = birthRashi ? this.getRashiDirectionScore(birthRashi, cityLat, cityLng) : 10;
    const lagnaScore = birthLagna ? this.getLagnaVastuScore(birthLagna, city) : 10;
    const dashaScore = currentDasha ? this.getDashaTimingScore(currentDasha, goal) : 10;
    
    const rawNakshatraRashi = Math.min(20, nakshatraMatch + rashiMatch);
    const rawLagnaVastu = Math.min(15, lagnaScore);
    const rawDashaTiming = Math.min(15, dashaScore);
    const rawVedicTotal = rawNakshatraRashi + rawLagnaVastu + rawDashaTiming;
    
    const rawTotal = rawWesternTotal + rawVedicTotal;
    const scaleFactor = rawTotal > 0 ? totalScore / rawTotal : 0.5;
    
    const westernTotal = Math.round(rawWesternTotal * scaleFactor);
    const vedicTotal = totalScore - westernTotal;
    
    const lineProximityScore = Math.round(rawLineProximity * scaleFactor);
    const paranScore = westernTotal - lineProximityScore;
    
    const vedicScaleFactor = rawVedicTotal > 0 ? vedicTotal / rawVedicTotal : 1/3;
    const scaledNakshatraRashi = Math.round(rawNakshatraRashi * vedicScaleFactor);
    const scaledLagnaVastu = Math.round(rawLagnaVastu * vedicScaleFactor);
    const scaledDashaTiming = vedicTotal - scaledNakshatraRashi - scaledLagnaVastu;
    
    const birthLat2 = birthData?.latitude ? parseFloat(birthData.latitude) : null;
    const birthLng2 = birthData?.longitude ? parseFloat(birthData.longitude) : null;
    let direction = nearestLine.direction;
    
    if (birthLat2 && birthLng2) {
      const distFromBirth = this.haversineDistance(birthLat2, birthLng2, cityLat, cityLng);
      if (distFromBirth < 50) {
        direction = 'Origin';
      } else {
        direction = this.getCardinalDirection(birthLat2, birthLng2, cityLat, cityLng);
      }
    }
    
    return {
      breakdown: {
        western: {
          total: westernTotal,
          lineProximity: {
            score: lineProximityScore,
            nearestLine: nearestLine.name,
            distanceKm: Math.round(distanceKm),
            direction: direction,
            orbBars: orbData.bars,
            orbStrength: orbData.strength
          },
          parans: {
            score: paranScore,
            details: paranLines
          }
        },
        vedic: {
          total: vedicTotal,
          nakshatraRashi: { score: scaledNakshatraRashi },
          lagnaVastu: { score: scaledLagnaVastu },
          dashaTiming: { score: scaledDashaTiming }
        }
      }
    };
  }
  
  getNakshatraAffinityScore(nakshatra, city, goal) {
    const nakshatraElements = {
      'Ashwini': 'fire', 'Bharani': 'earth', 'Krittika': 'fire', 'Rohini': 'earth',
      'Mrigashira': 'air', 'Ardra': 'water', 'Punarvasu': 'air', 'Pushya': 'water',
      'Ashlesha': 'water', 'Magha': 'fire', 'Purva Phalguni': 'fire', 'Uttara Phalguni': 'earth',
      'Hasta': 'earth', 'Chitra': 'fire', 'Swati': 'air', 'Vishakha': 'fire',
      'Anuradha': 'water', 'Jyeshtha': 'water', 'Mula': 'air', 'Purva Ashadha': 'water',
      'Uttara Ashadha': 'earth', 'Shravana': 'air', 'Dhanishta': 'air', 'Shatabhisha': 'air',
      'Purva Bhadrapada': 'air', 'Uttara Bhadrapada': 'water', 'Revati': 'water'
    };
    const element = nakshatraElements[nakshatra] || 'earth';
    const cityLat = city.latitude || city.lat || 20;
    
    const elementAffinities = {
      'fire': cityLat > 20 ? 12 : 8,
      'earth': Math.abs(cityLat - 25) < 15 ? 12 : 8,
      'air': cityLat > 30 ? 12 : 8,
      'water': cityLat < 25 ? 12 : 8
    };
    return elementAffinities[element] || 10;
  }
  
  getRashiDirectionScore(rashi, cityLat, cityLng) {
    const rashiDirections = {
      'Aries': 'east', 'Taurus': 'south', 'Gemini': 'west', 'Cancer': 'north',
      'Leo': 'east', 'Virgo': 'south', 'Libra': 'west', 'Scorpio': 'north',
      'Sagittarius': 'east', 'Capricorn': 'south', 'Aquarius': 'west', 'Pisces': 'north'
    };
    const direction = rashiDirections[rashi] || 'east';
    
    const directionScores = {
      'east': cityLng > 75 ? 10 : 6,
      'west': cityLng < 75 ? 10 : 6,
      'north': cityLat > 25 ? 10 : 6,
      'south': cityLat < 20 ? 10 : 6
    };
    return directionScores[direction] || 8;
  }
  
  getLagnaVastuScore(lagna, city) {
    const lagnaElements = {
      'Aries': 'fire', 'Taurus': 'earth', 'Gemini': 'air', 'Cancer': 'water',
      'Leo': 'fire', 'Virgo': 'earth', 'Libra': 'air', 'Scorpio': 'water',
      'Sagittarius': 'fire', 'Capricorn': 'earth', 'Aquarius': 'air', 'Pisces': 'water'
    };
    const element = lagnaElements[lagna] || 'earth';
    const cityScore = city.score || 75;
    
    if (cityScore > 85) return 13 + (element === 'fire' ? 2 : 0);
    if (cityScore > 75) return 10 + (element === 'earth' ? 2 : 0);
    if (cityScore > 65) return 8;
    return 6;
  }
  
  getDashaTimingScore(dashaLord, goal) {
    const dashaGoalAffinity = {
      'Sun': { Career: 15, Wealth: 10, Love: 8, Education: 12, Settlement: 8 },
      'Moon': { Career: 8, Wealth: 8, Love: 14, Education: 10, Settlement: 14 },
      'Mars': { Career: 12, Wealth: 10, Love: 10, Education: 8, Settlement: 8 },
      'Mercury': { Career: 12, Wealth: 14, Love: 8, Education: 15, Settlement: 10 },
      'Jupiter': { Career: 14, Wealth: 15, Love: 10, Education: 14, Settlement: 12 },
      'Venus': { Career: 8, Wealth: 12, Love: 15, Education: 8, Settlement: 12 },
      'Saturn': { Career: 10, Wealth: 8, Love: 6, Education: 10, Settlement: 14 },
      'Rahu': { Career: 12, Wealth: 12, Love: 8, Education: 10, Settlement: 8 },
      'Ketu': { Career: 8, Wealth: 6, Love: 8, Education: 12, Settlement: 10 }
    };
    const affinities = dashaGoalAffinity[dashaLord] || {};
    return affinities[goal] || 10;
  }
  
  getCardinalDirection(fromLat, fromLng, toLat, toLng) {
    const latDiff = toLat - fromLat;
    const lngDiff = toLng - fromLng;
    
    const angle = Math.atan2(lngDiff, latDiff) * 180 / Math.PI;
    
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
  
  findNearestLine(cityLat, cityLng, lines) {
    let minDistance = Infinity;
    let nearestLine = { name: 'Jupiter-MC', direction: 'west' };
    
    for (const line of lines) {
      if (!line.points || !Array.isArray(line.points)) continue;
      
      for (const point of line.points) {
        let pointLat, pointLng;
        
        if (Array.isArray(point)) {
          pointLng = point[0];
          pointLat = point[1];
        } else if (point && typeof point === 'object') {
          pointLat = point.latitude ?? point.lat ?? 0;
          pointLng = point.longitude ?? point.lng ?? point.lon ?? 0;
        } else {
          continue;
        }
        
        if (typeof pointLat !== 'number' || typeof pointLng !== 'number') continue;
        
        const dist = this.haversineDistance(cityLat, cityLng, pointLat, pointLng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestLine = {
            name: `${line.planet}-${line.lineType || line.line_type || 'MC'}`,
            direction: pointLng < cityLng ? 'west' : 'east'
          };
        }
      }
    }
    
    if (minDistance === Infinity) {
      const cityLines = this.estimateDistanceFromCityLines(lines, cityLat, cityLng);
      return cityLines;
    }
    
    return { ...nearestLine, distanceKm: minDistance };
  }
  
  estimateDistanceFromCityLines(lines, cityLat, cityLng) {
    const lineName = lines.length > 0 
      ? `${lines[0].planet || 'Jupiter'}-${lines[0].lineType || lines[0].line_type || 'MC'}`
      : 'Jupiter-MC';
    
    const baseDistance = 150 + (Math.abs(cityLat) % 20) * 15 + (Math.abs(cityLng) % 30) * 10;
    
    return {
      name: lineName,
      direction: cityLng > 0 ? 'east' : 'west',
      distanceKm: Math.round(baseDistance)
    };
  }
  
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  getOrbData(distanceKm) {
    if (distanceKm < 100) {
      return { strength: 'Direct', bars: '██████████' };
    } else if (distanceKm < 200) {
      return { strength: 'Very Strong', bars: '█████████░' };
    } else if (distanceKm < 350) {
      return { strength: 'Strong', bars: '████████░░' };
    } else if (distanceKm < 500) {
      return { strength: 'Moderate', bars: '██████░░░░' };
    } else if (distanceKm < 600) {
      return { strength: 'Weak', bars: '████░░░░░░' };
    } else {
      return { strength: 'Minimal', bars: '██░░░░░░░░' };
    }
  }
  
  calculateParanLines(latitude, goal) {
    const latitudeBandParans = {
      'tropical': [
        { planets: ['Jupiter', 'Venus'], key: 'Jupiter-Venus', interpretation: 'Prosperity' },
        { planets: ['Moon', 'Venus'], key: 'Moon-Venus', interpretation: 'Nurturing' }
      ],
      'subtropical': [
        { planets: ['Sun', 'Mercury'], key: 'Sun-Mercury', interpretation: 'Commerce' },
        { planets: ['Mars', 'Jupiter'], key: 'Mars-Jupiter', interpretation: 'Expansion' }
      ],
      'temperate': [
        { planets: ['Saturn', 'Jupiter'], key: 'Saturn-Jupiter', interpretation: 'Foundation' },
        { planets: ['Mercury', 'Jupiter'], key: 'Mercury-Jupiter', interpretation: 'Wisdom' }
      ],
      'northern': [
        { planets: ['Sun', 'Jupiter'], key: 'Sun-Jupiter', interpretation: 'Authority' },
        { planets: ['Venus', 'Saturn'], key: 'Venus-Saturn', interpretation: 'Stability' }
      ]
    };
    
    const goalModifiers = {
      'Career': { planets: ['Sun', 'Jupiter'], key: 'Sun-Jupiter', interpretation: 'Recognition' },
      'Wealth': { planets: ['Jupiter', 'Venus'], key: 'Jupiter-Venus', interpretation: 'Abundance' },
      'Love': { planets: ['Venus', 'Mars'], key: 'Venus-Mars', interpretation: 'Passion' },
      'Education': { planets: ['Mercury', 'Moon'], key: 'Mercury-Moon', interpretation: 'Intuition' },
      'Settlement': { planets: ['Moon', 'Saturn'], key: 'Moon-Saturn', interpretation: 'Roots' },
      'Complete': { planets: ['Sun', 'Moon'], key: 'Sun-Moon', interpretation: 'Balance' }
    };
    
    let band = 'temperate';
    const absLat = Math.abs(latitude);
    if (absLat < 15) band = 'tropical';
    else if (absLat < 25) band = 'subtropical';
    else if (absLat < 40) band = 'temperate';
    else band = 'northern';
    
    const bandParans = latitudeBandParans[band] || latitudeBandParans['temperate'];
    const goalParan = goalModifiers[goal] || goalModifiers['Complete'];
    
    const result = [...bandParans];
    if (!result.some(p => p.key === goalParan.key)) {
      result.push(goalParan);
    }
    
    return result;
  }
  
  async addAvoidCityPages(goal) {
    const template = loadTemplate('city-avoid-page.html');
    let avoidCities = this.getCitiesForGoal(goal, 'avoid');
    const bestCities = this.getCitiesForGoal(goal, 'best');
    
    try {
      const userData = {
        name: this.birthData.name || 'User',
        birthDate: this.birthData.birthDate || this.birthData.birth_date,
        reportGoal: goal.toLowerCase()
      };
      
      avoidCities = await claudeService.generateAvoidCityInterpretations(avoidCities, userData);
    } catch (error) {
      console.warn(`   ⚠️ Could not generate AI interpretations for avoid cities: ${error.message}`);
    }
    
    for (let i = 0; i < avoidCities.length; i++) {
      const city = avoidCities[i];
      
      const pageData = prepareAvoidCityData(city, goal, bestCities, this.baseData);
      pageData.GOAL_ICON = this.getGoalIcon(goal);
      pageData.AVOID_CITY_CARDS = generateAvoidCityCard(city, i + 1);
      pageData.AVOID_PAGE = i + 1;
      pageData.AVOID_TOTAL_PAGES = avoidCities.length;
      
      this.pages.push({ html: processTemplate(template, pageData), type: 'city-avoid' });
    }
    
    console.log(`   ⚠️ Added ${avoidCities.length} avoid city pages for ${goal}`);
  }
  
  async addVedicProfilePage() {
    const template = loadTemplate('vedic-profile-page.html');
    const vedicData = generateVedicTraitsData(this.birthData, this.baseData);
    const html = processTemplate(template, vedicData);
    this.pages.push({ html, type: 'vedic' });
  }
  
  async addDashaTimelinePage() {
    const template = loadTemplate('dasha-timeline-page.html');
    
    const mahadasha = this.birthData.currentDashaLord || 'Jupiter';
    
    let antardasha = this.birthData.currentAntardasha || '';
    let antardashaEnd = this.birthData.currentDashaEnd || '';
    
    if (this.birthData.antardashaTimeline) {
      try {
        const timeline = typeof this.birthData.antardashaTimeline === 'string' 
          ? JSON.parse(this.birthData.antardashaTimeline) 
          : this.birthData.antardashaTimeline;
        
        if (Array.isArray(timeline)) {
          const current = timeline.find(d => d.isCurrent);
          if (current) {
            antardasha = current.antardasha || antardasha;
            antardashaEnd = current.endDate || antardashaEnd;
          }
        }
      } catch (e) {
        console.log('   ⚠️ Could not parse antardasha timeline');
      }
    }
    
    if (!antardasha) antardasha = 'Saturn';
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'December 2027';
      if (dateStr.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = dateStr.split('-');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[parseInt(month) - 1]} ${year}`;
      }
      return dateStr;
    };
    
    const dashaData = {
      ...this.baseData,
      MAHADASHA: mahadasha,
      ANTARDASHA: antardasha,
      CURRENT_THEME: this.getDashaTheme(mahadasha),
      ANTARDASHA_END: formatDate(antardashaEnd),
      MAHADASHA_PERIOD: this.birthData.mahadashaPeriod || '2020 - 2036'
    };
    
    const html = processTemplate(template, dashaData);
    this.pages.push({ html, type: 'dasha' });
  }
  
  getDashaTheme(dashaLord) {
    const themes = {
      'Sun': 'Leadership, Recognition & Self-Expression',
      'Moon': 'Emotional Growth, Home & Nurturing',
      'Mars': 'Action, Courage & Physical Energy',
      'Mercury': 'Communication, Learning & Commerce',
      'Jupiter': 'Expansion, Wisdom & Spiritual Growth',
      'Venus': 'Love, Creativity & Material Comfort',
      'Saturn': 'Discipline, Karma & Long-term Goals',
      'Rahu': 'Ambition, Unconventional Paths & Desires',
      'Ketu': 'Spirituality, Detachment & Past-life Karma'
    };
    return themes[dashaLord] || 'Personal Growth & Transformation';
  }
  
  async addGlossaryPages() {
    const template1 = loadTemplate('glossary-page.html');
    const html1 = processTemplate(template1, this.baseData);
    this.pages.push({ html: html1, type: 'glossary' });
    
    const template2 = loadTemplate('glossary-page-2.html');
    const html2 = processTemplate(template2, this.baseData);
    this.pages.push({ html: html2, type: 'glossary' });
  }
  
  updatePageNumbers() {
    const totalPages = this.pages.length;
    this.pages = this.pages.map((page, index) => {
      let html = page.html;
      html = html.replace(/\{\{PAGE_NUM\}\}/g, String(index + 1));
      html = html.replace(/\{\{TOTAL_PAGES\}\}/g, String(totalPages));
      return { ...page, html };
    });
  }
  
  async generatePDF(outputPath) {
    console.log(`\n📄 Generating PDF with ${this.pages.length} pages...`);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    
    try {
      const page = await browser.newPage();
      
      await page.setViewport({ width: 794, height: 1123 });
      
      const pdfBuffers = [];
      
      for (let i = 0; i < this.pages.length; i++) {
        const pageData = this.pages[i];
        console.log(`   Rendering page ${i + 1}/${this.pages.length} (${pageData.type})`);
        
        await page.setContent(pageData.html, { waitUntil: 'networkidle0', timeout: 30000 });
        
        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        
        pdfBuffers.push(pdfBuffer);
      }
      
      const combinedPDF = await this.combinePDFBuffers(pdfBuffers);
      
      fs.writeFileSync(outputPath, combinedPDF);
      console.log(`✅ PDF saved to ${outputPath} (${this.pages.length} pages)`);
      
      return outputPath;
    } finally {
      await browser.close();
    }
  }
  
  async combinePDFBuffers(buffers) {
    const { PDFDocument } = await import('pdf-lib');
    
    const mergedPdf = await PDFDocument.create();
    
    for (const buffer of buffers) {
      const pdf = await PDFDocument.load(buffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }
    
    return Buffer.from(await mergedPdf.save());
  }
}

function convertBirthDataForAPI(birthData) {
  let day, month, year;
  const dateStr = birthData.birthDate;
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      [year, month, day] = parts.map(Number);
    } else {
      [day, month, year] = parts.map(Number);
    }
  } else if (dateStr.includes('/')) {
    [day, month, year] = dateStr.split('/').map(Number);
  } else {
    year = 1990; month = 1; day = 1;
  }
  
  let hour = 12, minute = 0;
  const timeMatch = birthData.birthTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    const period = timeMatch[3]?.toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  }
  
  return {
    date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    latitude: parseFloat(birthData.latitude),
    longitude: parseFloat(birthData.longitude),
    timezone: 'Asia/Kolkata'
  };
}

function convertBirthDataForVedicAPI(birthData) {
  let day, month, year;
  const dateStr = birthData.birthDate;
  
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      [year, month, day] = parts.map(Number);
    } else {
      [day, month, year] = parts.map(Number);
    }
  } else if (dateStr.includes('/')) {
    [day, month, year] = dateStr.split('/').map(Number);
  } else {
    year = 1990; month = 1; day = 1;
  }
  
  let hour = 12, minute = 0;
  const timeMatch = birthData.birthTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = parseInt(timeMatch[2]);
    const period = timeMatch[3]?.toUpperCase();
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
  }
  
  return {
    birthDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
    birthTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    latitude: birthData.latitude,
    longitude: birthData.longitude
  };
}

const PLANET_COLORS = {
  'Sun': '#FF8C00', 'Moon': '#C0C0C0', 'Mercury': '#4ECDC4', 'Venus': '#FF69B4',
  'Mars': '#FF4444', 'Jupiter': '#FFD700', 'Saturn': '#8B7355', 'Uranus': '#00CED1',
  'Neptune': '#9370DB', 'Pluto': '#8B0000', 'NorthNode': '#98FB98', 'SouthNode': '#DDA0DD',
  'Chiron': '#FFA07A', 'Vertex': '#87CEEB', 'PartOfFortune': '#F0E68C'
};

export async function generateTestPDF(reportType, scope, goal, customBirthData = null, options = {}) {
  const useAI = options.useAI || false;
  const useRealAPI = options.useRealAPI !== false;
  
  const defaultBirthData = {
    name: 'Arjun Sharma',
    birthDate: '15/08/1990',
    birthTime: '10:30 AM',
    birthPlace: 'Mumbai, Maharashtra, India',
    latitude: '19.076',
    longitude: '72.8777',
    rashi: 'Simha (Leo)',
    rashiLord: 'Sun',
    nakshatra: 'Magha',
    nakshatraLord: 'Ketu',
    nakshatraPada: 2,
    lagna: 'Tula (Libra)',
    lagnaLord: 'Venus',
    sunSign: 'Leo',
    currentDashaLord: 'Jupiter',
    currentDashaEnd: '2027-03-15',
    antardashaTimeline: JSON.stringify([
      { mahadasha: 'Jupiter', antardasha: 'Saturn', startDate: '2024-01', endDate: '2026-06', theme: 'Career consolidation', isCurrent: true },
      { mahadasha: 'Jupiter', antardasha: 'Mercury', startDate: '2026-06', endDate: '2028-09', theme: 'Educational pursuits' },
      { mahadasha: 'Jupiter', antardasha: 'Ketu', startDate: '2028-09', endDate: '2029-08', theme: 'Spiritual growth' }
    ])
  };
  
  let testBirthData = customBirthData ? {
    ...defaultBirthData,
    name: customBirthData.name || 'User',
    birthDate: customBirthData.birthDate,
    birthTime: customBirthData.birthTime,
    birthPlace: customBirthData.birthPlace,
    latitude: customBirthData.latitude,
    longitude: customBirthData.longitude
  } : defaultBirthData;
  
  if (customBirthData && process.env.ASTROLOGY_API_KEY && process.env.ASTROLOGY_API_USER_ID) {
    console.log('   🔮 Fetching Vedic profile from AstrologyAPI...');
    try {
      const vedicBirthData = convertBirthDataForVedicAPI(testBirthData);
      const vedicProfile = await vedicApi.getVedicProfile(vedicBirthData);
      
      if (vedicProfile) {
        // Extract dasha lord - handle both string and object formats
        let dashaLord = testBirthData.currentDashaLord;
        if (vedicProfile.currentDashaLord) {
          if (typeof vedicProfile.currentDashaLord === 'string') {
            dashaLord = vedicProfile.currentDashaLord;
          } else if (typeof vedicProfile.currentDashaLord === 'object') {
            dashaLord = vedicProfile.currentDashaLord.planet || 
                       vedicProfile.currentDashaLord.major || 
                       vedicProfile.currentDashaLord.name ||
                       JSON.stringify(vedicProfile.currentDashaLord);
          }
        }
        
        testBirthData = {
          ...testBirthData,
          rashi: vedicProfile.rashi || testBirthData.rashi,
          rashiLord: vedicProfile.rashiLord || testBirthData.rashiLord,
          nakshatra: vedicProfile.nakshatra || testBirthData.nakshatra,
          nakshatraLord: vedicProfile.nakshatraLord || testBirthData.nakshatraLord,
          nakshatraPada: vedicProfile.nakshatraPada || testBirthData.nakshatraPada,
          lagna: vedicProfile.lagna || testBirthData.lagna,
          lagnaLord: vedicProfile.lagnaLord || testBirthData.lagnaLord,
          sunSign: vedicProfile.sunSign || testBirthData.sunSign,
          currentDashaLord: dashaLord,
          currentDashaEnd: vedicProfile.currentDashaEnd || testBirthData.currentDashaEnd
        };
        console.log(`   ✅ Vedic Profile: Rashi=${testBirthData.rashi}, Lagna=${testBirthData.lagna}, Nakshatra=${testBirthData.nakshatra}, Dasha=${testBirthData.currentDashaLord}`);
      }
    } catch (error) {
      console.warn('   ⚠️ Vedic API fetch failed, using defaults:', error.message);
    }
  }
  
  let planetaryLines = [];
  let scoredCities = [];
  
  if (useRealAPI && process.env.RAPIDAPI_KEY) {
    console.log('   📡 Fetching REAL astrology data from API...');
    try {
      const apiBirthData = convertBirthDataForAPI(testBirthData);
      
      const linesResult = await astrologyApi.getAstrocartographyLines(apiBirthData);
      if (linesResult.success && linesResult.data) {
        const rawLines = linesResult.data.lines || linesResult.data || [];
        planetaryLines = Array.isArray(rawLines) ? rawLines.map(line => ({
          planet: line.planet || line.name,
          line_type: line.line_type || line.type || line.angle || 'AC',
          color: PLANET_COLORS[line.planet || line.name] || '#FFFFFF',
          points: line.points || line.coordinates || []
        })) : [];
        console.log(`   ✅ Fetched ${planetaryLines.length} planetary lines from API`);
      }
      
      const cities = scope === 'India' ? INDIAN_CITIES : 
                     scope === 'International' ? INTERNATIONAL_CITIES : 
                     [...INDIAN_CITIES, ...INTERNATIONAL_CITIES];
      
      const scoresResult = await astrologyApi.scoreCitiesFromPowerZones(apiBirthData, cities);
      if (scoresResult.success && scoresResult.data) {
        scoredCities = scoresResult.data;
        console.log(`   ✅ Scored ${scoredCities.length} cities using astrocartography lines`);
      }
    } catch (error) {
      console.error('   ⚠️ API fetch failed, using fallback data:', error.message);
    }
  }
  
  let testCities = scoredCities.length > 0 ? scoredCities.map(city => ({
    name: city.name,
    country: city.country || 'India',
    region: getRegionForCity(city),
    latitude: city.lat || city.latitude,
    longitude: city.lng || city.longitude,
    score: city.score || 70,
    direction: getDirectionFromCoords(parseFloat(testBirthData.latitude), parseFloat(testBirthData.longitude), city.lat || city.latitude, city.lng || city.longitude),
    nakshatraMatch: city.score >= 80,
    verdict: city.score >= 85 ? 'Highly Favorable' : city.score >= 75 ? 'Favorable' : city.score >= 65 ? 'Moderate' : 'Challenging',
    lines: (city.lines || []).map(l => typeof l === 'string' ? { planet: l.split('-')[0], line_type: l.split('-')[1] || 'AC' } : l),
    avoidReasons: city.score < 60 ? ['Low compatibility score', 'Challenging planetary influences'] : undefined
  })).sort((a, b) => b.score - a.score) : generateTestCities(scope);
  
  if (useAI && process.env.ANTHROPIC_API_KEY) {
    console.log('   🤖 Generating AI interpretations with Claude...');
    try {
      const userData = {
        name: testBirthData.name || 'User',
        birthDate: testBirthData.birthDate,
        birthPlace: testBirthData.birthPlace || 'India',
        rashi: testBirthData.rashi || null,
        reportGoal: goal.toLowerCase()
      };
      
      console.log(`   📋 Claude userData: name=${userData.name}, birthDate=${userData.birthDate}, place=${userData.birthPlace}`);
      
      const citiesWithLines = testCities.map(city => ({
        ...city,
        lines: (city.lines || []).map(l => typeof l === 'string' ? l : `${l.planet}-${l.line_type}`)
      }));
      
      console.log(`   📋 Sample city lines: ${citiesWithLines[0]?.name} has lines: [${citiesWithLines[0]?.lines?.join(', ') || 'none'}]`);
      
      testCities = await claudeService.generateCityInterpretations(citiesWithLines, userData);
      console.log('   ✅ AI interpretations generated successfully');
    } catch (error) {
      console.error('   ⚠️ AI generation failed, using fallback:', error.message);
    }
  }
  
  const testAstroData = {
    planetaryLines: planetaryLines.length > 0 ? planetaryLines : [
      { planet: 'Jupiter', line_type: 'MC', color: '#FFD700', points: [[72, 19], [75, 25], [78, 30]] },
      { planet: 'Venus', line_type: 'AC', color: '#FF69B4', points: [[70, 15], [75, 20], [80, 25]] },
      { planet: 'Sun', line_type: 'MC', color: '#FF8C00', points: [[68, 10], [72, 18], [76, 26]] },
      { planet: 'Moon', line_type: 'DC', color: '#C0C0C0', points: [[74, 12], [78, 20], [82, 28]] },
      { planet: 'Mercury', line_type: 'AC', color: '#4ECDC4', points: [[70, 8], [75, 16], [80, 24]] }
    ],
    powerZones: [
      { latitude: parseFloat(testBirthData.latitude), longitude: parseFloat(testBirthData.longitude), strength: 0.9, is_challenging: false }
    ],
    topCities: testCities
  };
  
  const assembler = new PDFAssembler(testBirthData, testAstroData, {
    goal: goal,
    scope: scope,
    reportType: reportType
  });
  
  await assembler.assemble();
  
  const outputDir = path.join(process.cwd(), 'public', 'test-pdfs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `test-${reportType}-${scope}-${goal}-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, filename);
  
  await assembler.generatePDF(outputPath);
  
  return {
    path: outputPath,
    filename: filename,
    pageCount: assembler.pages.length,
    url: `/test-pdfs/${filename}`
  };
}

function getRegionForCity(city) {
  const lat = city.lat || city.latitude;
  const lng = city.lng || city.longitude;
  const country = city.country || '';
  
  if (country === 'India') {
    if (lat > 25) return lng < 78 ? 'india_north' : 'india_east';
    if (lat < 15) return 'india_south';
    if (lng < 75) return 'india_west';
    if (lng > 85) return 'india_east';
    return 'india_central';
  }
  
  if (lng >= -30 && lng <= 50 && lat >= 35 && lat <= 70) return 'europe';
  if (lng >= 30 && lng <= 60 && lat >= 10 && lat <= 45) return 'middle_east';
  if (lng >= 90 && lng <= 145 && lat >= -10 && lat <= 25) return 'southeast_asia';
  if (lng >= 100 && lng <= 150 && lat >= 20 && lat <= 50) return 'east_asia';
  if (lng >= 110 && lng <= 180 && lat >= -50 && lat <= -10) return 'australia';
  if (lng >= -130 && lng <= -60 && lat >= 15 && lat <= 70) return 'north_america';
  if (lng >= -80 && lng <= -35 && lat >= -55 && lat <= 15) return 'south_america';
  if (lng >= -20 && lng <= 55 && lat >= -35 && lat <= 40) return 'africa';
  
  return 'world';
}

function getDirectionFromCoords(birthLat, birthLng, cityLat, cityLng) {
  const latDiff = cityLat - birthLat;
  const lngDiff = cityLng - birthLng;
  
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    return latDiff > 0 ? 'North' : 'South';
  } else {
    return lngDiff > 0 ? 'East' : 'West';
  }
}

function generateTestCities(scope) {
  const indianCities = [
    { name: 'Mumbai', country: 'India', region: 'india_west', latitude: 19.076, longitude: 72.877, score: 92, direction: 'West', nakshatraMatch: true, verdict: 'Highly Favorable', lines: [{ planet: 'Jupiter', line_type: 'MC' }] },
    { name: 'Delhi', country: 'India', region: 'india_north', latitude: 28.613, longitude: 77.209, score: 88, direction: 'North', nakshatraMatch: true, verdict: 'Favorable', lines: [{ planet: 'Sun', line_type: 'MC' }] },
    { name: 'Bangalore', country: 'India', region: 'india_south', latitude: 12.971, longitude: 77.594, score: 85, direction: 'South', nakshatraMatch: false, verdict: 'Good', lines: [{ planet: 'Mercury', line_type: 'AC' }] },
    { name: 'Chennai', country: 'India', region: 'india_south', latitude: 13.082, longitude: 80.270, score: 82, direction: 'South', nakshatraMatch: true, verdict: 'Favorable', lines: [{ planet: 'Venus', line_type: 'DC' }] },
    { name: 'Hyderabad', country: 'India', region: 'india_south', latitude: 17.385, longitude: 78.486, score: 79, direction: 'South', nakshatraMatch: false, verdict: 'Moderate', lines: [{ planet: 'Moon', line_type: 'IC' }] },
    { name: 'Pune', country: 'India', region: 'india_west', latitude: 18.520, longitude: 73.856, score: 76, direction: 'West', nakshatraMatch: true, verdict: 'Good', lines: [{ planet: 'Mars', line_type: 'AC' }] },
    { name: 'Ahmedabad', country: 'India', region: 'india_west', latitude: 23.022, longitude: 72.571, score: 73, direction: 'West', nakshatraMatch: false, verdict: 'Moderate', lines: [] },
    { name: 'Kolkata', country: 'India', region: 'india_east', latitude: 22.572, longitude: 88.363, score: 70, direction: 'East', nakshatraMatch: true, verdict: 'Moderate', lines: [{ planet: 'Saturn', line_type: 'MC' }] },
    { name: 'Jaipur', country: 'India', region: 'india_north', latitude: 26.912, longitude: 75.787, score: 68, direction: 'North', nakshatraMatch: false, verdict: 'Moderate', lines: [] },
    { name: 'Lucknow', country: 'India', region: 'india_north', latitude: 26.846, longitude: 80.946, score: 45, direction: 'North', nakshatraMatch: false, verdict: 'Challenging', lines: [{ planet: 'Saturn', line_type: 'IC' }], avoidReasons: ['Saturn IC line creates obstacles', 'Direction mismatch'] }
  ];
  
  const internationalCities = [
    { name: 'Dubai', country: 'UAE', region: 'middle_east', latitude: 25.204, longitude: 55.270, score: 90, direction: 'West', nakshatraMatch: true, verdict: 'Excellent', lines: [{ planet: 'Jupiter', line_type: 'AC' }] },
    { name: 'Singapore', country: 'Singapore', region: 'southeast_asia', latitude: 1.352, longitude: 103.819, score: 87, direction: 'East', nakshatraMatch: true, verdict: 'Favorable', lines: [{ planet: 'Mercury', line_type: 'MC' }] },
    { name: 'London', country: 'UK', region: 'europe', latitude: 51.507, longitude: -0.127, score: 84, direction: 'West', nakshatraMatch: false, verdict: 'Good', lines: [{ planet: 'Sun', line_type: 'AC' }] },
    { name: 'New York', country: 'USA', region: 'north_america', latitude: 40.712, longitude: -74.006, score: 81, direction: 'West', nakshatraMatch: true, verdict: 'Favorable', lines: [{ planet: 'Venus', line_type: 'MC' }] },
    { name: 'Sydney', country: 'Australia', region: 'australia', latitude: -33.868, longitude: 151.209, score: 78, direction: 'South', nakshatraMatch: false, verdict: 'Good', lines: [{ planet: 'Moon', line_type: 'AC' }] },
    { name: 'Toronto', country: 'Canada', region: 'north_america', latitude: 43.653, longitude: -79.383, score: 75, direction: 'West', nakshatraMatch: true, verdict: 'Good', lines: [{ planet: 'Jupiter', line_type: 'DC' }] },
    { name: 'Tokyo', country: 'Japan', region: 'east_asia', latitude: 35.689, longitude: 139.691, score: 72, direction: 'East', nakshatraMatch: false, verdict: 'Moderate', lines: [] },
    { name: 'Berlin', country: 'Germany', region: 'europe', latitude: 52.520, longitude: 13.404, score: 40, direction: 'West', nakshatraMatch: false, verdict: 'Challenging', lines: [{ planet: 'Pluto', line_type: 'MC' }], avoidReasons: ['Pluto MC creates intensity', 'May face power struggles'] }
  ];
  
  if (scope === 'India') return indianCities;
  if (scope === 'International') return internationalCities;
  return [...indianCities, ...internationalCities];
}

export { PDFAssembler as default };
