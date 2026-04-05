/**
 * Rule-based spending anomaly detection (no ML).
 * Works on expense rows with id, category, amount, date — reusable in jobs or tests.
 */

export type ExpenseAnomalyInput = {
  id: string;
  category: string;
  amount: number;
  date: Date;
};

export type SpendingAnomaly = {
  recordId: string;
  category: string;
  amount: number;
  reason: string;
};

/** Tunable thresholds — keep in sync with product docs / OpenAPI description */
export const SPENDING_ANOMALY_THRESHOLDS = {
  /** Multiple of same-category peer average (excluding this row) to flag */
  categoryToAvgMultiplier: 2.5,
  /** Need at least this many expenses in the category total (so peers ≥ 3) */
  minCategoryTransactions: 4,
  /** Multiple of recent global median expense (see lookback) */
  globalToMedianMultiplier: 3,
  /** Ignore tiny amounts for global-median rule */
  minAmountForGlobalMedianRule: 75,
  /** “Large purchase” vs recent median */
  absoluteHighVsMedianMultiplier: 2,
  /** Absolute amount that can qualify as unusually high when median check passes */
  absoluteHighFloor: 2500,
  /** Days of history used for category baselines */
  categoryLookbackDays: 540,
  /** Days used to compute “recent” median across all expenses */
  recentMedianLookbackDays: 120,
} as const;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

function fmtRatio(n: number): string {
  return (Math.round(n * 10) / 10).toFixed(1);
}

type CatStats = { sum: number; count: number };

function buildCategoryStats(rows: ExpenseAnomalyInput[]): Map<string, CatStats> {
  const m = new Map<string, CatStats>();
  for (const r of rows) {
    const cur = m.get(r.category) ?? { sum: 0, count: 0 };
    cur.sum += r.amount;
    cur.count += 1;
    m.set(r.category, cur);
  }
  return m;
}

function averageExcludingRow(stats: CatStats, amount: number): number | null {
  if (stats.count < SPENDING_ANOMALY_THRESHOLDS.minCategoryTransactions) return null;
  const others = stats.count - 1;
  if (others <= 0) return null;
  return (stats.sum - amount) / others;
}

/**
 * Returns anomalies with one reason per record (first matching rule wins by priority).
 * Priority: (1) vs same-category average, (2) vs recent global median, (3) large absolute outlier.
 */
export function detectSpendingAnomalies(
  rows: ExpenseAnomalyInput[],
  now: Date = new Date()
): SpendingAnomaly[] {
  if (rows.length === 0) return [];

  const recentCut = new Date(now);
  recentCut.setDate(recentCut.getDate() - SPENDING_ANOMALY_THRESHOLDS.recentMedianLookbackDays);
  const recentAmounts = rows
    .filter((r) => r.date >= recentCut)
    .map((r) => r.amount)
    .filter((a) => a > 0);
  const recentMedian = median(recentAmounts);

  const catStats = buildCategoryStats(rows);
  const seen = new Set<string>();
  const out: SpendingAnomaly[] = [];

  // Newest first feels most relevant for review UIs
  const ordered = [...rows].sort((a, b) => b.date.getTime() - a.date.getTime());

  for (const r of ordered) {
    const stats = catStats.get(r.category);
    if (!stats) continue;

    const avgExcl = averageExcludingRow(stats, r.amount);
    let reason: string | null = null;

    if (avgExcl !== null && avgExcl > 0 && r.amount >= SPENDING_ANOMALY_THRESHOLDS.categoryToAvgMultiplier * avgExcl) {
      const ratio = r.amount / avgExcl;
      reason = `This expense is ${fmtRatio(ratio)}× higher than your average ${r.category} spending`;
    } else if (
      recentMedian > 0 &&
      r.amount >= SPENDING_ANOMALY_THRESHOLDS.minAmountForGlobalMedianRule &&
      r.amount >= SPENDING_ANOMALY_THRESHOLDS.globalToMedianMultiplier * recentMedian
    ) {
      const ratio = r.amount / recentMedian;
      reason = `This expense is ${fmtRatio(ratio)}× higher than your recent typical expense (median over ~${SPENDING_ANOMALY_THRESHOLDS.recentMedianLookbackDays} days)`;
    } else if (
      recentMedian > 0 &&
      r.amount >= SPENDING_ANOMALY_THRESHOLDS.absoluteHighFloor &&
      r.amount >= SPENDING_ANOMALY_THRESHOLDS.absoluteHighVsMedianMultiplier * recentMedian
    ) {
      reason = `Unusually high-value transaction compared to your recent spending pattern`;
    }

    if (reason && !seen.has(r.id)) {
      seen.add(r.id);
      out.push({
        recordId: r.id,
        category: r.category,
        amount: Math.round(r.amount * 100) / 100,
        reason,
      });
    }
  }

  return out.slice(0, 100);
}
