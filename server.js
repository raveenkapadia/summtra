// ============================================
// SUMMITRA - Astrocartography Report Generator
// Main Server File
// ============================================

const express = require('express');
const cors = require('cors');
const path = require('path');

// Load environment variables (Replit uses Secrets)
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Import services
const { generateReport } = require('./server/services/reportGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (your frontend)
app.use(express.static(path.join(__dirname)));
app.use('/icons', express.static(path.join(__dirname, 'icons')));

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Summitra API is running!',
    timestamp: new Date().toISOString(),
    env: {
      rapidApi: RAPIDAPI_KEY ? '✅ Set' : '❌ Missing',
      anthropic: ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing',
      resend: RESEND_API_KEY ? '✅ Set' : '❌ Missing'
    }
  });
});

// Generate Report Endpoint
app.post('/api/generate-report', async (req, res) => {
  try {
    const {
      // User details
      name,
      email,
      phone,
      
      // Birth details
      birthDate,      // "1990-05-15"
      birthTime,      // "14:30"
      birthCity,      // "Delhi"
      birthCountry,   // "India"
      latitude,       // 28.6139
      longitude,      // 77.2090
      timezone,       // "Asia/Kolkata"
      
      // Report options
      reportType,     // "india" | "international" | "combo"
    } = req.body;

    // Validate required fields
    if (!name || !email || !birthDate || !birthTime || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields. Need: name, email, birthDate, birthTime, latitude, longitude'
      });
    }

    console.log(`\n📍 New report request from: ${name} (${email})`);
    console.log(`   Report type: ${reportType}`);
    console.log(`   Birth: ${birthDate} ${birthTime} at ${birthCity}, ${birthCountry}`);

    // Generate the report
    const result = await generateReport({
      user: { name, email, phone },
      birth: {
        date: birthDate,
        time: birthTime,
        city: birthCity,
        country: birthCountry,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timezone: timezone || 'Asia/Kolkata'
      },
      reportType: reportType || 'india'
    });

    if (result.success) {
      res.json({
        success: true,
        message: 'Report generated and sent successfully!',
        reportId: result.reportId,
        emailSent: result.emailSent,
        timeTaken: result.timeTaken
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    console.error('❌ Report generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report. Please try again.'
    });
  }
});

// Get pricing info
app.get('/api/pricing', (req, res) => {
  res.json({
    india: {
      name: 'India Report',
      price: 999,
      currency: 'INR',
      pages: '50+',
      description: 'Top cities across India for all life areas'
    },
    international: {
      name: 'International Report',
      price: 999,
      currency: 'INR',
      pages: '50+',
      description: 'Top cities worldwide for all life areas'
    },
    combo: {
      name: 'India + International Combo',
      price: 1499,
      currency: 'INR',
      pages: '100+',
      description: 'Complete analysis of India and global cities'
    }
  });
});

// Test endpoint - just fetches astrology data without full report
app.post('/api/test-astrology', async (req, res) => {
  try {
    const { fetchAllAstrologyData } = require('./server/services/astrologyApi');
    
    const testBirth = {
      date: req.body.birthDate || '1990-05-15',
      time: req.body.birthTime || '14:30',
      latitude: parseFloat(req.body.latitude) || 28.6139,
      longitude: parseFloat(req.body.longitude) || 77.2090,
      timezone: req.body.timezone || 'Asia/Kolkata'
    };
    
    console.log('🧪 Testing astrology API with:', testBirth);
    
    const data = await fetchAllAstrologyData(testBirth, 'india');
    
    res.json({
      success: true,
      message: 'Astrology API test successful!',
      data: data
    });
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Catch-all: serve index.html for any other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   🧭 SUMMITRA - Astrocartography Report Generator         ║
  ║                                                           ║
  ║   Server running on port ${PORT}                            ║
  ║   API Health: http://localhost:${PORT}/api/health           ║
  ║                                                           ║
  ║   Environment:                                            ║
  ║   - RapidAPI Key: ${RAPIDAPI_KEY ? '✅ Set' : '❌ Missing'}                              ║
  ║   - Anthropic Key: ${ANTHROPIC_API_KEY ? '✅ Set' : '❌ Missing'}                             ║
  ║   - Resend Key: ${RESEND_API_KEY ? '✅ Set' : '❌ Missing'}                                ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
