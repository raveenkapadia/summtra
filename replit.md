# Ssumitra - Astrocartography Report Generator

## Overview

Ssumitra is a Progressive Web App (PWA) that generates personalized astrocartography reports, helping users discover their "lucky cities" based on astrological principles. The application combines a mobile-first frontend with a Node.js/Express backend that integrates multiple external services for astrology calculations, AI-powered interpretations, PDF generation, payment processing, and email delivery.

The app targets users interested in location-based astrology, offering reports for cities in India, internationally, or combo packages. The workflow collects birth data, calculates astrological lines via external APIs, generates AI interpretations using Claude, produces PDF reports, and delivers them via email after payment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology**: Pure HTML, CSS, and JavaScript with no frontend frameworks.

- **PWA Implementation**: Service worker (`service-worker.js`) enables offline caching and installability
- **Mobile-First Design**: Fixed 375px viewport targeting mobile devices with responsive adaptations
- **Manifest**: `manifest.json` configures standalone app behavior with portrait orientation
- **Icon Generation**: Utility HTML tool (`generate-icons.html`) creates PWA icons in required sizes
- **Form Input Design**:
  - Birth date uses DD/MM/YYYY format via three dropdown selects (Day, Month, Year) - standard Indian format
  - Birth place uses Google Places Autocomplete for accurate coordinate capture
  - Coordinates stored in hidden fields and passed to API for precise astrology calculations

**Design Rationale**: Framework-free approach keeps the frontend lightweight and fast-loading, critical for a conversion-optimized landing page with PWA capabilities.

### Backend Architecture

**Technology**: Node.js with Express, TypeScript via tsx runtime.

- **Dual Entry Points**: 
  - `server/index.ts` - Main TypeScript server with full functionality
  - `server.js` - Legacy JavaScript server (likely for simpler deployments)
  
- **API Structure**: RESTful endpoints under `/api/` prefix
  - `/api/health` - System status and environment check
  - `/api/birth-data` - Submit/retrieve user birth information (authenticated)
  - `/api/user-profile` - Get authenticated user profile
  - `/api/reports` - Fetch user's generated reports
  - `/api/astro-map-data` - Get astrocartography lines for map visualization (public with personalized data for authenticated users)
  - `/api/create-order` - Create Razorpay payment order
  - `/api/verify-payment` - Verify payment and store record
  - `/api/login` - Redirect to Replit Auth login
  - `/api/logout` - Clear session and logout
  - `/api/auth/user` - Get current authenticated user

- **Astrocartography Map - Leaflet** (`/astro-map`):
  - Interactive world map using Leaflet.js with dark CartoDB tiles
  - Displays planetary lines (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)
  - Four line types per planet: Ascendant (AC), Descendant (DC), Midheaven (MC), Imum Coeli (IC)
  - Color-coded lines with tooltips and popups showing planetary meanings
  - Legend showing all planets and line type styles
  - Demo mode for unauthenticated users with sample lines
  - Personalized lines for authenticated users with birth data
  - Falls back to demo lines if RapidAPI astrology endpoint fails

- **D3.js Astrocartography Map** (`/d3-map`):
  - Interactive vector map using D3.js v7 with SVG rendering
  - **Data Sources**:
    - Natural Earth 50m TopoJSON for world boundaries (public domain, used by major publications)
    - Locally served from `/public/data/countries-50m.json` (756KB)
  - **Features**:
    - India-focused view with highlighted India boundary
    - World view toggle for global perspective
    - 10 planetary lines with color coding (Sun gold, Moon silver, Venus pink, etc.)
    - 4 line types with distinct dash patterns (AC solid, DC dashed, MC dotted, IC fine)
    - City markers sized by score, colored by goal relevance (green 85%+, orange 75%+, blue 65%+)
    - Birth location marked with pulsing red star
    - Interactive tooltips on hover showing city scores and planetary meanings
    - Zoom/pan controls with smooth D3 transitions
    - Legend panel with all planets and line types
    - Birth data info panel showing user details
  - **API Integration**: Uses `/api/astro-map-data` endpoint for personalized planetary lines
  - **Demo Mode**: Falls back to demo data for unauthenticated users

- **Authentication**: Replit Auth integration using OpenID Connect
  - Session management via PostgreSQL-backed connect-pg-simple
  - Passport.js strategy for OAuth flow
  - Mandatory sessions and users tables in database
  - Role-based access control: `user` (default) or `admin`

