# Ssumitra - Vedic Astrocartography Report Generator

A Progressive Web App that generates personalized astrocartography reports, helping users discover their "lucky cities" based on both Western and Vedic astrological principles.

## Features

- **Personalized Reports** - Generate 45+ page PDF reports with AI-powered city interpretations
- **Dual Astrology System** - Combines Western astrocartography with Vedic astrology (50/50 scoring)
- **28 Planetary Lines** - 10 planets x 4 line types (AC, DC, MC, IC) with interactive visualization
- **86 Cities Analyzed** - 31 Indian + 55 International cities scored for 5 life goals
- **Goal-Based Analysis** - Career, Wealth, Love, Education, Settlement, or Complete reports
- **Interactive Maps** - D3.js and Leaflet maps with personalized planetary lines
- **Credibility Layer** - Transparent scoring with haversine distance calculations and orb influence
- **Mobile-First PWA** - Installable on any device with offline support

## Tech Stack

### Frontend
- Pure HTML, CSS, JavaScript (no frameworks)
- Progressive Web App (PWA) with Service Worker
- D3.js v7 for interactive SVG maps
- Leaflet.js for tile-based maps
- Google Places Autocomplete for birth location

### Backend
- Node.js with Express
- TypeScript via tsx runtime
- PostgreSQL with Drizzle ORM
- Puppeteer for PDF generation
- Replit Auth (OpenID Connect)

### External APIs
- RapidAPI (Best Astrology API) - Natal charts, astrocartography lines
- AstrologyAPI.com - Vedic astrology (Rashi, Nakshatra, Dasha)
- Anthropic Claude - AI-powered interpretations
- Resend - Email delivery
- Razorpay - Payment processing (INR)

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Required API keys (see Environment Variables)

### Installation

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `RAPIDAPI_KEY` | RapidAPI astrology endpoints |
| `ASTROLOGY_API_USER_ID` | AstrologyAPI.com user ID |
| `ASTROLOGY_API_KEY` | AstrologyAPI.com API key |
| `ANTHROPIC_API_KEY` | Claude AI for interpretations |
| `RESEND_API_KEY` | Email delivery |
| `GOOGLE_API_KEY` | Places Autocomplete & Geocoding |
| `RAZORPAY_KEY_ID` | Payment processing |
| `RAZORPAY_KEY_SECRET` | Payment processing |
| `SESSION_SECRET` | Session encryption |

## Project Structure

```
ssumitra/
├── public/                    # Static frontend files
│   ├── index.html            # Main PWA landing page
│   ├── styles.css            # Global styles
│   ├── app.js                # Frontend logic
│   ├── astro-map.html        # Leaflet map page
│   ├── d3-map.html           # D3.js map page
│   └── data/                 # TopoJSON map data
├── server/
│   ├── index.ts              # Express server entry point
│   ├── routes.ts             # API routes
│   ├── services/
│   │   ├── astrologyApi.js   # RapidAPI integration
│   │   ├── vedicApi.js       # AstrologyAPI.com integration
│   │   ├── claudeService.js  # AI interpretations
│   │   ├── pdfAssembler.js   # Multi-page PDF generation
│   │   ├── pdfGenerator.js   # Puppeteer PDF rendering
│   │   ├── templateProcessor.js  # HTML template processing
│   │   ├── map-renderer.js   # Server-side map PNG rendering
│   │   └── emailService.js   # Resend email delivery
│   └── templates/pdf/        # HTML templates for PDF pages
├── shared/
│   └── schema.ts             # Drizzle ORM database schema
├── icons/                    # PWA icons
├── manifest.json             # PWA manifest
└── service-worker.js         # Offline caching
```

## Report Types

| Report | Pages | Description |
|--------|-------|-------------|
| Single Goal (India) | ~40-50 | Top 12 cities for one goal |
| Single Goal (Both) | ~50-60 | Top 18 cities (India + International) |
| Complete (India) | ~150 | All 5 goals, comprehensive analysis |
| Complete (Both) | ~180-200 | All 5 goals, 86 cities analyzed |

## Credibility Layer

Each city score includes transparent breakdowns:

**Western Astrocartography (50 points)**
- Line Proximity: 25 pts (haversine distance to nearest line)
- Paran Lines: 25 pts (latitude-based planetary alignments)

**Vedic Astrology (50 points)**
- Nakshatra + Rashi: 20 pts
- Lagna-Vastu: 15 pts
- Dasha Timing: 15 pts

Visual orb strength indicators show line influence (Direct to Minimal based on km distance).

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System status |
| `/api/birth-data` | POST/GET | User birth information |
| `/api/astro-map-data` | GET | Planetary lines for maps |
| `/api/create-order` | POST | Razorpay payment order |
| `/api/verify-payment` | POST | Payment verification |
| `/api/reports` | GET | User's generated reports |

## Pricing

| Plan | Price | Cities |
|------|-------|--------|
| India Only | Rs 999 | 31 Indian cities |
| International | Rs 999 | 55 global cities |
| Combo (Both) | Rs 1,499 | All 86 cities |

## License

MIT License

## Author

Built with care for astrology enthusiasts seeking location-based guidance.
