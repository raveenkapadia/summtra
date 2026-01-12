# Ssumitra Scoring Logic Documentation

This document explains the complete scoring methodology used to calculate city compatibility scores for astrocartography reports.

---

## Table of Contents
1. [Total Score Overview](#total-score-overview)
2. [Western Astrocartography (50 points)](#western-astrocartography-50-points)
3. [Vedic Astrology (50 points)](#vedic-astrology-50-points)
4. [Direction Penalties](#direction-penalties)
5. [Planet Boost System](#planet-boost-system)
6. [Caps and Minimums](#caps-and-minimums)
7. [API Dependencies](#api-dependencies)

---

## Total Score Overview

```
Raw Score = Western Score (50 max) + Vedic Score (50 max) = 100 max
Final Score = clamp(Raw Score with direction adjustment, 40, 92)
```

| Component | Max Points | Description |
|-----------|------------|-------------|
| **Western Astrocartography** | 50 | Line proximity + Paran lines |
| **Vedic Astrology** | 50 | Nakshatra + Lagna + Dasha timing |
| **Raw Total** | 100 | Before direction adjustment |
| **Final Score** | 40-92 | After direction multiplier and clamping |

**Note:** The final score is clamped to 40-92 range. Direction multipliers (×0.75-1.0) are applied to the Western score before combining with Vedic, which can reduce the raw total. The clamp ensures no city scores unrealistically low (<40) or high (>92).

---

## Western Astrocartography (50 points)

### 1. Line Proximity Score (25 base, 35 max with boost)

The system calculates distance from the city to the nearest **goal-relevant** planetary line.

#### Distance-to-Score Mapping (Orb Strength)

| Distance (km) | Label | Base Score | Orb Bars |
|---------------|-------|------------|----------|
| 0 - 150 | Direct | 25 | ██████████ |
| 150 - 400 | Very Strong | 22 | █████████░ |
| 400 - 700 | Strong | 18 | ███████░░░ |
| 700 - 1100 | Moderate | 14 | █████░░░░░ |
| 1100 - 1600 | Weak | 10 | ███░░░░░░░ |
| 1600 - 2500 | Minimal | 5 | █░░░░░░░░░ |
| 2500 - 3500 | Trace | 2 | ░░░░░░░░░░ |
| 3500+ | None | 0 | ░░░░░░░░░░ |
| No line found | None | 3 | (base fallback) |

#### Goal-Relevant Planets

Only lines from goal-relevant planets are considered for scoring:

| Goal | Relevant Planets |
|------|------------------|
| **Career** | Sun, Saturn, Jupiter, Mercury |
| **Wealth** | Jupiter, Venus, Mercury, Sun |
| **Love** | Venus, Moon, Mars, Jupiter |
| **Education** | Mercury, Jupiter, Moon, Sun |
| **Settlement** | Moon, Venus, Saturn, Jupiter |
| **Complete** | All major planets |

*Note: Yogakaraka planet for user's Lagna is automatically added to relevant planets.*

### 2. Paran Lines Score (25 max)

Parans are latitude-based planetary alignments where two planets share angular positions.

#### Paran Combinations

| Paran | Career | Love | Wealth | Education | Settlement |
|-------|--------|------|--------|-----------|------------|
| Jupiter-Venus | Prosperity & growth | Romance & harmony | Abundance | Wisdom & creativity | Comfortable home |
| Sun-Mercury | Recognition & deals | Communication | Business acumen | Learning & expression | Clear thinking |
| Jupiter-Saturn | Long-term success | Commitment | Stable growth | Discipline & wisdom | Solid foundation |
| Mars-Jupiter | Bold initiatives | Passion | Risk-taking success | Competition edge | Active lifestyle |
| Moon-Venus | Intuitive success | Deep harmony | Comfort | Creative insight | Peaceful home |
| Sun-Jupiter | Leadership | Generosity | Expansion | Optimism | Prosperity |
| Mercury-Venus | Negotiation | Charm | Trade success | Artistic learning | Pleasant environment |
| Moon-Jupiter | Popular appeal | Emotional growth | Good fortune | Receptive learning | Family blessings |

#### Paran Score Calculation Formula

Paran score is **proximity-dependent** - parans only amplify when there's actual planetary line influence nearby.

**Special Case: Zero Parans**
If no parans are detected for the city, the function returns a **flat score of 5** with no distance scaling applied.

**Step 1: Base Score from Paran Count** (only if parans exist)

| Paran Count | Base Score |
|-------------|------------|
| 3+ parans | 25 |
| 2 parans | 20 |
| 1 paran | 15 |
| 0 parans | 5 (flat, no scaling) |

**Step 2: Distance Scaling** (only applies when parans exist)

| Distance to Nearest Line | Scale Factor | Example (3 parans) |
|--------------------------|--------------|-------------------|
| 0 - 1000 km | ×1.00 (100%) | 25 |
| 1000 - 1600 km | ×0.70 (70%) | 17 |
| 1600 - 2500 km | ×0.50 (50%) | 12 |
| 2500 - 3500 km | ×0.35 (35%) | 8 |
| 3500+ km | ×0.20 (20%) | 5 |
| No line data | ×0.25 (25%) | 6 |

**Final Formula:**
```
if (parans.length === 0) return 5;  // Flat score, no scaling
paranScore = floor(baseScore × distanceScaleFactor)
```

---

## Vedic Astrology (50 points)

### 3. Nakshatra-Rashi Score (20 max)

Based on whether city direction matches the user's birth Nakshatra favorable direction.

| Match | Score |
|-------|-------|
| Direction matches Nakshatra favorable | 20 |
| Direction doesn't match | 12 |

#### Nakshatra Direction Mappings

| Nakshatra | Direction | Nakshatra | Direction |
|-----------|-----------|-----------|-----------|
| Ashwini | East | Magha | East |
| Bharani | West | Purva Phalguni | South |
| Krittika | North | Uttara Phalguni | East |
| Rohini | East | Hasta | East |
| Mrigashira | South | Chitra | West |
| Ardra | West | Swati | North |
| Punarvasu | North | Vishakha | East |
| Pushya | East | Anuradha | South |
| Ashlesha | South | Jyeshtha | West |
| | | Mula | South |
| | | Purva Ashadha | South |
| | | Uttara Ashadha | North |
| | | Shravana | West |
| | | Dhanishta | North |
| | | Shatabhisha | South |
| | | Purva Bhadrapada | West |
| | | Uttara Bhadrapada | North |
| | | Revati | West |

### 4. Lagna-Vastu Score (15 max)

Based on whether city direction matches the user's Lagna (Ascendant) favorable direction per Vastu principles.

| Match | Score |
|-------|-------|
| Direction matches Lagna favorable | 15 |
| Direction doesn't match | 10 |

#### Lagna Direction Mappings

| Lagna | Favorable Direction |
|-------|---------------------|
| Aries / Mesha | East |
| Taurus / Vrishabha | South |
| Gemini / Mithuna | West |
| Cancer / Karka | North |
| Leo / Simha | East |
| Virgo / Kanya | South |
| Libra / Tula | West |
| Scorpio / Vrishchika | North |
| Sagittarius / Dhanu | East |
| Capricorn / Makara | South |
| Aquarius / Kumbha | West |
| Pisces / Meena | North |

### 5. Dasha Timing Score (15 max)

Measures how well the current Mahadasha lord supports the selected goal. This is a **timing factor**, not location-based - same score applies to all cities.

#### Dasha-Goal Affinity Table

| Dasha Lord | Career | Wealth | Love | Education | Settlement | Complete |
|------------|--------|--------|------|-----------|------------|----------|
| **Sun** | 15 | 10 | 8 | 12 | 8 | 10 |
| **Moon** | 8 | 8 | 14 | 10 | 14 | 10 |
| **Mars** | 12 | 10 | 10 | 8 | 8 | 10 |
| **Mercury** | 12 | 14 | 8 | 15 | 10 | 12 |
| **Jupiter** | 14 | 15 | 10 | 14 | 12 | 13 |
| **Venus** | 8 | 12 | 15 | 8 | 12 | 11 |
| **Saturn** | 10 | 8 | 6 | 10 | 14 | 10 |
| **Rahu** | 12 | 12 | 8 | 10 | 8 | 10 |
| **Ketu** | 8 | 6 | 8 | 12 | 10 | 9 |

**Score Range: 6-15 points**

---

## Direction Penalties

Direction multipliers are applied to the **Western score only** based on city direction relative to the user's Nakshatra favorable direction.

### Application Order

```
1. Calculate Western Total (Line Proximity + Paran) → cap at 50
2. Apply Direction Multiplier → adjustedWestern = min(westernTotal, 50) × multiplier
   (Multiplier only reduces or maintains the score; never increases it)
3. Add Vedic Total → adjustedTotal = adjustedWestern + vedicTotal  
4. Apply Final Clamp → finalScore = clamp(adjustedTotal, 40, 92)
```

**Key Point:** The direction multiplier is applied *after* the 50-point cap, so it can only reduce the Western contribution (from 50 down to as low as 37.5 for ×0.75 unfavorable directions).

### Complete Direction Multiplier Tables

#### If Favorable Direction = EAST

| City Direction | Multiplier | Type |
|----------------|------------|------|
| East | ×1.00 | Favorable |
| Northeast | ×1.00 | Favorable Adjacent |
| Southeast | ×1.00 | Favorable Adjacent |
| North | ×0.90 | Neutral |
| South | ×0.90 | Neutral |
| Northwest | ×0.85 | Partial Unfavorable |
| Southwest | ×0.85 | Partial Unfavorable |
| West | ×0.75 | Unfavorable |
| Origin | ×1.00 | Origin (birthplace) |

#### If Favorable Direction = WEST

| City Direction | Multiplier | Type |
|----------------|------------|------|
| West | ×1.00 | Favorable |
| Northwest | ×1.00 | Favorable Adjacent |
| Southwest | ×1.00 | Favorable Adjacent |
| North | ×0.90 | Neutral |
| South | ×0.90 | Neutral |
| Northeast | ×0.85 | Partial Unfavorable |
| Southeast | ×0.85 | Partial Unfavorable |
| East | ×0.75 | Unfavorable |
| Origin | ×1.00 | Origin (birthplace) |

#### If Favorable Direction = NORTH

| City Direction | Multiplier | Type |
|----------------|------------|------|
| North | ×1.00 | Favorable |
| Northeast | ×1.00 | Favorable Adjacent |
| Northwest | ×1.00 | Favorable Adjacent |
| East | ×0.90 | Neutral |
| West | ×0.90 | Neutral |
| Southeast | ×0.85 | Partial Unfavorable |
| Southwest | ×0.85 | Partial Unfavorable |
| South | ×0.75 | Unfavorable |
| Origin | ×1.00 | Origin (birthplace) |

#### If Favorable Direction = SOUTH

| City Direction | Multiplier | Type |
|----------------|------------|------|
| South | ×1.00 | Favorable |
| Southeast | ×1.00 | Favorable Adjacent |
| Southwest | ×1.00 | Favorable Adjacent |
| East | ×0.90 | Neutral |
| West | ×0.90 | Neutral |
| Northeast | ×0.85 | Partial Unfavorable |
| Northwest | ×0.85 | Partial Unfavorable |
| North | ×0.75 | Unfavorable |
| Origin | ×1.00 | Origin (birthplace) |

---

## Planet Boost System

Planet boosts personalize scores based on the user's natal chart. Boosts are multiplicative and applied to the Line Proximity Score.

### Boost Factors (Applied Multiplicatively)

| Factor | Multiplier | Condition |
|--------|------------|-----------|
| **Natural Benefic** | ×1.10 | Jupiter or Venus |
| **2nd Lord** | ×1.20 | Planet rules 2nd house (Wealth goal) |
| **11th Lord** | ×1.15 | Planet rules 11th house (Wealth goal) |
| **Yogakaraka** | ×1.35 | Most beneficial planet for Lagna |
| **Exalted** | ×1.15 | Planet in exaltation sign |
| **Debilitated** | ×0.85 | Planet in debilitation sign |
| **Combust** | ×0.85 | Planet too close to Sun |
| **Functional Malefic** | ×0.90 | Planet is malefic for this Lagna |

### Wealth Lords by Lagna

| Lagna | 2nd Lord | 11th Lord |
|-------|----------|-----------|
| Aries | Venus | Saturn |
| Taurus | Mercury | Jupiter |
| Gemini | Moon | Mars |
| Cancer | Sun | Venus |
| Leo | Mercury | Mercury |
| Virgo | Venus | Moon |
| Libra | Mars | Sun |
| Scorpio | Jupiter | Mercury |
| Sagittarius | Saturn | Venus |
| Capricorn | Saturn | Mars |
| Aquarius | Jupiter | Jupiter |
| Pisces | Mars | Saturn |

### Yogakaraka by Lagna

| Lagna | Yogakaraka Planet |
|-------|-------------------|
| Aries | None |
| Taurus | Saturn |
| Gemini | None |
| Cancer | Mars |
| Leo | Mars |
| Virgo | None |
| Libra | Saturn |
| Scorpio | None |
| Sagittarius | None |
| Capricorn | Venus |
| Aquarius | Venus |
| Pisces | None |

### Functional Status by Lagna

| Lagna | Functional Benefics | Functional Malefics |
|-------|---------------------|---------------------|
| Aries | Jupiter, Sun, Mars, Moon | Mercury, Venus, Saturn |
| Taurus | Saturn, Venus, Sun, Mercury | Moon, Mars, Jupiter |
| Gemini | Venus, Saturn, Mercury | Moon, Mars, Jupiter |
| Cancer | Mars, Jupiter, Moon | Mercury, Venus, Saturn |
| Leo | Mars, Jupiter, Sun | Mercury, Venus, Saturn |
| Virgo | Venus, Mercury | Moon, Mars, Jupiter, Sun |
| Libra | Saturn, Venus, Mercury | Sun, Moon, Mars, Jupiter |
| Scorpio | Jupiter, Moon, Sun | Mercury, Venus, Mars |

---

## Caps and Minimums

### Score Caps

| Component | Minimum | Maximum | Notes |
|-----------|---------|---------|-------|
| Line Proximity (base) | 0 | 25 | Before boost |
| Line Proximity (boosted) | 5 | 35 | After boost applied |
| Paran Score | 0 | 25 | Scaled by distance |
| Western Total (pre-multiplier) | 0 | 50 | Capped before direction multiplier |
| Western Total (post-multiplier) | 0 | 50 | After ×0.75-1.0 multiplier |
| Nakshatra-Rashi | 12 | 20 | Match vs no match |
| Lagna-Vastu | 10 | 15 | Match vs no match |
| Dasha Timing | 6 | 15 | Per affinity table |
| Vedic Total | 0 | 50 | Capped to maintain balance |
| **Final Score** | 40 | 92 | Clamped after all calculations |

### Score Floors and Guards

- **No nearby lines**: Base score of **3** for Line Proximity
- **Boosted score floor**: Minimum **5** to prevent excessive penalties
- **Final score floor**: **40** minimum (no city scores below 40%)
- **Final score ceiling**: **92** maximum (prevents unrealistic 100% scores)

### Why the 40-92 Clamp?

1. **Floor of 40**: Even cities with unfavorable directions and no nearby lines have *some* Vedic support (Dasha timing alone can contribute 6-15 points)
2. **Ceiling of 92**: Perfect alignment is extremely rare; the cap prevents overconfidence in any single location

---

## API Dependencies

### 1. Astrocartography API (RapidAPI - Best Astrology API)

**Endpoint:** Fetches planetary lines for all 15 celestial bodies

**Data Provided:**
- 28 planetary lines (7 planets × 4 line types)
- Line types: AC (Ascendant), DC (Descendant), MC (Midheaven), IC (Imum Coeli)
- Point arrays with latitude/longitude coordinates

**Used For:**
- Line Proximity Score calculation
- Distance measurements (Haversine formula)
- Determining which lines pass near each city

### 2. AstrologyAPI.com (Vedic Profile)

**Endpoints Used:**
- `/western_horoscope` - General profile
- `/numero_table` - Numerological data
- `/planets` - Planet positions
- `/current_vdasha_all` - Current Mahadasha/Dasha periods

**Data Provided:**
- Rashi (Moon Sign)
- Lagna (Ascendant Sign)
- Nakshatra (Birth Star)
- Current Dasha Lord
- Planet positions with signs and degrees

**Used For:**
- Nakshatra-Rashi direction matching
- Lagna-Vastu direction matching
- Dasha Timing Score
- Planet Boost calculations (exaltation, combustion)

### 3. Data Integrity Rules

1. **No Fabricated Data:** Lines are only assigned from actual API data. If no lines exist near a city, it honestly shows no nearby lines.

2. **Goal-Relevant Filtering:** Only planets relevant to the selected goal are considered for Line Proximity scoring.

3. **Distance Calculations:** Use Haversine formula for accurate great-circle distances between coordinates.

4. **Fallbacks:**
   - Missing Nakshatra defaults to 'Magha' (East direction)
   - Missing Lagna defaults to 'Scorpio' (North direction)
   - Missing Dasha defaults to 'Jupiter'

---

## Example Calculation

**User Profile:**
- Nakshatra: Vishakha (→ East favorable)
- Lagna: Scorpio (→ North favorable per Vastu)
- Current Dasha: Mercury
- Goal: Wealth

**City: Seoul (East direction, 347km from nearest line)**

### Step-by-Step Calculation

| Step | Component | Calculation | Score |
|------|-----------|-------------|-------|
| 1 | Line Proximity Base | Mercury-MC 347km = Strong orb | 18 |
| 2 | Planet Boost | Mercury: 11th Lord (×1.15) × Func. Malefic (×0.90) = ×1.035 | 18 × 1.035 = 19 |
| 3 | Paran Score | 3 parans at 347km → 25 × 1.0 = 25 | 25 |
| 4 | **Western Raw** | 19 + 25 = 44 | 44 |
| 5 | Western Cap | min(44, 50) | **44** |
| 6 | Direction Multiplier | Favorable=East, City=East → ×1.00 | 44 × 1.00 = **44** |
| 7 | Nakshatra-Rashi | Vishakha=East, Seoul=East → Match | 20 |
| 8 | Lagna-Vastu | Scorpio=North, Seoul=East → No match | 10 |
| 9 | Dasha Timing | Mercury + Wealth affinity | 14 |
| 10 | **Vedic Total** | 20 + 10 + 14 = 44 (capped at 50) | **44** |
| 11 | Raw Total | 44 (adjusted Western) + 44 (Vedic) | 88 |
| 12 | **Final Score** | clamp(88, 40, 92) | **88** |

*Note: If Seoul were in the West direction instead, the multiplier would be ×0.75, giving adjusted Western = 33, and final score = 33 + 44 = 77.*

---

## Version History

| Date | Change |
|------|--------|
| Jan 2026 | Initial 50/50 Western+Vedic methodology |
| Jan 2026 | Added Dasha-Goal affinity table |
| Jan 2026 | Removed fabricated line fallbacks |
| Jan 2026 | Added proximity-dependent paran scoring |

---

*This document is auto-maintained alongside the scoring codebase. Last updated: January 2026*
