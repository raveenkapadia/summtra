import { generateTestPDF } from '../server/services/pdfAssembler.js';

async function generateValidationPDFs() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('   VALIDATION PDF GENERATION - Testing Grammar Fixes');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const validationTests = [
    {
      name: 'ValidationTest1',
      birthDate: '20/01/1990',
      birthTime: '06:15',
      birthPlace: 'Delhi, India',
      latitude: 28.6139,
      longitude: 77.2090,
      expectedLagna: 'Aquarius',
      expectedArticle: 'an'
    },
    {
      name: 'ValidationTest2',
      birthDate: '05/04/1985',
      birthTime: '05:45',
      birthPlace: 'Mumbai, India',
      latitude: 19.076,
      longitude: 72.8777,
      expectedLagna: 'Aries',
      expectedArticle: 'an'
    },
    {
      name: 'ValidationTest3',
      birthDate: '12/08/1992',
      birthTime: '06:30',
      birthPlace: 'Chennai, India',
      latitude: 13.0827,
      longitude: 80.2707,
      expectedLagna: 'Leo',
      expectedArticle: 'a'
    },
    {
      name: 'ValidationTest4',
      birthDate: '01/03/1988',
      birthTime: '05:00',
      birthPlace: 'Bangalore, India',
      latitude: 12.9716,
      longitude: 77.5946,
      expectedLagna: 'Pisces',
      expectedArticle: 'a'
    }
  ];
  
  const results = [];
  
  for (const test of validationTests) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`🧪 Generating ${test.name} (Expected: ${test.expectedLagna} Lagna)`);
    console.log(`   Birth: ${test.birthDate} at ${test.birthTime}`);
    console.log(`   Place: ${test.birthPlace}`);
    console.log(`${'─'.repeat(60)}`);
    
    try {
      const result = await generateTestPDF('india', 'india', 'Career', {
        name: test.name,
        birthDate: test.birthDate,
        birthTime: test.birthTime,
        birthPlace: test.birthPlace,
        latitude: test.latitude,
        longitude: test.longitude
      }, { useAI: false, useRealAPI: true });
      
      results.push({
        name: test.name,
        expectedLagna: test.expectedLagna,
        expectedArticle: test.expectedArticle,
        actualLagna: result.birthData?.lagna || 'Unknown',
        pdfPath: result.pdfPath,
        success: result.success !== false,
        pageCount: result.pageCount
      });
      
      console.log(`   ✅ PDF Generated: ${result.pdfPath}`);
      console.log(`   📊 Pages: ${result.pageCount}`);
      console.log(`   🔮 Actual Lagna: ${result.birthData?.lagna || 'Unknown'}`);
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      results.push({
        name: test.name,
        expectedLagna: test.expectedLagna,
        expectedArticle: test.expectedArticle,
        actualLagna: 'ERROR',
        pdfPath: null,
        success: false,
        error: error.message
      });
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('   VALIDATION RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('| Test Name       | Expected Lagna | Actual Lagna     | Article | Status |');
  console.log('|-----------------|----------------|------------------|---------|--------|');
  
  for (const r of results) {
    const status = r.success ? '✅' : '❌';
    console.log(`| ${r.name.padEnd(15)} | ${r.expectedLagna.padEnd(14)} | ${(r.actualLagna || 'N/A').slice(0, 16).padEnd(16)} | ${r.expectedArticle.padEnd(7)} | ${status.padEnd(6)} |`);
  }
  
  console.log('\n📁 PDF Files Generated:');
  for (const r of results) {
    if (r.pdfPath) {
      console.log(`   - ${r.pdfPath}`);
    }
  }
  
  return results;
}

generateValidationPDFs()
  .then(results => {
    console.log('\n✅ Validation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Validation failed:', error);
    process.exit(1);
  });
