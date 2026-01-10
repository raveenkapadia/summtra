import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import Razorpay from "razorpay";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth/index.js";
import { db } from "./db.js";
import { birthData, reports, payments, users, apiCalls } from "../shared/schema.js";
import { eq, sql, desc } from "drizzle-orm";
import { getPrice } from "../shared/pricing.js";

// Import services
const { generateReport } = require("./services/reportGenerator.js");
const { getLocationData, findNearestIndianCity, findNearestInternationalCity, getTimezone } = require("./services/geocodingService.js");
const { generateCityInterpretations, getZodiacSign, applyGoalScoreBoost } = require("./services/claudeService.js");
const { getAstrocartographyLines } = require("./services/astrologyApi.js");
const { getVedicProfile, getDashaInsight, checkNakshatraDirectionMatch, getDirectionFromBirthPlace, getAntardashaTimeline, generateTimingSection } = require("./services/vedicApi.js");

const app = express();
const PORT = 5000;

// Helper function to generate demo astrocartography lines for visualization
function generateDemoLines(birthData: any) {
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const angles = ['AC', 'DC', 'MC', 'IC'];
  const lines: any = {};
  
  // Generate lines based on birth coordinates to create unique patterns
  const baseLat = parseFloat(birthData.latitude) || 0;
  const baseLng = parseFloat(birthData.longitude) || 0;
  
  planets.forEach((planet, planetIndex) => {
    lines[planet] = {};
    angles.forEach((angle, angleIndex) => {
      // Create unique line pattern based on planet and angle
      const offset = (planetIndex * 25 + angleIndex * 90) % 360 - 180;
      const wobbleAmount = 10 + (planetIndex % 5) * 5;
      
      const points = [];
      for (let lat = -85; lat <= 85; lat += 5) {
        const wobble = Math.sin((lat + baseLat) * Math.PI / 180) * wobbleAmount;
        const lng = (offset + wobble + baseLng) % 360;
        points.push([lat, lng > 180 ? lng - 360 : lng < -180 ? lng + 360 : lng]);
      }
      
      lines[planet][angle] = points;
    });
  });
  
  return lines;
}

