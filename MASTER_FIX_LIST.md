# MASTER FIX LIST - Ssumitra Astrocartography
## Version 2.0 - Lagna-Aware Vedic Scoring

---

## IMPLEMENTATION NOTE

The Raveen Kapadia example (Scorpio Lagna, Vishakha Nakshatra) was used to ILLUSTRATE bugs during audit. All fixes must work DYNAMICALLY for ANY user based on their unique chart from API. Do NOT hardcode for this specific example.

---

> **Core USP**: Lagna-aware Vedic interpretation of astrocartography lines. 
> APIs are Lagna-blind. WE provide the intelligence.

---

## ARCHITECTURE DECISIONS

### DECISION 1: Dual-API Architecture (Confirmed)

**RapidAPI/astrology-api.io (Astrocartography)**
| USE | DON'T USE |
|-----|-----------|
| ✅ Line coordinates (AC, DC, MC, IC) | ❌ `life_area_ratings` (Lagna-blind) |
| ✅ Line distances from cities | ❌ `Astrodynes` (Western planetary strength) |
| ✅ Power zones locations | ❌ Pre-calculated goal scores |
| ✅ Paran crossing coordinates | ❌ Generic planet meanings |

**Reason**: API doesn't know Mercury is 11th Lord for Scorpio. WE provide that intelligence.

**AstrologyAPI.com (Vedic)**
| USE | Endpoint |
|-----|----------|
| ✅ Lagna (Ascendant sign) | `/planets` (Ascendant object) |
| ✅ Vimshottari Dasha | `/current_vdasha`, `/major_vdasha` |
| ✅ Nakshatra + Pada | `/planets` (Moon's nakshatra) |
| ✅ Retrograde status | `/planets` (isRetro flag) |
| ✅ Manglik analysis | `/manglik` |

### DECISION 2: Dynamic House Lord Derivation

Replace ALL hardcoded benefic/malefic tables with:
```javascript
deriveFunctionalStatus(planet, lagna) // Returns: BENEFIC | MALEFIC | NEUTRAL
```

Based on house lordships:
- Kendra lords (1,4,7,10): Neutral (Kendradhipati Dosha for benefics)
- Trikona lords (1,5,9): Always benefic
- Dusthana lords (6,8,12): Malefic
- 2nd/11th lords: Neutral (Maraka houses)
- Lagna lord: ALWAYS benefic (never penalized)

### DECISION 3: Goal-Specific Planet Selection

```javascript
getGoalPlanets(goal, lagna) // Returns array of relevant planets
```

For each goal, identify house lords:
- CAREER: 10th + 6th lords (profession + service)
- WEALTH: 2nd + 11th + 5th lords (income + gains + speculation)
- LOVE: 7th + 5th lords (partnership + romance)
- HEALTH: 1st + 6th lords (body + disease)
- CREATIVITY: 5th + 3rd lords (creation + skills)
- FAMILY: 4th + 2nd lords (home + family)

### DECISION 4: House Lord Boost Overrides Malefic Penalty

When a planet is both a dusthana lord AND relevant house lord for goal:
- Example: For Scorpio Lagna, Mars rules 6th (dusthana) AND 1st (trikona)
- **Rule**: Trikona lordship always wins
- **Implementation**: Check goal relevance FIRST, skip malefic penalty if relevant

### DECISION 5: Neutral Category for Mixed Lordships

Create NEUTRAL status for planets ruling both good and bad houses:
- Saturn for Aries (10th + 11th) → NEUTRAL not BENEFIC
- Moon for most lagnas → NEUTRAL (rules only 1 house, context-dependent)

### DECISION 6: Antardasha Equal Weight

Current: Only Mahadasha considered
Fix: Weight Antardasha equally with Mahadasha

```javascript
dashaScore = (mahadashaMatch * 0.5) + (antardashaMatch * 0.5)
```

If current Antardasha lord matches city's dominant planet line → timing boost

### DECISION 7: Paran Weighting by Latitude Band

Distance-aware paran calculations:
- Paran at same latitude as city → 100% weight
- Paran ±5° latitude → 80% weight
- Paran ±10° latitude → 60% weight
- Paran >10° latitude → 40% weight

### DECISION 8: Avoid City Interpretations

Generate AI interpretations for cities in AVOID category:
- Explain WHY city has challenging energy
- Focus on dusthana planet lines (6th, 8th, 12th lords)
- Provide growth perspective, not just warnings

### DECISION 9: No API Consolidation Needed

After testing VedicAstroAPI, AstrologyAPI.com, and RapidAPI:
- No single provider offers BOTH astrocartography AND true Vedic
- VedicAstroAPI lacks Yogas/Shadbala in starter tier
- Keep current dual-API architecture

---

## CRITICAL BUGS (C1-C5) ✅ ALL COMPLETE

### C1: Mars Misclassified for Scorpio Lagna ✅
**Current**: Mars treated as malefic (6th lord)
**Should Be**: Mars is BENEFIC (1st + 8th lord, Lagna lord always benefic)
**Impact**: Scorpio Lagna users get wrong city recommendations

### C2: All 12 Lagna Classifications Hardcoded ✅
**Fix Required**: Replace `BENEFIC_PLANETS_BY_LAGNA` with dynamic derivation
**FIXED**: Using deriveFunctionalStatus() for all planet classifications

| Lagna | Planet | Current | Should Be | Why |
|-------|--------|---------|-----------|-----|
| Scorpio | Mars | Malefic | **Benefic** | Lagna lord |
| Virgo | Saturn | Missing | **Benefic** | 5th + 6th lord (trikona wins) |
| Aquarius | Mercury | Missing | **Benefic** | 5th + 8th lord (trikona wins) |
| Aries | Moon | Benefic | **Neutral** | 4th lord only (Kendradhipati) |
| Taurus | Moon | Malefic | **Neutral** | 3rd lord only |
| Gemini | Moon | Malefic | **Neutral** | 2nd lord only (maraka) |
| Libra | Moon | Malefic | **Neutral** | 10th lord (Kendradhipati) |
| Leo | Venus | Malefic | **Neutral** | 3rd + 10th lord (mixed) |

### C3: API Response Parsing Errors ✅
**Issues**:
a) Lagna not extracted correctly from Ascendant.sign
b) Antardasha value displayed incorrectly (PDF showed "Mercury-Saturn", API returned "Mercury-Rahu")

