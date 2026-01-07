import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import Razorpay from "razorpay";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth/index.js";
import { db } from "./db.js";
import { birthData, reports, payments } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// Import services
const { generateReport } = require("./services/reportGenerator.js");
const { getLocationData, findNearestIndianCity, findNearestInternationalCity } = require("./services/geocodingService.js");
const { generateCityInterpretations, getZodiacSign } = require("./services/claudeService.js");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  app.post("/api/birth-data", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name, birthDate, birthTime, birthPlace, latitude, longitude } = req.body;

      const [data] = await db.insert(birthData).values({
        userId,
        name,
        birthDate,
        birthTime,
        birthPlace,
        latitude,
        longitude,
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
      const { amount, currency = "INR", reportId } = req.body;

      if (!amount) {
        return res.status(400).json({ success: false, message: "Amount is required" });
      }

      const options = {
        amount: amount * 100,
        currency,
        receipt: "receipt_" + Math.random().toString(36).substring(7),
      };

      const order = await razorpay.orders.create(options);

      const [payment] = await db.insert(payments).values({
        userId,
        reportId,
        razorpayOrderId: order.id,
        amount: amount,
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
      
      const { birthDate, birthTime, birthPlace, reportType = "india" } = req.body;

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
        status: "processing",
      }).returning();

      // Start report generation (async - don't await)
      generateReport({
        user: {
          name: userName,
          email: userEmail,
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
      const { name, email, birthDate, birthTime, birthPlace, reportType = "india" } = req.body;

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
      console.log(`📊 Report Type: ${reportType}`);

      // Step 1: Get coordinates and timezone from city name
      console.log("\n📍 Step 1: Geocoding birth place...");
      const locationData = await getLocationData(birthPlace);
      console.log(`   ✅ Found: ${locationData.formattedAddress}`);
      console.log(`   📌 Coordinates: ${locationData.lat}, ${locationData.lng}`);
      console.log(`   🕐 Timezone: ${locationData.timezone}`);

      // Step 2: Prepare birth data for astrology API
      const birthData = {
        date: birthDate,
        time: birthTime,
        latitude: locationData.lat,
        longitude: locationData.lng,
        timezone: locationData.timezone
      };

      // Step 3: Call real astrology APIs
      console.log("\n🌟 Step 2: Calling RapidAPI for astrocartography data...");
      
      const astrologyApi = require('./services/astrologyApi');
      
      // Get power zones based on report type
      let indiaPowerZones: any[] = [];
      let intlPowerZones: any[] = [];
      
      if (reportType === 'india' || reportType === 'combo') {
        console.log("   📡 Fetching India power zones...");
        const indiaResult = await astrologyApi.findPowerZones(birthData, { region: 'india', limit: 10 });
        if (indiaResult.success && indiaResult.data) {
          indiaPowerZones = Array.isArray(indiaResult.data) ? indiaResult.data : [];
          console.log(`   ✅ Got ${indiaPowerZones.length} Indian cities`);
        }
      }
      
      if (reportType === 'international' || reportType === 'combo') {
        console.log("   📡 Fetching International power zones...");
        const intlResult = await astrologyApi.findPowerZones(birthData, { region: 'global', limit: 10 });
        if (intlResult.success && intlResult.data) {
          intlPowerZones = Array.isArray(intlResult.data) ? intlResult.data : [];
          console.log(`   ✅ Got ${intlPowerZones.length} International cities`);
        }
      }

      // Step 4: Get astrocartography lines
      console.log("   📡 Fetching astrocartography lines...");
      const linesResult = await astrologyApi.getAstrocartographyLines(birthData);
      const astroLines = linesResult.success ? linesResult.data : null;
      if (astroLines) {
        console.log("   ✅ Astrocartography lines received");
      }

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

      // Format power zones for frontend with actual Indian city names
      const usedIndianCities = new Set<string>();
      
      const formatPowerZoneToIndianCity = (zone: any, index: number) => {
        const planets = zone.planets || [];
        const lineTypes = zone.line_types || [];
        const lines = planets.map((planet: string, i: number) => `${planet}-${lineTypes[i] || 'MC'}`);
        const strength = zone.strength || 0.5;
        const score = Math.round(strength * 100);
        const category = zone.category || 'general';
        const meaning = zone.meaning || 'Strong planetary alignment';
        
        // Map to nearest Indian city
        const nearestCity = findNearestIndianCity(zone.latitude || 0, zone.longitude || 0);
        
        // Avoid duplicates
        if (usedIndianCities.has(nearestCity.name)) {
          return null;
        }
        usedIndianCities.add(nearestCity.name);
        
        return {
          name: nearestCity.name,
          state: nearestCity.state,
          country: 'India',
          score,
          lines: lines.length > 0 ? lines : ['Jupiter-MC'],
          reason: meaning,
          category,
          coordinates: { lat: nearestCity.lat, lng: nearestCity.lng },
          isRealAPIData: true
        };
      };

      // Format international zones with actual city names using geocoding
      const usedIntlCities = new Set<string>();
      
      const formatInternationalZone = (zone: any, index: number) => {
        const planets = zone.planets || [];
        const lineTypes = zone.line_types || [];
        const lines = planets.map((planet: string, i: number) => `${planet}-${lineTypes[i] || 'MC'}`);
        const strength = zone.strength || 0.5;
        const score = Math.round(strength * 100);
        const category = zone.category || 'general';
        const meaning = zone.meaning || 'Strong planetary alignment';
        
        // Map to nearest international city using the geocoding service
        const nearestCity = findNearestInternationalCity(zone.latitude || 0, zone.longitude || 0);
        
        // Avoid duplicates
        if (usedIntlCities.has(nearestCity.name)) {
          return null;
        }
        usedIntlCities.add(nearestCity.name);
        
        return {
          name: nearestCity.name,
          country: nearestCity.country,
          score,
          lines: lines.length > 0 ? lines : ['Jupiter-MC'],
          reason: meaning,
          category,
          coordinates: { lat: nearestCity.lat, lng: nearestCity.lng },
          isRealAPIData: true
        };
      };

      // Map India zones to Indian cities, filter duplicates
      let indiaCities = indiaPowerZones
        .map(formatPowerZoneToIndianCity)
        .filter((city: any) => city !== null);
      
      // Map international zones to global cities, filter duplicates
      let internationalCities = intlPowerZones
        .map(formatInternationalZone)
        .filter((city: any) => city !== null);

      // Step 6: Generate AI interpretations using Claude
      const userData = { name, birthDate, email };
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
            aiInterpretation: generateFallbackText(city, zodiac)
          }));
          internationalCities = internationalCities.map((city: any) => ({
            ...city,
            aiInterpretation: generateFallbackText(city, zodiac)
          }));
        }
      } else if (!process.env.ANTHROPIC_API_KEY) {
        console.log(`   ⚠️ ANTHROPIC_API_KEY not set, using fallback interpretations`);
        // Add fallback interpretations when API key is missing
        indiaCities = indiaCities.map((city: any) => ({
          ...city,
          aiInterpretation: generateFallbackText(city, zodiac)
        }));
        internationalCities = internationalCities.map((city: any) => ({
          ...city,
          aiInterpretation: generateFallbackText(city, zodiac)
        }));
      }
      
      // Helper function for fallback interpretations
      function generateFallbackText(city: any, zodiac: any): string {
        const lines = city.lines || [];
        const category = city.category || 'general';
        const categoryText: any = {
          'love': 'romantic connections and heartfelt relationships',
          'career': 'professional success and public recognition',
          'wealth': 'abundance and financial prosperity',
          'general': 'personal growth and transformation'
        };
        
        if (lines.length >= 2) {
          return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lines[0]} and ${lines[1]} lines in ${city.name} create powerful opportunities for ${categoryText[category] || 'success'}. This location holds exceptional potential for you.`;
        } else if (lines.length === 1) {
          return `As a ${zodiac.name} born in ${zodiac.monthName}, your ${lines[0]} line in ${city.name} activates extraordinary potential for ${categoryText[category] || 'growth'}. This city offers wonderful cosmic support for you.`;
        }
        return `As a ${zodiac.name} born in ${zodiac.monthName}, ${city.name} offers powerful planetary alignments supporting ${categoryText[category] || 'personal success'}.`;
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
  function generateDemoResults(name: string, birthDate: string, birthTime: string, birthPlace: string, reportType: string, locationData: any) {
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

    // Sort by score
    indiaCities.sort((a, b) => b.score - a.score);
    internationalCities.sort((a, b) => b.score - a.score);

    // Calculate top match based on report type
    let topMatch: number;
    if (reportType === 'india') {
      topMatch = indiaCities[0].score;
    } else if (reportType === 'international') {
      topMatch = internationalCities[0].score;
    } else {
      // combo - take the highest from both
      topMatch = Math.max(indiaCities[0].score, internationalCities[0].score);
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
      indiaCities: reportType === 'international' ? [] : indiaCities,
      internationalCities: reportType === 'india' ? [] : internationalCities,
      avoidCities,
      reportType
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

  app.use(express.static(path.join(process.cwd())));

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api")) {
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
