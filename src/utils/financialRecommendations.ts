/**
 * Rule-based financial recommendations from pre-aggregated dashboard inputs.
 * No randomness — deterministic strings for the same data.
 */

export type MonthSnapshot = {
  month: string;
  income: number;
  expense: number;
};

export type RecommendationEngineInput = {
  /** Oldest → newest; at least 0 entries */
  monthlySnapshots: MonthSnapshot[];
  /** Parsed from category rows for the latest month in snapshots */
  latestMonthCategoryExpenses: Array<{ category: string; amount: number }>;
  /** Previous calendar month in sequence (may be empty) */
  previousMonthCategoryExpenses: Array<{ category: string; amount: number }>;
  /** Per-category average monthly expense over up to the last 3 months (same category keys) */
  categoryTrailingAvgExpense: Map<string, number>;
};

const DISCRETIONARY = /food|grocery|groceries|dining|restaurant|entertainment|shopping|retail|transport|travel|coffee|subscription|subscriptions|leisure|hobby|hobbies|takeout|uber|lyft|cinema|games/i;

const ESSENTIAL = /rent|mortgage|utilities|utility|insurance|tax|loan|debt|healthcare|medical|pharmacy/i;

function sumCategory(list: Array<{ category: string; amount: number }>): number {
  return list.reduce((a, x) => a + x.amount, 0);
}

function discretionaryTotal(list: Array<{ category: string; amount: number }>): number {
  return list.filter((x) => DISCRETIONARY.test(x.category)).reduce((a, x) => a + x.amount, 0);
}

function findCategoryAmount(list: Array<{ category: string; amount: number }>, pattern: RegExp): number {
  let t = 0;
  for (const x of list) {
    if (pattern.test(x.category)) t += x.amount;
  }
  return t;
}

function savingsRate(snapshot: MonthSnapshot): number | null {
  if (snapshot.income <= 0) return null;
  return (snapshot.income - snapshot.expense) / snapshot.income;
}

/**
 * Produces ordered, deduplicated recommendation lines (newest-month aware).
 */
