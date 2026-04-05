import { Decimal } from "@prisma/client/runtime/library";
import type { FinancialRecord } from "@prisma/client";

/** Stable, human-readable label for audit / APIs (not i18n). */
export function formatFinancialRecordLabel(
  record: Pick<FinancialRecord, "type" | "category" | "amount">
): string {
  const amt = record.amount instanceof Decimal ? record.amount.toNumber() : Number(record.amount);
  return `${record.type} · ${record.category} · ${amt.toFixed(2)}`;
}
