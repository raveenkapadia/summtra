// ============================================
// SUMMITRA - Report Generator (Orchestrator)
// Ties together all services to generate report
// ============================================

const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const { fetchAllAstrologyData } = require('./astrologyApi');
const { generateAllInterpretations } = require('./claudeService');
const { generatePDF } = require('./pdfGenerator');
const { sendReportEmail, sendOrderConfirmation } = require('./emailService');

/**
 * Main function to generate complete report
 */
async function generateReport(params) {
  const { user, birth, reportType } = params;
  const reportId = uuidv4();
  const startTime = Date.now();
  
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           SUMMITRA REPORT GENERATION STARTED                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Report ID: ${reportId}
║  User: ${user.name} (${user.email})
║  Report Type: ${reportType}
║  Birth: ${birth.date} ${birth.time} at ${birth.city}
╚═══════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 0: Send order confirmation email
    console.log('\n📧 Step 0: Sending order confirmation...');
    await sendOrderConfirmation(user, reportType, reportId);

    // Step 1: Fetch astrology data from RapidAPI
    console.log('\n🌟 Step 1: Fetching astrology data from API...');
    const astrologyData = await fetchAllAstrologyData(birth, reportType);
    console.log('   ✅ Astrology data fetched');
    
    // Use enriched birth data for H4-H6 scoring (retrograde, nakshatra lord, manglik)
    const enrichedBirth = astrologyData.enrichedBirthData || birth;

    // Step 2: Generate AI interpretations using Claude
    console.log('\n🤖 Step 2: Generating AI interpretations...');
    const interpretations = await generateAllInterpretations(
      astrologyData,
      { name: user.name, birth: enrichedBirth },
      reportType
    );
    console.log('   ✅ Interpretations generated');

    // Step 3: Generate PDF
    console.log('\n📄 Step 3: Generating PDF report...');
    
    // Create outputs directory in project root
    const outputDir = path.join(__dirname, '../../outputs');
    await fs.mkdir(outputDir, { recursive: true });
    
    const pdfFilename = `Summitra_${user.name.replace(/\s+/g, '_')}_${reportId.slice(0, 8)}.pdf`;
    const pdfPath = path.join(outputDir, pdfFilename);
    
    await generatePDF({
      userData: { name: user.name, email: user.email, birth: enrichedBirth },
      astrologyData,
      interpretations,
      reportType
    }, pdfPath);
    console.log(`   ✅ PDF generated: ${pdfFilename}`);

    // Step 4: Send email with PDF
    console.log('\n📧 Step 4: Sending report email...');
    const emailResult = await sendReportEmail(user, pdfPath, reportType);
    console.log('   ✅ Email sent');

    // Calculate time taken
    const timeTaken = Math.round((Date.now() - startTime) / 1000);

    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           REPORT GENERATION COMPLETE! ✅                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Report ID: ${reportId}
║  Time Taken: ${timeTaken} seconds
║  PDF: ${pdfFilename}
║  Email Sent: ${emailResult.success ? 'Yes' : 'No'}
╚═══════════════════════════════════════════════════════════════╝
    `);

    return {
      success: true,
      reportId,
      pdfPath,
      emailSent: emailResult.success,
      timeTaken
    };

  } catch (error) {
    console.error(`
╔═══════════════════════════════════════════════════════════════╗
║           REPORT GENERATION FAILED ❌                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Report ID: ${reportId}
║  Error: ${error.message}
╚═══════════════════════════════════════════════════════════════╝
    `);

    return {
      success: false,
      reportId,
      error: error.message
    };
  }
}

/**
 * Test function for development
 */
async function testReportGeneration() {
  const testData = {
    user: {
      name: 'Test User',
      email: 'test@example.com',
      phone: '+91-9999999999'
    },
    birth: {
      date: '1990-05-15',
      time: '14:30',
      city: 'Delhi',
      country: 'India',
      latitude: 28.6139,
      longitude: 77.2090,
      timezone: 'Asia/Kolkata'
    },
    reportType: 'india'
  };

  console.log('\n🧪 Running test report generation...\n');
  const result = await generateReport(testData);
  console.log('\nTest Result:', result);
}

module.exports = { generateReport, testReportGeneration };
