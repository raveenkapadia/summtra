describe('Input Validation', () => {
  
  const validateDate = (dateStr) => {
    if (!dateStr) return { valid: false, error: 'Date is required' };
    
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { valid: false, error: 'Invalid date format' };
    
    const [year, month, day] = parts.map(Number);
    const date = new Date(year, month - 1, day);
    
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return { valid: false, error: 'Invalid date' };
    }
    
    const now = new Date();
    if (date > now) return { valid: false, error: 'Future dates not allowed' };
    if (year < 1900) return { valid: false, error: 'Date too old' };
    
    return { valid: true };
  };

  const validateTime = (timeStr) => {
    if (!timeStr) return { valid: false, error: 'Time is required' };
    
    const parts = timeStr.split(':');
    if (parts.length !== 2) return { valid: false, error: 'Invalid time format' };
    
    const [hours, minutes] = parts.map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return { valid: false, error: 'Invalid time' };
    if (hours < 0 || hours > 23) return { valid: false, error: 'Invalid hours' };
    if (minutes < 0 || minutes > 59) return { valid: false, error: 'Invalid minutes' };
    
    return { valid: true };
  };

  const validateName = (name) => {
    if (!name || name.trim() === '') return { valid: true, value: 'User' };
    const trimmed = name.trim().substring(0, 100);
    return { valid: true, value: trimmed };
  };

  const validateCoordinates = (lat, lng) => {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    
    if (isNaN(latitude) || isNaN(longitude)) {
      return { valid: false, error: 'Invalid coordinates' };
    }
    if (latitude < -90 || latitude > 90) {
      return { valid: false, error: 'Latitude must be between -90 and 90' };
    }
    if (longitude < -180 || longitude > 180) {
      return { valid: false, error: 'Longitude must be between -180 and 180' };
    }
    
    return { valid: true, latitude, longitude };
  };

  describe('Date Validation', () => {
    test('rejects future dates', () => {
      const result = validateDate('2030-06-15');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Future');
    });

    test('rejects invalid date format', () => {
      const result = validateDate('15-06-1990');
      expect(result.valid).toBe(false);
    });

    test('rejects impossible dates (Feb 30)', () => {
      const result = validateDate('1990-02-30');
      expect(result.valid).toBe(false);
    });

    test('accepts valid historical dates (1950-2025)', () => {
      expect(validateDate('1950-01-01').valid).toBe(true);
      expect(validateDate('1990-06-15').valid).toBe(true);
      expect(validateDate('2020-12-31').valid).toBe(true);
    });

    test('handles Y2K dates correctly', () => {
      expect(validateDate('2000-01-01').valid).toBe(true);
      expect(validateDate('1999-12-31').valid).toBe(true);
    });

    test('rejects dates before 1900', () => {
      const result = validateDate('1899-12-31');
      expect(result.valid).toBe(false);
    });
  });

  describe('Time Validation', () => {
    test('accepts 00:00 (midnight)', () => {
      expect(validateTime('00:00').valid).toBe(true);
    });

    test('accepts 12:00 (noon)', () => {
      expect(validateTime('12:00').valid).toBe(true);
    });

    test('accepts 23:59', () => {
      expect(validateTime('23:59').valid).toBe(true);
    });

    test('rejects 24:00', () => {
      expect(validateTime('24:00').valid).toBe(false);
    });

    test('rejects 25:00', () => {
      expect(validateTime('25:00').valid).toBe(false);
    });

    test('rejects negative hours', () => {
      expect(validateTime('-1:00').valid).toBe(false);
    });

    test('rejects invalid minutes', () => {
      expect(validateTime('12:60').valid).toBe(false);
    });
  });

  describe('Name Validation', () => {
    test('accepts normal names', () => {
      const result = validateName('John Doe');
      expect(result.valid).toBe(true);
      expect(result.value).toBe('John Doe');
    });

    test('handles names with special characters', () => {
      const result = validateName("O'Brien-Smith");
      expect(result.valid).toBe(true);
      expect(result.value).toBe("O'Brien-Smith");
    });

    test('handles very long names (truncates gracefully)', () => {
      const longName = 'A'.repeat(200);
      const result = validateName(longName);
      expect(result.valid).toBe(true);
      expect(result.value.length).toBeLessThanOrEqual(100);
    });

    test('handles empty name (uses default)', () => {
      expect(validateName('').value).toBe('User');
      expect(validateName(null).value).toBe('User');
      expect(validateName(undefined).value).toBe('User');
    });

    test('trims whitespace from names', () => {
      const result = validateName('  John Doe  ');
      expect(result.value).toBe('John Doe');
    });
  });

  describe('Location Validation', () => {
    test('accepts valid Indian city coordinates', () => {
      const mumbai = validateCoordinates(19.076, 72.8777);
      expect(mumbai.valid).toBe(true);
      expect(mumbai.latitude).toBeCloseTo(19.076);
      expect(mumbai.longitude).toBeCloseTo(72.8777);
    });

    test('accepts valid international coordinates', () => {
      const sydney = validateCoordinates(-33.8688, 151.2093);
      expect(sydney.valid).toBe(true);
      expect(sydney.latitude).toBeCloseTo(-33.8688);
    });

    test('accepts coordinates at extreme latitudes', () => {
      expect(validateCoordinates(90, 0).valid).toBe(true);
      expect(validateCoordinates(-90, 0).valid).toBe(true);
    });

    test('rejects latitude outside -90 to 90', () => {
      expect(validateCoordinates(91, 0).valid).toBe(false);
      expect(validateCoordinates(-91, 0).valid).toBe(false);
    });

    test('rejects longitude outside -180 to 180', () => {
      expect(validateCoordinates(0, 181).valid).toBe(false);
      expect(validateCoordinates(0, -181).valid).toBe(false);
    });

    test('handles string coordinates', () => {
      const result = validateCoordinates('28.6139', '77.2090');
      expect(result.valid).toBe(true);
    });

    test('rejects non-numeric coordinates', () => {
      expect(validateCoordinates('abc', 'xyz').valid).toBe(false);
    });
  });

});
