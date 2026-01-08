export const PRICING: Record<string, Record<string, number>> = {
  education: { india: 699, worldwide: 999, both: 1299 },
  career: { india: 699, worldwide: 999, both: 1299 },
  love: { india: 699, worldwide: 999, both: 1299 },
  relocation: { india: 699, worldwide: 999, both: 1299 },
  wealth: { india: 999, worldwide: 1499, both: 1799 },
  complete: { india: 1299, worldwide: 1799, both: 2499 },
};

export const ORIGINAL_PRICING: Record<string, Record<string, number>> = {
  education: { india: 1399, worldwide: 1999, both: 2599 },
  career: { india: 1399, worldwide: 1999, both: 2599 },
  love: { india: 1399, worldwide: 1999, both: 2599 },
  relocation: { india: 1399, worldwide: 1999, both: 2599 },
  wealth: { india: 1999, worldwide: 2999, both: 3599 },
  complete: { india: 2599, worldwide: 3599, both: 4999 },
};

function normalizeGoal(goal: string): string {
  const key = goal.toLowerCase();
  if (key === 'settlement') return 'relocation';
  return key;
}

function normalizeScope(scope: string): string {
  const key = scope.toLowerCase();
  if (key === 'international' || key === 'worldwide') return 'worldwide';
  if (key === 'combo' || key === 'both') return 'both';
  return key;
}

export function getPrice(goal: string, scope: string): number {
  const goalKey = normalizeGoal(goal);
  const scopeKey = normalizeScope(scope);
  const price = PRICING[goalKey]?.[scopeKey];
  if (price === undefined) {
    console.warn(`Pricing not found for goal="${goal}" scope="${scope}", using complete.both`);
    return PRICING.complete.both;
  }
  return price;
}

export function getOriginalPrice(goal: string, scope: string): number {
  const goalKey = normalizeGoal(goal);
  const scopeKey = normalizeScope(scope);
  const price = ORIGINAL_PRICING[goalKey]?.[scopeKey];
  if (price === undefined) {
    console.warn(`Original pricing not found for goal="${goal}" scope="${scope}", using complete.both`);
    return ORIGINAL_PRICING.complete.both;
  }
  return price;
}

export function getDiscount(goal: string, scope: string): number {
  const original = getOriginalPrice(goal, scope);
  const current = getPrice(goal, scope);
  return original - current;
}

export function getDiscountPercentage(goal: string, scope: string): number {
  const original = getOriginalPrice(goal, scope);
  const discount = getDiscount(goal, scope);
  return Math.round((discount / original) * 100);
}
