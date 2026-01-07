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
const { getLocationData } = require("./services/geocodingService.js");

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
  app.post("/api/test-report", async (req, res) => {
    try {
      const { name, email, birthDate, birthTime, birthPlace, reportType = "india" } = req.body;

      if (!name || !email || !birthDate || !birthTime || !birthPlace) {
        return res.status(400).json({ 
          success: false, 
          message: "Name, email, birth date, time, and place are required" 
        });
      }

      // Get coordinates and timezone from city name
      console.log("📍 Looking up location data for test...");
      const locationData = await getLocationData(birthPlace);

      console.log("🚀 Starting test report generation...");
      
      // Generate report (sync for testing)
      const result = await generateReport({
        user: {
          name,
          email,
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
      });

      res.json({
        success: result.success,
        message: result.success ? "Report generated successfully" : "Report generation failed",
        reportId: result.reportId,
        timeTaken: result.timeTaken,
        error: result.error || null,
      });

    } catch (error: any) {
      console.error("Error in test report:", error);
      res.status(500).json({ success: false, message: error.message || "Failed to generate test report" });
    }
  });

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
