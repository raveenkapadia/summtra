const fs = require('fs');
const path = require('path');
const { extractTextFromPDF, getPDFPageCount } = require('./helpers/pdfHelper');

describe('PDF Content Verification', () => {
  
  const testPDFsDir = path.join(process.cwd(), 'public/test-pdfs');
  
  function findLatestPDF() {
    if (!fs.existsSync(testPDFsDir)) {
      return null;
    }
    const files = fs.readdirSync(testPDFsDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => ({
        name: f,
        path: path.join(testPDFsDir, f),
        mtime: fs.statSync(path.join(testPDFsDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files[0]?.path || null;
  }

  function findPDFsByPattern(pattern) {
    if (!fs.existsSync(testPDFsDir)) {
      return [];
    }
    return fs.readdirSync(testPDFsDir)
      .filter(f => f.endsWith('.pdf') && f.includes(pattern))
      .map(f => path.join(testPDFsDir, f))
      .sort()
      .reverse();
  }

  describe('PDF Structure', () => {
    
    test('PDF files exist in test directory', () => {
      const pdfPath = findLatestPDF();
      expect(pdfPath).not.toBeNull();
      expect(fs.existsSync(pdfPath)).toBe(true);
    });

    test('PDF has expected page count (40+ pages)', async () => {
      const pdfPath = findLatestPDF();
      if (!pdfPath) {
        console.warn('No PDF files found, skipping test');
        return;
      }
      
      const pageCount = await getPDFPageCount(pdfPath);
      expect(pageCount).toBeGreaterThanOrEqual(40);
    });

  });

  describe('Required Sections Present', () => {
    let pdfText = null;
    let pdfPath = null;
    
    beforeAll(async () => {
      pdfPath = findLatestPDF();
      if (pdfPath) {
        pdfText = await extractTextFromPDF(pdfPath);
      }
    });

    test('PDF contains introduction content', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText.toLowerCase()).toMatch(/cosmic blueprint|astrocartography|vedic/i);
    });

    test('PDF contains city ranking content', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText.toLowerCase()).toMatch(/top.*cities|city.*rank|score/i);
    });

    test('PDF contains Vedic terminology', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).toMatch(/lagna|nakshatra|rashi|dasha/i);
    });

    test('PDF contains score breakdown labels', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).toMatch(/western|vedic|total/i);
    });

  });

  describe('Grammar Verification Patterns', () => {
    let pdfText = null;
    
    beforeAll(async () => {
      const pdfPath = findLatestPDF();
      if (pdfPath) {
        pdfText = await extractTextFromPDF(pdfPath);
      }
    });

    test('No "a Aquarius" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ba\s+Aquarius\b/i);
    });

    test('No "a Aries" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ba\s+Aries\b/i);
    });

    test('No "an Leo" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Leo\b/i);
    });

    test('No "an Pisces" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Pisces\b/i);
    });

    test('No "an Taurus" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Taurus\b/i);
    });

    test('No "an Gemini" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Gemini\b/i);
    });

    test('No "an Cancer" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Cancer\b/i);
    });

    test('No "an Virgo" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Virgo\b/i);
    });

    test('No "an Libra" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Libra\b/i);
    });

    test('No "an Scorpio" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Scorpio\b/i);
    });

    test('No "an Sagittarius" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Sagittarius\b/i);
    });

    test('No "an Capricorn" grammar error', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toMatch(/\ban\s+Capricorn\b/i);
    });

  });

  describe('Star Rating Characters', () => {
    let pdfText = null;
    
    beforeAll(async () => {
      const pdfPath = findLatestPDF();
      if (pdfPath) {
        pdfText = await extractTextFromPDF(pdfPath);
      }
    });

    test('PDF contains star rating characters', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).toMatch(/★|☆|⭐/);
    });

  });

  describe('Planet Names Present', () => {
    let pdfText = null;
    
    beforeAll(async () => {
      const pdfPath = findLatestPDF();
      if (pdfPath) {
        pdfText = await extractTextFromPDF(pdfPath);
      }
    });

    test('PDF contains planet names', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      const planets = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
      const foundPlanets = planets.filter(p => pdfText.includes(p));
      
      expect(foundPlanets.length).toBeGreaterThanOrEqual(3);
    });

    test('PDF contains line type labels', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      const lineTypes = ['AC', 'DC', 'MC', 'IC'];
      const foundTypes = lineTypes.filter(t => pdfText.includes(t));
      
      expect(foundTypes.length).toBeGreaterThanOrEqual(2);
    });

  });

  describe('No Broken Unicode', () => {
    let pdfText = null;
    
    beforeAll(async () => {
      const pdfPath = findLatestPDF();
      if (pdfPath) {
        pdfText = await extractTextFromPDF(pdfPath);
      }
    });

    test('No replacement character boxes', () => {
      if (!pdfText) {
        console.warn('No PDF text extracted, skipping test');
        return;
      }
      
      expect(pdfText).not.toContain('\uFFFD');
    });

  });

});
