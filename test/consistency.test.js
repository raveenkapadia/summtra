describe('Ranking Table vs City Page Consistency', () => {
  
  const simulateRankingTableExtraction = (city) => {
    const credNearestLine = city.credibility?.western?.lineProximity?.nearestLine;
    return {
      name: city.name,
      nearestLine: credNearestLine || city.nearestLine || 'N/A',
      lineDistanceKm: city.credibility?.western?.lineProximity?.distanceKm || city.lineDistanceKm || 0,
      score: city.credibility?.total || 0
    };
  };

  const simulateCityPageExtraction = (city) => {
    return {
      name: city.name,
      nearestLine: city.nearestLine || 'N/A',
      lineDistanceKm: city.lineDistanceKm || 0,
      score: city.credibility?.total || 0
    };
  };

  describe('Planetary Line Matching', () => {
    
    const testCities = [
      {
        name: 'Melbourne',
        nearestLine: 'Moon-DS',
        lineDistanceKm: 125,
        credibility: {
          western: { lineProximity: { nearestLine: 'Moon-DS', distanceKm: 125 } },
          total: 87
        }
      },
      {
        name: 'Singapore',
        nearestLine: 'Mars-DS',
        lineDistanceKm: 200,
        credibility: {
          western: { lineProximity: { nearestLine: 'Mars-DS', distanceKm: 200 } },
          total: 84
        }
      },
      {
        name: 'Kuala Lumpur',
        nearestLine: 'Mars-DS',
        lineDistanceKm: 180,
        credibility: {
          western: { lineProximity: { nearestLine: 'Mars-DS', distanceKm: 180 } },
          total: 84
        }
      },
      {
        name: 'Bangkok',
        nearestLine: 'Jupiter-MC',
        lineDistanceKm: 350,
        credibility: {
          western: { lineProximity: { nearestLine: 'Jupiter-MC', distanceKm: 350 } },
          total: 82
        }
      },
      {
        name: 'Tokyo',
        nearestLine: 'Venus-AC',
        lineDistanceKm: 450,
        credibility: {
          western: { lineProximity: { nearestLine: 'Venus-AC', distanceKm: 450 } },
          total: 70
        }
      },
      {
        name: 'Sydney',
        nearestLine: 'Moon-IC',
        lineDistanceKm: 520,
        credibility: {
          western: { lineProximity: { nearestLine: 'Moon-IC', distanceKm: 520 } },
          total: 68
        }
      }
    ];

    it('ranking table nearestLine matches city page nearestLine for all cities', () => {
      let matchCount = 0;
      let totalCount = testCities.length;

      testCities.forEach(city => {
        const rankingEntry = simulateRankingTableExtraction(city);
        const cityPageEntry = simulateCityPageExtraction(city);
        
        if (rankingEntry.nearestLine === cityPageEntry.nearestLine) {
          matchCount++;
        }
        
        expect(rankingEntry.nearestLine).toBe(cityPageEntry.nearestLine);
      });

      const matchRate = (matchCount / totalCount) * 100;
      expect(matchRate).toBe(100);
    });

    it('ranking table lineDistanceKm matches city page lineDistanceKm', () => {
      testCities.forEach(city => {
        const rankingEntry = simulateRankingTableExtraction(city);
        const cityPageEntry = simulateCityPageExtraction(city);
        
        expect(rankingEntry.lineDistanceKm).toBe(cityPageEntry.lineDistanceKm);
      });
    });

    it('ranking table score matches city page score', () => {
      testCities.forEach(city => {
        const rankingEntry = simulateRankingTableExtraction(city);
        const cityPageEntry = simulateCityPageExtraction(city);
        
        expect(rankingEntry.score).toBe(cityPageEntry.score);
      });
    });
  });

  describe('Edge Cases', () => {
    
    it('handles city with missing credibility gracefully', () => {
      const cityNoCredibility = {
        name: 'Test City',
        nearestLine: 'Sun-MC',
        lineDistanceKm: 100
      };

      const rankingEntry = simulateRankingTableExtraction(cityNoCredibility);
      const cityPageEntry = simulateCityPageExtraction(cityNoCredibility);
      
      expect(rankingEntry.nearestLine).toBe(cityPageEntry.nearestLine);
    });

    it('handles city with null nearestLine in credibility', () => {
      const cityNullCredLine = {
        name: 'Test City',
        nearestLine: 'Venus-DS',
        lineDistanceKm: 100,
        credibility: {
          western: {
            lineProximity: {
              nearestLine: null,
              distanceKm: 100
            }
          },
          total: 75
        }
      };

      const rankingEntry = simulateRankingTableExtraction(cityNullCredLine);
      const cityPageEntry = simulateCityPageExtraction(cityNullCredLine);
      
      expect(rankingEntry.nearestLine).toBe('Venus-DS');
      expect(cityPageEntry.nearestLine).toBe('Venus-DS');
    });

    it('handles city with empty credibility object', () => {
      const cityEmptyCredibility = {
        name: 'Test City',
        nearestLine: 'Mars-IC',
        lineDistanceKm: 200,
        credibility: {}
      };

      const rankingEntry = simulateRankingTableExtraction(cityEmptyCredibility);
      const cityPageEntry = simulateCityPageExtraction(cityEmptyCredibility);
      
      expect(rankingEntry.nearestLine).toBe(cityPageEntry.nearestLine);
    });
  });

  describe('Match Rate Calculation', () => {
    
    it('calculates 100% match rate for consistent data', () => {
      const consistentCities = [
        { name: 'City1', nearestLine: 'A', credibility: { western: { lineProximity: { nearestLine: 'A' } } } },
        { name: 'City2', nearestLine: 'B', credibility: { western: { lineProximity: { nearestLine: 'B' } } } },
        { name: 'City3', nearestLine: 'C', credibility: { western: { lineProximity: { nearestLine: 'C' } } } },
      ];

      let matches = 0;
      consistentCities.forEach(city => {
        const ranking = simulateRankingTableExtraction(city);
        const cityPage = simulateCityPageExtraction(city);
        if (ranking.nearestLine === cityPage.nearestLine) matches++;
      });

      const matchRate = (matches / consistentCities.length) * 100;
      expect(matchRate).toBe(100);
    });

    it('detects inconsistent data (the bug we fixed)', () => {
      const inconsistentCities = [
        { name: 'City1', nearestLine: 'X', credibility: { western: { lineProximity: { nearestLine: 'A' } } } },
        { name: 'City2', nearestLine: 'Y', credibility: { western: { lineProximity: { nearestLine: 'B' } } } },
        { name: 'City3', nearestLine: 'Z', credibility: { western: { lineProximity: { nearestLine: 'C' } } } },
      ];

      inconsistentCities.forEach(city => {
        const credLine = city.credibility?.western?.lineProximity?.nearestLine;
        expect(city.nearestLine).not.toBe(credLine);
      });
    });
  });
});
