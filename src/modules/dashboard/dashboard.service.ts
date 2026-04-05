import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "../../config/db";
import { serializeFinancialRecord } from "../records/record.service";

const active = { isDeleted: false as const };

export async function getSummary() {
  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...active, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...active, type: "EXPENSE" },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = incomeAgg._sum.amount ?? new Decimal(0);
  const totalExpense = expenseAgg._sum.amount ?? new Decimal(0);
  const netBalance = totalIncome.minus(totalExpense);

  return {
    totalIncome: totalIncome.toNumber(),
    totalExpense: totalExpense.toNumber(),
    netBalance: netBalance.toNumber(),
  };
}

export async function getCategoryBreakdown() {
  const rows = await prisma.financialRecord.groupBy({
    by: ["category"],
    where: active,
    _sum: { amount: true },
  });

  return rows.map((r) => ({
    category: r.category,
    total: (r._sum.amount ?? new Decimal(0)).toNumber(),
  }));
}

export async function getMonthlyTrends() {
  const rows = await prisma.$queryRaw<Array<{ month: string; income: unknown; expense: unknown }>>`
    SELECT 
      to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
      COALESCE(SUM(CASE WHEN "type"::text = 'INCOME' THEN "amount" ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN "type"::text = 'EXPENSE' THEN "amount" ELSE 0 END), 0) AS expense
    FROM "FinancialRecord"
    WHERE "isDeleted" = false
    GROUP BY date_trunc('month', "date")
    ORDER BY date_trunc('month', "date")
  `;
  const asNumber = (v: unknown) => new Decimal(v as string | number | Decimal).toNumber();
  return rows.map((r) => ({
    month: r.month,
    income: asNumber(r.income),
    expense: asNumber(r.expense),
  }));
}

export async function getRecentActivity(limit: number) {
  const rows = await prisma.financialRecord.findMany({
    where: active,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(serializeFinancialRecord);
}

export async function getInsights() {
  const [incomeAgg, expenseByCategory, expenseAgg] = await Promise.all([
    prisma.financialRecord.aggregate({
      where: { ...active, type: "INCOME" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.groupBy({
      by: ["category"],
      where: { ...active, type: "EXPENSE" },
      _sum: { amount: true },
    }),
    prisma.financialRecord.aggregate({
      where: { ...active, type: "EXPENSE" },
      _sum: { amount: true },
      _count: { _all: true },
    }),
  ]);

  let highestExpenseCategory: string | null = null;
  let max = new Decimal(0);
  for (const row of expenseByCategory) {
    const sum = row._sum.amount ?? new Decimal(0);
    if (sum.gt(max)) {
      max = sum;
      highestExpenseCategory = row.category;
    }
  }

  const expenseTotal = expenseAgg._sum.amount ?? new Decimal(0);
  const expenseCount = expenseAgg._count._all;
  const averageExpense =
    expenseCount > 0 ? expenseTotal.div(new Decimal(expenseCount)) : new Decimal(0);

  const incomeTotal = incomeAgg._sum.amount ?? new Decimal(0);
  const expenseToIncomeRatio = incomeTotal.gt(0) ? expenseTotal.div(incomeTotal).toNumber() : null;

  return {
    highestExpenseCategory,
    averageExpense: averageExpense.toNumber(),
    expenseToIncomeRatio,
  };
}
