const {
  normalizeSign,
  getSignLord,
  getHouseSign,
  getHouseLord,
  getGoalPlanets,
  HINDI_TO_ENGLISH
} = require('../server/services/vedicLordship.js');

describe('Integration: Hindi Lagna to Goal Planets Pipeline', () => {
  
  const testCases = [
    { hindiLagna: 'Tula', goal: 'Career', expectedHouse10Lord: 'Moon' },
    { hindiLagna: 'Mesha', goal: 'Career', expectedHouse10Lord: 'Saturn' },
    { hindiLagna: 'Vrishchika', goal: 'Career', expectedHouse10Lord: 'Sun' },
    { hindiLagna: 'Dhanu', goal: 'Wealth', expectedHouse2Lord: 'Saturn' },
    { hindiLagna: 'Karka', goal: 'Love', expectedHouse7Lord: 'Saturn' },
  ];

  testCases.forEach(({ hindiLagna, goal, expectedHouse10Lord, expectedHouse2Lord, expectedHouse7Lord }) => {
    it(`correctly derives goal planets for ${hindiLagna} Lagna + ${goal} goal`, () => {
      const englishLagna = normalizeSign(hindiLagna);
      expect(englishLagna).toBe(HINDI_TO_ENGLISH[hindiLagna]);
      
      const planets = getGoalPlanets(goal, hindiLagna);
      expect(planets.length).toBeGreaterThan(0);
      
      const expectedLord = expectedHouse10Lord || expectedHouse2Lord || expectedHouse7Lord;
      expect(planets).toContain(expectedLord);
    });
  });

  describe('Full House Lordship Chain', () => {
    it('computes 10th house lord correctly for Tula (Hindi) Lagna', () => {
      const houseSign = getHouseSign(10, 'Tula');
      expect(houseSign).toBe('Cancer');
      
      const houseLord = getHouseLord(10, 'Tula');
      expect(houseLord).toBe('Moon');
    });

    it('returns identical results for Hindi and English Lagna names', () => {
      Object.entries(HINDI_TO_ENGLISH).forEach(([hindi, english]) => {
        const hindiLord = getHouseLord(10, hindi);
        const englishLord = getHouseLord(10, english);
        expect(hindiLord).toBe(englishLord);
        
        const hindiPlanets = getGoalPlanets('Career', hindi);
        const englishPlanets = getGoalPlanets('Career', english);
        expect(hindiPlanets).toEqual(englishPlanets);
      });
    });
  });
});

describe('Integration: Ranking Table Data Extraction Logic', () => {
  
  const extractRankingTableLine = (city) => {
    const credNearestLine = city.credibility?.western?.lineProximity?.nearestLine;
    return credNearestLine || city.nearestLine || 'N/A';
  };

  const extractCityPageLine = (city) => {
    return city.nearestLine || 'N/A';
  };

  const realCityDataPatterns = [
    {
      name: 'Properly Mapped City',
      nearestLine: 'Moon-DS',
      credibility: { western: { lineProximity: { nearestLine: 'Moon-DS' } } }
    },
    {
      name: 'City Missing Cred Line (pre-fix pattern)',
      nearestLine: 'Venus-AC',
      credibility: { western: { lineProximity: {} } }
    },
    {
      name: 'City with null cred line',
      nearestLine: 'Mars-MC',
      credibility: { western: { lineProximity: { nearestLine: null } } }
    },
    {
      name: 'City with empty credibility',
      nearestLine: 'Jupiter-IC',
      credibility: {}
    }
  ];

  it('ranking table extraction matches city page for well-formed data', () => {
    const city = realCityDataPatterns[0];
    const rankingLine = extractRankingTableLine(city);
    const cityPageLine = extractCityPageLine(city);
    expect(rankingLine).toBe(cityPageLine);
  });

  it('falls back correctly when credibility line is missing', () => {
    realCityDataPatterns.slice(1).forEach(city => {
      const rankingLine = extractRankingTableLine(city);
      const cityPageLine = extractCityPageLine(city);
      expect(rankingLine).toBe(cityPageLine);
    });
  });

  describe('Bug Prevention: Field Priority Order', () => {
    it('prioritizes credibility line over global line when both exist', () => {
      const buggyCity = {
        nearestLine: 'OLD-LINE',
        credibility: { western: { lineProximity: { nearestLine: 'CORRECT-LINE' } } }
      };
      
      const rankingLine = extractRankingTableLine(buggyCity);
      expect(rankingLine).toBe('CORRECT-LINE');
      expect(rankingLine).not.toBe('OLD-LINE');
    });

    it('the exact bug scenario: different lines in different places', () => {
      const preBugCity = {
        nearestLine: 'Venus-AC',
        credibility: { western: { lineProximity: { nearestLine: 'Moon-DS' } } }
      };
      
      const rankingLine = extractRankingTableLine(preBugCity);
      const cityPageLine = extractCityPageLine(preBugCity);
      
      expect(rankingLine).toBe('Moon-DS');
      expect(cityPageLine).toBe('Venus-AC');
    });
  });
});

describe('Integration: All 12 Hindi Signs Translation', () => {
  
  it('all 12 Hindi signs translate correctly through lordship chain', () => {
    const allSigns = [
      ['Mesha', 'Aries', 'Mars'],
      ['Vrishabha', 'Taurus', 'Venus'],
      ['Mithuna', 'Gemini', 'Mercury'],
      ['Karka', 'Cancer', 'Moon'],
      ['Simha', 'Leo', 'Sun'],
      ['Kanya', 'Virgo', 'Mercury'],
      ['Tula', 'Libra', 'Venus'],
      ['Vrishchika', 'Scorpio', 'Mars'],
      ['Dhanu', 'Sagittarius', 'Jupiter'],
      ['Makara', 'Capricorn', 'Saturn'],
      ['Kumbha', 'Aquarius', 'Saturn'],
      ['Meena', 'Pisces', 'Jupiter']
    ];

    allSigns.forEach(([hindi, english, expectedLord]) => {
      expect(normalizeSign(hindi)).toBe(english);
      expect(getSignLord(hindi)).toBe(expectedLord);
      expect(getSignLord(hindi)).toBe(getSignLord(english));
    });
  });
});
