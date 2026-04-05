import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/db";
import {
  buildFinancialRecommendations,
  type MonthSnapshot,
  type RecommendationEngineInput,
} from "../../utils/financialRecommendations";

/**
 * Same aggregate scope as other dashboard endpoints (all non-deleted records).
 * For user-scoped recommendations, add `createdById` to WHERE clauses and pass `userId` from JWT.
 */
export async function getFinancialRecommendations(): Promise<string[]> {
  const monthlyRows = await prisma.$queryRaw<Array<{ month: string; income: unknown; expense: unknown }>>`
    SELECT 
      to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN "type"::text = 'INCOME' THEN "amount" ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN "type"::text = 'EXPENSE' THEN "amount" ELSE 0 END), 0) AS expense
    FROM "FinancialRecord"
    WHERE "isDeleted" = false
    GROUP BY date_trunc('month', "date")
    ORDER BY date_trunc('month', "date") ASC
    LIMIT 24
  `;

  const monthlySnapshots: MonthSnapshot[] = monthlyRows.map((r) => ({
    month: r.month,
    income: new Decimal(r.income as string | number | Decimal).toNumber(),
    expense: new Decimal(r.expense as string | number | Decimal).toNumber(),
  }));

  if (monthlySnapshots.length === 0) {
    return buildFinancialRecommendations({
      monthlySnapshots: [],
      latestMonthCategoryExpenses: [],
      previousMonthCategoryExpenses: [],
      categoryTrailingAvgExpense: new Map(),
    });
  }

  const lastMonthKey = monthlySnapshots[monthlySnapshots.length - 1]!.month;
  const prevMonthKey =
    monthlySnapshots.length >= 2 ? monthlySnapshots[monthlySnapshots.length - 2]!.month : null;

  const categoryRows = await prisma.$queryRaw<Array<{ month: string; category: string; amount: unknown }>>`
    SELECT 
      to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
      "category",
      COALESCE(SUM("amount"), 0) AS amount
    FROM "FinancialRecord"
    WHERE "isDeleted" = false AND "type"::text = 'EXPENSE'
      AND "date" >= (date_trunc('month', CURRENT_DATE) - interval '24 months')
    GROUP BY date_trunc('month', "date"), "category"
  `;

  const byMonthCat = new Map<string, Array<{ category: string; amount: number }>>();
  for (const row of categoryRows) {
    const amt = new Decimal(row.amount as string | number | Decimal).toNumber();
    const list = byMonthCat.get(row.month) ?? [];
    list.push({ category: row.category, amount: amt });
    byMonthCat.set(row.month, list);
  }

  const latestMonthCategoryExpenses = byMonthCat.get(lastMonthKey) ?? [];
  const previousMonthCategoryExpenses = prevMonthKey ? (byMonthCat.get(prevMonthKey) ?? []) : [];

  // Trailing 3-month average expense per category (including lastMonthKey)
  const monthKeys = monthlySnapshots.map((m) => m.month);
  const last3 = monthKeys.slice(-3);
  const categoryTrailingAvgExpense = new Map<string, number>();
  const sums = new Map<string, number>();

  for (const mk of last3) {
    const cats = byMonthCat.get(mk) ?? [];
    for (const { category, amount } of cats) {
      sums.set(category, (sums.get(category) ?? 0) + amount);
    }
  }
  const denom = last3.length;
  for (const [cat, total] of sums) {
    categoryTrailingAvgExpense.set(cat, total / denom);
  }

  const payload: RecommendationEngineInput = {
    monthlySnapshots,
    latestMonthCategoryExpenses,
    previousMonthCategoryExpenses,
    categoryTrailingAvgExpense,
  };

  return buildFinancialRecommendations(payload);
}