export function buildFinancialRecommendations(input: RecommendationEngineInput): string[] {
  const {
    monthlySnapshots,
    latestMonthCategoryExpenses,
    previousMonthCategoryExpenses,
    categoryTrailingAvgExpense,
  } = input;

  const out: string[] = [];

  if (monthlySnapshots.length === 0) {
    return ["Add income and expense records to receive personalized recommendations"];
  }

  const latest = monthlySnapshots[monthlySnapshots.length - 1]!;
  const prev = monthlySnapshots.length >= 2 ? monthlySnapshots[monthlySnapshots.length - 2]! : null;

  const latestCatTotal = sumCategory(latestMonthCategoryExpenses);
  const prevCatTotal = sumCategory(previousMonthCategoryExpenses);

  // --- Dominant category (latest month)
  if (latestCatTotal > 0 && latestMonthCategoryExpenses.length > 0) {
    const sorted = [...latestMonthCategoryExpenses].sort((a, b) => b.amount - a.amount);
    const top = sorted[0]!;
    const share = top.amount / latestCatTotal;
    if (share >= 0.38) {
      out.push(`${top.category} consumes a large share of your monthly expenses`);
    } else if (share >= 0.28) {
      out.push(`${top.category} represents a notable portion of last month’s spending`);
    }
  }

  // --- Food: trim suggestion when food-heavy and savings tight
  const foodSpend = findCategoryAmount(latestMonthCategoryExpenses, /food|grocery|groceries|dining|restaurant|takeout/i);
  const sr = savingsRate(latest);
  if (latest.income > 0 && latestCatTotal > 0 && foodSpend > 0) {
    const foodShare = foodSpend / latestCatTotal;
    if (foodShare >= 0.18 && (sr !== null && sr < 0.18)) {
      out.push("Reduce Food expenses by 10% to improve savings");
    } else if (foodShare >= 0.22) {
      out.push("Food-related spending is elevated — consider meal planning or dining out less");
    }
  }

  // --- Transport month-over-month
  if (prev && latest.month !== prev.month) {
    const tNow = findCategoryAmount(latestMonthCategoryExpenses, /transport|commute|fuel|gas|parking|transit|uber|lyft/i);
    const tWas = findCategoryAmount(previousMonthCategoryExpenses, /transport|commute|fuel|gas|parking|transit|uber|lyft/i);
    if (tWas > 0 && tNow > tWas * 1.12) {
      out.push("Your Transport costs increased compared to last month");
    } else if (tWas === 0 && tNow > 0 && latest.expense > 0) {
      out.push("Transport spending appeared this month — review one-off trips or new recurring costs");
    }
  }

  // --- Income stable vs discretionary drift
  if (prev && latest.month !== prev.month) {
    const incNow = latest.income;
    const incWas = prev.income;
    const incomeStable =
      incNow > 0 && incWas > 0 && Math.abs(incNow - incWas) / Math.max(incNow, incWas) <= 0.08;

    const discNow = discretionaryTotal(latestMonthCategoryExpenses);
    const discWas = discretionaryTotal(previousMonthCategoryExpenses);

    if (incomeStable && discWas > 0) {
      if (discNow > discWas * 1.14) {
        out.push("Income is stable, but discretionary spending is rising");
      } else if (discNow > discWas * 1.08 && discNow / Math.max(latest.expense, 1) >= 0.35) {
        out.push("Income is stable, but monthly discretionary spending is rising");
      }
    }
  }

  // --- Savings rate (latest month)
  if (sr !== null) {
    if (sr >= 0.22) {
      out.push("Your savings rate is healthy this month");
    } else if (sr >= 0.1) {
      out.push("Your savings rate has room to grow — prioritize high-impact categories");
    } else if (sr < 0 && latest.income > 0) {
      out.push("Last month’s expenses exceeded income — review large or recurring items");
    }
  } else if (latest.income <= 0 && latest.expense > 0) {
    out.push("No income recorded for the latest month with expenses — confirm salary or transfers are logged");
  }

  // --- Total expense growth (MoM)
  if (prev && prev.expense > 0 && latest.expense > prev.expense * 1.15) {
    out.push("Total spending grew sharply compared to the prior month");
  } else if (prev && prev.expense > 0 && latest.expense < prev.expense * 0.88) {
    out.push("Total spending decreased versus last month — good momentum if intentional");
  }

  // --- Income vs expense trend (multi-month)
  if (monthlySnapshots.length >= 3) {
    const tail = monthlySnapshots.slice(-3);
    const avgExp = tail.reduce((a, m) => a + m.expense, 0) / 3;
    const avgInc = tail.reduce((a, m) => a + m.income, 0) / 3;
    if (avgInc > 0 && avgExp / avgInc > 0.92) {
      out.push("Over recent months, expenses are running close to income — watch fixed costs");
    }
  }

  // --- Unusual category spike vs trailing average (light)
  if (latestCatTotal > 0 && categoryTrailingAvgExpense.size > 0) {
    for (const { category, amount } of latestMonthCategoryExpenses) {
      if (ESSENTIAL.test(category)) continue;
      const avg = categoryTrailingAvgExpense.get(category);
      if (avg !== undefined && avg > 0 && amount > avg * 1.45) {
        out.push(`${category} was higher than its recent average — worth a quick review`);
        break;
      }
    }
  }

  // --- Rent share (explicit)
  if (latestCatTotal > 0) {
    const rent = findCategoryAmount(latestMonthCategoryExpenses, /rent|mortgage|housing|lease/i);
    if (rent / latestCatTotal >= 0.32) {
      out.push("Rent consumes a large share of your monthly expenses");
    }
  }

  // --- Data quality nudge
  if (monthlySnapshots.length === 1) {
    out.push("Add another month of data for stronger month-over-month recommendations");
  }

  const seen = new Set<string>();
  const deduped = out.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return deduped.slice(0, 10);
}
