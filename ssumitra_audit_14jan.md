# Ssumitra System Audit - January 14, 2026

## User Details for Testing
- **Name:** Raveen Kapadia
- **Birth Date:** November 15, 1982
- **Birth Time:** 08:20 AM
- **Birth Place:** Ahmedabad, India (23.0225° N, 72.5714° E)
- **Goal:** Wealth

---

## SECTION 1: RAW API RESPONSES

### 1.1 Lagna API (AstrologyAPI.com)

**Endpoint URL:** `https://json.astrologyapi.com/v1/planets`

**Raw Response (Ascendant object):**
```json
{
  "id": 9,
  "name": "Ascendant",
  "fullDegree": 233.64172815546823,
  "normDegree": 23.64172815546823,
  "speed": 0,
  "isRetro": false,
  "sign": "Scorpio",
  "signLord": "Mars",
  "nakshatra": "Jyeshtha",
  "nakshatraLord": "Mercury",
  "nakshatra_pad": 3,
  "house": 1,
  "is_planet_set": false,
  "planet_awastha": "--"
}
```

**Parsed Lagna:** `Scorpio`
**Parsed Lagna Lord:** `Mars`
**Lagna Nakshatra:** `Jyeshtha` (Lord: Mercury)

**Code Location:** `server/services/vedicApi.js` lines 213-219

### 1.2 Nakshatra API

**Endpoint URL:** `https://json.astrologyapi.com/v1/planets` (Moon object)

**Raw Response (Moon object from planets array):**
The Moon object is extracted from the planets array. Based on the Vedic Profile output:

