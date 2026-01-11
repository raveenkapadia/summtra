# Ssumitra - Astrocartography Report Generator

## Overview

Ssumitra is a Progressive Web App (PWA) designed to generate personalized astrocartography reports. It helps users identify "lucky cities" based on astrological principles by combining a mobile-first frontend with a Node.js/Express backend. The application integrates various external services for astrology calculations, AI interpretations, PDF generation, payment processing, and email delivery, targeting users interested in location-based astrology reports for cities globally. The project aims to provide insightful, detailed reports delivered via email after secure payment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

The frontend is built using pure HTML, CSS, and JavaScript, designed as a mobile-first PWA. It features offline capabilities, a fixed 375px viewport, and a custom manifest for standalone app behavior. Form inputs, such as birth date (DD/MM/YYYY dropdowns) and birth place (Google Places Autocomplete), are meticulously designed for user experience and accurate data capture.

### Backend

The backend utilizes Node.js with Express and TypeScript (via `tsx`). It exposes RESTful APIs for health checks, user data management, report generation, payment processing, and authentication. Key features include:

-   **Astrocartography Maps**: Interactive world maps using Leaflet.js and D3.js (v7) to display planetary lines (AC, DC, MC, IC) for 10 planets, color-coded and with tooltips. Both maps offer a demo mode and personalized lines for authenticated users, with the D3 map providing additional features like city markers, birth location display, and zoom/pan controls, along with an India-focused view.
-   **Authentication**: Implements Replit Auth using OpenID Connect, with session management backed by PostgreSQL and Passport.js for OAuth.
-   **Admin Dashboard**: A desktop-optimized, role-based access controlled interface for managing users, tracking reports, analyzing payments, and monitoring API usage.

### Database

PostgreSQL is used with Drizzle ORM. The schema, defined in `shared/schema.ts`, includes tables for sessions, users, birth data, reports, and payments. Database migrations are managed via `drizzle-kit`.

### Service Layer

The application incorporates a modular service layer for specific functionalities:

-   **Astrology & Vedic APIs**: Integrates RapidAPI for natal charts and astrocartography lines, and AstrologyAPI.com for Vedic data (Rashi, Nakshatra, Lagna, Dasha). Features a credibility scoring system for cities based on a 50/50 Western + Vedic methodology, including line proximity, paran lines, nakshatra/rashi affinity, and dasha timing, with personalized planet weighting and direction bonuses/penalties.
-   **AI Interpretations**: Leverages Anthropic's Claude API for personalized, goal-specific astrological interpretations.
-   **PDF Generation & Email**: Uses Puppeteer to convert HTML templates into multi-page PDF reports, which are then delivered via Resend email service.
-   **Geocoding**: Google Geocoding API converts city names to coordinates.
-   **Map Rendering**: Server-side map rendering using Node Canvas + D3.js for embedding maps into PDFs, supporting various global and regional views with goal-based line filtering.
-   **PDF Assembly**: Orchestrates multi-page PDF generation with dynamic content insertion, including cover, intro, maps, planetary lines, rankings, city details, Vedic insights, and a glossary.
-   **Template Processing**: Manages HTML template variable replacement and dynamic content generation for various report sections.

### Credibility Layer

A comprehensive system to build user trust, including Haversine distance calculations for line proximity, orb influence visualization, paran lines system with latitude bands, detailed 50/50 Western + Vedic scoring breakdown, birthplace direction logic, and AI-generated interpretations for "avoid" cities.

### Report Generation Workflow

The process involves user data submission, payment, order confirmation, fetching astrology data, AI interpretation generation, HTML-to-PDF conversion, and final report delivery via email.

## External Dependencies

### APIs and Services

-   **RapidAPI (Best Astrology API)**: Natal charts, astrocartography lines.
-   **AstrologyAPI.com**: Vedic astrology data (Rashi, Nakshatra, Dasha).
-   **Anthropic Claude**: AI-powered astrological interpretations.
-   **Resend**: Transactional email delivery.
-   **Google Geocoding**: City to coordinates conversion.
-   **Razorpay**: Payment processing (INR).
-   **Replit Auth**: User authentication via OpenID Connect.

### Database

-   **PostgreSQL**: Primary database for all application data, sessions, and Drizzle ORM.

### Runtime Dependencies

-   **Puppeteer**: Headless Chrome for PDF generation.
-   **tsx**: TypeScript execution.
-   **drizzle-kit**: Database schema management.