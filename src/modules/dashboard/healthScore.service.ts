import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/db";
import { computeFinanceHealth } from "../../utils/financeHealthScore";

const active = { isDeleted: false as const };

/**
 * Uses the same scope as other dashboard aggregates: all non-deleted records.
 * To scope to the authenticated user only, add `createdById: userId` to each `where` below.
 */
export async function getFinanceHealthScore() {
  const [incomeAgg, expenseAgg, expenseByCategory] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...active, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...active, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.groupBy({
      by: ["category"],
      where: { ...active, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = (incomeAgg._sum.amount ?? new Decimal(0)).toNumber();
  const totalExpense = (expenseAgg._sum.amount ?? new Decimal(0)).toNumber();

  let highestExpenseCategory: string | null = null;
  let maxCat = new Decimal(0);
  for (const row of expenseByCategory) {
    const sum = row._sum.amount ?? new Decimal(0);
    if (sum.gt(maxCat)) {
      maxCat = sum;
      highestExpenseCategory = row.category;
    }
  }

  const topCategoryExpenseShare =
    totalExpense > 0 ? maxCat.toNumber() / totalExpense : 0;

  const monthlyRows = await prisma.$queryRaw<Array<{ month: string; expense: unknown }>>`
    SELECT 
      to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
      COALESCE(SUM("amount"), 0) AS expense
    FROM "FinancialRecord"
    WHERE "isDeleted" = false AND "type"::text = 'EXPENSE'
    GROUP BY date_trunc('month', "date")
    ORDER BY date_trunc('month', "date") DESC
    LIMIT 12
  `;

  const monthlyExpenseTotals = monthlyRows
    .map((r) => new Decimal(r.expense as string | number | Decimal).toNumber())
    .reverse();

  return computeFinanceHealth({
    totalIncome,
    totalExpense,
    highestExpenseCategory,
    topCategoryExpenseShare,
    monthlyExpenseTotals,
  });
}
