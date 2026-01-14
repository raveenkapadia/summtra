const { execSync } = require('child_process');
const path = require('path');

function callPrepareReportData(birthData, astroData, options) {
  const script = `
    import { prepareReportData } from './server/services/templateProcessor.js';
    
    const birthData = ${JSON.stringify(birthData)};
    const astroData = ${JSON.stringify(astroData || { natal_chart: { planets: [] }, astrocartography_lines: [] })};
    const options = ${JSON.stringify(options || { goal: 'Career' })};
    
    const result = prepareReportData(birthData, astroData, options);
    
    console.log(JSON.stringify({
      LAGNA_ARTICLE: result.LAGNA_ARTICLE,
      LAGNA: result.LAGNA,
      USER_NAME: result.USER_NAME,
      NAKSHATRA: result.NAKSHATRA,
      MAHADASHA: result.MAHADASHA,
      GOAL: result.GOAL,
      BIRTH_DATE: result.BIRTH_DATE,
      BIRTH_TIME: result.BIRTH_TIME,
      BIRTH_PLACE: result.BIRTH_PLACE
    }));
  `;
  
  try {
    const result = execSync(`npx tsx -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 10000
    });
    return JSON.parse(result.trim());
  } catch (error) {
    console.error('Error calling prepareReportData:', error.message);
    return null;
  }
}

function getArticle(word) {
  if (!word) return 'a';
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  return vowels.includes(word.charAt(0).toUpperCase()) ? 'an' : 'a';
}

module.exports = { callPrepareReportData, getArticle };
