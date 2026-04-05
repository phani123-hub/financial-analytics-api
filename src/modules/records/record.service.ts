import type { FinancialRecord } from "@prisma/client";
import { AuditAction, AuditTargetType } from "@prisma/client";
import { prisma } from "../../config/db";
import { insertAuditLog } from "../admin/auditLog.service";
import { formatFinancialRecordLabel } from "../../utils/auditRecordLabel";
import { ApiError } from "../../utils/apiError";
import type { CreateRecordInput, ListRecordsQuery, RecordType, UpdateRecordInput } from "./record.schema";

export function serializeFinancialRecord(record: FinancialRecord) {
  const { amount, ...rest } = record;
  return { ...rest, amount: amount.toNumber() };
}

type FinancialRecordWhere = {
  isDeleted: boolean;
  type?: RecordType;
  category?: { equals: string; mode: "insensitive" };
  date?: { gte?: Date; lte?: Date };
};

const active: Pick<FinancialRecordWhere, "isDeleted"> = { isDeleted: false };

export async function createRecord(createdById: string, input: CreateRecordInput) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.financialRecord.create({
      data: {
        amount: input.amount,
        type: input.type,
        category: input.category,
        date: input.date,
        description: input.description,
        createdById,
      },
    });
    await insertAuditLog(tx, {
      performedById: createdById,
      action: AuditAction.RECORD_CREATED,
      targetType: AuditTargetType.FINANCIAL_RECORD,
      targetId: created.id,
      targetLabel: formatFinancialRecordLabel(created),
    });
    return serializeFinancialRecord(created);
  });
}

export async function listRecords(query: ListRecordsQuery) {
  const skip = (query.page - 1) * query.limit;
  const take = query.limit;

  const where: FinancialRecordWhere = {
    ...active,
    ...(query.type ? { type: query.type } : {}),
    ...(query.category ? { category: { equals: query.category, mode: "insensitive" } } : {}),
    ...(query.dateFrom || query.dateTo
      ? {
          date: {
            ...(query.dateFrom ? { gte: query.dateFrom } : {}),
            ...(query.dateTo ? { lte: query.dateTo } : {}),
          },
        }
      : {}),
  };

  const order = query.order;
  const orderBy = query.sort === "amount" ? { amount: order } : { date: order };

  const [items, total] = await Promise.all([
    prisma.financialRecord.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    prisma.financialRecord.count({ where }),
  ]);

  return { items: items.map(serializeFinancialRecord), total };
}

export async function getRecord(id: string) {
  const record = await prisma.financialRecord.findFirst({
    where: { id, ...active },
  });
  if (!record) throw new ApiError(404, "Not found", "Record not found");
  return serializeFinancialRecord(record);
}

export async function updateRecord(actorId: string, id: string, input: UpdateRecordInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialRecord.findFirst({
      where: { id, ...active },
    });
    if (!existing) throw new ApiError(404, "Not found", "Record not found");
    const updated = await tx.financialRecord.update({
      where: { id },
      data: input,
    });
    await insertAuditLog(tx, {
      performedById: actorId,
      action: AuditAction.RECORD_UPDATED,
      targetType: AuditTargetType.FINANCIAL_RECORD,
      targetId: id,
      targetLabel: formatFinancialRecordLabel(updated),
    });
    return serializeFinancialRecord(updated);
  });
}

export async function softDeleteRecord(actorId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.financialRecord.findFirst({
      where: { id, ...active },
    });
    if (!existing) throw new ApiError(404, "Not found", "Record not found");
    await tx.financialRecord.update({
      where: { id },
      data: { isDeleted: true },
    });
    await insertAuditLog(tx, {
      performedById: actorId,
      action: AuditAction.RECORD_DELETED,
      targetType: AuditTargetType.FINANCIAL_RECORD,
      targetId: id,
      targetLabel: formatFinancialRecordLabel(existing),
    });
    return { id };
  });
}
