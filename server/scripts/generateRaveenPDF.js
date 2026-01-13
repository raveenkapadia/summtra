const path = require('path');

async function generateRaveenPDF() {
  console.log('\n' + '▓'.repeat(70));
  console.log('  FULL PDF GENERATION - Raveen Kapadia');
  console.log('  Nov 15, 1982, 08:20 AM, Ahmedabad');
  console.log('  Goal: Wealth');
  console.log('▓'.repeat(70));

  const birthData = {
    date: '1982-11-15',
    time: '08:20',
    birthDate: '15/11/1982',
    birthTime: '08:20 AM',
    birthPlace: 'Ahmedabad, India',
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: 5.5,
    city: 'Ahmedabad',
    country: 'India'
  };

  const userData = {
    name: 'Raveen Kapadia',
    email: 'raveen@test.com',
    birth: birthData
  };

  const goal = 'Wealth';
  const reportType = 'Single';

  try {
    console.log('\n📡 Step 1: Fetching astrology data...');
    const { fetchAllAstrologyData, getScoresForAllCities } = require('../services/astrologyApi.js');
    
    const astroData = await fetchAllAstrologyData(birthData, reportType);
    console.log('   ✅ Astrology data fetched');
    
    const enrichedBirth = astroData.enrichedBirthData || birthData;
    
    console.log('\n📋 ENRICHED BIRTH DATA (H4-H6):');
    console.log(`   Lagna: ${enrichedBirth.lagna}`);
    console.log(`   Nakshatra: ${enrichedBirth.nakshatra}`);
    console.log(`   Mahadasha: ${enrichedBirth.currentDashaLord}`);
    console.log(`   Antardasha: ${enrichedBirth.currentAntardasha}`);
    
    const retroPlanets = Object.entries(enrichedBirth.retrogradeStatus || {})
      .filter(([_, v]) => v === true)
      .map(([k]) => k);
    console.log(`   Retrograde: ${retroPlanets.length > 0 ? retroPlanets.join(', ') : 'None'}`);
    console.log(`   Manglik: ${enrichedBirth.manglikStatus?.is_present ? 'Yes' : 'No'}`);

    console.log('\n🏙️ Step 2: Scoring cities for Wealth goal...');
    
    const TOP_CITIES = [
      { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.9780 },
      { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
      { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708 },
      { name: 'Mumbai', country: 'India', lat: 19.0760, lng: 72.8777 },
      { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278 },
      { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.0060 },
      { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
      { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
      { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
      { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 },
      { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
      { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194 }
    ];

    const scoredResult = await getScoresForAllCities(
      enrichedBirth,
      TOP_CITIES,
      astroData.astroLines,
      goal
    );

    const scoredCities = Array.isArray(scoredResult) ? scoredResult : (scoredResult.data || scoredResult.cities || scoredResult.scoredCities || []);
    const sortedCities = [...scoredCities].sort((a, b) => (b.score || 0) - (a.score || 0));
    const top10 = sortedCities.slice(0, 10);

    console.log('\n' + '═'.repeat(70));
    console.log('  TOP 10 CITIES FOR WEALTH');
    console.log('═'.repeat(70));
    
    top10.forEach((city, i) => {
      const rank = i + 1;
      const cred = city.credibility || {};
      const total = city.score || 0;
      const western = cred.western?.total || cred.western?.adjustedTotal || 0;
      const vedic = cred.vedic?.total || 0;
      console.log(`   ${rank}. ${city.name.padEnd(15)} ${total}/100  (W:${western} V:${vedic})`);
    });

    console.log('\n' + '═'.repeat(70));
    console.log('  #1 CITY DETAILED BREAKDOWN');
    console.log('═'.repeat(70));
    
    const topCity = top10[0];
    const cred = topCity.credibility || {};
    const western = cred.western || {};
    const vedic = cred.vedic || {};
    
    console.log(`\n   City: ${topCity.name}, ${topCity.country}`);
    console.log(`   Total Score: ${topCity.score || 0}/100`);
    
    console.log('\n   WESTERN COMPONENT (50 max):');
    console.log(`   ├─ Line Proximity: ${western.lineProximity || 0}/35`);
    console.log(`   │   └─ Nearest Line: ${topCity.nearestLine || 'N/A'}`);
    console.log(`   │   └─ Distance: ${topCity.nearestDistanceKm ? topCity.nearestDistanceKm.toFixed(0) + ' km' : 'N/A'}`);
    console.log(`   │   └─ Orb: ${topCity.orbStrength?.label || 'N/A'}`);
    console.log(`   └─ Paran Score: ${western.paran || 0}/15`);
    console.log(`   WESTERN TOTAL: ${western.total || western.adjustedTotal || 0}/50`);
    
    console.log('\n   VEDIC COMPONENT (50 max):');
    console.log(`   ├─ Nakshatra Direction: ${vedic.nakshatra || 0}/20`);
    console.log(`   ├─ Lagna-Vastu: ${vedic.lagnaVastu || 0}/15`);
    console.log(`   └─ Dasha Timing: ${vedic.dashaTiming || 0}/15`);
    console.log(`   VEDIC TOTAL: ${vedic.total || 0}/50`);
    
    console.log('\n   H4-H6 BOOSTS APPLIED:');
    const boostInfo = topCity.planetBoostInfo || western.planetBoost || null;
    if (boostInfo) {
      console.log(`   ├─ Planet: ${topCity.nearestPlanet || 'N/A'}`);
      console.log(`   ├─ Boost: ×${boostInfo.boost || 1.0}`);
      if (boostInfo.reasons && boostInfo.reasons.length > 0) {
        boostInfo.reasons.forEach((r, i) => {
          const prefix = i === boostInfo.reasons.length - 1 ? '└─' : '├─';
          console.log(`   ${prefix} ${r}`);
        });
      } else {
        console.log(`   └─ No special boosts`);
      }
    } else {
      console.log(`   └─ No boost info available`);
    }

    console.log('\n📄 Step 3: Generating PDF...');
    
    const { PDFAssembler } = require('../services/pdfAssembler.js');
    
    const outputDir = path.join(process.cwd(), 'generated_reports');
    const fs = require('fs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const outputPath = path.join(outputDir, `Raveen_Wealth_${timestamp}.pdf`);

    const pdfAssembler = new PDFAssembler(
      { ...enrichedBirth, name: userData.name, email: userData.email },
      { ...astroData, topCities: sortedCities, scoredCities: sortedCities },
      { goal, scope: 'Both', topCities: 10 }
    );

    await pdfAssembler.assemble();
    await pdfAssembler.generatePDF(outputPath);
    
    console.log('\n' + '▓'.repeat(70));
    console.log('  PDF GENERATION COMPLETE');
    console.log('▓'.repeat(70));
    console.log(`\n   ✅ PDF Generated: YES`);
    console.log(`   📁 File Path: ${outputPath}`);
    
    const stats = fs.statSync(outputPath);
    console.log(`   📊 File Size: ${(stats.size / 1024).toFixed(1)} KB`);
    
    console.log('\n   TOP 3 CITIES SUMMARY:');
    top10.slice(0, 3).forEach((city, i) => {
      console.log(`   ${i + 1}. ${city.name}: ${(city.totalScore || 0).toFixed(1)}/100`);
    });

    console.log('\n' + '▓'.repeat(70) + '\n');
    
    return { success: true, outputPath, topCities: top10.slice(0, 3), topCity };
    
  } catch (error) {
    console.error('\n❌ PDF Generation Failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

generateRaveenPDF().catch(console.error);