**Fix**: Audit all API response parsing in vedicApi.js to ensure correct field extraction
**FIXED**: getVedicProfile() now correctly parses Lagna, Antardasha with 50/50 weighting

### C4: Goal-Planet Mapping Ignores Lagna ✅
**Current**: Same planets for all users' wealth goal
**Should Be**: Use house lords specific to user's Lagna
**FIXED**: getPersonalGoalPlanets() derives goal planets dynamically per Lagna

### C5: 5th House Lord Missing from Wealth Goal ✅
**Current**: WEALTH_LORDS_BY_LAGNA only has 2nd and 11th lords
**Should Add**: 5th lord (speculation, investments, sudden gains)
**FIXED**: 5th lord now included in Wealth goal planets

---

## HIGH PRIORITY (H1-H6) ✅ ALL COMPLETE

### H1: Unused Planetary Line Data ✅
**Current**: `lineDetails` fetched but scoring uses only basic scores
**Fix**: Use line proximity, line type (MC > AC > IC > DC) in scoring
**FIXED**: getLineTypeWeight() applies MC×1.25 for Career, DC×1.25 for Love, etc.

### H2: No Direction Penalty/Bonus ✅
**Current**: All directions treated equal
**Fix**: Apply Nakshatra-direction affinity bonus (+5-10%)
**FIXED**: Nakshatra direction from Moon's birth star applied in scoring

### H3: Dasha-Goal Timing Not Connected ✅
**Current**: Dasha shown but not used in goal scoring
**Fix**: If Mahadasha lord = goal-relevant planet → timing boost
**FIXED**: Dasha-Goal synergy with 50/50 Maha+Antardasha weighting

### H4: Retrograde Detection Available But Unused ✅
**Endpoint**: AstrologyAPI.com `/planets` has `isRetro` flag
**Fix**: Apply retrograde modifier (-10% for outer planets, +5% for Mercury)
**FIXED**: retrogradeStatus populated from API, ×0.90 for Mars/Jupiter/Saturn, ×1.05 for Mercury

