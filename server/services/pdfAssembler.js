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
  PLANET_DATA
} from './templateProcessor.js';
import { MapGenerator } from './mapGenerator.js';

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
    this.mapGenerator = new MapGenerator();
  }
  
  async assemble() {
    console.log(`\n📚 Assembling ${this.reportType} Report for ${this.scope}...`);
    
    await this.addCoverPage();
    await this.addIntroPage();
    await this.addHowToReadPage();
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
  
  async addLegendPage() {
    const template = loadTemplate('legend-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'legend' });
  }
  
  async addMapPages() {
    const template = loadTemplate('map-page.html');
    
    const worldMap = await this.mapGenerator.generateMap({
      viewType: 'world',
      cities: this.astroData?.topCities || [],
      lines: this.astroData?.planetaryLines || [],
      goal: this.goal === 'Complete' ? null : this.goal,
      birthLocation: {
        latitude: parseFloat(this.birthData.latitude) || 0,
        longitude: parseFloat(this.birthData.longitude) || 0
      }
    });
    
    const worldData = prepareMapPageData(worldMap, 'world', 'World Overview', this.baseData);
    this.pages.push({ html: processTemplate(template, worldData), type: 'map' });
    
    let regionalViews = [];
    if (this.scope === 'India') {
      regionalViews = REGIONAL_VIEWS_INDIA;
    } else if (this.scope === 'International') {
      regionalViews = REGIONAL_VIEWS_INTERNATIONAL;
    } else {
      regionalViews = [...REGIONAL_VIEWS_INDIA, ...REGIONAL_VIEWS_INTERNATIONAL.filter(v => v !== 'world')];
    }
    
    for (const view of regionalViews) {
      try {
        const mapImage = await this.mapGenerator.generateMap({
          viewType: view,
          cities: this.astroData?.topCities || [],
          lines: this.astroData?.planetaryLines || [],
          goal: this.goal === 'Complete' ? null : this.goal,
          birthLocation: {
            latitude: parseFloat(this.birthData.latitude) || 0,
            longitude: parseFloat(this.birthData.longitude) || 0
          }
        });
        
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
    const goalData = {
      ...this.baseData,
      SECTION_GOAL: goal,
      GOAL: goal,
      GOAL_ICON: this.getGoalIcon(goal),
      GOAL_COLOR: this.getGoalColor(goal),
      GOAL_DESCRIPTION: this.getGoalDescription(goal)
    };
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
    const cities = this.getCitiesForGoal(goal, 'best');
    
    const citiesPerPage = 15;
    const totalPages = Math.ceil(cities.length / citiesPerPage);
    
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * citiesPerPage;
      const pageCities = cities.slice(startIdx, startIdx + citiesPerPage);
      
      const pageData = {
        ...this.baseData,
        GOAL: goal,
        GOAL_ICON: this.getGoalIcon(goal),
        CITY_ROWS: generateCityRows(pageCities, startIdx + 1),
        RANKING_PAGE: i + 1,
        RANKING_TOTAL_PAGES: totalPages,
        TOTAL_CITIES: cities.length
      };
      
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
    
    const sorted = [...filteredCities].sort((a, b) => (b.score || 0) - (a.score || 0));
    
    if (type === 'best') {
      return sorted.slice(0, this.scope === 'Both' ? 18 : 9);
    } else {
      return sorted.slice(-5).reverse();
    }
  }
  
  async addBestCityPages(goal) {
    const template = loadTemplate('city-page.html');
    const cities = this.getCitiesForGoal(goal, 'best');
    
    for (let i = 0; i < cities.length; i++) {
      const city = cities[i];
      const cityData = prepareCityPageData(city, i + 1, goal, this.baseData);
      this.pages.push({ html: processTemplate(template, cityData), type: 'city-best' });
    }
    
    console.log(`   🌟 Added ${cities.length} best city pages for ${goal}`);
  }
  
  async addAvoidCityPages(goal) {
    const template = loadTemplate('city-avoid-page.html');
    const cities = this.getCitiesForGoal(goal, 'avoid');
    
    const citiesPerPage = 2;
    const totalPages = Math.ceil(cities.length / citiesPerPage);
    
    for (let i = 0; i < totalPages; i++) {
      const startIdx = i * citiesPerPage;
      const pageCities = cities.slice(startIdx, startIdx + citiesPerPage);
      
      const avoidCards = pageCities.map((city, idx) => 
        generateAvoidCityCard(city, startIdx + idx + 1)
      ).join('');
      
      const pageData = {
        ...this.baseData,
        GOAL: goal,
        GOAL_ICON: this.getGoalIcon(goal),
        AVOID_CITY_CARDS: avoidCards,
        AVOID_PAGE: i + 1,
        AVOID_TOTAL_PAGES: totalPages
      };
      
      this.pages.push({ html: processTemplate(template, pageData), type: 'city-avoid' });
    }
    
    console.log(`   ⚠️ Added ${totalPages} avoid city pages for ${goal}`);
  }
  
  async addVedicProfilePage() {
    const template = loadTemplate('vedic-profile-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'vedic' });
  }
  
  async addDashaTimelinePage() {
    const template = loadTemplate('dasha-timeline-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'dasha' });
  }
  
  async addGlossaryPages() {
    const template = loadTemplate('glossary-page.html');
    const html = processTemplate(template, this.baseData);
    this.pages.push({ html, type: 'glossary' });
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
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
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

export async function generateTestPDF(reportType, scope, goal) {
  const testBirthData = {
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
  
  const testAstroData = {
    planetaryLines: [
      { planet: 'Jupiter', line_type: 'MC', color: '#FFD700', points: [[72, 19], [75, 25], [78, 30]] },
      { planet: 'Venus', line_type: 'AC', color: '#FF69B4', points: [[70, 15], [75, 20], [80, 25]] },
      { planet: 'Sun', line_type: 'MC', color: '#FF8C00', points: [[68, 10], [72, 18], [76, 26]] },
      { planet: 'Moon', line_type: 'DC', color: '#C0C0C0', points: [[74, 12], [78, 20], [82, 28]] },
      { planet: 'Mercury', line_type: 'AC', color: '#4ECDC4', points: [[70, 8], [75, 16], [80, 24]] }
    ],
    powerZones: [
      { latitude: 19.076, longitude: 72.877, strength: 0.9, is_challenging: false },
      { latitude: 28.613, longitude: 77.209, strength: 0.8, is_challenging: false }
    ],
    topCities: generateTestCities(scope)
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