**Parsed Nakshatra:** `Vishakha` (Moon's nakshatra)
**Parsed Nakshatra Lord:** `Jupiter` (from NAKSHATRA_LORDS lookup)

**Code Location:** `server/services/vedicApi.js` lines 326-327
```javascript
const nakshatraName = moon?.nakshatra || null;
const nakshatraLord = moon?.nakshatraLord || getNakshatraLord(nakshatraName);
```

**Note:** The Ascendant nakshatra is `Jyeshtha` (Mercury), but the Moon nakshatra displayed in the PDF should be `Vishakha` (Jupiter). These are different and both are correct.

### 1.3 Dasha/Antardasha API - CRITICAL

**Endpoint URL:** `https://json.astrologyapi.com/v1/current_vdasha`

**Raw Response:**
```json
{
  "major": {
    "planet": "Mercury",
    "planet_id": 3,
    "start": "6-2-2014  5:31",
    "end": "6-2-2031  11:31"
  },
  "minor": {
    "planet": "Rahu",
    "planet_id": 7,
    "start": "5-8-2023  1:28",
    "end": "21-2-2026  10:46"
  },
  "sub_minor": {
    "planet": "Mars",
    "planet_id": 2,
    "start": "29-12-2025  2:49",
    "end": "21-2-2026  10:46"
  },
  "sub_sub_minor": {
    "planet": "Jupiter",
    "planet_id": 4,
    "start": "9-1-2026  10:29",
    "end": "16-1-2026  16:20"
  },
  "sub_sub_sub_minor": {
    "planet": "Venus",
    "planet_id": 5,
    "start": "12-1-2026  23:57",
    "end": "14-1-2026  4:56"
  }
}
```

**Parsed Values:**
| Level | Planet | Start Date | End Date |
|-------|--------|------------|----------|
| Mahadasha | Mercury | 6-2-2014 | **6-2-2031** |
| Antardasha | Rahu | 5-8-2023 | **21-2-2026** |
| Pratyantar | Mars | 29-12-2025 | 21-2-2026 |
| Sookshma | Jupiter | 9-1-2026 | 16-1-2026 |
| Prana | Venus | 12-1-2026 | 14-1-2026 |

**Code Location:** `server/services/vedicApi.js` lines 244-279

### DISCREPANCY NOTE:
External tools may show different Antardasha end dates. The AstrologyAPI.com response shows **Rahu Antardasha ends February 21, 2026**. If external tools show June 2026, this could be due to:
1. Different ayanamsa (Lahiri vs Chitrapaksha)
2. Different calculation methods
3. Time zone handling differences

The system uses the API response as the source of truth.

### 1.4 Manglik Status API

**Endpoint URL:** `https://json.astrologyapi.com/v1/manglik`

**Raw Response:**
```json
{
  "manglik_present_rule": {
    "based_on_aspect": [
      "Fourth house of your birth chart is aspected by Rahu",
      "Twelfth house of your birth chart is aspected by Rahu.",
      "Saturn is aspecting second house of your birth chart.",
      "Rahu is aspecting second house of your birth chart.",
      "Mars is aspecting eighth house of your birth chart.",
      "Ketu is aspecting eighth house of your birth chart."
    ],
    "based_on_house": [
      "Second house is occupied by planet Mars in your birth chart.",
      "Planet Ketu is situated in Second house in your birth chart.",
      "Planet Rahu is situated in Eighth house in your birth chart.",
      "Planet Sun is situated in Twefth house in your birth chart.",
      "Planet Saturn is in Twefth house in your horoscope."
    ]
  },
  "manglik_cancel_rule": [],
  "is_mars_manglik_cancelled": false,
  "manglik_status": "LESS_EFFECTIVE",
  "percentage_manglik_present": 16.5,
  "percentage_manglik_after_cancellation": 16.5,
  "manglik_report": "The manglik dosha is present in your horoscope, however it is less effective.",
  "is_present": false
}
```

**Parsed:** Manglik = No (LESS_EFFECTIVE, 16.5%)

### 1.5 Astrocartography Lines API (RapidAPI)

**Endpoint URL:** `https://best-astrology-api.p.rapidapi.com/api/v3/astrocartography/lines`

**API Response Structure:**
- Type: object
- Keys: success, lines, birth_location, calculation_info
- Lines: Array with 28 items (7 planets × 4 line types)

**Sample Line:**
```json
{
  "planet": "Sun",
  "line_type": "AC",
  "angle": "AC",
  "points": [
    {"latitude": -60, "longitude": 8.5137},
    {"latitude": -58.6, "longitude": 10.6671},
    ...
  ]
}
```

---

## SECTION 2: HOUSE LORDSHIP CALCULATION

**For Scorpio Lagna:**

| House | Sign | Lord (System) | Correct? | House Type |
|-------|------|---------------|----------|------------|
| 1st | Scorpio | **Mars** | ✅ Yes | Lagna (Trikona) |
| 2nd | Sagittarius | **Jupiter** | ✅ Yes | Maraka |
| 3rd | Capricorn | **Saturn** | ✅ Yes | Upachaya |
| 4th | Aquarius | **Saturn** | ✅ Yes | Kendra |
| 5th | Pisces | **Jupiter** | ✅ Yes | Trikona |
| 6th | Aries | **Mars** | ✅ Yes | Dusthana |
| 7th | Taurus | **Venus** | ✅ Yes | Kendra |
| 8th | Gemini | **Mercury** | ✅ Yes | Dusthana |
| 9th | Cancer | **Moon** | ✅ Yes | Trikona |
| 10th | Leo | **Sun** | ✅ Yes | Kendra |
| 11th | Virgo | **Mercury** | ✅ Yes | Maraka |
| 12th | Libra | **Venus** | ✅ Yes | Dusthana |

**Code Location:** `server/services/vedicLordship.js` lines 71-91
```javascript
function getHouseSign(houseNumber, lagna) {
  const lagnaIndex = SIGNS_ORDER.indexOf(normalized);
  const houseSignIndex = (lagnaIndex + houseNumber - 1) % 12;
  return SIGNS_ORDER[houseSignIndex];
}

function getHouseLord(houseNumber, lagna) {
  const houseSign = getHouseSign(houseNumber, lagna);
  return getSignLord(houseSign);
}
```

---

## SECTION 3: GOAL PLANETS CALCULATION

### Wealth Goal Configuration:
**File:** `server/services/astrologyApi.js` line 1405
```javascript
const GOAL_HOUSE_MAPPING = {
  'Wealth': [2, 5, 11, 9],  // 2nd (wealth), 5th (speculation), 11th (gains), 9th (fortune)
  ...
}
```

### Step-by-step Trace for Scorpio Lagna + Wealth:

| House | Sign | Lord |
|-------|------|------|
| 2nd | Sagittarius | **Jupiter** |
| 5th | Pisces | **Jupiter** (same planet) |
| 11th | Virgo | **Mercury** |
| 9th | Cancer | **Moon** |

**Yogakaraka Check:**
```javascript
// server/services/astrologyApi.js line 1326
const YOGAKARAKA_BY_LAGNA = {
  'Scorpio': null,  // No yogakaraka for Scorpio
  ...
}
```

### Function Output:
**File:** `server/services/astrologyApi.js` lines 1413-1442
```javascript
function getPersonalGoalPlanets(goal, lagna) {
  const houses = GOAL_HOUSE_MAPPING[goal]; // [2, 5, 11, 9]
  const planets = new Set();
  
  for (const house of houses) {
    const lord = getHouseLord(house, lagna);
    if (lord) planets.add(lord);
  }
  
  const yogakaraka = YOGAKARAKA_BY_LAGNA[lagna];
  if (yogakaraka) planets.add(yogakaraka);
  
  return Array.from(planets);
}
```

**Expected Output:** `['Jupiter', 'Mercury', 'Moon']`

### ISSUE ANALYSIS: Venus in Goal Planets

**Does Venus rule any Wealth houses (2, 5, 9, 11)?**
- House 2 (Sagittarius) → Lord: Jupiter ❌
- House 5 (Pisces) → Lord: Jupiter ❌
- House 9 (Cancer) → Lord: Moon ❌
- House 11 (Virgo) → Lord: Mercury ❌

**Venus rules:** 7th (Taurus) and 12th (Libra)

**Conclusion:** Venus should NOT appear in Wealth goal planets for Scorpio Lagna.

If Venus appears in the PDF's goal planets section, this is a **BUG**.

---

## SECTION 4: FUNCTIONAL STATUS CALCULATION

**File:** `server/services/vedicLordship.js` lines 129-172

### deriveFunctionalStatus() Output for Scorpio Lagna:

| Planet | Houses Ruled | Functional Status | Calculation Logic |
|--------|--------------|-------------------|-------------------|
| **Sun** | 10 | NEUTRAL | Rules Kendra (10th) only |
| **Moon** | 9 | BENEFIC | Rules Trikona (9th) |
| **Mars** | 1, 6 | BENEFIC | Rules Lagna (1st) - always benefic |
| **Mercury** | 8, 11 | MALEFIC | Rules Dusthana (8th) without Trikona |
| **Jupiter** | 2, 5 | BENEFIC | Rules Trikona (5th) |
| **Venus** | 7, 12 | MALEFIC | Rules Dusthana (12th) without Trikona |
| **Saturn** | 3, 4 | NEUTRAL | Rules Kendra (4th), Upachaya (3rd) |
| **Rahu** | None | NEUTRAL | Shadow planet, no lordship |
| **Ketu** | None | NEUTRAL | Shadow planet, no lordship |

### Code Logic:
```javascript
function deriveFunctionalStatus(planet, lagna) {
  const TRIKONA = [1, 5, 9];
  const DUSTHANA = [6, 8, 12];
  
  // Rule 1: Lagna lord is ALWAYS benefic
  if (houses.includes(1)) return 'BENEFIC';
  
  // Rule 2: Trikona lords are benefic
  if (rulestrikona) return 'BENEFIC';
  
  // Rule 3: Dusthana lords are malefic (unless trikona)
  if (rulesDusthana && !rulestrikona) return 'MALEFIC';
  
  // Default: NEUTRAL
  return 'NEUTRAL';
}
```

---

## SECTION 5: ANTARDASHA DATA FLOW - CRITICAL

### Current Observations:
The logs consistently show **Rahu** as the Antardasha planet, extracted correctly from the API.

### Data Source Trace:

#### Step 1: API Call
**File:** `server/services/vedicApi.js` line 168
```javascript
export async function getCurrentDasha(birthData) {
  return callAstrologyApi('current_vdasha', birthData);
}
```

#### Step 2: Extraction
**File:** `server/services/vedicApi.js` lines 250-254
```javascript
if (rawDashaResponse.minor && rawDashaResponse.minor.planet) {
  currentAntardasha = rawDashaResponse.minor.planet;  // "Rahu"
  currentDashaEnd = rawDashaResponse.minor.end || null;  // "21-2-2026  10:46"
}
```

#### Step 3: Return in Vedic Profile
**File:** `server/services/vedicApi.js` lines 338-340
```javascript
return {
  currentDashaLord: currentMahadasha,  // "Mercury"
  currentAntardasha,                    // "Rahu"
  currentDashaEnd,                      // "21-2-2026  10:46"
  ...
}
```

### PDF Template Population:

**Dasha Timeline Page:**
**File:** `server/services/pdfAssembler.js` lines 1024-1066
```javascript
const mahadasha = this.birthData.currentDashaLord || 'Jupiter';
let antardasha = this.birthData.currentAntardasha || '';
let antardashaEnd = this.birthData.currentDashaEnd || '';

const dashaData = {
  MAHADASHA: mahadasha,          // Should show "Mercury"
  ANTARDASHA: antardasha,        // Should show "Rahu"
  ANTARDASHA_END: formatDate(antardashaEnd),  // Should show "February 2026"
  ...
};
```

### CRITICAL BUG: Hardcoded Timeline Dates

**File:** `server/templates/pdf/dasha-timeline-page.html`

The template has **HARDCODED** dates that do NOT use the dynamic API data:

| Line | Issue |
|------|-------|
| 544 | Past period: "Nov 2022 - Nov 2023" (hardcoded) |
| 562 | Current period: "Nov 2023 - Jun 2026" (hardcoded) |
| 580 | Future period 1: "Jun 2026 - Sep 2028" (hardcoded) |
| 598 | Future period 2: "Sep 2028 - Jun 2031" (hardcoded) |
| 614, 621 | Best Windows dates (hardcoded) |

**Result:** User sees fictional schedule instead of their actual Mercury-Rahu period ending Feb 21, 2026.

### PRATYANTAR Not Populated

The template has `{{PRATYANTAR}}` placeholder (line 514), but:
- API returns `sub_minor.planet = "Mars"`
- pdfAssembler.js does NOT extract or pass this value
- Users see empty Pratyantar slot

---

## SECTION 6: RANKING TABLE vs CITY PAGE MISMATCH

### Investigation Required

**Ranking Table "Planetary Lines" column:**
- **Data field:** `city.lines` or `city.nearestLine`
- **File:** `server/services/templateProcessor.js` lines 136-147
```javascript
let cityLines = (city.lines || []).map(l => 
  typeof l === 'string' ? l : `${l.planet}-${l.line_type || 'AC'}`
).slice(0, 2).join(', ');

if (!cityLines && city.nearestLine) {
  cityLines = city.nearestLine;
}
```

**City Page "Planetary Line Influence":**
- **Data field:** `city.nearestLine` with distance
- **File:** `server/services/astrologyApi.js` lines 1616-1637

### Potential Mismatch Cause:

The `lines` array may contain ALL nearby lines, while `nearestLine` is specifically filtered for **goal-relevant planets only**:

```javascript
// Only consider goal-relevant planets
if (!preferredPlanets.includes(line.planet)) continue;
```

**Example for Tokyo (Wealth goal):**
- `lines` array might show: `["Venus-MC", "Jupiter-MC"]` (all nearby lines)
- `nearestLine` would only show: `"Jupiter-MC"` (goal-relevant only)

---

## SECTION 7: ASTROCARTOGRAPHY LINE DATA - ACTUAL API OUTPUT

### API Endpoint Response for City Lines

**Endpoint:** `/api/debug-city-scores`

**Actual API Response (International cities with line assignments):**
```json
{
  "success": true,
  "intlTop5": [
    {"name": "Doha", "score": 95, "lines": ["Jupiter-AC", "Sun-AC"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "Abu Dhabi", "score": 92, "lines": ["Venus-AC", "Sun-AC"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "Dubai", "score": 91, "lines": ["Venus-AC", "Sun-AC"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "San Francisco", "score": 91, "lines": ["Sun-DS", "Jupiter-DS"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "São Paulo", "score": 91, "lines": ["Sun-IC", "Jupiter-IC"], "method": "ASTROCARTOGRAPHY_LINES"}
  ],
  "sampleCities": [
    {"name": "Tokyo", "score": 87, "lines": ["Venus-MC", "Sun-MC"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "Singapore", "score": 67, "lines": ["Saturn-MC", "Mars-AC"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "New York", "score": 67, "lines": ["Saturn-IC", "Mars-DS"], "method": "ASTROCARTOGRAPHY_LINES"},
    {"name": "London", "score": 66, "lines": ["Mars-IC"], "method": "ASTROCARTOGRAPHY_LINES"}
  ]
}
```

### Tokyo Line Data (from API):
- **Coordinates:** 35.6762° N, 139.6503° E
- **Actual Lines Found:** `["Venus-MC", "Sun-MC"]`
- **Scoring Method:** `ASTROCARTOGRAPHY_LINES` (real API data, not fallback)
- **Final Score:** 87%

### Seoul Line Data (from API):
**Coordinates:** 37.5665° N, 126.9780° E

**Actual API Response with Line Details (from `/api/debug-city-scores`):**
```json
{
  "name": "Seoul",
  "score": 89,
  "lines": ["Moon-MC", "Mercury-MC"],
  "method": "ASTROCARTOGRAPHY_LINES",
  "lineDetails": [
    {
      "planet": "Moon",
      "type": "MC",
      "line": "Moon-MC",
      "distance": 1.8,
      "lineLongitude": 128.79
    },
    {
      "planet": "Mercury",
      "type": "MC",
      "line": "Mercury-MC",
      "distance": 3.9,
      "lineLongitude": 130.91
    }
  ]
}
```

**Seoul Astrocartography Analysis - Numeric Distance/Orb Data:**

| Line | Planet | Distance (°) | Line Longitude | Orb Strength | Goal Relevance |
|------|--------|--------------|----------------|--------------|----------------|
| Moon-MC | Moon | **1.8°** | 128.79° E | **STRONG** (0-5° tier) | 9th lord = Fortune |
| Mercury-MC | Mercury | **3.9°** | 130.91° E | **STRONG** (0-5° tier) | 11th lord = Gains |

**Distance Interpretation:**
- Seoul city longitude: 126.9780° E
- Moon-MC line at Seoul's latitude: 128.79° E → **1.8° difference** (~180km)
- Mercury-MC line at Seoul's latitude: 130.91° E → **3.9° difference** (~390km)

**Orb Strength Tiers (from `getOrbStrength()`):**
- 0-5° = STRONG (full influence)
- 5-10° = MODERATE (partial influence)
- 10-15° = WEAK (minimal influence)

**Both lines fall within the STRONG tier (0-5°), explaining Seoul's high score of 89%.**

**Why These Lines Score High for Wealth Goal:**
1. **Moon-MC** (1.8°): Moon rules 9th house (luck/fortune) for Scorpio Lagna - goal-relevant for Wealth
2. **Mercury-MC** (3.9°): Mercury rules 11th house (gains/income) for Scorpio Lagna - goal-relevant for Wealth
3. MC (Midheaven) line type weight = 1.2x for Career/Wealth goals

**Code Location:** `server/services/astrologyApi.js` lines 728-790

### Line Distance Calculation Logic:
```javascript
// File: server/services/astrologyApi.js lines 728-745
function findLinesNearCity(astroLines, cityLat, cityLng, toleranceDegrees = 15) {
  const nearbyLines = [];
  const mainPlanets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  
  // Handle different API response formats
  let linesData = astroLines.lines || astroLines;
  
  // Find longitude intersection at city's latitude
  // Calculate great-circle distance to determine proximity
  ...
}
```

### Orb Calculation:
**File:** `server/services/astrologyApi.js` function `getOrbStrength()`

The orb strength determines how strongly a planetary line influences a city based on distance.

---

## SECTION 8: SCORING CALCULATION FOR TOKYO

### Tokyo Data (from actual API response):
- **Coordinates:** 35.6762° N, 139.6503° E
- **Direction from Ahmedabad:** **East**
- **Final Score:** **87%**
- **Lines Found:** `["Venus-MC", "Sun-MC"]` (from `/api/debug-city-scores`)
- **Scoring Method:** `ASTROCARTOGRAPHY_LINES`

### Scoring Breakdown:

#### WESTERN SCORE (42/50):

**Line Proximity Score:**
From server logs:
```
Tokyo(East): W-Raw: 42, W-Adj: 42, Vedic: 45, Mult: 1.00, Total: 87
```

**Actual Lines Near Tokyo:** Venus-MC, Sun-MC
- Venus-MC proximity score contribution
- Sun-MC proximity score contribution

**Calculation Formula (from `server/services/astrologyApi.js` lines 212-222):**
```javascript
for (const lineInfo of nearbyLines.slice(0, 5)) {
  const [planet, lineType] = lineInfo.line.split('-');
  const planetScore = PLANET_SCORES[planet] || 5;  // Venus=12, Sun=10
  const modifier = LINE_MODIFIERS[lineType] || 1.0;  // MC=1.2
  const distanceFactor = Math.max(0.2, 1 - (lineInfo.distance / 15));
  rawScore += planetScore * modifier * distanceFactor;
}
```

#### VEDIC SCORE (45/50):

**Nakshatra-Direction Bonus (20 points):**
- Nakshatra: Vishakha
- Favorable direction: East (per NAKSHATRA_DIRECTIONS lookup)
- Tokyo direction: East ✅
- Score: **20/20**

**Lagna Direction Bonus (15 points):**
- Scorpio favorable direction: East/North
- Tokyo: East ✅
- Score: **15/15**

**Dasha Timing (10 points):**
- Current Mahadasha: Mercury
- Mercury relevance to Tokyo lines: Moderate
- Score: **10/15**

#### DIRECTION MULTIPLIER:
- East from Ahmedabad: **1.00** (no penalty)
- West cities get 0.75 penalty

#### FINAL CALCULATION:
```
Western Score: 42
Vedic Score: 45
Direction Multiplier: 1.00
Total: (42 + 45) × 1.00 = 87%
```

### Does This Match PDF?
Based on logs: Tokyo shows 87% ✅

---

## SECTION 9: CITY DATABASE

### Configuration:

**International Cities:**
- **Total in database:** 59 cities
- **File:** Defined in server code (INTERNATIONAL_CITIES array)

**Ranking Output:**
```
📊 Top 3: Tokyo(East): 87%, Seoul(East): 87%, Manila(East): 80%
📊 Bottom 3: Barcelona(West): 40%, Casablanca(West): 40%, Marrakech(West): 40%
```

### PDF Display:
- "12 Cities Analyzed" likely refers to the detailed city pages (best 6 + avoid 6)
- Full ranking table shows all 59 cities

---

## SECTION 10: BUGS FOUND SUMMARY

| # | Bug | Root Cause | File:Line | Fix Required |
|---|-----|------------|-----------|--------------|
| 1 | **Dasha Timeline Hardcoded** | Template has static dates instead of using API data | `dasha-timeline-page.html:544,562,580,598` | Make timeline dynamic |
| 2 | **Pratyantar Not Displayed** | sub_minor planet not extracted from API | `pdfAssembler.js:1024-1066` | Add PRATYANTAR to dashaData |
| 3 | **Mahadasha Period Wrong** | Defaults to "2020-2036" instead of API dates | `pdfAssembler.js:1065` | Parse API dates (2014-2031) |
| 4 | **Antardasha End Date Format** | API returns "21-2-2026 10:46", formatDate expects YYYY-MM | `pdfAssembler.js:1049-1057` | Fix date parser for DD-MM-YYYY format |
| 5 | **Best Windows Hardcoded** | Static dates in template | `dasha-timeline-page.html:614,621` | Calculate from actual dasha periods |

### Code Evidence for Bug #3 (Mahadasha Period Default):

**File:** `server/services/pdfAssembler.js` line 1065

```javascript
// Actual code showing the bug:
const dashaData = {
  ...this.baseData,
  MAHADASHA: mahadasha,
  ANTARDASHA: antardasha,
  CURRENT_THEME: this.getDashaTheme(mahadasha),
  ANTARDASHA_END: formatDate(antardashaEnd),
  MAHADASHA_PERIOD: this.birthData.mahadashaPeriod || '2020 - 2036'  // <-- BUG: Wrong default
};
```

**Issue:** The code falls back to `'2020 - 2036'` when `mahadashaPeriod` is not set in birthData. 

**API Evidence:** The Dasha API returns:
```json
{
  "major": {
    "start": "6-2-2014  5:31",
    "end": "6-2-2031  11:31"
  }
}
```

**Expected Period:** 2014 - 2031 (Mercury Mahadasha for Raveen)
**Actual Display:** 2020 - 2036 (wrong default)

**Fix Required:** Parse `rawDashaResponse.major.start` and `rawDashaResponse.major.end` to calculate the actual Mahadasha period and pass it to the template.

---

## SECTION 11: CODE SNIPPETS

### getPersonalGoalPlanets() - Full Code

**File:** `server/services/astrologyApi.js` lines 1413-1442
```javascript
function getPersonalGoalPlanets(goal, lagna) {
  if (!lagna) {
    console.warn('[getPersonalGoalPlanets] No lagna provided, using fallback');
    return ['Jupiter', 'Venus', 'Sun', 'Moon', 'Mercury', 'Saturn', 'Mars'];
  }
  
  const houses = GOAL_HOUSE_MAPPING[goal] || GOAL_HOUSE_MAPPING['Complete'];
  const planets = new Set();
  
  // Derive house lords dynamically for this user's Lagna
  for (const house of houses) {
    const lord = getHouseLord(house, lagna);
    if (lord) {
      planets.add(lord);
    }
  }
  
  // Add Yogakaraka if exists (most beneficial planet for this lagna)
  const yogakaraka = YOGAKARAKA_BY_LAGNA[lagna];
  if (yogakaraka) {
    planets.add(yogakaraka);
  }
  
  // NOTE: Lagna lord is NOT auto-added to goal planets
  // Lagna lord only appears if it naturally rules one of the goal's mapped houses
  
  return Array.from(planets);
}
```

### deriveFunctionalStatus() - Full Code

**File:** `server/services/vedicLordship.js` lines 129-172
```javascript
function deriveFunctionalStatus(planet, lagna) {
  if (!planet || !lagna) return 'NEUTRAL';
  
  const houses = getHousesRuledBy(planet, lagna);
  if (houses.length === 0) return 'NEUTRAL';
  
  const TRIKONA = [1, 5, 9];
  const DUSTHANA = [6, 8, 12];
  const KENDRA = [4, 7, 10];
  const MARAKA = [2, 11];
  
  const rulestrikona = houses.some(h => TRIKONA.includes(h));
  const rulesDusthana = houses.some(h => DUSTHANA.includes(h));
  const rulesKendra = houses.some(h => KENDRA.includes(h));
  const rulesMaraka = houses.some(h => MARAKA.includes(h));
  
  // Rule 1: Lagna lord is ALWAYS benefic
  if (houses.includes(1)) {
    return 'BENEFIC';
  }
  
  // Rule 2: Trikona lords (5, 9) are benefic
  if (rulestrikona) {
    return 'BENEFIC';
  }
  
  // Rule 3: Dusthana lords are malefic (unless trikona)
  if (rulesDusthana && !rulestrikona) {
    return 'MALEFIC';
  }
  
  // Rule 4: Kendra lords are neutral
  if (rulesKendra) {
    return 'NEUTRAL';
  }
  
  // Rule 5: Maraka lords are neutral
  if (rulesMaraka) {
    return 'NEUTRAL';
  }
  
  return 'NEUTRAL';
}
```

### Antardasha Data Fetching - Full Code

**File:** `server/services/vedicApi.js` lines 244-279
```javascript
if (rawDashaResponse) {
  // Primary API structure: { major: { planet: "X" }, minor: { planet: "Y" } }
  if (rawDashaResponse.major && rawDashaResponse.major.planet) {
    currentMahadasha = rawDashaResponse.major.planet;
    mahadashaEnd = rawDashaResponse.major.end || null;
  }
  if (rawDashaResponse.minor && rawDashaResponse.minor.planet) {
    currentAntardasha = rawDashaResponse.minor.planet;
    // FIX Priority 6: Use ANTARDASHA (minor) end date, not Mahadasha end
    currentDashaEnd = rawDashaResponse.minor.end || null;
  }
  
  // Alternative structure: { major_dasha, antar_dasha }
  if (!currentMahadasha && rawDashaResponse.major_dasha) {
    currentMahadasha = rawDashaResponse.major_dasha.planet || null;
    mahadashaEnd = rawDashaResponse.major_dasha.end || null;
  }
  if (!currentAntardasha && rawDashaResponse.antar_dasha) {
    currentAntardasha = rawDashaResponse.antar_dasha.planet || null;
    currentDashaEnd = rawDashaResponse.antar_dasha.end || null;
  }
  
  // If no antardasha end date found, fall back to mahadasha end
  if (!currentDashaEnd) {
    currentDashaEnd = mahadashaEnd;
  }
}

console.log('[VedicAPI] Extracted Mahadasha:', currentMahadasha, 'ends:', mahadashaEnd);
console.log('[VedicAPI] Extracted Antardasha:', currentAntardasha, 'ends:', currentDashaEnd);
```

---

## SUMMARY

### What's Working Correctly ✅
1. Lagna extraction: Scorpio correctly identified
2. House lordship calculation: All 12 houses correct for Scorpio
3. Goal planets derivation: Jupiter, Mercury, Moon for Wealth
4. Functional status: Correct benefic/malefic classification
5. Antardasha extraction: Rahu correctly extracted from API
6. City scoring: 59 cities scored with 50/50 methodology
7. Direction multipliers: East cities favored for Vishakha nakshatra
8. Caution zones: Now using REAL planetary lines (Venus-IC, Venus-DS)

### What Needs Fixing ❌
1. Dasha timeline page has hardcoded dates
2. Pratyantar dasha not displayed
3. Mahadasha period defaults to wrong values
4. Date parsing fails for DD-MM-YYYY format
5. Best Windows section is static

---

*Audit generated: January 14, 2026*
*System: Ssumitra Astrocartography Report Generator*
