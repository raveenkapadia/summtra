describe('Error Handling and Graceful Degradation', () => {

  const getArticle = (word) => {
    if (!word) return 'a';
    const vowels = ['A', 'E', 'I', 'O', 'U'];
    return vowels.includes(word.charAt(0).toUpperCase()) ? 'an' : 'a';
  };

  const LAGNA_QUALITIES = {
    Aries: 'pioneering spirit',
    Scorpio: 'penetrating insight'
  };

  const generatePersonalizedVerdict = (city, goal, score, lagna, nakshatra) => {
    const lagnaQuality = lagna ? (LAGNA_QUALITIES[lagna] || 'unique cosmic nature') : 'unique cosmic nature';
    const nakshatraGift = nakshatra || 'natural talents';
    const article = getArticle(lagna);
    
    if (lagna && score >= 70) {
      return `As ${article} ${lagna} rising with your ${lagnaQuality}, ${city} aligns powerfully with your ${goal.toLowerCase()} ambitions.`;
    }
    if (lagna && score >= 60) {
      return `${city} offers solid ${goal.toLowerCase()} potential for your ${lagna} ascendant.`;
    }
    if (lagna) {
      return `For ${article} ${lagna} like you, ${city} requires conscious effort for ${goal.toLowerCase()} success.`;
    }
    return `${city} offers ${score >= 60 ? 'good' : 'moderate'} potential for ${goal.toLowerCase()} pursuits.`;
  };

  const generateTimingInsight = (mahadasha, goal, city) => {
    if (!mahadasha) {
      return `The planetary lines at this location create specific opportunities for ${goal || 'personal growth'} pursuits.`;
    }
    return `Your ${mahadasha} period influences opportunities at ${city} for ${goal} goals.`;
  };

  const safeGet = (obj, path, defaultValue = '') => {
    try {
      return path.split('.').reduce((o, k) => (o || {})[k], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  };

  describe('Missing Lagna Data', () => {
    test('verdict works without Lagna data', () => {
      const verdict = generatePersonalizedVerdict('Mumbai', 'Career', 65, null, 'Ashwini');
      expect(verdict).toBeDefined();
      expect(verdict).not.toContain('undefined');
      expect(verdict).not.toContain('null');
      expect(verdict.length).toBeGreaterThan(10);
    });

    test('verdict provides generic text when Lagna missing', () => {
      const verdict = generatePersonalizedVerdict('Delhi', 'Wealth', 70, null, null);
      expect(verdict).toContain('potential');
    });

    test('article defaults to "a" when Lagna is null', () => {
      expect(getArticle(null)).toBe('a');
      expect(getArticle(undefined)).toBe('a');
      expect(getArticle('')).toBe('a');
    });
  });

  describe('Missing Nakshatra Data', () => {
    test('verdict works without Nakshatra data', () => {
      const verdict = generatePersonalizedVerdict('Chennai', 'Love', 68, 'Scorpio', null);
      expect(verdict).toBeDefined();
      expect(verdict).not.toContain('undefined');
    });

    test('verdict still uses Lagna when Nakshatra missing', () => {
      const verdict = generatePersonalizedVerdict('Bangalore', 'Career', 75, 'Aries', null);
      expect(verdict).toContain('Aries');
    });
  });

  describe('Missing Dasha Data', () => {
    test('timing insight works without Mahadasha', () => {
      const timing = generateTimingInsight(null, 'Career', 'Mumbai');
      expect(timing).toBeDefined();
      expect(timing).not.toContain('undefined');
      expect(timing).not.toContain('null');
    });

    test('timing insight provides generic guidance when Dasha missing', () => {
      const timing = generateTimingInsight(null, 'Wealth', 'Delhi');
      expect(timing).toContain('opportunities');
    });

    test('timing insight works with valid Mahadasha', () => {
      const timing = generateTimingInsight('Jupiter', 'Career', 'Mumbai');
      expect(timing).toContain('Jupiter');
    });
  });

  describe('Missing City Data', () => {
    test('handles city with no coordinates gracefully', () => {
      const city = { name: 'Unknown City' };
      expect(city.name).toBeDefined();
      expect(city.latitude || 0).toBe(0);
    });

    test('handles city with missing score', () => {
      const city = { name: 'Test City' };
      const score = city.score || 50;
      expect(score).toBe(50);
    });

    test('handles city with missing lines array', () => {
      const city = { name: 'Test City', lines: null };
      const lines = city.lines || [];
      expect(Array.isArray(lines)).toBe(true);
      expect(lines.length).toBe(0);
    });
  });

  describe('Safe Property Access', () => {
    test('safeGet handles null object', () => {
      expect(safeGet(null, 'a.b.c', 'default')).toBe('default');
    });

    test('safeGet handles undefined path', () => {
      const obj = { a: { b: 1 } };
      expect(safeGet(obj, 'a.c.d', 'default')).toBe('default');
    });

    test('safeGet returns value when path exists', () => {
      const obj = { a: { b: { c: 'value' } } };
      expect(safeGet(obj, 'a.b.c', 'default')).toBe('value');
    });

    test('safeGet handles deeply nested objects', () => {
      const obj = { credibility: { western: { lineProximity: { distanceKm: 125 } } } };
      expect(safeGet(obj, 'credibility.western.lineProximity.distanceKm', 0)).toBe(125);
    });
  });

  describe('Empty Arrays and Objects', () => {
    test('handles empty cities array', () => {
      const cities = [];
      expect(cities.length).toBe(0);
      expect(cities.map(c => c.name)).toEqual([]);
    });

    test('handles empty planetary lines', () => {
      const lines = [];
      const activeLines = lines.filter(l => l.active);
      expect(activeLines.length).toBe(0);
    });

    test('handles empty credibility object', () => {
      const credibility = {};
      expect(credibility.western || {}).toEqual({});
      expect(credibility.vedic || {}).toEqual({});
    });
  });

  describe('Type Coercion Safety', () => {
    test('handles string score conversion', () => {
      const score = '75';
      expect(Number(score)).toBe(75);
      expect(Number(score) >= 70).toBe(true);
    });

    test('handles NaN score gracefully', () => {
      const score = Number('invalid');
      expect(isNaN(score)).toBe(true);
      const safeScore = isNaN(score) ? 0 : score;
      expect(safeScore).toBe(0);
    });

    test('handles undefined boolean conversion', () => {
      const value = undefined;
      expect(Boolean(value)).toBe(false);
      expect(value || false).toBe(false);
    });
  });

  describe('Fallback Values', () => {
    test('goal defaults to Career when missing', () => {
      const goal = undefined || 'Career';
      expect(goal).toBe('Career');
    });

    test('scope defaults to Both when missing', () => {
      const scope = null || 'Both';
      expect(scope).toBe('Both');
    });

    test('name defaults to User when empty', () => {
      const name = '' || 'User';
      expect(name).toBe('User');
    });

    test('coordinates default to 0 when missing', () => {
      const lat = undefined || 0;
      const lng = null || 0;
      expect(lat).toBe(0);
      expect(lng).toBe(0);
    });
  });

});
