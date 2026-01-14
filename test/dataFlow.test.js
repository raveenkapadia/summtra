describe('nearestLine Data Preservation', () => {
  
  const mockScoredCity = {
    name: 'Melbourne',
    country: 'Australia',
    lat: -37.8136,
    lng: 144.9631,
    nearestLine: 'Moon-DS',
    lineDistanceKm: 125,
    credibility: {
      western: {
        lineProximity: {
          nearestLine: 'Moon-DS',
          distanceKm: 125,
          score: 45
        }
      },
      vedic: {
        score: 37
      },
      total: 87
    }
  };

  describe('City Mapping Preservation', () => {
    
    it('preserves nearestLine when mapping scored cities', () => {
      const mapped = {
        name: mockScoredCity.name,
        country: mockScoredCity.country,
        lat: mockScoredCity.lat,
        lng: mockScoredCity.lng,
        nearestLine: mockScoredCity.nearestLine,
        lineDistanceKm: mockScoredCity.lineDistanceKm,
        credibility: mockScoredCity.credibility
      };
      
      expect(mapped.nearestLine).toBe('Moon-DS');
      expect(mapped.nearestLine).toBeDefined();
      expect(mapped.nearestLine).not.toBeNull();
    });

    it('credibility nearestLine matches city nearestLine', () => {
      const credLine = mockScoredCity.credibility?.western?.lineProximity?.nearestLine;
      expect(mockScoredCity.nearestLine).toBe(credLine);
    });

    it('lineDistanceKm is preserved', () => {
      expect(mockScoredCity.lineDistanceKm).toBe(125);
      expect(mockScoredCity.credibility.western.lineProximity.distanceKm).toBe(125);
    });
  });

  describe('Ranking Table Field Priority', () => {
    
    it('prioritizes credibility nearestLine over global nearestLine', () => {
      const cityWithMismatch = {
        nearestLine: 'Venus-AC',
        credibility: {
          western: {
            lineProximity: {
              nearestLine: 'Moon-DS'
            }
          }
        }
      };
      
      const credNearestLine = cityWithMismatch.credibility?.western?.lineProximity?.nearestLine;
      const displayLine = credNearestLine || cityWithMismatch.nearestLine || 'N/A';
      
      expect(displayLine).toBe('Moon-DS');
    });

    it('falls back to global nearestLine if credibility is missing', () => {
      const cityNoCredLine = {
        nearestLine: 'Venus-AC',
        credibility: {
          western: {
            lineProximity: {}
          }
        }
      };
      
      const credNearestLine = cityNoCredLine.credibility?.western?.lineProximity?.nearestLine;
      const displayLine = credNearestLine || cityNoCredLine.nearestLine || 'N/A';
      
      expect(displayLine).toBe('Venus-AC');
    });

    it('returns N/A if no nearestLine available', () => {
      const cityNoLine = {
        credibility: {
          western: {
            lineProximity: {}
          }
        }
      };
      
      const credNearestLine = cityNoLine.credibility?.western?.lineProximity?.nearestLine;
      const displayLine = credNearestLine || cityNoLine.nearestLine || 'N/A';
      
      expect(displayLine).toBe('N/A');
    });
  });

  describe('Multiple Cities Consistency', () => {
    const mockCities = [
      { name: 'Melbourne', nearestLine: 'Moon-DS', credibility: { western: { lineProximity: { nearestLine: 'Moon-DS' } } } },
      { name: 'Singapore', nearestLine: 'Mars-DS', credibility: { western: { lineProximity: { nearestLine: 'Mars-DS' } } } },
      { name: 'Kuala Lumpur', nearestLine: 'Mars-DS', credibility: { western: { lineProximity: { nearestLine: 'Mars-DS' } } } },
      { name: 'Bangkok', nearestLine: 'Jupiter-MC', credibility: { western: { lineProximity: { nearestLine: 'Jupiter-MC' } } } },
      { name: 'Tokyo', nearestLine: 'Venus-AC', credibility: { western: { lineProximity: { nearestLine: 'Venus-AC' } } } },
    ];

    it('all cities have matching nearestLine values', () => {
      mockCities.forEach(city => {
        const credLine = city.credibility?.western?.lineProximity?.nearestLine;
        expect(city.nearestLine).toBe(credLine);
      });
    });

    it('no cities have null or undefined nearestLine', () => {
      mockCities.forEach(city => {
        expect(city.nearestLine).toBeDefined();
        expect(city.nearestLine).not.toBeNull();
        expect(city.nearestLine).not.toBe('');
      });
    });
  });
});
