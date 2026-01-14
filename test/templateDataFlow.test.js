const { getArticle } = require('./helpers/templateProcessorWrapper.cjs');

describe('Template Data Flow - LAGNA_ARTICLE Contract', () => {

  describe('getArticle Function (Production Logic)', () => {
    
    test('Aquarius gets "an" article', () => {
      expect(getArticle('Aquarius')).toBe('an');
    });

    test('Aries gets "an" article', () => {
      expect(getArticle('Aries')).toBe('an');
    });

    test('Leo gets "a" article', () => {
      expect(getArticle('Leo')).toBe('a');
    });

    test('Pisces gets "a" article', () => {
      expect(getArticle('Pisces')).toBe('a');
    });

    test('Capricorn gets "a" article', () => {
      expect(getArticle('Capricorn')).toBe('a');
    });

    test('Taurus gets "a" article', () => {
      expect(getArticle('Taurus')).toBe('a');
    });

    test('Gemini gets "a" article', () => {
      expect(getArticle('Gemini')).toBe('a');
    });

    test('Cancer gets "a" article', () => {
      expect(getArticle('Cancer')).toBe('a');
    });

    test('Virgo gets "a" article', () => {
      expect(getArticle('Virgo')).toBe('a');
    });

    test('Libra gets "a" article', () => {
      expect(getArticle('Libra')).toBe('a');
    });

    test('Scorpio gets "a" article', () => {
      expect(getArticle('Scorpio')).toBe('a');
    });

    test('Sagittarius gets "a" article', () => {
      expect(getArticle('Sagittarius')).toBe('a');
    });

    test('null lagna gets "a" article (safe default)', () => {
      expect(getArticle(null)).toBe('a');
    });

    test('undefined lagna gets "a" article (safe default)', () => {
      expect(getArticle(undefined)).toBe('a');
    });

    test('empty string lagna gets "a" article (safe default)', () => {
      expect(getArticle('')).toBe('a');
    });

  });

  describe('Article Logic Consistency', () => {
    const lagnas = [
      'Aries', 'Taurus', 'Gemini', 'Cancer',
      'Leo', 'Virgo', 'Libra', 'Scorpio',
      'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
    ];

    const vowelLagnas = ['Aries', 'Aquarius'];
    const consonantLagnas = lagnas.filter(l => !vowelLagnas.includes(l));

    vowelLagnas.forEach(lagna => {
      test(`${lagna} (vowel) consistently returns "an"`, () => {
        expect(getArticle(lagna)).toBe('an');
        expect(getArticle(lagna.toLowerCase())).toBe('an');
        expect(getArticle(lagna.toUpperCase())).toBe('an');
      });
    });

    consonantLagnas.forEach(lagna => {
      test(`${lagna} (consonant) consistently returns "a"`, () => {
        expect(getArticle(lagna)).toBe('a');
        expect(getArticle(lagna.toLowerCase())).toBe('a');
        expect(getArticle(lagna.toUpperCase())).toBe('a');
      });
    });

  });

  describe('LAGNA_ARTICLE Template Variable Contract', () => {
    
    test('LAGNA_ARTICLE should be lowercase', () => {
      expect(getArticle('Aquarius')).toBe('an');
      expect(getArticle('Aquarius')).not.toBe('An');
      expect(getArticle('Aquarius')).not.toBe('AN');
    });

    test('LAGNA_ARTICLE must be either "a" or "an"', () => {
      const lagnas = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      
      lagnas.forEach(lagna => {
        const article = getArticle(lagna);
        expect(['a', 'an']).toContain(article);
      });
    });

    test('Only vowel-starting Lagnas get "an"', () => {
      const lagnas = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
      
      lagnas.forEach(lagna => {
        const article = getArticle(lagna);
        const firstLetter = lagna.charAt(0).toUpperCase();
        const isVowel = ['A', 'E', 'I', 'O', 'U'].includes(firstLetter);
        
        if (isVowel) {
          expect(article).toBe('an');
        } else {
          expect(article).toBe('a');
        }
      });
    });

  });

});