- **Admin Dashboard** (`/admin`):
  - Desktop-optimized interface separate from mobile PWA
  - Protected by admin middleware - only users with `role: 'admin'` can access
  - First user to access admin becomes the super admin automatically
  - Features: User management, reports tracking, payment analytics, revenue stats, API usage monitoring
  - API endpoints under `/api/admin/*` for CRUD operations
  - **API Usage Tracking**: Monitors all `/api/*` endpoint calls with response times, daily stats, top endpoints, and live feed

### Database Layer

**Technology**: PostgreSQL with Drizzle ORM.

- **Schema Location**: `shared/schema.ts` exports all table definitions
- **Tables**:
  - `sessions` - Auth session storage (required for Replit Auth)
  - `users` - User profiles with email and name fields
  - `birth_data` - User-submitted birth information (date, time, location, coordinates) + Vedic profile (rashi, nakshatra, lagna, dasha)
  - `reports` - Generated report records with status, PDF URLs, and `reportGoal` for goal-based customization
  - `payments` - Razorpay payment tracking with verification status

- **Migrations**: Managed via drizzle-kit with output to `/migrations` directory

### Service Layer

Located in `server/services/`, each service handles a specific concern:

1. **astrologyApi.js** - Calls RapidAPI astrology endpoints for natal charts and astrocartography lines. Uses transparent `calculateCredibilityScore()` with direction penalty/bonus to score ALL 86 cities (31 India + 55 International) with 50/50 Western+Vedic methodology. Exports `/api/validate-report` endpoint for debugging score breakdowns.
2. **vedicApi.js** - Integrates with AstrologyAPI.com for Vedic astrology data (Rashi, Nakshatra, Lagna, Dasha periods). Provides `getVedicProfile()`, `getDashaInsight()`, `checkNakshatraDirectionMatch()`, and `getDirectionFromBirthPlace()` functions
3. **claudeService.js** - Generates personalized interpretations using Anthropic's Claude API with goal-specific customization (Education, Career, Love, Relocation, Wealth, Complete)
4. **pdfGenerator.js** - Uses Puppeteer to convert HTML templates to PDF reports
5. **emailService.js** - Sends reports and confirmations via Resend email API
6. **geocodingService.js** - Converts city names to coordinates using Google Geocoding API. Also exports `INDIAN_CITIES` (31), `INTERNATIONAL_CITIES` (55), and `ALL_CITIES` arrays with coordinates
7. **reportGenerator.js** - Orchestrates the complete report generation workflow
8. **map-renderer.js** - Server-side astrocartography map PNG rendering using Node Canvas + D3.js
   - Uses Natural Earth 110m TopoJSON data (`/public/data/countries-110m.json`)
   - Module-level caching for world data to avoid repeated disk reads
   - Supports 15 view types: world, india, india_north/south/east/west/central, europe, middle_east, southeast_asia, east_asia, north_america, south_america, australia, africa
   - Goal-based line filtering with GOAL_LINE_CONFIG for Career, Wealth, Love, Education, Settlement, Complete
   - Primary/secondary/other importance levels with distinct opacity/glow/line-width
   - Test endpoints: `/api/test-map` (default), `/api/test-map/:goal` (goal-filtered)
9. **pdfAssembler.js** - Orchestrates multi-page PDF assembly with page ordering
   - Single Goal reports: ~40-50 pages (cover, intro, maps, planetary lines, rankings, city details, vedic, dasha, glossary)
   - Complete reports: ~180-200 pages (all 5 goals with dedicated sections per goal)
   - Uses templateProcessor.js to replace {{PLACEHOLDERS}} with HTML content
   - Integrates AstroMapRenderer for embedded map images as base64
   - Page types: cover, intro, howtoread, legend, map, planets, divider, ranking, city-best, city-map, city-avoid, vedic, dasha, glossary
   - Test endpoint: `/api/test-pdf/:reportType/:scope/:goal` (Single/Complete, India/Both, goal name)
10. **templateProcessor.js** - HTML template variable replacement
    - Replaces {{PLACEHOLDER}} variables with prepared HTML content
    - Generates HTML for planetary lines, power zones, top cities, rankings
    - Handles goal-specific content customization

### Credibility Layer System

The report includes a comprehensive credibility/transparency layer to build user trust:

