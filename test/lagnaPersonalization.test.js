const {
  normalizeSign,
  getSignLord,
  getLagnaLord,
  getHouseSign,
  getHouseLord,
  getGoalPlanets,
  HINDI_TO_ENGLISH
} = require('../server/services/vedicLordship.js');

const ALL_LAGNAS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

const VOWEL_LAGNAS = ['Aries', 'Aquarius'];
const CONSONANT_LAGNAS = ['Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Pisces'];

function getArticle(word) {
  if (!word) return 'a';
  const vowels = ['A', 'E', 'I', 'O', 'U'];
  return vowels.includes(word.charAt(0).toUpperCase()) ? 'an' : 'a';
}

describe('Lagna Personalization', () => {

  describe('Lagna Lords (Production Code)', () => {
    ALL_LAGNAS.forEach(lagna => {
      test(`${lagna} has defined lord from production vedicLordship`, () => {
        const lord = getLagnaLord(lagna);
        expect(lord).toBeDefined();
        expect(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']).toContain(lord);
      });
    });

    test('Aries Lagna lord is Mars', () => {
      expect(getLagnaLord('Aries')).toBe('Mars');
    });

    test('Taurus Lagna lord is Venus', () => {
      expect(getLagnaLord('Taurus')).toBe('Venus');
    });

    test('Leo Lagna lord is Sun', () => {
      expect(getLagnaLord('Leo')).toBe('Sun');
    });

    test('Cancer Lagna lord is Moon', () => {
      expect(getLagnaLord('Cancer')).toBe('Moon');
    });

    test('Scorpio Lagna lord is Mars', () => {
      expect(getLagnaLord('Scorpio')).toBe('Mars');
    });

    test('Aquarius Lagna lord is Saturn', () => {
      expect(getLagnaLord('Aquarius')).toBe('Saturn');
    });

    test('Pisces Lagna lord is Jupiter', () => {
      expect(getLagnaLord('Pisces')).toBe('Jupiter');
    });
  });

  describe('Goal Planets by Lagna (Production Code)', () => {
    ALL_LAGNAS.forEach(lagna => {
      test(`${lagna} has Career goal planets from production`, () => {
        const planets = getGoalPlanets('Career', lagna);
        expect(planets).toBeDefined();
        expect(Array.isArray(planets)).toBe(true);
        expect(planets.length).toBeGreaterThan(0);
      });
    });

    test('Career goal includes 10th house lord', () => {
      const planets = getGoalPlanets('Career', 'Aries');
      expect(planets).toContain('Saturn');
    });

    test('Love goal includes 7th house lord', () => {
      const planets = getGoalPlanets('Love', 'Aries');
      expect(planets).toContain('Venus');
    });

    test('Wealth goal includes 2nd house lord', () => {
      const planets = getGoalPlanets('Wealth', 'Aries');
      expect(planets).toContain('Venus');
    });
  });

  describe('House Sign Calculations (Production Code)', () => {
    test('1st house sign is same as Lagna', () => {
      expect(getHouseSign(1, 'Aries')).toBe('Aries');
      expect(getHouseSign(1, 'Scorpio')).toBe('Scorpio');
    });

    test('7th house is opposite to Lagna', () => {
      expect(getHouseSign(7, 'Aries')).toBe('Libra');
      expect(getHouseSign(7, 'Taurus')).toBe('Scorpio');
    });

    test('10th house is 10 signs from Lagna', () => {
      expect(getHouseSign(10, 'Aries')).toBe('Capricorn');
      expect(getHouseSign(10, 'Cancer')).toBe('Aries');
    });
  });

  describe('Hindi to English Normalization (Production Code)', () => {
    test('normalizes Mesha to Aries', () => {
      expect(normalizeSign('Mesha')).toBe('Aries');
    });

    test('normalizes Vrishchika to Scorpio', () => {
      expect(normalizeSign('Vrishchika')).toBe('Scorpio');
    });

    test('normalizes Kumbha to Aquarius', () => {
      expect(normalizeSign('Kumbha')).toBe('Aquarius');
    });

    test('passes through English names', () => {
      expect(normalizeSign('Aries')).toBe('Aries');
      expect(normalizeSign('Aquarius')).toBe('Aquarius');
    });
  });

  describe('Grammar - a/an Article', () => {
    test('getArticle returns "an" for Aries', () => {
      expect(getArticle('Aries')).toBe('an');
    });

    test('getArticle returns "an" for Aquarius', () => {
      expect(getArticle('Aquarius')).toBe('an');
    });

    test('getArticle returns "a" for Pisces', () => {
      expect(getArticle('Pisces')).toBe('a');
    });

    test('getArticle returns "a" for Taurus', () => {
      expect(getArticle('Taurus')).toBe('a');
    });

    test('getArticle returns "a" for Leo', () => {
      expect(getArticle('Leo')).toBe('a');
    });

    test('getArticle returns "a" for Scorpio', () => {
      expect(getArticle('Scorpio')).toBe('a');
    });

    test('getArticle handles lowercase input', () => {
      expect(getArticle('aries')).toBe('an');
      expect(getArticle('pisces')).toBe('a');
    });

    test('getArticle handles null/undefined', () => {
      expect(getArticle(null)).toBe('a');
      expect(getArticle(undefined)).toBe('a');
      expect(getArticle('')).toBe('a');
    });

    VOWEL_LAGNAS.forEach(lagna => {
      test(`${lagna} should use "an" article`, () => {
        const article = getArticle(lagna);
        expect(article).toBe('an');
      });
    });

    CONSONANT_LAGNAS.forEach(lagna => {
      test(`${lagna} should use "a" article`, () => {
        const article = getArticle(lagna);
        expect(article).toBe('a');
      });
    });
  });

  describe('Cross-Lagna Consistency (Production Code)', () => {
    test('Hindi and English Lagnas give same house lords', () => {
      Object.entries(HINDI_TO_ENGLISH).forEach(([hindi, english]) => {
        const hindiLord = getHouseLord(10, hindi);
        const englishLord = getHouseLord(10, english);
        expect(hindiLord).toBe(englishLord);
      });
    });

    test('Hindi and English Lagnas give same goal planets', () => {
      Object.entries(HINDI_TO_ENGLISH).forEach(([hindi, english]) => {
        const hindiPlanets = getGoalPlanets('Career', hindi);
        const englishPlanets = getGoalPlanets('Career', english);
        expect(hindiPlanets).toEqual(englishPlanets);
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles unknown lagna gracefully in getArticle', () => {
      const article = getArticle('Unknown');
      expect(article).toBe('an');
    });

    test('handles consonant-starting unknown word', () => {
      const article = getArticle('Mystery');
      expect(article).toBe('a');
    });

    test('getGoalPlanets handles invalid goal gracefully', () => {
      const planets = getGoalPlanets('Invalid', 'Aries');
      expect(Array.isArray(planets)).toBe(true);
    });

    test('normalizeSign handles null', () => {
      expect(normalizeSign(null)).toBeNull();
    });

    test('normalizeSign handles empty string', () => {
      expect(normalizeSign('')).toBeNull();
    });
  });

});
