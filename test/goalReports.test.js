const {
  getGoalPlanets,
  getHouseLord,
  getHouseSign
} = require('../server/services/vedicLordship.js');

const ALL_GOALS = ['Career', 'Love', 'Wealth', 'Education', 'Settlement'];
const ALL_LAGNAS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer',
  'Leo', 'Virgo', 'Libra', 'Scorpio',
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

describe('Goal-Specific Reports (Production Code)', () => {

  describe('Goal Planets by Lagna from Production vedicLordship', () => {
    ALL_GOALS.forEach(goal => {
      test(`${goal} goal returns planets for all Lagnas`, () => {
        ALL_LAGNAS.forEach(lagna => {
          const planets = getGoalPlanets(goal, lagna);
          expect(planets).toBeDefined();
          expect(Array.isArray(planets)).toBe(true);
          expect(planets.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Career Goal Houses (10th House Focus)', () => {
    test('Career includes 10th house lord for Aries', () => {
      const lord = getHouseLord(10, 'Aries');
      expect(lord).toBe('Saturn');
      const planets = getGoalPlanets('Career', 'Aries');
      expect(planets).toContain('Saturn');
    });

    test('Career includes 10th house lord for Libra', () => {
      const lord = getHouseLord(10, 'Libra');
      expect(lord).toBe('Moon');
      const planets = getGoalPlanets('Career', 'Libra');
      expect(planets).toContain('Moon');
    });

    test('Career includes 10th house lord for Scorpio', () => {
      const lord = getHouseLord(10, 'Scorpio');
      expect(lord).toBe('Sun');
      const planets = getGoalPlanets('Career', 'Scorpio');
      expect(planets).toContain('Sun');
    });
  });

  describe('Love Goal Houses (7th House Focus)', () => {
    test('Love includes 7th house lord for Aries', () => {
      const lord = getHouseLord(7, 'Aries');
      expect(lord).toBe('Venus');
      const planets = getGoalPlanets('Love', 'Aries');
      expect(planets).toContain('Venus');
    });

    test('Love includes 7th house lord for Cancer', () => {
      const lord = getHouseLord(7, 'Cancer');
      expect(lord).toBe('Saturn');
      const planets = getGoalPlanets('Love', 'Cancer');
      expect(planets).toContain('Saturn');
    });
  });

  describe('Wealth Goal Houses (2nd and 11th House Focus)', () => {
    test('Wealth includes 2nd house lord for Aries', () => {
      const lord = getHouseLord(2, 'Aries');
      expect(lord).toBe('Venus');
      const planets = getGoalPlanets('Wealth', 'Aries');
      expect(planets).toContain('Venus');
    });

    test('Wealth includes 11th house lord for Scorpio', () => {
      const lord = getHouseLord(11, 'Scorpio');
      expect(lord).toBe('Mercury');
      const planets = getGoalPlanets('Wealth', 'Scorpio');
      expect(planets).toContain('Mercury');
    });
  });

  describe('Education Goal Houses (4th and 5th House Focus)', () => {
    test('Education includes 4th house lord for Aries', () => {
      const lord = getHouseLord(4, 'Aries');
      expect(lord).toBe('Moon');
      const planets = getGoalPlanets('Education', 'Aries');
      expect(planets).toContain('Moon');
    });

    test('Education includes 5th house lord for Leo', () => {
      const lord = getHouseLord(5, 'Leo');
      expect(lord).toBe('Jupiter');
      const planets = getGoalPlanets('Education', 'Leo');
      expect(planets).toContain('Jupiter');
    });
  });

  describe('Settlement Goal Houses (4th House Focus)', () => {
    test('Settlement includes 4th house lord for Taurus', () => {
      const lord = getHouseLord(4, 'Taurus');
      expect(lord).toBe('Sun');
      const planets = getGoalPlanets('Settlement', 'Taurus');
      expect(planets).toContain('Sun');
    });

    test('Settlement includes 4th house lord for Pisces', () => {
      const lord = getHouseLord(4, 'Pisces');
      expect(lord).toBe('Mercury');
      const planets = getGoalPlanets('Settlement', 'Pisces');
      expect(planets).toContain('Mercury');
    });
  });

  describe('House Sign Calculations', () => {
    test('7th house is opposite sign for all Lagnas', () => {
      const opposites = {
        'Aries': 'Libra', 'Taurus': 'Scorpio', 'Gemini': 'Sagittarius',
        'Cancer': 'Capricorn', 'Leo': 'Aquarius', 'Virgo': 'Pisces',
        'Libra': 'Aries', 'Scorpio': 'Taurus', 'Sagittarius': 'Gemini',
        'Capricorn': 'Cancer', 'Aquarius': 'Leo', 'Pisces': 'Virgo'
      };
      ALL_LAGNAS.forEach(lagna => {
        expect(getHouseSign(7, lagna)).toBe(opposites[lagna]);
      });
    });

    test('10th house sign is correctly calculated', () => {
      expect(getHouseSign(10, 'Aries')).toBe('Capricorn');
      expect(getHouseSign(10, 'Libra')).toBe('Cancer');
      expect(getHouseSign(10, 'Cancer')).toBe('Aries');
    });
  });

  describe('Goal Planet Uniqueness', () => {
    test('different goals return different planet sets for same Lagna', () => {
      const careerPlanets = getGoalPlanets('Career', 'Aries');
      const lovePlanets = getGoalPlanets('Love', 'Aries');
      const wealthPlanets = getGoalPlanets('Wealth', 'Aries');
      
      expect(careerPlanets).not.toEqual(lovePlanets);
    });

    test('same goal returns different planets for different Lagnas', () => {
      const ariesCareer = getGoalPlanets('Career', 'Aries');
      const libraCareer = getGoalPlanets('Career', 'Libra');
      
      expect(ariesCareer).not.toEqual(libraCareer);
    });
  });

  describe('Edge Cases', () => {
    test('handles invalid goal gracefully', () => {
      const planets = getGoalPlanets('InvalidGoal', 'Aries');
      expect(Array.isArray(planets)).toBe(true);
    });

    test('handles invalid Lagna gracefully', () => {
      const planets = getGoalPlanets('Career', 'InvalidLagna');
      expect(Array.isArray(planets)).toBe(true);
    });

    test('handles null goal', () => {
      const planets = getGoalPlanets(null, 'Aries');
      expect(Array.isArray(planets)).toBe(true);
    });
  });

});