1. **Haversine Distance Calculation**
   - Calculates exact km distance from cities to nearest planetary lines
   - Uses haversine formula for accurate great-circle distance
   - Shows distance in city page headers (e.g., "235km west")

2. **Orb Influence Visualization**
   - Visual bars showing line strength: ██████████ (Direct <100km) to ██░░░░░░░░ (Minimal >600km)
   - Categories: Direct (<100km), Very Strong (100-200km), Strong (200-350km), Moderate (350-500km), Weak (500-600km), Minimal (>600km)
   - Explains that lines influence areas within 700km orb

3. **Paran Lines System**
   - Latitude-based planetary alignments with zone-specific combinations
   - **Latitude Bands**: Tropical (<15°), Subtropical (15-25°), Temperate (25-40°), Northern (>40°)
   - Each band has distinct paran combinations + goal-specific modifiers
   - Goal paran additions: Career (Sun-Jupiter), Wealth (Jupiter-Venus), Love (Venus-Mars), etc.

4. **Transparent 50/50 Western + Vedic Scoring**
   - **Western Score** (50 points max):
     - Line Proximity: Haversine distance to nearest planetary line (10-25 points, based on orb strength)
     - Paran Lines: Count of active parans for city latitude (8-25 points)
   - **Vedic Score** (50 points max):
     - Nakshatra+Rashi Affinity: Direction matching with favorable nakshatra direction (10-20 points)
     - Lagna-Vastu: Lagna element correlation with city direction (8-15 points)
     - Dasha Timing: Current dasha lord alignment with planetary lines (8-15 points)
   - **Direction Penalty/Bonus System**:
     - Cities in favorable direction (nakshatra-based): +25 points bonus
     - Cities in opposite direction: -25 points penalty
     - Partial alignment: +18/-12 points
   - **Score Distribution**: Calibrated for 48-72% range with 24-point spread
   - **Verdict Thresholds**: Highly Favorable (≥70%), Favorable (≥60%), Moderate (≥52%), Challenging (<52%)
   - Displayed on city pages with full calculation breakdown

5. **Birthplace Direction Logic**
   - Shows cardinal direction from birthplace to city (N/S/E/W/NE/NW/SE/SW)
   - Shows "Origin" instead when city is within 50km of birthplace
   - Uses atan2 for accurate compass bearing calculation

6. **Avoid City AI Interpretations**
   - Claude generates unique caution interpretations for each low-score city
   - Goal-specific challenging factors (authority conflicts, financial blocks, etc.)
   - Neutral, non-discouraging tone with planetary influence context

7. **Understanding Your Lines Page**
   - Educational page explaining orb influence, paran lines, and scoring methodology
   - Shows user's planetary line paths across globe regions
   - Explains why cities work even when direct lines pass elsewhere

### Report Generation Workflow

1. User submits birth data and payment
2. Order confirmation email sent
3. Astrology data fetched from RapidAPI
4. Claude generates personalized interpretations
5. Puppeteer renders HTML to PDF
6. Report emailed to user via Resend

## External Dependencies

### APIs and Services

| Service | Purpose | Environment Variable |
|---------|---------|---------------------|
| RapidAPI (Best Astrology API) | Natal charts, astrocartography lines | `RAPIDAPI_KEY` |
| AstrologyAPI.com | Vedic astrology (Rashi, Nakshatra, Dasha) | `ASTROLOGY_API_USER_ID`, `ASTROLOGY_API_KEY` |
| Anthropic Claude | AI-powered astrological interpretations | `ANTHROPIC_API_KEY` |
| Resend | Transactional email delivery | `RESEND_API_KEY` |
| Google Geocoding | City to coordinates conversion | `GOOGLE_API_KEY` |
| Razorpay | Payment processing (INR) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Replit Auth | User authentication via OpenID Connect | `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET` |

### Database

- **PostgreSQL**: Required for Drizzle ORM, sessions, and all data storage
- **Connection**: Via `DATABASE_URL` environment variable

### Runtime Dependencies

- **Puppeteer**: Headless Chrome for PDF generation (requires sandbox flags on Replit)
- **tsx**: TypeScript execution without compilation step
- **drizzle-kit**: Database schema management and migrations

### Deployment

- **Target**: Replit Cloud Run deployment
- **Static Serving**: `npx serve` for production static files
- **Port Configuration**: Internal 3000/5000, external 80