### H5: Nakshatra Lord Boost Missing ✅
**Available**: Moon's Nakshatra Lord from `/planets`
**Fix**: If city's dominant line = Nakshatra Lord → affinity boost (+8%)
**FIXED**: getNakshatraLord() + ×1.10 boost when planet matches nakshatra lord

### H6: Manglik Check for Love Goal ✅
**Endpoint**: AstrologyAPI.com `/manglik`
**Fix**: For Love/Settlement goal, check Manglik status, adjust Mars line interpretation
**FIXED**: manglikStatus from /manglik API, ×0.85 penalty for Mars lines on Love goal if Manglik

---

## MEDIUM PRIORITY (M1-M6)

### M1: Combustion Detection Not Implemented
**Logic**: Planet within 6° of Sun (varies by planet) is combust
**Impact**: Combust planets have reduced benefic power

### M2: Exaltation/Debilitation Not Used
**Available**: Planet signs from `/planets`
**Fix**: Exalted planet lines get +15%, debilitated get -15%

### M3: Paran Distance Not Weighted
**Current**: All parans treated equally
**Fix**: Weight by latitude proximity to city

### M4: No Planet Speed Consideration
**Future**: Fast-moving planets have different energy than slow

### M5: House Strength Not Calculated
**Future**: Consider if goal-house is aspected by benefics

### M6: Divisional Charts (D9/D10) Not Used
**Future**: Navamsa for marriage, Dasamsa for career

---

## LOW PRIORITY (L1-L5) - Future Enhancements

### L1: VedicAstroAPI Alternative
Consider for: 21 languages, PDF reports, better Manglik details
Wait until: Pricing comparison, Yoga endpoints confirmed

### L2: Shadbala Integration
VedicAstroAPI doesn't have in starter tier
Alternative: Calculate manually from planetary positions

### L3: Yoga Detection
Dhana Yoga, Raj Yoga not available in APIs
Alternative: Implement basic yoga detection logic locally

### L4: Transit Overlay
Show current transit positions on astrocartography map

### L5: Relocation Chart for Top Cities
Calculate relocated Lagna for recommended cities

---

## CORE FUNCTIONS TO IMPLEMENT

### 1. deriveFunctionalStatus(planet, lagna)
```javascript
function deriveFunctionalStatus(planet, lagna) {
  const houses = getHousesRuledBy(planet, lagna);
  
  // Lagna lord is ALWAYS benefic
  if (houses.includes(1)) return 'BENEFIC';
  
  // Trikona lords (5, 9) are benefic
  if (houses.some(h => [5, 9].includes(h))) return 'BENEFIC';
  
  // Dusthana lords (6, 8, 12) are malefic UNLESS trikona
  if (houses.some(h => [6, 8, 12].includes(h))) return 'MALEFIC';
  
  // Kendra lords (4, 7, 10) are neutral (Kendradhipati dosha)
  if (houses.some(h => [4, 7, 10].includes(h))) return 'NEUTRAL';
  
  // Maraka lords (2, 11) are neutral
  if (houses.some(h => [2, 11].includes(h))) return 'NEUTRAL';
  
  return 'NEUTRAL';
}
```

### 2. getGoalPlanets(goal, lagna)
```javascript
function getGoalPlanets(goal, lagna) {
  const goalHouses = {
    'career': [10, 6],      // Profession + service
    'wealth': [2, 11, 5],   // Income + gains + speculation
    'love': [7, 5],         // Partnership + romance
    'health': [1, 6],       // Body + disease resistance
    'creativity': [5, 3],   // Creation + skills
    'family': [4, 2],       // Home + family
    'spiritual': [9, 12]    // Dharma + moksha
  };
  
  const houses = goalHouses[goal.toLowerCase()] || [10];
  return houses.map(h => getHouseLord(h, lagna));
}
```

### 3. getLagnaLord(lagna)
```javascript
const SIGN_LORDS = {
  'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury',
  'Cancer': 'Moon', 'Leo': 'Sun', 'Virgo': 'Mercury',
  'Libra': 'Venus', 'Scorpio': 'Mars', 'Sagittarius': 'Jupiter',
  'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
};

function getLagnaLord(lagna) {
  return SIGN_LORDS[lagna];
}
```

