import { prisma } from "../../config/db";
import {
  detectSpendingAnomalies,
  SPENDING_ANOMALY_THRESHOLDS,
  type ExpenseAnomalyInput,
} from "../../utils/spendingAnomalies";

const active = { isDeleted: false as const };

/**
 * Same scope as other dashboard aggregates (all non-deleted expense records in window).
 * For user-only anomalies, add `createdById: userId` to the filter.
 */
export async function getSpendingAnomalies() {
  const since = new Date();
  since.setDate(since.getDate() - SPENDING_ANOMALY_THRESHOLDS.categoryLookbackDays);

  const rows = await prisma.financialRecord.findMany({
    where: {
      ...active,
      type: "EXPENSE",
      date: { gte: since },
    },
    select: {
      id: true,
      category: true,
      amount: true,
      date: true,
    },
    orderBy: { date: "desc" },
    take: 8000,
  });

  const inputs: ExpenseAnomalyInput[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    amount: r.amount.toNumber(),
    date: r.date,
  }));

  return detectSpendingAnomalies(inputs);
}
