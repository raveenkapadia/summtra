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
  - `/api/create-order` - Create Razorpay payment order
  - `/api/verify-payment` - Verify payment and store record
  - `/api/login` - Redirect to Replit Auth login
  - `/api/logout` - Clear session and logout
  - `/api/auth/user` - Get current authenticated user

- **Authentication**: Replit Auth integration using OpenID Connect
  - Session management via PostgreSQL-backed connect-pg-simple
  - Passport.js strategy for OAuth flow
  - Mandatory sessions and users tables in database

### Database Layer

**Technology**: PostgreSQL with Drizzle ORM.

- **Schema Location**: `shared/schema.ts` exports all table definitions
- **Tables**:
  - `sessions` - Auth session storage (required for Replit Auth)
  - `users` - User profiles with email and name fields
  - `birth_data` - User-submitted birth information (date, time, location, coordinates)
  - `reports` - Generated report records with status and PDF URLs
  - `payments` - Razorpay payment tracking with verification status

- **Migrations**: Managed via drizzle-kit with output to `/migrations` directory

### Service Layer

Located in `server/services/`, each service handles a specific concern:

1. **astrologyApi.js** - Calls RapidAPI astrology endpoints for natal charts and astrocartography lines
2. **claudeService.js** - Generates personalized interpretations using Anthropic's Claude API
3. **pdfGenerator.js** - Uses Puppeteer to convert HTML templates to PDF reports
4. **emailService.js** - Sends reports and confirmations via Resend email API
5. **geocodingService.js** - Converts city names to coordinates using Google Geocoding API
6. **reportGenerator.js** - Orchestrates the complete report generation workflow

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