### 4. getHouseLord(houseNumber, lagna)
```javascript
function getHouseLord(houseNumber, lagna) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const lagnaIndex = signs.indexOf(lagna);
  const houseSign = signs[(lagnaIndex + houseNumber - 1) % 12];
  return SIGN_LORDS[houseSign];
}
```

### 5. isRelevantHouseLord(planet, goal, lagna)
```javascript
function isRelevantHouseLord(planet, goal, lagna) {
  const goalPlanets = getGoalPlanets(goal, lagna);
  return goalPlanets.includes(planet);
}
```

---

## SCORING FORMULA (50/50 Western + Vedic)

```javascript
function calculateCityScore(city, birthData, goal, vedicProfile) {
  // WESTERN COMPONENT (50%)
  const lineProximity = calculateLineProximity(city, astroLines); // 0-100
  const paranBonus = calculateParanBonus(city, paranMap);          // 0-20
  const westernScore = Math.min(100, lineProximity + paranBonus);
  
  // VEDIC COMPONENT (50%)
  const lagna = vedicProfile.lagna;
  const goalPlanets = getGoalPlanets(goal, lagna);
  
  let vedicScore = 0;
  
  // 1. Goal-planet line presence (30 pts)
  const dominantLine = city.lineDetails?.[0];
  if (goalPlanets.includes(dominantLine?.planet)) {
    vedicScore += 30;
  }
  
  // 2. Functional benefic boost (20 pts)
  const status = deriveFunctionalStatus(dominantLine?.planet, lagna);
  if (status === 'BENEFIC') vedicScore += 20;
  else if (status === 'NEUTRAL') vedicScore += 10;
  // MALEFIC: 0 pts
  
  // 3. Dasha timing (20 pts)
  const dashaMatch = checkDashaMatch(vedicProfile.currentDashaLord, dominantLine?.planet, goal);
  vedicScore += dashaMatch * 20;
  
  // 4. Nakshatra direction (15 pts)
  const directionMatch = checkNakshatraDirection(vedicProfile.nakshatra, city.direction);
  vedicScore += directionMatch * 15;
  
  // 5. Retrograde/Combustion modifier (±15 pts)
  const retrogradeMod = getRetrogradeMod(dominantLine?.planet, vedicProfile.planetPositions);
  vedicScore += retrogradeMod;
  
  // FINAL SCORE
  return Math.round((westernScore * 0.5) + (vedicScore * 0.5));
}
```

---

## IMPLEMENTATION ORDER

1. **Phase 1**: Fix C1-C3 (Lagna detection + Mars fix)
2. **Phase 2**: Implement 5 core functions
3. **Phase 3**: Fix C4-C5 (Goal-planet mapping)
4. **Phase 4**: Implement H1-H3 (Line proximity, direction, timing)
5. **Phase 5**: Implement H4-H6 (Retrograde, Nakshatra lord, Manglik)
6. **Phase 6**: Implement M1-M3 (Combustion, Exaltation, Paran distance)
7. **Phase 7**: Testing with multiple Lagna types

---

## VERIFICATION CHECKLIST

✅ **VERIFIED January 13, 2026** (see server/scripts/verifyLagnas.js)

- [x] Works for Aries Lagna - Mars=BENEFIC, Goal planets: Venus(2nd), Sun(5th), Saturn(11th)
- [x] Works for Scorpio Lagna - Mars=BENEFIC, Jupiter×1.67 boost (benefic+2nd+5th+nakshatra)
- [x] Works for Virgo Lagna - Saturn=BENEFIC (5th lord), Mercury=BENEFIC (Lagna lord)
- [x] Works for Aquarius Lagna - Mercury=BENEFIC (5th lord), Saturn=BENEFIC (Lagna lord)
- [x] No hardcoded planet lists remain - All derived via getHouseLord() and deriveFunctionalStatus()
- [x] All house lords derived dynamically - Goal planets vary by Lagna correctly

---

## REMOVED ITEMS (Intentionally Not Bugs)

- ~~Astrodynes not used~~ - Intentional. Lagna-blind Western calculation.
- ~~life_area_ratings not used~~ - Intentional. Generic, not personalized.
- ~~API pre-calculated scores not used~~ - Intentional. WE provide Lagna intelligence.

---

*Last Updated: January 13, 2026*
*Document Status: COMPLETE - All Critical (C1-C5) and High Priority (H1-H6) items verified and implemented*
