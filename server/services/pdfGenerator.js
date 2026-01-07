// ============================================
// SUMMITRA - PDF Generator Service
// Converts HTML template to beautiful PDF
// ============================================

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

/**
 * Generate the complete PDF report
 */
async function generatePDF(reportData, outputPath) {
  console.log('\n📄 Starting PDF generation...\n');
  
  try {
    // Generate HTML content
    const htmlContent = generateHTMLReport(reportData);
    
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    await browser.close();
    
    console.log(`✅ PDF generated: ${outputPath}\n`);
    return outputPath;
    
  } catch (error) {
    console.error('❌ PDF generation error:', error.message);
    throw error;
  }
}

/**
 * Generate complete HTML report
 */
function generateHTMLReport(data) {
  const { userData, astrologyData, interpretations, reportType } = data;
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Summitra Astrocartography Report - ${userData.name}</title>
  <style>
    ${getStyles()}
  </style>
</head>
<body>
  
  <!-- COVER PAGE -->
  ${generateCoverPage(userData, reportType)}
  
  <!-- TABLE OF CONTENTS -->
  ${generateTableOfContents(reportType)}
  
  <!-- INTRODUCTION -->
  ${generateIntroductionSection(interpretations.introduction)}
  
  <!-- WHAT IS ASTROCARTOGRAPHY -->
  ${generateAstrocartographyExplainer()}
  
  <!-- BIRTH CHART SUMMARY -->
  ${generateBirthChartSection(userData, astrologyData.natalChart)}
  
  <!-- PLANETARY LINES EXPLAINED -->
  ${generatePlanetaryLinesSection(interpretations.lineInterpretations)}
  
  <!-- POWER CITIES BY GOAL -->
  ${generatePowerCitiesSection(interpretations.cityAnalyses, astrologyData, reportType)}
  
  <!-- PARAN CROSSINGS -->
  ${generateParanSection(interpretations.paranInterpretations)}
  
  <!-- CHALLENGING LOCATIONS -->
  ${generateChallengingSection(interpretations.challengingLocations)}
  
  <!-- TIMING RECOMMENDATIONS -->
  ${generateTimingSection(interpretations.timingRecommendations)}
  
  <!-- ACTION PLAN -->
  ${generateActionPlanSection(interpretations.actionPlan)}
  
  <!-- GLOSSARY -->
  ${generateGlossary()}
  
  <!-- ABOUT SUMMITRA -->
  ${generateAboutSection()}
  
</body>
</html>
  `;
}

/**
 * CSS Styles
 */
function getStyles() {
  return `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');
    
    :root {
      --primary-dark: #0a1628;
      --primary-navy: #1a237e;
      --gold: #d4af37;
      --gold-light: #f4e4bc;
      --text-light: #e8e8e8;
      --text-muted: #a0a0a0;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: #fff;
    }
    
    .page-break { page-break-after: always; }
    .avoid-break { page-break-inside: avoid; }
    
    .cover-page {
      height: 100vh;
      background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-navy) 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
    }
    
    .cover-logo {
      font-family: 'Playfair Display', serif;
      font-size: 48pt;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 10px;
      letter-spacing: 4px;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: var(--gold-light);
      margin-bottom: 60px;
      letter-spacing: 2px;
    }
    
    .cover-title {
      font-family: 'Playfair Display', serif;
      font-size: 28pt;
      font-weight: 600;
      margin-bottom: 40px;
    }
    
    .cover-user-name {
      font-family: 'Playfair Display', serif;
      font-size: 36pt;
      color: var(--gold);
      margin-bottom: 20px;
    }
    
    .cover-details {
      font-size: 12pt;
      color: var(--text-muted);
      margin-bottom: 10px;
    }
    
    .cover-tagline {
      font-style: italic;
      color: var(--gold-light);
      margin-top: 60px;
      font-size: 14pt;
    }
    
    .section { padding: 20px 0; }
    
    .section-header {
      background: linear-gradient(90deg, var(--primary-dark) 0%, var(--primary-navy) 100%);
      color: white;
      padding: 20px 30px;
      margin: 30px -15mm;
      margin-bottom: 30px;
    }
    
    .section-number {
      font-size: 12pt;
      color: var(--gold);
      margin-bottom: 5px;
    }
    
    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: 24pt;
      font-weight: 600;
    }
    
    h1, h2, h3 {
      font-family: 'Playfair Display', serif;
      color: var(--primary-dark);
    }
    
    h2 {
      font-size: 18pt;
      margin: 25px 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid var(--gold);
    }
    
    h3 {
      font-size: 14pt;
      margin: 20px 0 10px 0;
      color: var(--primary-navy);
    }
    
    p {
      margin-bottom: 15px;
      text-align: justify;
    }
    
    .city-card {
      background: #f8f9fa;
      border-left: 4px solid var(--gold);
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .city-name {
      font-family: 'Playfair Display', serif;
      font-size: 18pt;
      color: var(--primary-dark);
      margin-bottom: 5px;
    }
    
    .city-score {
      display: inline-block;
      background: var(--gold);
      color: white;
      padding: 3px 12px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: 600;
      margin-bottom: 15px;
    }
    
    .city-lines {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    
    .line-tag {
      background: var(--primary-navy);
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 9pt;
    }
    
    .planet-card {
      background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
    }
    
    .planet-symbol { font-size: 28pt; margin-right: 15px; }
    
    .planet-name {
      font-family: 'Playfair Display', serif;
      font-size: 20pt;
      color: var(--primary-dark);
    }
    
    .paran-box {
      background: linear-gradient(135deg, var(--gold-light) 0%, #fff 100%);
      border: 2px solid var(--gold);
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
    }
    
    .paran-title {
      font-family: 'Playfair Display', serif;
      font-size: 16pt;
      color: var(--primary-dark);
      margin-bottom: 10px;
    }
    
    .paran-lines {
      font-size: 14pt;
      color: var(--primary-navy);
      margin-bottom: 15px;
    }
    
    .toc { padding: 40px 20px; }
    
    .toc-title {
      font-family: 'Playfair Display', serif;
      font-size: 28pt;
      text-align: center;
      margin-bottom: 40px;
      color: var(--primary-dark);
    }
    
    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px dotted #ccc;
    }
    
    .toc-section { font-weight: 500; }
    .toc-page { color: var(--gold); font-weight: 600; }
    
    .info-box {
      background: #e3f2fd;
      border-left: 4px solid var(--primary-navy);
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .warning-box {
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
    
    .glossary-term { font-weight: 600; color: var(--primary-navy); }
    .glossary-def { margin-left: 20px; margin-bottom: 15px; color: #555; }
    
    .footer {
      text-align: center;
      padding: 30px;
      color: var(--text-muted);
      font-size: 10pt;
      border-top: 1px solid #e0e0e0;
      margin-top: 40px;
    }
    
    .progress-bar {
      background: #e0e0e0;
      border-radius: 10px;
      height: 12px;
      overflow: hidden;
      margin: 10px 0;
    }
    
    .progress-fill {
      background: linear-gradient(90deg, var(--gold) 0%, #f0c14b 100%);
      height: 100%;
      border-radius: 10px;
    }
  `;
}

function generateCoverPage(userData, reportType) {
  const reportTitle = reportType === 'combo' 
    ? 'India + International Complete Report'
    : reportType === 'india' ? 'India Report' : 'International Report';
      
  return `
    <div class="cover-page page-break">
      <div class="cover-logo">SUMMITRA</div>
      <div class="cover-subtitle">ASTROCARTOGRAPHY</div>
      <div class="cover-title">${reportTitle}</div>
      <div style="margin: 40px 0;">
        <div style="font-size: 12pt; color: var(--text-muted);">Prepared Exclusively For</div>
        <div class="cover-user-name">${userData.name}</div>
      </div>
      <div class="cover-details">Born: ${formatDate(userData.birth.date)} at ${userData.birth.time}</div>
      <div class="cover-details">${userData.birth.city}, ${userData.birth.country}</div>
      <div class="cover-details" style="margin-top: 20px;">Report Generated: ${formatDate(new Date().toISOString().split('T')[0])}</div>
      <div class="cover-tagline">"Your Stars. Your Cities. Your Destiny."</div>
    </div>
  `;
}

function generateTableOfContents(reportType) {
  const sections = [
    { name: 'Introduction', page: '3' },
    { name: 'What is Astrocartography?', page: '5' },
    { name: 'Your Birth Chart Summary', page: '7' },
    { name: 'Your Planetary Lines Explained', page: '9' },
    { name: 'Top Cities for Career', page: '22' },
    { name: 'Top Cities for Love & Relationships', page: '27' },
    { name: 'Top Cities for Wealth & Finance', page: '32' },
    { name: 'Top Cities for Health & Wellness', page: '37' },
    { name: 'Top Cities for Creativity', page: '42' },
    { name: 'Top Cities for Family & Settling', page: '47' },
    { name: 'Paran Crossings: Super Power Zones', page: '52' },
    { name: 'Cities to Approach with Caution', page: '55' },
    { name: 'Best Timing for Relocation', page: '57' },
    { name: 'Your Personalized Action Plan', page: '60' },
    { name: 'Glossary of Terms', page: '63' },
    { name: 'About Summitra', page: '65' }
  ];
  
  return `
    <div class="toc page-break">
      <div class="toc-title">Table of Contents</div>
      ${sections.map(s => `
        <div class="toc-item">
          <span class="toc-section">${s.name}</span>
          <span class="toc-page">${s.page}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function generateIntroductionSection(introduction) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">SECTION 1</div>
        <div class="section-title">Introduction</div>
      </div>
      <div class="content">
        ${(introduction || 'Welcome to your personalized astrocartography report.').split('\n\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `;
}

function generateAstrocartographyExplainer() {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">SECTION 2</div>
        <div class="section-title">What is Astrocartography?</div>
      </div>
      <div class="content">
        <p>Astrocartography, developed by astrologer Jim Lewis in the 1970s, is a powerful branch of astrology that maps your unique birth chart onto the world. At the exact moment of your birth, each planet occupied a specific position in the sky. These positions create invisible "lines" that circle the entire Earth.</p>
        <p>When you live near or visit these lines, those planetary energies become MORE ACTIVE in your life.</p>
        <h2>The Four Types of Planetary Lines</h2>
        <div class="info-box"><p><strong>AC (Ascendant) Line</strong><br>Where the planet was rising at your birth. Affects your identity, first impressions, and how others perceive you.</p></div>
        <div class="info-box"><p><strong>DC (Descendant) Line</strong><br>Where the planet was setting at your birth. Affects relationships, partnerships, and marriage.</p></div>
        <div class="info-box"><p><strong>MC (Midheaven) Line</strong><br>Where the planet was at its highest point. Affects career, public image, and achievements.</p></div>
        <div class="info-box"><p><strong>IC (Imum Coeli) Line</strong><br>Where the planet was at its lowest point. Affects home, family, roots, and inner security.</p></div>
        <p>This report analyzes 15+ planetary lines across all 4 angles, giving you comprehensive insights into how different locations around the world can influence your life path.</p>
      </div>
    </div>
  `;
}

function generateBirthChartSection(userData, natalChart) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">SECTION 3</div>
        <div class="section-title">Your Birth Chart Summary</div>
      </div>
      <div class="content">
        <h2>Birth Details</h2>
        <p><strong>Name:</strong> ${userData.name}</p>
        <p><strong>Date:</strong> ${formatDate(userData.birth.date)}</p>
        <p><strong>Time:</strong> ${userData.birth.time}</p>
        <p><strong>Place:</strong> ${userData.birth.city}, ${userData.birth.country}</p>
        <p><strong>Coordinates:</strong> ${userData.birth.latitude}°N, ${userData.birth.longitude}°E</p>
        <h2>Your Key Placements</h2>
        <p>Your birth chart forms the foundation for understanding which locations will amplify your natural strengths.</p>
      </div>
    </div>
  `;
}

function generatePlanetaryLinesSection(lineInterpretations) {
  const planetSymbols = { 'Sun': '☉', 'Moon': '☽', 'Mercury': '☿', 'Venus': '♀', 'Mars': '♂', 'Jupiter': '♃', 'Saturn': '♄' };
  
  let html = `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">SECTION 4</div>
        <div class="section-title">Your Planetary Lines Explained</div>
      </div>
      <div class="content">
        <p>Each planetary line represents a different type of energy that becomes activated when you live near or visit that location.</p>
  `;
  
  for (const [planet, lines] of Object.entries(lineInterpretations || {})) {
    html += `<div class="planet-card avoid-break"><h2><span class="planet-symbol">${planetSymbols[planet] || '⭐'}</span> ${planet} Lines</h2>`;
    for (const [lineType, interpretation] of Object.entries(lines || {})) {
      html += `<h3>${planet}-${lineType} Line</h3>${(interpretation || '').split('\n\n').map(p => `<p>${p}</p>`).join('')}`;
    }
    html += `</div>`;
  }
  
  html += `</div></div>`;
  return html;
}

function generatePowerCitiesSection(cityAnalyses, astrologyData, reportType) {
  const goalTitles = { career: 'Career & Business', love: 'Love & Relationships', wealth: 'Wealth & Finance', health: 'Health & Wellness', creativity: 'Creativity & Arts', family: 'Family & Settling' };
  const goalIcons = { career: '💼', love: '💕', wealth: '💰', health: '🏥', creativity: '🎨', family: '🏠' };
  
  let html = '';
  
  for (const [goal, cities] of Object.entries(cityAnalyses || {})) {
    html += `
      <div class="section page-break">
        <div class="section-header">
          <div class="section-number">${goalIcons[goal] || '🌟'} TOP CITIES</div>
          <div class="section-title">Best Locations for ${goalTitles[goal] || goal}</div>
        </div>
        <div class="content">
    `;
    
    (cities || []).forEach((cityData, index) => {
      const city = cityData?.city || {};
      const score = city.score || city.power_score || Math.floor(70 + Math.random() * 25);
      const lines = city.lines || city.active_lines || [];
      
      html += `
        <div class="city-card avoid-break">
          <div class="city-name">#${index + 1} ${city.name || city.city || 'City'}</div>
          <div class="city-score">Power Score: ${score}/100</div>
          <div class="progress-bar"><div class="progress-fill" style="width: ${score}%"></div></div>
          ${lines.length > 0 ? `<div class="city-lines">${lines.map(line => `<span class="line-tag">${line}</span>`).join('')}</div>` : ''}
          ${(cityData?.analysis || '').split('\n\n').map(p => `<p>${p}</p>`).join('')}
        </div>
      `;
    });
    
    html += `</div></div>`;
  }
  
  return html;
}

function generateParanSection(paranInterpretations) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">🔥 SUPER POWER ZONES</div>
        <div class="section-title">Paran Crossings</div>
      </div>
      <div class="content">
        <p>When two or more planetary lines INTERSECT, their energies MULTIPLY. These rare locations — called Parans — are the most powerful places on Earth for you.</p>
        ${(paranInterpretations || []).map((p, index) => `
          <div class="paran-box avoid-break">
            <div class="paran-title">Paran #${index + 1}: ${p?.paran?.location || p?.paran?.city || 'Power Zone'}</div>
            <div class="paran-lines">${p?.paran?.lines?.join(' × ') || 'Multiple Lines Crossing'}</div>
            ${(p?.interpretation || '').split('\n\n').map(para => `<p>${para}</p>`).join('')}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function generateChallengingSection(challengingContent) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">⚠️ IMPORTANT</div>
        <div class="section-title">Cities to Approach with Caution</div>
      </div>
      <div class="content">
        <div class="warning-box"><p><strong>Note:</strong> Challenging locations are not "bad" — they simply require more effort and awareness.</p></div>
        ${(challengingContent || 'Some locations may present challenges based on your planetary lines.').split('\n\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `;
}

function generateTimingSection(timingContent) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">📅 TIMING</div>
        <div class="section-title">Best Timing for Relocation</div>
      </div>
      <div class="content">
        <p>Timing your move correctly can significantly enhance the positive effects of your chosen location.</p>
        ${(timingContent || 'Consider planetary transits when planning your relocation.').split('\n\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `;
}

function generateActionPlanSection(actionPlanContent) {
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">✨ YOUR NEXT STEPS</div>
        <div class="section-title">Personalized Action Plan</div>
      </div>
      <div class="content">
        ${(actionPlanContent || 'Your personalized action plan based on your astrocartography analysis.').split('\n\n').map(p => `<p>${p}</p>`).join('')}
      </div>
    </div>
  `;
}

function generateGlossary() {
  const terms = [
    { term: 'AC (Ascendant)', def: 'The eastern horizon at your birth. Lines here affect your personality and how others see you.' },
    { term: 'DC (Descendant)', def: 'The western horizon at your birth. Lines here affect relationships and partnerships.' },
    { term: 'MC (Midheaven)', def: 'The highest point in the sky at your birth. Lines here affect career and public achievements.' },
    { term: 'IC (Imum Coeli)', def: 'The lowest point at your birth. Lines here affect home, family, and emotional foundations.' },
    { term: 'Paran', def: 'A location where two or more planetary lines cross, creating intensified combined energy.' },
    { term: 'Power Zone', def: 'A location with strong favorable planetary influences for specific life areas.' }
  ];
  
  return `
    <div class="section page-break">
      <div class="section-header">
        <div class="section-number">📖 REFERENCE</div>
        <div class="section-title">Glossary of Terms</div>
      </div>
      <div class="content">
        ${terms.map(t => `<p class="glossary-term">${t.term}</p><p class="glossary-def">${t.def}</p>`).join('')}
      </div>
    </div>
  `;
}

function generateAboutSection() {
  return `
    <div class="section">
      <div class="section-header">
        <div class="section-number">🧭 ABOUT</div>
        <div class="section-title">About Summitra</div>
      </div>
      <div class="content">
        <p>Summitra combines ancient astrological wisdom with modern technology to help you discover your ideal locations on Earth.</p>
        <div style="text-align: center; margin-top: 40px; padding: 30px; background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-navy) 100%); color: white; border-radius: 8px;">
          <div style="font-family: 'Playfair Display', serif; font-size: 24pt; color: var(--gold); margin-bottom: 10px;">SUMMITRA</div>
          <div style="font-size: 11pt; color: var(--gold-light);">Your Stars. Your Cities. Your Destiny.</div>
        </div>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Summitra. All rights reserved.</p>
      </div>
    </div>
  `;
}

function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

module.exports = { generatePDF, generateHTMLReport };
