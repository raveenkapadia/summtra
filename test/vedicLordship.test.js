const {
  normalizeSign,
  getSignLord,
  getLagnaLord,
  getHouseSign,
  getHouseLord,
  getGoalPlanets
} = require('../server/services/vedicLordship.js');

describe('Hindi Zodiac Name Normalization', () => {
  const hindiToEnglish = {
    'Mesha': 'Aries',
    'Vrishabha': 'Taurus',
    'Mithuna': 'Gemini',
    'Karka': 'Cancer',
    'Simha': 'Leo',
    'Kanya': 'Virgo',
    'Tula': 'Libra',
    'Vrishchika': 'Scorpio',
    'Dhanu': 'Sagittarius',
    'Makara': 'Capricorn',
    'Kumbha': 'Aquarius',
    'Meena': 'Pisces'
  };

  describe('normalizeSign()', () => {
    Object.entries(hindiToEnglish).forEach(([hindi, english]) => {
      it(`normalizes ${hindi} to ${english}`, () => {
        expect(normalizeSign(hindi)).toBe(english);
      });
    });

    it('passes through English names unchanged', () => {
      expect(normalizeSign('Libra')).toBe('Libra');
      expect(normalizeSign('Scorpio')).toBe('Scorpio');
      expect(normalizeSign('Aries')).toBe('Aries');
    });

    it('handles case variations', () => {
      expect(normalizeSign('tula')).toBe('Libra');
      expect(normalizeSign('TULA')).toBe('Libra');
      expect(normalizeSign('libra')).toBe('Libra');
    });

    it('returns null for null/undefined input', () => {
      expect(normalizeSign(null)).toBeNull();
      expect(normalizeSign(undefined)).toBeNull();
    });

    it('handles unknown Hindi signs gracefully', () => {
      expect(normalizeSign('UnknownSign')).toBe('Unknownsign');
      expect(normalizeSign('Xyz')).toBe('Xyz');
    });

    it('handles empty string as falsy input', () => {
      expect(normalizeSign('')).toBeNull();
    });
  });

  describe('getSignLord()', () => {
    it('returns correct lord for Hindi sign names', () => {
      expect(getSignLord('Tula')).toBe('Venus');
      expect(getSignLord('Mesha')).toBe('Mars');
      expect(getSignLord('Vrishchika')).toBe('Mars');
      expect(getSignLord('Dhanu')).toBe('Jupiter');
    });

    it('returns correct lord for English sign names', () => {
      expect(getSignLord('Libra')).toBe('Venus');
      expect(getSignLord('Aries')).toBe('Mars');
      expect(getSignLord('Scorpio')).toBe('Mars');
      expect(getSignLord('Sagittarius')).toBe('Jupiter');
    });
  });

  describe('getLagnaLord()', () => {
    it('returns correct lagna lord for Hindi lagna names', () => {
      expect(getLagnaLord('Tula')).toBe('Venus');
      expect(getLagnaLord('Mesha')).toBe('Mars');
      expect(getLagnaLord('Karka')).toBe('Moon');
    });
  });

  describe('getHouseSign()', () => {
    it('calculates correct house signs for Hindi lagna', () => {
      expect(getHouseSign(1, 'Tula')).toBe('Libra');
      expect(getHouseSign(7, 'Tula')).toBe('Aries');
      expect(getHouseSign(10, 'Tula')).toBe('Cancer');
    });

    it('calculates correct house signs for English lagna', () => {
      expect(getHouseSign(1, 'Libra')).toBe('Libra');
      expect(getHouseSign(7, 'Libra')).toBe('Aries');
      expect(getHouseSign(10, 'Libra')).toBe('Cancer');
    });
  });

  describe('getHouseLord()', () => {
    it('returns correct house lords for Hindi lagna', () => {
      expect(getHouseLord(10, 'Tula')).toBe('Moon');
      expect(getHouseLord(1, 'Mesha')).toBe('Mars');
      expect(getHouseLord(7, 'Dhanu')).toBe('Mercury');
    });
  });

  describe('getGoalPlanets()', () => {
    it('returns goal planets for Hindi lagna names', () => {
      const planets = getGoalPlanets('Career', 'Tula');
      expect(planets.length).toBeGreaterThan(0);
      expect(planets).toContain('Moon');
    });

    it('returns goal planets for English lagna names', () => {
      const planets = getGoalPlanets('Career', 'Libra');
      expect(planets.length).toBeGreaterThan(0);
      expect(planets).toContain('Moon');
    });

    it('returns same planets for Hindi and English equivalents', () => {
      const hindiPlanets = getGoalPlanets('Career', 'Tula');
      const englishPlanets = getGoalPlanets('Career', 'Libra');
      expect(hindiPlanets).toEqual(englishPlanets);
    });

    it('returns different planets for different goals', () => {
      const careerPlanets = getGoalPlanets('Career', 'Tula');
      const wealthPlanets = getGoalPlanets('Wealth', 'Tula');
      expect(careerPlanets).not.toEqual(wealthPlanets);
    });
  });
});