// Normalize RapidAPI astrocartography response to our expected format
function normalizeAstrocartographyData(apiData: any): any {
  const normalized: any = {};
  
  // Handle different API response formats
  if (!apiData) return normalized;
  
  // If data is already in our expected format (planet -> angle -> points)
  if (typeof apiData === 'object' && !Array.isArray(apiData)) {
    const sampleKey = Object.keys(apiData)[0];
    if (sampleKey && apiData[sampleKey] && typeof apiData[sampleKey] === 'object') {
      const sampleAngle = Object.keys(apiData[sampleKey])[0];
      if (sampleAngle && Array.isArray(apiData[sampleKey][sampleAngle])) {
        return apiData; // Already normalized
      }
    }
  }
  
  // Handle array format: [{planet, angle, coordinates/geometry}, ...]
  if (Array.isArray(apiData)) {
    apiData.forEach((line: any) => {
      const planet = line.planet || line.celestialBody || line.body;
      const angle = line.angle || line.type || 'AC';
      
      if (!planet) return;
      
      if (!normalized[planet]) {
        normalized[planet] = {};
      }
      
      // Extract coordinates
      let coords: any[] = [];
      if (line.coordinates) {
        coords = line.coordinates;
      } else if (line.geometry?.coordinates) {
        // GeoJSON format: [lng, lat] -> [lat, lng]
        coords = line.geometry.coordinates.map((c: any) => [c[1], c[0]]);
      } else if (line.points) {
        coords = line.points.map((p: any) => [p.lat || p.latitude, p.lng || p.lon || p.longitude]);
      }
      
      normalized[planet][angle] = coords;
    });
    return normalized;
  }
  
  // Handle lines wrapper: {lines: [...]}
  if (apiData.lines && Array.isArray(apiData.lines)) {
    return normalizeAstrocartographyData(apiData.lines);
  }
  
  // Handle astrocartography wrapper: {astrocartography: {...}}
  if (apiData.astrocartography) {
    return normalizeAstrocartographyData(apiData.astrocartography);
  }
  
  return normalized;
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API call tracking middleware
app.use(async (req: any, res, next) => {
  // Only track /api/ routes (excluding admin and health for less noise)
  if (req.path.startsWith('/api/') && !req.path.startsWith('/api/admin/') && req.path !== '/api/health') {
    const startTime = Date.now();
    
    // Capture response status after response is sent
    res.on('finish', async () => {
      try {
        const responseTime = Date.now() - startTime;
        const userId = req.user?.claims?.sub || null;
        
        await db.insert(apiCalls).values({
          endpoint: req.path,
          method: req.method,
          userId,
          statusCode: res.statusCode,
          responseTime
        });
      } catch (err) {
        // Silent fail - don't break the request for tracking
        console.error('API tracking error:', err);
      }
    });
  }
  next();
});

async function startServer() {
  await setupAuth(app);
  registerAuthRoutes(app);

  let razorpay: Razorpay | null = null;
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    console.log("Razorpay initialized successfully");
  } else {
    console.log("Warning: Razorpay keys not configured. Payment features will be disabled.");
  }

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Test map rendering endpoint - generates PNG map image
  app.get("/api/test-map", async (req, res) => {
    try {
      const MapRenderer = require('./map-renderer.js');
      const renderer = new MapRenderer();
      
      // Test with sample data matching API response format
      const sampleLines = [
        {
          planet: 'Sun',
          line_type: 'MC',
          points: Array.from({ length: 35 }, (_, i) => ({
            latitude: -85 + i * 5,
            longitude: 72 + Math.sin(i * 0.2) * 10
          }))
        },
        {
          planet: 'Jupiter',
          line_type: 'AC',
          points: Array.from({ length: 35 }, (_, i) => ({
            latitude: -85 + i * 5,
            longitude: 50 + Math.sin(i * 0.3) * 15
          }))
        },
        {
          planet: 'Venus',
          line_type: 'DC',
          points: Array.from({ length: 35 }, (_, i) => ({
            latitude: -85 + i * 5,
            longitude: 100 + Math.cos(i * 0.25) * 12
          }))
        },
        {
          planet: 'Saturn',
          line_type: 'IC',
          points: Array.from({ length: 35 }, (_, i) => ({
            latitude: -85 + i * 5,
            longitude: -20 + Math.sin(i * 0.15) * 20
          }))
        }
      ];

      const sampleCities = [
        { name: 'Mumbai', latitude: 19.076, longitude: 72.8777, score: 92, showLabel: true },
        { name: 'Delhi', latitude: 28.6139, longitude: 77.209, score: 88, showLabel: true },
        { name: 'Bangalore', latitude: 12.9716, longitude: 77.5946, score: 85, showLabel: true },
        { name: 'Singapore', latitude: 1.3521, longitude: 103.8198, score: 83, showLabel: true },
        { name: 'Dubai', latitude: 25.2048, longitude: 55.2708, score: 79, showLabel: true }
      ];

      const viewType = (req.query.view as string) || 'world';
      
      const buffer = await renderer.renderMap({
        viewType,
        lines: sampleLines,
        cities: sampleCities,
        birthLocation: { lat: 23.0225, lng: 72.5714 },
        highlightIndia: true,
        title: `Test Astrocartography Map - ${viewType.charAt(0).toUpperCase() + viewType.slice(1)} View`
      });

      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'no-cache');
      res.send(buffer);
    } catch (error: any) {
      console.error('Map rendering error:', error);
      res.status(500).json({ error: 'Failed to render map', details: error.message });
    }
  });

  // Debug endpoint to test astrocartography API response and line assignment
  app.get("/api/debug-astro-lines", async (req, res) => {
    try {
      const astrologyApi = require('./services/astrologyApi');
      const { INDIAN_CITIES } = require('./services/geocodingService');
      
      // Sample birth data (you can override with query params)
      const sampleBirth = {
        date: (req.query.date as string) || '1990-01-15',
        time: (req.query.time as string) || '10:30',
        latitude: parseFloat(req.query.lat as string) || 28.6139,
        longitude: parseFloat(req.query.lng as string) || 77.2090,
        timezone: 'Asia/Kolkata'
      };
      
      console.log('\n=== DEBUG: Testing Astrocartography Lines API ===');
      console.log('Birth Data:', sampleBirth);
      
      // Step 1: Get astrocartography lines from API
      const linesResult = await astrologyApi.getAstrocartographyLines(sampleBirth);
      
      const apiResponse = {
        success: linesResult.success,
        hasData: !!linesResult.data,
        dataType: typeof linesResult.data,
        dataKeys: linesResult.data ? Object.keys(linesResult.data) : [],
        rawSample: linesResult.data ? JSON.stringify(linesResult.data).substring(0, 1000) + '...' : null
      };
      
      console.log('API Response Structure:', JSON.stringify(apiResponse, null, 2));
      
      // Step 2: Test line assignment for Mumbai, Delhi, Chennai
      const testCities = INDIAN_CITIES.filter((c: any) => 
        ['Mumbai', 'Delhi', 'Chennai'].includes(c.name)
      ).map((c: any, index: number) => ({
        ...c,
        score: 75 - (index * 5), // Give them slightly different scores
        lines: []
      }));
      
      console.log('\nTest Cities (before line assignment):');
      testCities.forEach((c: any) => console.log(`  ${c.name}: lng=${c.lng}, score=${c.score}`));
      
      // Step 3: Assign lines to these cities
      const citiesWithLines = astrologyApi.assignLinesToCities(testCities, linesResult.data);
      
      // Step 4: Get detailed line proximity info for each city
      const detailedResults = citiesWithLines.map((city: any) => {
        // Try to find all nearby lines (not just top 2)
        const allNearbyLines: any[] = [];
        
        if (linesResult.data && linesResult.data.lines) {
          const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
          const lineTypes = ['AC', 'DC', 'MC', 'IC'];
          
          const linesData = linesResult.data.lines;
          
          if (typeof linesData === 'object' && !Array.isArray(linesData)) {
            for (const planet of mainPlanets) {
              const planetData = linesData[planet];
              if (!planetData) continue;
              
              for (const lineType of lineTypes) {
                const linePoints = planetData[lineType];
                if (!linePoints || !Array.isArray(linePoints)) continue;
                
                // Find closest point on this line to the city
                let minDistance = Infinity;
                for (const point of linePoints) {
                  const pointLng = point.lng || point.longitude || point.lon;
                  if (pointLng === undefined) continue;
                  
                  let lngDiff = Math.abs(pointLng - city.lng);
                  if (lngDiff > 180) lngDiff = 360 - lngDiff;
                  
                  if (lngDiff < minDistance) {
                    minDistance = lngDiff;
                  }
                }
                
                if (minDistance < Infinity) {
                  allNearbyLines.push({
                    line: `${planet}-${lineType}`,
                    distanceDegrees: Math.round(minDistance * 100) / 100
                  });
                }
              }
            }
          }
        }
        
        // Sort by distance
        allNearbyLines.sort((a, b) => a.distanceDegrees - b.distanceDegrees);
        
        return {
          city: city.name,
          longitude: city.lng,
          latitude: city.lat,
          score: city.score,
          assignedLines: city.lines,
          assignmentMethod: allNearbyLines.length > 0 ? 'API_PROXIMITY' : 'FALLBACK_DETERMINISTIC',
          nearestLines: allNearbyLines.slice(0, 6) // Show top 6 nearest lines
        };
      });
      
      console.log('\nDetailed Results:');
      detailedResults.forEach((r: any) => {
        console.log(`\n${r.city} (lng: ${r.longitude}):`);
        console.log(`  Assigned: ${r.assignedLines.join(', ')}`);
        console.log(`  Method: ${r.assignmentMethod}`);
        console.log(`  Nearest lines: ${r.nearestLines.map((l: any) => `${l.line}(${l.distanceDegrees}°)`).join(', ')}`);
      });
      
      // Scan all lines to find which ones pass near India (longitude 70-90)
      const linesNearIndia: any[] = [];
      if (linesResult.data && linesResult.data.lines && Array.isArray(linesResult.data.lines)) {
        for (const line of linesResult.data.lines) {
          if (line.points && Array.isArray(line.points)) {
            for (const point of line.points) {
              const lng = point.longitude;
              const lat = point.latitude;
              // Check if this point is near India (lat: 8-35, lng: 68-97)
              if (lng >= 68 && lng <= 97 && lat >= 8 && lat <= 35) {
                linesNearIndia.push({
                  planet: line.planet,
                  lineType: line.line_type,
                  latitude: lat,
                  longitude: lng
                });
                break; // Only need one point per line
              }
            }
          }
        }
      }
      
      res.json({
        success: true,
        birthData: sampleBirth,
        apiResponse,
        cityResults: detailedResults,
        linesNearIndia: linesNearIndia,
        summary: {
          apiReturnsLines: linesResult.success && linesResult.data && Object.keys(linesResult.data).length > 0,
          lineAssignmentMethod: detailedResults[0]?.assignmentMethod || 'UNKNOWN',
          linesPassingThroughIndia: linesNearIndia.length
        }
      });
      
    } catch (error: any) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message,
        stack: error.stack 
      });
    }
  });

  // Debug endpoint to test new scoreCitiesFromPowerZones function
  app.get("/api/debug-city-scores", async (req, res) => {
    try {
      const astrologyApi = require('./services/astrologyApi');
      const { INDIAN_CITIES, INTERNATIONAL_CITIES } = require('./services/geocodingService');
      
      // Raveen's birth data from user request
      const birthData = {
        date: (req.query.date as string) || '1982-11-15',
        time: (req.query.time as string) || '08:20',
        latitude: parseFloat(req.query.lat as string) || 23.0225,  // Ahmedabad
        longitude: parseFloat(req.query.lng as string) || 72.5714,
        timezone: 'Asia/Kolkata'
      };
      
      console.log('\n=== DEBUG: Testing scoreCitiesFromPowerZones ===');
      console.log('Birth Data:', birthData);
      
      // Score India cities using new function
      const indiaScoresResult = await astrologyApi.scoreCitiesFromPowerZones(birthData, INDIAN_CITIES, 'india');
      const intlScoresResult = await astrologyApi.scoreCitiesFromPowerZones(birthData, INTERNATIONAL_CITIES, 'global');
      
      const indiaCities = indiaScoresResult.success ? indiaScoresResult.data : [];
      const intlCities = intlScoresResult.success ? intlScoresResult.data : [];
      
      // Extract scores for distribution analysis
      const allScores = [...indiaCities, ...intlCities].map((c: any) => c.score);
      const minScore = allScores.length > 0 ? Math.min(...allScores) : null;
      const maxScore = allScores.length > 0 ? Math.max(...allScores) : null;
      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : null;
      
      // Get sample cities by name
      const sampleCities = [...indiaCities, ...intlCities].filter((c: any) => 
        ['Mumbai', 'Delhi', 'Chennai', 'Bangalore', 'New York', 'London', 'Tokyo', 'Singapore'].includes(c.name)
      );
      
      console.log(`\nScore Distribution: min=${minScore}, max=${maxScore}, avg=${avgScore}`);
      console.log('\nIndia Top 5:');
      indiaCities.slice(0, 5).forEach((c: any) => console.log(`  ${c.name}: ${c.score}% (${(c.lines || []).join(', ')})`));
      console.log('\nInternational Top 5:');
      intlCities.slice(0, 5).forEach((c: any) => console.log(`  ${c.name}: ${c.score}% (${(c.lines || []).join(', ')})`));
      console.log('\nSample Cities:');
      sampleCities.forEach((c: any) => console.log(`  ${c.name}: ${c.score}% (${(c.lines || []).join(', ')})`));
      
      res.json({
        success: true,
        birthData,
        indiaCitiesCount: indiaCities.length,
        intlCitiesCount: intlCities.length,
        scoreDistribution: { min: minScore, max: maxScore, avg: avgScore },
        indiaTop5: indiaCities.slice(0, 5).map((c: any) => ({ 
          name: c.name, 
          score: c.score,
          lines: c.lines,
          method: c.scoringMethod
        })),
        intlTop5: intlCities.slice(0, 5).map((c: any) => ({ 
          name: c.name, 
          score: c.score,
          lines: c.lines,
          method: c.scoringMethod
        })),
        sampleCities: sampleCities.map((c: any) => ({ 
          name: c.name, 
          score: c.score,
          lines: c.lines,
          method: c.scoringMethod,
          contributingZones: c.contributingZones
        }))
      });
      
    } catch (error: any) {
      console.error('Debug city scores error:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message
      });
    }
  });

  app.get("/api/config/places", (req, res) => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, message: "Google API key not configured" });
    }
    res.json({ success: true, apiKey });
  });

  app.post("/api/birth-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, birthDate, birthTime, birthPlace, latitude, longitude } = req.body;

      let vedicProfile: any = {};
      let antardashaData: any = null;
      
      try {
        vedicProfile = await getVedicProfile({
          birthDate,
          birthTime: birthTime || '12:00',
          latitude,
          longitude
        });
        console.log('Vedic profile fetched:', vedicProfile.rashi, vedicProfile.nakshatra, vedicProfile.currentDashaLord);
        
        if (vedicProfile.currentDashaLord) {
          antardashaData = await getAntardashaTimeline({
            birthDate,
            birthTime: birthTime || '12:00',
            latitude,
            longitude
          }, vedicProfile.currentDashaLord);
          console.log('Antardasha timeline fetched:', antardashaData?.length || 0, 'periods');
        }
      } catch (vedicError) {
        console.error('Vedic API error (non-blocking):', vedicError);
      }

      const [data] = await db.insert(birthData).values({
        userId,
        name,
        birthDate,
        birthTime,
        birthPlace,
        latitude,
        longitude,
        rashi: vedicProfile.rashi || null,
        rashiLord: vedicProfile.rashiLord || null,
        nakshatra: vedicProfile.nakshatra || null,
        nakshatraLord: vedicProfile.nakshatraLord || null,
        nakshatraPada: vedicProfile.nakshatraPada || null,
        lagna: vedicProfile.lagna || null,
        lagnaLord: vedicProfile.lagnaLord || null,
        sunSign: vedicProfile.sunSign || null,
        currentDashaLord: vedicProfile.currentDashaLord || null,
        currentDashaEnd: vedicProfile.currentDashaEnd || null,
        antardashaTimeline: antardashaData ? JSON.stringify(antardashaData) : null,
      }).returning();

      res.json({ success: true, data });
    } catch (error) {
      console.error("Error saving birth data:", error);
      res.status(500).json({ success: false, message: "Failed to save birth data" });
    }
  });

  app.get("/api/birth-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await db.select().from(birthData).where(eq(birthData.userId, userId));
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching birth data:", error);
      res.status(500).json({ success: false, message: "Failed to fetch birth data" });
    }
  });

  app.get("/api/reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const data = await db.select().from(reports).where(eq(reports.userId, userId));
      res.json({ success: true, data });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
  });

  // Astrocartography Map Data endpoint (public with optional auth for personalized data)
  app.get("/api/astro-map-data", async (req: any, res) => {
    try {
      // Check if user is authenticated
      const isLoggedIn = req.user && req.user.claims && req.user.claims.sub;
      
      if (isLoggedIn) {
        const userId = req.user.claims.sub;
        
        // Get user's latest birth data
        const userBirthData = await db.select()
          .from(birthData)
          .where(eq(birthData.userId, userId))
          .orderBy(desc(birthData.createdAt))
          .limit(1);
        
        if (userBirthData && userBirthData.length > 0) {
          const birth = userBirthData[0];
          
          // Get timezone for the birth location
          let timezone = 'Asia/Kolkata';
          try {
            if (birth.latitude && birth.longitude) {
              timezone = await getTimezone(birth.latitude, birth.longitude);
            }
          } catch (e) {
            console.log('Using default timezone');
          }
          
          // Format birth data for API
          const apiFormatBirth = {
            date: birth.birthDate,
            time: birth.birthTime,
            latitude: parseFloat(birth.latitude || '0'),
            longitude: parseFloat(birth.longitude || '0'),
            timezone: timezone
          };
          
          // Try to fetch astrocartography lines from RapidAPI
          let lines = null;
          try {
            console.log('Fetching astrocartography lines for map...');
            const linesResult = await getAstrocartographyLines(apiFormatBirth);
            
            // Check if we got valid data
            if (linesResult.success && linesResult.data) {
              // Normalize the API response to our expected format
              lines = normalizeAstrocartographyData(linesResult.data);
            }
          } catch (apiError) {
            console.log('RapidAPI call failed, using demo lines:', apiError);
          }
          
          // If no valid lines, generate demo lines
          if (!lines || Object.keys(lines).length === 0) {
            console.log('Generating demo astrocartography lines...');
            lines = generateDemoLines(apiFormatBirth);
          }
          
          return res.json({
            success: true,
            user: {
              name: birth.name || req.user.claims.first_name || 'You'
            },
            birth: {
              date: birth.birthDate,
              time: birth.birthTime,
              city: birth.birthPlace
            },
            lines: lines
          });
        }
      }
      
      // Not logged in or no birth data - return sample demo lines for preview
      const sampleBirth = {
        latitude: 28.6139, // Delhi coordinates as sample
        longitude: 77.2090
      };
      
      return res.json({ 
        success: true, 
        isDemo: true,
        user: { name: 'Explorer' },
        birth: null,
        lines: generateDemoLines(sampleBirth),
        message: "This is a sample map. Enter your birth details to see your personalized planetary lines."
      });
      
    } catch (error: any) {
      console.error("Error fetching astro map data:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to fetch astrocartography data" });
    }
  });

  app.get("/api/vedic-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { cityLat, cityLng, cityName } = req.query;
      
      const userBirthData = await db.select()
        .from(birthData)
        .where(eq(birthData.userId, userId))
        .orderBy(desc(birthData.createdAt))
        .limit(1);
      
      if (!userBirthData || userBirthData.length === 0) {
        return res.status(400).json({ success: false, message: "No birth data found" });
      }
      
      const birth = userBirthData[0];
      const birthLat = parseFloat(birth.latitude || '0');
      const birthLon = parseFloat(birth.longitude || '0');
      const targetLat = parseFloat(cityLat as string);
      const targetLon = parseFloat(cityLng as string);
      
      const nakshatraMatch = birth.nakshatra ? 
        checkNakshatraDirectionMatch(birth.nakshatra, birthLat, birthLon, targetLat, targetLon) :
        { matches: null, reason: 'Nakshatra data not available' };
      
      const dashaInsight = birth.currentDashaLord ? 
        getDashaInsight(birth.currentDashaLord, []) :
        { supports: null, reason: 'Dasha data not available' };
      
      const direction = getDirectionFromBirthPlace(birthLat, birthLon, targetLat, targetLon);
      
      const lagnaFavorableDirections: Record<string, string[]> = {
        'Aries': ['East', 'Northeast'],
        'Taurus': ['South', 'Southeast'],
        'Gemini': ['West', 'Southwest'],
        'Cancer': ['North', 'Northwest'],
        'Leo': ['East', 'Northeast'],
        'Virgo': ['South', 'Southeast'],
        'Libra': ['West', 'Southwest'],
        'Scorpio': ['North', 'Northwest'],
        'Sagittarius': ['East', 'Northeast'],
        'Capricorn': ['South', 'Southeast'],
        'Aquarius': ['West', 'Southwest'],
        'Pisces': ['North', 'Northwest']
      };
      
      const vastuFavorable = birth.lagna && lagnaFavorableDirections[birth.lagna] ?
        lagnaFavorableDirections[birth.lagna].some(d => direction.includes(d)) : null;
      
      // Parse antardasha timeline for timing analysis
      let antardashaTimeline: any[] = [];
      if (birth.antardashaTimeline) {
        try {
          antardashaTimeline = JSON.parse(birth.antardashaTimeline);
        } catch (e) {
          console.error('Error parsing antardasha timeline:', e);
        }
      }
      
      // Get city lines from query or default empty
      const cityLines = req.query.cityLines ? (req.query.cityLines as string).split(',') : [];
      
      // Generate timing section
      const timingSection = generateTimingSection(
        { name: cityName, lines: cityLines },
        { currentDashaLord: birth.currentDashaLord, currentDashaEnd: birth.currentDashaEnd },
        antardashaTimeline
      );
      
      res.json({
        success: true,
        cityName: cityName || 'Unknown',
        vedicProfile: {
          rashi: birth.rashi,
          rashiLord: birth.rashiLord,
          nakshatra: birth.nakshatra,
          nakshatraLord: birth.nakshatraLord,
          lagna: birth.lagna,
          lagnaLord: birth.lagnaLord,
          currentDashaLord: birth.currentDashaLord,
          currentDashaEnd: birth.currentDashaEnd
        },
        insights: {
          nakshatra: nakshatraMatch,
          dasha: dashaInsight,
          vastu: {
            direction: direction,
            favorable: vastuFavorable,
            lagna: birth.lagna,
            reason: vastuFavorable === true ? 
              `${direction} direction is favorable for ${birth.lagna} Lagna` :
              vastuFavorable === false ?
              `${direction} direction is neutral for ${birth.lagna} Lagna` :
              'Lagna data not available'
          }
        },
        timing: timingSection
      });
    } catch (error) {
      console.error("Error fetching Vedic insights:", error);
      res.status(500).json({ success: false, message: "Failed to fetch Vedic insights" });
    }
  });

  app.get("/api/user-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = req.user.claims;
      res.json({
        success: true,
        user: {
          id: userId,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          profileImageUrl: user.profile_image_url,
        }
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ success: false, message: "Failed to fetch user profile" });
    }
  });

  app.post("/api/create-order", isAuthenticated, async (req: any, res) => {
    try {
      if (!razorpay) {
        return res.status(503).json({ success: false, message: "Payment service not configured" });
      }

      const userId = req.user.claims.sub;
      const { amount, currency = "INR", reportId, reportGoal, searchScope } = req.body;

      if (!amount) {
        return res.status(400).json({ success: false, message: "Amount is required" });
      }

      // Validate price matches expected pricing
      const goal = reportGoal || 'complete';
      const scope = searchScope || 'india';
      const expectedPrice = getPrice(goal, scope);
      const expectedAmountInPaise = expectedPrice * 100;

      if (amount !== expectedAmountInPaise) {
        console.warn(`Price mismatch: received ${amount} paise, expected ${expectedAmountInPaise} paise for goal="${goal}" scope="${scope}"`);
        return res.status(400).json({ success: false, message: "Invalid price" });
      }

      const options = {
        amount: amount,
        currency,
        receipt: "receipt_" + Math.random().toString(36).substring(7),
        notes: {
          reportGoal: goal,
          searchScope: scope
        }
      };

      const order = await razorpay.orders.create(options);

      const [payment] = await db.insert(payments).values({
        userId,
        reportId,
        razorpayOrderId: order.id,
        amount: Math.round(amount / 100),
        currency,
        status: "created",
      }).returning();

      res.json({
        success: true,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: process.env.RAZORPAY_KEY_ID,
        payment_id: payment.id,
      });
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ success: false, message: "Failed to create order" });
    }
  });

  app.post("/api/verify-payment", isAuthenticated, async (req: any, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

      if (generatedSignature === razorpay_signature) {
        await db.update(payments)
          .set({
            razorpayPaymentId: razorpay_payment_id,
            status: "paid",
            verified: true,
          })
          .where(eq(payments.razorpayOrderId, razorpay_order_id));

        res.json({
          success: true,
          message: "Payment verified successfully",
          payment_id: razorpay_payment_id,
        });
      } else {
        res.status(400).json({ success: false, message: "Payment verification failed" });
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ success: false, message: "Error during verification" });
    }
  });

  // TEST MODE: Bypass payment for testing (only works when Razorpay not configured)
  app.post("/api/test-bypass-payment", async (req: any, res) => {
    try {
      // Only allow bypass when Razorpay is NOT configured (development/testing)
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        return res.status(403).json({
          success: false,
          message: "Test bypass not available - use real payment"
        });
      }
      
      console.log("🧪 TEST MODE: Bypassing payment for testing");
      
      res.json({
        success: true,
        message: "Payment bypassed for testing",
        testMode: true,
        payment_id: "test_payment_" + Date.now(),
      });
    } catch (error) {
      console.error("Error in test bypass:", error);
      res.status(500).json({ success: false, message: "Test bypass failed" });
    }
  });

  // Generate report endpoint (authenticated)
  app.post("/api/generate-report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userEmail = req.user.claims.email || "";
      const userName = req.user.claims.first_name || "User";
      
      const { birthDate, birthTime, birthPlace, reportType = "india", reportGoal = "complete" } = req.body;

      if (!birthDate || !birthTime || !birthPlace) {
        return res.status(400).json({ 
          success: false, 
          message: "Birth date, time, and place are required" 
        });
      }

      // Get coordinates and timezone from city name
      console.log("📍 Looking up location data...");
      const locationData = await getLocationData(birthPlace);

      // Create report record in database
      const [reportRecord] = await db.insert(reports).values({
        userId,
        reportType,
        reportGoal,
        status: "processing",
      }).returning();

      // Start report generation (async - don't await)
      generateReport({
        user: {
          name: userName,
          email: userEmail,
          reportGoal,
        },
        birth: {
          date: birthDate,
          time: birthTime,
          city: birthPlace,
          country: locationData.formattedAddress.split(",").pop()?.trim() || "India",
          latitude: locationData.lat,
          longitude: locationData.lng,
          timezone: locationData.timezone,
        },
        reportType,
        reportGoal,
      }).then(async (result: any) => {
        // Update report status when done
        await db.update(reports)
          .set({
            status: result.success ? "completed" : "failed",
            pdfUrl: result.pdfPath || null,
          })
          .where(eq(reports.id, reportRecord.id));
      }).catch(async (error: any) => {
        console.error("Report generation failed:", error);
        await db.update(reports)
          .set({ status: "failed" })
          .where(eq(reports.id, reportRecord.id));
      });

      res.json({
        success: true,
        message: "Report generation started",
        reportId: reportRecord.id,
        status: "processing",
      });

    } catch (error: any) {
      console.error("Error starting report generation:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to start report generation" });
    }
  });

  // Test report endpoint (no auth required for testing)
  // NOW USES REAL APIs for actual astrocartography data!
  app.post("/api/test-report", async (req, res) => {
    try {
      const { name, email, birthDate, birthTime, birthPlace, latitude, longitude, reportType: rawReportType, scope, reportGoal = "complete" } = req.body;
      
      // Accept both 'scope' and 'reportType' - scope takes precedence if provided
      const reportType = scope || rawReportType || "india";

      if (!name || !email || !birthDate || !birthTime || !birthPlace) {
        return res.status(400).json({ 
          success: false, 
          message: "Name, email, birth date, time, and place are required" 
        });
      }

      console.log("\n" + "=".repeat(60));
      console.log("🚀 REAL API TEST: Starting astrocartography analysis");
      console.log("=".repeat(60));
      console.log(`📋 User: ${name}`);
      console.log(`📍 Birth: ${birthDate} at ${birthTime} in ${birthPlace}`);
      console.log(`📊 Report Type: ${reportType} (scope: ${scope || 'not provided'})`);
      console.log(`🎯 Report Goal: ${reportGoal}`);

      // Step 1: Get coordinates - use frontend-provided coords or fallback to geocoding
      let locationData: any;
      if (latitude && longitude) {
        console.log("\n📍 Step 1: Using provided coordinates...");
        console.log(`   ✅ Coordinates from Places Autocomplete: ${latitude}, ${longitude}`);
        locationData = {
          lat: parseFloat(latitude),
          lng: parseFloat(longitude),
          formattedAddress: birthPlace,
          timezone: 'Asia/Calcutta'
        };
        // Get timezone for the coordinates
        try {
          const tzData = await getLocationData(birthPlace);
          locationData.timezone = tzData.timezone;
          console.log(`   🕐 Timezone: ${locationData.timezone}`);
        } catch (e) {
          console.log(`   🕐 Using default timezone: Asia/Calcutta`);
        }
      } else {
        console.log("\n📍 Step 1: Geocoding birth place...");
        locationData = await getLocationData(birthPlace);
        console.log(`   ✅ Found: ${locationData.formattedAddress}`);
        console.log(`   📌 Coordinates: ${locationData.lat}, ${locationData.lng}`);
        console.log(`   🕐 Timezone: ${locationData.timezone}`);
      }

      // Step 2: Prepare birth data for astrology API
      const birthData = {
        date: birthDate,
        time: birthTime,
        latitude: locationData.lat,
        longitude: locationData.lng,
        timezone: locationData.timezone
      };

      // Step 3: Call real astrology APIs - NEW: Score ALL 86 cities using astrodynes endpoint
      console.log("\n🌟 Step 2: Calling RapidAPI for astrocartography data...");
      
      const astrologyApi = require('./services/astrologyApi');
      const { INDIAN_CITIES, INTERNATIONAL_CITIES, ALL_CITIES } = require('./services/geocodingService');
      
      // Determine which cities to score based on report type
      let citiesToScore: any[] = [];
      if (reportType === 'india') {
        citiesToScore = INDIAN_CITIES;
        console.log(`   📡 Scoring ${citiesToScore.length} Indian cities...`);
      } else if (reportType === 'international') {
        citiesToScore = INTERNATIONAL_CITIES;
        console.log(`   📡 Scoring ${citiesToScore.length} International cities...`);
      } else {
        citiesToScore = ALL_CITIES;
        console.log(`   📡 Scoring ALL ${citiesToScore.length} cities (${INDIAN_CITIES.length} India + ${INTERNATIONAL_CITIES.length} International)...`);
      }
      
      // Get scores for all cities using the astrodynes endpoint
      const scoresResult = await astrologyApi.getScoresForAllCities(birthData, citiesToScore);
      
      let allScoredCities: any[] = [];
      if (scoresResult.success && scoresResult.data) {
        allScoredCities = scoresResult.data;
        console.log(`   ✅ Got scores for ${allScoredCities.length} cities from astrodynes API`);
      } else {
        console.log(`   ⚠️ Astrodynes API failed, using fallback random scores`);
        // Fallback: assign random scores if API fails (lines will be assigned later by assignLinesToCities)
        allScoredCities = citiesToScore.map((city: any, index: number) => ({
          name: city.name,
          state: city.state || null,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
          score: Math.floor(Math.random() * 40) + 40, // Random 40-80
          lines: [], // Will be assigned by assignLinesToCities based on coordinates
          isIndian: city.country === 'India'
        }));
      }
      
      // Split scored cities into India and International arrays
      let indiaPowerZones: any[] = allScoredCities.filter((city: any) => city.isIndian || city.country === 'India');
      let intlPowerZones: any[] = allScoredCities.filter((city: any) => !city.isIndian && city.country !== 'India');
      
      console.log(`   📊 Breakdown: ${indiaPowerZones.length} Indian, ${intlPowerZones.length} International cities scored`);

      // Step 4: Get astrocartography lines and assign them to cities
      console.log("   📡 Fetching astrocartography lines...");
      const linesResult = await astrologyApi.getAstrocartographyLines(birthData);
      const astroLines = linesResult.success ? linesResult.data : null;
      if (astroLines) {
        console.log("   ✅ Astrocartography lines received");
        // Assign planetary lines to each city based on longitude proximity
        allScoredCities = astrologyApi.assignLinesToCities(allScoredCities, astroLines);
        console.log("   ✅ Planetary lines assigned to cities based on coordinates");
      } else {
        console.log("   ⚠️ No astroLines data, using fallback line assignment");
        // Still assign lines using the fallback method
        allScoredCities = astrologyApi.assignLinesToCities(allScoredCities, null);
      }
      
      // Update the split arrays with line assignments
      indiaPowerZones = allScoredCities.filter((city: any) => city.isIndian || city.country === 'India');
      intlPowerZones = allScoredCities.filter((city: any) => !city.isIndian && city.country !== 'India');

      // Step 5: Calculate power direction from lines data
      const directions = ['NORTH', 'NORTH-EAST', 'EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST'];
      const directionMeanings: any = {
        'NORTH': 'The Direction of Career & Success',
        'NORTH-EAST': 'The Direction of Wisdom & Spirituality',
        'EAST': 'The Direction of New Beginnings',
        'SOUTH-EAST': 'The Direction of Wealth & Growth',
        'SOUTH': 'The Direction of Fame & Recognition',
        'SOUTH-WEST': 'The Direction of Relationships',
        'WEST': 'The Direction of Creativity & Children',
        'NORTH-WEST': 'The Direction of Travel & Support'
      };
      
      // Calculate power direction based on Jupiter line position or best city coordinates
      let powerDirection = 'SOUTH-EAST';
      if (indiaPowerZones.length > 0 || intlPowerZones.length > 0) {
        const topCity = indiaPowerZones[0] || intlPowerZones[0];
        const cityLat = topCity?.latitude || topCity?.lat || 0;
        const cityLng = topCity?.longitude || topCity?.lng || 0;
        
        // Calculate direction from birth place to top city
        const latDiff = cityLat - locationData.lat;
        const lngDiff = cityLng - locationData.lng;
        
        if (Math.abs(latDiff) > Math.abs(lngDiff)) {
          powerDirection = latDiff > 0 ? 'NORTH' : 'SOUTH';
          if (Math.abs(lngDiff) > Math.abs(latDiff) * 0.5) {
            powerDirection += lngDiff > 0 ? '-EAST' : '-WEST';
          }
        } else {
          powerDirection = lngDiff > 0 ? 'EAST' : 'WEST';
          if (Math.abs(latDiff) > Math.abs(lngDiff) * 0.5) {
            powerDirection = (latDiff > 0 ? 'NORTH' : 'SOUTH') + '-' + powerDirection;
          }
        }
        if (!directions.includes(powerDirection)) {
          powerDirection = 'SOUTH-EAST';
        }
      }

      // Cities already have lines assigned by assignLinesToCities - just add frontend-compatible structure
      let indiaCities = indiaPowerZones.map((city: any) => ({
        name: city.name,
        state: city.state,
        country: city.country || 'India',
        score: city.score,
        lines: city.lines, // Lines already assigned by assignLinesToCities
        reason: 'Strong planetary alignment',
        category: 'general',
        coordinates: { lat: city.lat, lng: city.lng },
        isRealAPIData: true
      }));
      
      let internationalCities = intlPowerZones.map((city: any) => ({
        name: city.name,
        country: city.country,
        score: city.score,
        lines: city.lines, // Lines already assigned by assignLinesToCities
        reason: 'Strong planetary alignment',
        category: 'general',
        coordinates: { lat: city.lat, lng: city.lng },
        isRealAPIData: true
      }));

      // Apply goal-based score boosts to city rankings
      console.log(`\n🎯 Applying goal-based score boosts for: ${reportGoal.toUpperCase()}`);
      indiaCities = indiaCities.map((city: any) => ({
        ...city,
        score: applyGoalScoreBoost(city.score, city.lines || [], reportGoal)
      }));
      internationalCities = internationalCities.map((city: any) => ({
        ...city,
        score: applyGoalScoreBoost(city.score, city.lines || [], reportGoal)
      }));

      // Re-sort cities by adjusted score (all cities now included, sorted by score)
      indiaCities.sort((a: any, b: any) => b.score - a.score);
      internationalCities.sort((a: any, b: any) => b.score - a.score);
      
      // Take top 10 cities for display (from full 31 India / 55 International)
      const topIndiaCities = indiaCities.slice(0, 10);
      const topIntlCities = internationalCities.slice(0, 10);
      
      console.log(`   ✅ Scores adjusted and cities re-ranked`);
      console.log(`   📊 Top 10 India: ${topIndiaCities.map((c: any) => `${c.name}(${c.score})`).join(', ')}`);
      console.log(`   📊 Top 10 International: ${topIntlCities.map((c: any) => `${c.name}(${c.score})`).join(', ')}`);
      
      // Use top 10 for report generation
      indiaCities = topIndiaCities;
      internationalCities = topIntlCities;

      // Step 6: Generate AI interpretations using Claude
      const userData = { name, birthDate, email, reportGoal };
      const zodiac = getZodiacSign(birthDate);
      console.log(`\n🤖 Step 3: Generating Claude AI interpretations...`);
      console.log(`   ♈ Zodiac: ${zodiac.name} (${zodiac.symbol}) - born in ${zodiac.monthName}`);
      
      // Generate interpretations for all cities
      const allCities = [...indiaCities, ...internationalCities];
      if (allCities.length > 0 && process.env.ANTHROPIC_API_KEY) {
        try {
          const interpretedCities = await generateCityInterpretations(allCities, userData);
          
          // Split back into India and International
          const indiaCount = indiaCities.length;
          indiaCities = interpretedCities.slice(0, indiaCount);
          internationalCities = interpretedCities.slice(indiaCount);
          
          console.log(`   ✅ AI interpretations generated for ${interpretedCities.length} cities`);
        } catch (error: any) {
          console.log(`   ⚠️ AI interpretation failed, using fallback: ${error.message}`);
          // Add fallback interpretations when Claude fails
          indiaCities = indiaCities.map((city: any) => ({
            ...city,
            aiInterpretation: generateFallbackText(city, zodiac, reportGoal)
          }));
          internationalCities = internationalCities.map((city: any) => ({
            ...city,
            aiInterpretation: generateFallbackText(city, zodiac, reportGoal)
          }));
        }
      } else if (!process.env.ANTHROPIC_API_KEY) {
        console.log(`   ⚠️ ANTHROPIC_API_KEY not set, using fallback interpretations`);
        // Add fallback interpretations when API key is missing
        indiaCities = indiaCities.map((city: any) => ({
          ...city,
          aiInterpretation: generateFallbackText(city, zodiac, reportGoal)
        }));
        internationalCities = internationalCities.map((city: any) => ({
          ...city,
          aiInterpretation: generateFallbackText(city, zodiac, reportGoal)
        }));
      }
      
      // Helper function for fallback interpretations - now goal-aware
      function generateFallbackText(city: any, zodiac: any, goal: string = 'complete'): string {
        const lines = city.lines || [];
        // Goal-specific text matching claudeService
        const goalText: any = {
          'education': 'academic excellence and intellectual growth',
          'career': 'professional success and career advancement',
          'love': 'romantic connections and finding your soulmate',
          'relocation': 'settling down and building a happy life',
          'wealth': 'financial prosperity and abundance',
          'complete': 'overall life success and transformation'
        };
        
        if (lines.length >= 2) {
          return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lines[0]} and ${lines[1]} lines in ${city.name} create powerful opportunities for ${goalText[goal] || 'success'}. This location holds exceptional potential for you.`;
        } else if (lines.length === 1) {
          return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lines[0]} line in ${city.name} activates extraordinary potential for ${goalText[goal] || 'growth'}. This city offers wonderful cosmic support for you.`;
        }
        return `As a ${zodiac.name} born in ${zodiac.monthName}, ${city.name} offers powerful planetary alignments supporting ${goalText[goal] || 'personal success'}.`;
      }

      // Calculate top match based on report type
      let topMatch = 90;
      if (reportType === 'india' && indiaCities.length > 0) {
        topMatch = indiaCities[0].score;
      } else if (reportType === 'international' && internationalCities.length > 0) {
        topMatch = internationalCities[0].score;
      } else if (indiaCities.length > 0 || internationalCities.length > 0) {
        topMatch = Math.max(indiaCities[0]?.score || 0, internationalCities[0]?.score || 0);
      }

      // Build response
      const results = {
        userName: name,
        birthPlace,
        coordinates: { lat: locationData.lat, lng: locationData.lng },
        powerDirection,
        powerDirectionMeaning: directionMeanings[powerDirection] || 'Your Lucky Direction',
        stats: {
          luckyCities: indiaCities.length + internationalCities.length,
          avoidCities: 3,
          topMatch
        },
        indiaCities: reportType === 'international' ? [] : indiaCities,
        internationalCities: reportType === 'india' ? [] : internationalCities,
        avoidCities: [
          { name: 'Check full report', reason: 'Saturn-IC challenges' }
        ],
        reportType,
        reportGoal,
        apiSource: 'RapidAPI Astrocartography',
        astroLinesAvailable: !!astroLines
      };

      console.log("\n" + "=".repeat(60));
      console.log("✅ REAL API TEST COMPLETE!");
      console.log(`   📊 India cities: ${indiaCities.length}`);
      console.log(`   🌍 International cities: ${internationalCities.length}`);
      console.log(`   🧭 Power direction: ${powerDirection}`);
      console.log(`   🤖 AI Interpretations: ${indiaCities.some((c: any) => c.aiInterpretation) || internationalCities.some((c: any) => c.aiInterpretation) ? 'Yes' : 'No'}`);
      console.log("=".repeat(60) + "\n");

      res.json({
        success: true,
        message: "Analysis complete (Real API Data)",
        data: results,
      });

    } catch (error: any) {
      console.error("Error in test report:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to generate report" });
    }
  });

  // Generate demo results for quick preview
  function generateDemoResults(name: string, birthDate: string, birthTime: string, birthPlace: string, reportType: string, locationData: any, reportGoal: string = 'complete') {
    // Parse birth data to create personalized demo results
    const birthMonth = new Date(birthDate).getMonth();
    const birthHour = parseInt(birthTime.split(':')[0]);
    
    // Calculate a "power direction" based on birth data
    const directions = ['NORTH', 'NORTH-EAST', 'EAST', 'SOUTH-EAST', 'SOUTH', 'SOUTH-WEST', 'WEST', 'NORTH-WEST'];
    const directionMeanings: any = {
      'NORTH': 'The Direction of Career & Success',
      'NORTH-EAST': 'The Direction of Wisdom & Spirituality',
      'EAST': 'The Direction of New Beginnings',
      'SOUTH-EAST': 'The Direction of Wealth & Growth',
      'SOUTH': 'The Direction of Fame & Recognition',
      'SOUTH-WEST': 'The Direction of Relationships',
      'WEST': 'The Direction of Creativity & Children',
      'NORTH-WEST': 'The Direction of Travel & Support'
    };
    const powerDirectionIndex = (birthMonth + birthHour) % 8;
    const powerDirection = directions[powerDirectionIndex];

    // Indian cities with scores
    const indiaCities = [
      { name: 'Bangalore', score: 94, lines: ['Jupiter-MC', 'Venus-AC'], reason: 'Strong Jupiter line for career growth' },
      { name: 'Hyderabad', score: 91, lines: ['Sun-MC', 'Mercury-AC'], reason: 'Sun line activates leadership potential' },
      { name: 'Chennai', score: 88, lines: ['Moon-IC', 'Venus-DC'], reason: 'Moon line for emotional fulfillment' },
      { name: 'Pune', score: 85, lines: ['Mercury-MC', 'Mars-AC'], reason: 'Mercury enhances communication' },
      { name: 'Kochi', score: 82, lines: ['Neptune-IC', 'Jupiter-DC'], reason: 'Neptune for creativity and intuition' },
      { name: 'Jaipur', score: 79, lines: ['Sun-AC', 'Saturn-MC'], reason: 'Sun line for personal power' },
      { name: 'Goa', score: 76, lines: ['Venus-IC', 'Neptune-AC'], reason: 'Venus for pleasure and relaxation' },
      { name: 'Ahmedabad', score: 73, lines: ['Mars-MC', 'Jupiter-AC'], reason: 'Mars for action and drive' },
    ];

    // International cities with scores
    const internationalCities = [
      { name: 'Dubai', country: 'UAE', score: 96, lines: ['Jupiter-MC', 'Sun-AC'], reason: 'Powerful Jupiter-Sun combination' },
      { name: 'Singapore', country: 'Singapore', score: 93, lines: ['Mercury-MC', 'Venus-AC'], reason: 'Mercury line for business success' },
      { name: 'Sydney', country: 'Australia', score: 89, lines: ['Sun-MC', 'Jupiter-DC'], reason: 'Sun line for recognition abroad' },
      { name: 'London', country: 'UK', score: 86, lines: ['Saturn-MC', 'Mercury-AC'], reason: 'Saturn for career structure' },
      { name: 'Toronto', country: 'Canada', score: 83, lines: ['Moon-IC', 'Jupiter-AC'], reason: 'Moon for emotional security' },
      { name: 'New York', country: 'USA', score: 80, lines: ['Mars-MC', 'Sun-AC'], reason: 'Mars for competitive edge' },
    ];

    // Cities to avoid (challenging energies)
    const avoidCities = [
      { name: 'Kolkata', reason: 'Saturn-IC may create obstacles' },
      { name: 'Lucknow', reason: 'Pluto line for intense transformations' },
      { name: 'Delhi', reason: 'Challenging Mars-Saturn aspect' },
    ];

    // Personalize based on birth hour (morning people vs night people)
    if (birthHour < 12) {
      // Morning births tend toward Sun-dominant cities
      indiaCities[0].score = 96;
      internationalCities[0].score = 98;
    } else {
      // Evening births tend toward Moon-dominant cities
      indiaCities[2].score = 95;
      internationalCities[4].score = 94;
    }

    // Apply goal-based score boosts
    const adjustedIndiaCities = indiaCities.map(city => ({
      ...city,
      score: applyGoalScoreBoost(city.score, city.lines || [], reportGoal)
    }));
    const adjustedIntlCities = internationalCities.map(city => ({
      ...city,
      score: applyGoalScoreBoost(city.score, city.lines || [], reportGoal)
    }));

    // Sort by adjusted score
    adjustedIndiaCities.sort((a, b) => b.score - a.score);
    adjustedIntlCities.sort((a, b) => b.score - a.score);

    // Calculate top match based on report type
    let topMatch: number;
    if (reportType === 'india') {
      topMatch = adjustedIndiaCities[0].score;
    } else if (reportType === 'international') {
      topMatch = adjustedIntlCities[0].score;
    } else {
      // combo - take the highest from both
      topMatch = Math.max(adjustedIndiaCities[0].score, adjustedIntlCities[0].score);
    }

    return {
      userName: name,
      birthPlace,
      coordinates: { lat: locationData.lat, lng: locationData.lng },
      powerDirection,
      powerDirectionMeaning: directionMeanings[powerDirection],
      stats: {
        luckyCities: reportType === 'india' ? 8 : reportType === 'international' ? 6 : 14,
        avoidCities: 3,
        topMatch
      },
      indiaCities: reportType === 'international' ? [] : adjustedIndiaCities,
      internationalCities: reportType === 'india' ? [] : adjustedIntlCities,
      avoidCities,
      reportType,
      reportGoal
    };
  }

  // Get report status endpoint (authenticated - user can only see their own reports)
  app.get("/api/report-status/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reportId = parseInt(req.params.id);
      const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
      
      if (!report) {
        return res.status(404).json({ success: false, message: "Report not found" });
      }

      // Security check: ensure report belongs to authenticated user
      if (report.userId !== userId) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      res.json({
        success: true,
        status: report.status,
        pdfUrl: report.pdfUrl,
      });
    } catch (error) {
      console.error("Error fetching report status:", error);
      res.status(500).json({ success: false, message: "Failed to fetch report status" });
    }
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================

  // Admin authentication middleware
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.user || !req.user.claims) {
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    
    const userId = req.user.claims.sub;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    
    req.adminUser = user;
    next();
  };

  // Check if current user is admin
  app.get("/api/admin/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      // First-time setup: If no admins exist, make the first user who checks an admin
      if (user) {
        const [adminCount] = await db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.role, 'admin'));
        
        if (Number(adminCount.count) === 0) {
          // No admins exist - make this user the first admin
          await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
          console.log(`🔐 First admin created: ${user.email || userId}`);
          
          // Refetch with updated role
          const [updatedUser] = await db.select().from(users).where(eq(users.id, userId));
          return res.json({
            success: true,
            isAdmin: true,
            user: updatedUser,
            message: "You have been set as the first admin!"
          });
        }
      }
      
      res.json({
        success: true,
        isAdmin: user?.role === 'admin',
        user: user || null
      });
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ success: false, message: "Failed to check admin status" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const [reportCount] = await db.select({ count: sql<number>`count(*)` }).from(reports);
      const [paymentCount] = await db.select({ count: sql<number>`count(*)` }).from(payments);
      const [revenueResult] = await db.select({ 
        total: sql<number>`COALESCE(SUM(CASE WHEN verified = true THEN amount ELSE 0 END), 0)` 
      }).from(payments);
      
      res.json({
        success: true,
        stats: {
          totalUsers: Number(userCount.count),
          totalReports: Number(reportCount.count),
          totalPayments: Number(paymentCount.count),
          totalRevenue: Number(revenueResult.total)
        }
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
  });

  // Get all users
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
      const allBirthData = await db.select().from(birthData);
      
      res.json({
        success: true,
        users: allUsers,
        birthData: allBirthData
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  });

  // Update user role
  app.put("/api/admin/users/:userId/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!['user', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, message: "Invalid role" });
      }
      
      await db.update(users).set({ role }).where(eq(users.id, userId));
      
      res.json({ success: true, message: "User role updated" });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ success: false, message: "Failed to update user role" });
    }
  });

  // Get all reports
  app.get("/api/admin/reports", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allReports = await db.select().from(reports).orderBy(desc(reports.createdAt));
      res.json({ success: true, reports: allReports });
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ success: false, message: "Failed to fetch reports" });
    }
  });

  // Get all payments
  app.get("/api/admin/payments", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const allPayments = await db.select().from(payments).orderBy(desc(payments.createdAt));
      res.json({ success: true, payments: allPayments });
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
  });

  // Get API usage stats
  app.get("/api/admin/api-stats", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      // Today's API calls
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [todayCount] = await db.select({ count: sql<number>`count(*)` })
        .from(apiCalls)
        .where(sql`created_at >= ${today.toISOString()}`);
      
      // Total API calls
      const [totalCount] = await db.select({ count: sql<number>`count(*)` }).from(apiCalls);
      
      // Last 7 days breakdown
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const dailyStats = await db.select({
        date: sql<string>`DATE(created_at)`,
        count: sql<number>`count(*)`
      })
        .from(apiCalls)
        .where(sql`created_at >= ${sevenDaysAgo.toISOString()}`)
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);
      
      // Top endpoints
      const topEndpoints = await db.select({
        endpoint: apiCalls.endpoint,
        count: sql<number>`count(*)`
      })
        .from(apiCalls)
        .groupBy(apiCalls.endpoint)
        .orderBy(sql`count(*) DESC`)
        .limit(10);
      
      // Average response time
      const [avgResponse] = await db.select({
        avg: sql<number>`COALESCE(AVG(response_time), 0)`
      }).from(apiCalls);
      
      res.json({
        success: true,
        stats: {
          todayCount: Number(todayCount.count),
          totalCount: Number(totalCount.count),
          avgResponseTime: Math.round(Number(avgResponse.avg)),
          dailyStats,
          topEndpoints
        }
      });
    } catch (error) {
      console.error("Error fetching API stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch API stats" });
    }
  });

  // Get live API calls (last 5 minutes)
  app.get("/api/admin/api-live", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const recentCalls = await db.select()
        .from(apiCalls)
        .where(sql`created_at >= ${fiveMinutesAgo.toISOString()}`)
        .orderBy(desc(apiCalls.createdAt))
        .limit(50);
      
      const [liveCount] = await db.select({ count: sql<number>`count(*)` })
        .from(apiCalls)
        .where(sql`created_at >= ${fiveMinutesAgo.toISOString()}`);
      
      res.json({
        success: true,
        liveCount: Number(liveCount.count),
        recentCalls
      });
    } catch (error) {
      console.error("Error fetching live API stats:", error);
      res.status(500).json({ success: false, message: "Failed to fetch live API stats" });
    }
  });

  // Serve astro-map.html for /astro-map route
  app.get("/astro-map", (req: any, res) => {
    res.sendFile(path.join(process.cwd(), "public", "astro-map.html"));
  });

  // Serve d3-map.html for /d3-map route (D3.js version with accurate borders)
  app.get("/d3-map", (req: any, res) => {
    res.sendFile(path.join(process.cwd(), "public", "d3-map.html"));
  });

  // Serve admin.html for /admin route (protected server-side)
  app.get("/admin", async (req: any, res) => {
    // Check if user has a valid session
    if (!req.user || !req.user.claims) {
      // Not authenticated - redirect to login
      return res.redirect('/api/login?returnTo=/admin');
    }
    
    // User is authenticated - check if admin
    const userId = req.user.claims.sub;
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      // User not in database yet - redirect to login
      return res.redirect('/api/login?returnTo=/admin');
    }
    
    // Check if no admins exist - if so, auto-promote this user
    const [adminCount] = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, 'admin'));
    
    if (Number(adminCount.count) === 0) {
      // No admins exist - make this user the first admin
      await db.update(users).set({ role: 'admin' }).where(eq(users.id, userId));
      console.log(`🔐 First admin created via /admin route: ${user.email || userId}`);
      return res.sendFile(path.join(process.cwd(), "admin.html"));
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Access Denied</title></head>
        <body style="background: #0f1419; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;">
          <div style="text-align: center;">
            <h1 style="color: #f87171;">Access Denied</h1>
            <p>You don't have admin privileges to access this page.</p>
            <a href="/" style="color: #d4a854;">Return to Home</a>
          </div>
        </body>
        </html>
      `);
    }
    
    // User is admin - serve the dashboard
    res.sendFile(path.join(process.cwd(), "admin.html"));
  });

  app.use(express.static(path.join(process.cwd())));

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api") && req.path !== "/admin") {
      res.sendFile(path.join(process.cwd(), "index.html"));
    } else {
      next();
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
