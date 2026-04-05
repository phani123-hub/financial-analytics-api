/**
 * Pure finance health scoring + insight strings (no I/O).
 * Reusable for tests, batch jobs, or alternate data sources.
 */

export type FinanceHealthStatus = "POOR" | "FAIR" | "GOOD" | "EXCELLENT";

export type FinanceHealthMetrics = {
  totalIncome: number;
  totalExpense: number;
  expenseToIncomeRatio: number | null;
  savingsRate: number | null;
  highestExpenseCategory: string | null;
};

export type FinanceHealthComputationInput = {
  totalIncome: number;
  totalExpense: number;
  highestExpenseCategory: string | null;
  /** Portion of total expenses in the largest category (0–1). */
  topCategoryExpenseShare: number;
  /** Recent monthly expense totals (e.g. last N calendar months). */
  monthlyExpenseTotals: number[];
};

export type FinanceHealthComputationResult = {
  score: number;
  status: FinanceHealthStatus;
  insights: string[];
  metrics: FinanceHealthMetrics;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundScore(n: number): number {
  return Math.round(clamp(n, 0, 100));
}

export function statusFromScore(score: number): FinanceHealthStatus {
  if (score >= 80) return "EXCELLENT";
  if (score >= 60) return "GOOD";
  if (score >= 40) return "FAIR";
  return "POOR";
}

/** Coefficient of variation of monthly expenses; lower = more stable. */
function expenseStabilityScore(monthlyExpenseTotals: number[]): number {
  const vals = monthlyExpenseTotals.filter((x) => x >= 0);
  if (vals.length < 2) return 65;

  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  if (mean <= 0) return 65;

  const variance =
    vals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / Math.max(1, vals.length - 1);
  const cv = Math.sqrt(variance) / mean;
  // cv 0 → 100 pts; cv ≥ 0.85 → ~0 pts
  return clamp(100 * (1 - Math.min(cv, 1.2) / 1.2), 0, 100);
}

function savingsComponent(savingsRate: number | null, totalIncome: number, totalExpense: number): number {
  if (totalIncome <= 0 && totalExpense <= 0) return 55;
  if (totalIncome <= 0 && totalExpense > 0) return 5;
  if (savingsRate === null) return 40;
  // Map savings rate: negative → 0, 0% → 15, 50%+ → ~100
  if (savingsRate < 0) return clamp(15 + savingsRate * 30, 0, 20);
  return clamp(15 + savingsRate * 170, 0, 100);
}

function expenseRatioComponent(
  expenseToIncomeRatio: number | null,
  totalIncome: number,
  totalExpense: number
): number {
  if (totalIncome <= 0 && totalExpense <= 0) return 55;
  if (totalIncome <= 0 && totalExpense > 0) return 8;
  if (expenseToIncomeRatio === null) return 40;
  const r = expenseToIncomeRatio;
  if (r <= 0.5) return 100;
  if (r <= 1) return clamp(100 - (r - 0.5) * 120, 35, 100);
  return clamp(35 - (r - 1) * 80, 0, 35);
}

function concentrationComponent(topShare: number, totalExpense: number): number {
  if (totalExpense <= 0) return 85;
  // Ideal: no single category dominates; >55% in one bucket hurts.
  const excess = Math.max(0, topShare - 0.35);
  return clamp(100 - excess * 130, 0, 100);
}

export function buildFinanceHealthInsights(
  input: FinanceHealthComputationInput,
  score: number
): string[] {
  const insights: string[] = [];
  const {
    totalIncome,
    totalExpense,
    highestExpenseCategory,
    topCategoryExpenseShare,
    monthlyExpenseTotals,
  } = input;

  const ratio =
    totalIncome > 0 ? totalExpense / totalIncome : totalExpense > 0 ? Number.POSITIVE_INFINITY : 0;
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : null;

  if (totalIncome <= 0 && totalExpense > 0) {
    insights.push("Recorded expenses exist without income — this pattern severely limits your health score");
  }

  if (totalIncome > 0 && totalExpense === 0) {
    insights.push("No expenses recorded — add data for a more realistic health picture");
  }

  if (savingsRate !== null) {
    if (savingsRate >= 0.2) insights.push("Your savings rate is healthy relative to income");
    else if (savingsRate >= 0.05) insights.push("Savings potential is moderate — room to improve");
    else if (savingsRate >= 0) insights.push("Savings are thin — consider reducing discretionary spend");
    else insights.push("Spending exceeds income — sustainability risk is high");
  }

  if (Number.isFinite(ratio) && totalIncome > 0) {
    if (ratio <= 0.5) insights.push("Your expenses are within a healthy range versus income");
    else if (ratio <= 0.85) insights.push("Expense load is noticeable — watch large recurring items");
    else insights.push("Expenses are very close to or above income");
  }

  if (highestExpenseCategory && totalExpense > 0) {
    const pct = Math.round(topCategoryExpenseShare * 100);
    if (pct >= 45) {
      insights.push(`${highestExpenseCategory} contributes ${pct}% of your expenses — concentration is high`);
    } else if (pct >= 28) {
      insights.push(`${highestExpenseCategory} is your largest expense area (${pct}% of spend)`);
    }
  }

  const vals = monthlyExpenseTotals.filter((x) => x >= 0);
  if (vals.length >= 3) {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (mean > 0) {
      const variance =
        vals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / Math.max(1, vals.length - 1);
      const cv = Math.sqrt(variance) / mean;
      if (cv < 0.25) insights.push("Your current spending pattern is relatively stable month to month");
      else if (cv > 0.55) insights.push("Monthly spending varies a lot — budgeting may help smooth cash flow");
    }
  }

  if (score >= 75) insights.push("Overall financial health interpretation: you are in a solid position if income stays steady");
  else if (score >= 55) insights.push("Overall financial health interpretation: fundamentals are acceptable with targeted improvements");
  else if (score >= 35) insights.push("Overall financial health interpretation: there is meaningful room to strengthen savings and control spend");
  else insights.push("Overall financial health interpretation: immediate attention to cash flow and expenses is recommended");

  const seen = new Set<string>();
  const deduped = insights.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  return deduped.slice(0, 8);
}

export function computeFinanceHealth(input: FinanceHealthComputationInput): FinanceHealthComputationResult {
  const { totalIncome, totalExpense, highestExpenseCategory, topCategoryExpenseShare, monthlyExpenseTotals } =
    input;

  const expenseToIncomeRatio = totalIncome > 0 ? totalExpense / totalIncome : null;
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome : null;

  const s1 = savingsComponent(savingsRate, totalIncome, totalExpense);
  const s2 = expenseRatioComponent(expenseToIncomeRatio, totalIncome, totalExpense);
  const s3 = concentrationComponent(topCategoryExpenseShare, totalExpense);
  const s4 = expenseStabilityScore(monthlyExpenseTotals);

  const score = roundScore(s1 * 0.38 + s2 * 0.38 + s3 * 0.14 + s4 * 0.1);
  const status = statusFromScore(score);
  const insights = buildFinanceHealthInsights(input, score);

  return {
    score,
    status,
    insights,
    metrics: {
      totalIncome,
      totalExpense,
      expenseToIncomeRatio: expenseToIncomeRatio !== null ? Number(expenseToIncomeRatio.toFixed(4)) : null,
      savingsRate: savingsRate !== null ? Number(savingsRate.toFixed(4)) : null,
      highestExpenseCategory,
    },
  };
}
