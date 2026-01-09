export * from "./models/auth";
import { sql } from "drizzle-orm";
import { pgTable, varchar, timestamp, text, integer, boolean } from "drizzle-orm/pg-core";

export const birthData = pgTable("birth_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  name: varchar("name").notNull(),
  birthDate: varchar("birth_date").notNull(),
  birthTime: varchar("birth_time"),
  birthPlace: varchar("birth_place").notNull(),
  latitude: varchar("latitude"),
  longitude: varchar("longitude"),
  rashi: varchar("rashi"),
  rashiLord: varchar("rashi_lord"),
  nakshatra: varchar("nakshatra"),
  nakshatraLord: varchar("nakshatra_lord"),
  nakshatraPada: integer("nakshatra_pada"),
  lagna: varchar("lagna"),
  lagnaLord: varchar("lagna_lord"),
  sunSign: varchar("sun_sign"),
  currentDashaLord: varchar("current_dasha_lord"),
  currentDashaEnd: varchar("current_dasha_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  birthDataId: varchar("birth_data_id").notNull(),
  reportType: varchar("report_type").notNull(),
  reportGoal: varchar("report_goal"),
  status: varchar("status").default("pending"),
  pdfUrl: text("pdf_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  reportId: varchar("report_id"),
  razorpayOrderId: varchar("razorpay_order_id"),
  razorpayPaymentId: varchar("razorpay_payment_id"),
  amount: integer("amount").notNull(),
  currency: varchar("currency").default("INR"),
  status: varchar("status").default("created"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiCalls = pgTable("api_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  userId: varchar("user_id"),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BirthData = typeof birthData.$inferSelect;
export type InsertBirthData = typeof birthData.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;
export type ApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = typeof apiCalls.$inferInsert;
