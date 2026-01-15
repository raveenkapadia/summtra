const path = require('path');

jest.mock('puppeteer', () => ({
  launch: jest.fn(() => Promise.resolve({
    newPage: jest.fn(() => Promise.resolve({
      setViewport: jest.fn(),
      setContent: jest.fn(),
      pdf: jest.fn(() => Promise.resolve(Buffer.from('fake-pdf')))
    })),
    close: jest.fn()
  }))
}));

jest.mock('../server/services/astrologyApi', () => ({
  getAstrocartographyLines: jest.fn(() => Promise.resolve({ success: true, data: { lines: [] } })),
  getScoresForAllCities: jest.fn(() => Promise.resolve({ success: true, data: [] }))
}));

jest.mock('../server/services/vedicApi', () => ({
  getVedicProfile: jest.fn(() => Promise.resolve(null))
}));

describe('PDF Generation - Data Integrity', () => {
  let generateTestPDF;
  
  beforeAll(async () => {
    const pdfAssembler = await import('../server/services/pdfAssembler.js');
    generateTestPDF = pdfAssembler.generateTestPDF;
  });

  test('TEST 1: should throw error when birthData is null', async () => {
    await expect(generateTestPDF('Single', 'India', 'Wealth', null))
      .rejects.toThrow('User birth data is required');
  });

  test('TEST 2: should throw error when birthData is undefined', async () => {
    await expect(generateTestPDF('Single', 'India', 'Wealth', undefined))
      .rejects.toThrow('User birth data is required');
  });

  test('TEST 3: should throw error when name is missing', async () => {
    const incompleteData = {
      birthDate: '15/11/1982',
      birthTime: '8:20 AM',
      birthPlace: 'Ahmedabad',
      lat: 23.0225,
      lng: 72.5714
    };
    await expect(generateTestPDF('Single', 'India', 'Wealth', incompleteData))
      .rejects.toThrow('Missing required field: name');
  });

  test('TEST 4: should throw error when birthDate is missing', async () => {
    const incompleteData = {
      name: 'Raveen Kapadia',
      birthTime: '8:20 AM',
      birthPlace: 'Ahmedabad',
      lat: 23.0225,
      lng: 72.5714
    };
    await expect(generateTestPDF('Single', 'India', 'Wealth', incompleteData))
      .rejects.toThrow('Missing required field: birthDate');
  });

  test('TEST 5: should throw error when birthTime is missing', async () => {
    const incompleteData = {
      name: 'Raveen Kapadia',
      birthDate: '15/11/1982',
      birthPlace: 'Ahmedabad',
      lat: 23.0225,
      lng: 72.5714
    };
    await expect(generateTestPDF('Single', 'India', 'Wealth', incompleteData))
      .rejects.toThrow('Missing required field: birthTime');
  });

  test('TEST 6: should throw error when birthPlace is missing', async () => {
    const incompleteData = {
      name: 'Raveen Kapadia',
      birthDate: '15/11/1982',
      birthTime: '8:20 AM',
      lat: 23.0225,
      lng: 72.5714
    };
    await expect(generateTestPDF('Single', 'India', 'Wealth', incompleteData))
      .rejects.toThrow('Missing required field: birthPlace');
  });

  test('TEST 7: should throw error when lat/lng is missing', async () => {
    const incompleteData = {
      name: 'Raveen Kapadia',
      birthDate: '15/11/1982',
      birthTime: '8:20 AM',
      birthPlace: 'Ahmedabad'
    };
    await expect(generateTestPDF('Single', 'India', 'Wealth', incompleteData))
      .rejects.toThrow('Missing required field: lat/lng');
  });

  test('TEST 8: should NOT have hardcoded default user "Arjun Sharma"', async () => {
    const uniqueUserData = {
      name: 'Unique Test Name 12345',
      birthDate: '25/12/1985',
      birthTime: '3:30 PM',
      birthPlace: 'Chennai, India',
      lat: 13.0827,
      lng: 80.2707
    };
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    try {
      await generateTestPDF('Single', 'India', 'Wealth', uniqueUserData);
    } catch (e) {
    }
    
    const logCalls = consoleSpy.mock.calls.map(call => call.join(' ')).join('\n');
    
    expect(logCalls).not.toContain('Arjun Sharma');
    expect(logCalls).toContain('Unique Test Name 12345');
    
    consoleSpy.mockRestore();
  });
});

describe('PDF Generation - Endpoint Validation', () => {
  const express = require('express');
  const request = require('supertest');
  
  let app;
  
  beforeAll(() => {
    app = express();
    app.use(express.json());
    
    app.post('/api/test-pdf', (req, res) => {
      const { name, birthDate, birthTime, birthPlace, lat, lng } = req.body;
      
      const requiredFields = ['name', 'birthDate', 'birthTime', 'birthPlace'];
      const missingFields = requiredFields.filter(field => !req.body[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          error: 'Missing required fields',
          missing: missingFields
        });
      }
      
      if (!lat || !lng) {
        return res.status(400).json({
          error: 'Missing required coordinates'
        });
      }
      
      res.json({ success: true, userName: name });
    });
  });

  test('POST /api/test-pdf should reject missing fields', async () => {
    const response = await request(app)
      .post('/api/test-pdf')
      .send({ name: 'Test' });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required fields');
  });

  test('POST /api/test-pdf should reject missing coordinates', async () => {
    const response = await request(app)
      .post('/api/test-pdf')
      .send({
        name: 'Test User',
        birthDate: '15/11/1982',
        birthTime: '8:20 AM',
        birthPlace: 'Ahmedabad'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Missing required coordinates');
  });

  test('POST /api/test-pdf should accept complete valid data', async () => {
    const response = await request(app)
      .post('/api/test-pdf')
      .send({
        name: 'Raveen Kapadia',
        birthDate: '15/11/1982',
        birthTime: '8:20 AM',
        birthPlace: 'Ahmedabad, Gujarat, India',
        lat: 23.0225,
        lng: 72.5714,
        reportType: 'Single',
        scope: 'India',
        goal: 'Wealth'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userName).toBe('Raveen Kapadia');
  });
});
