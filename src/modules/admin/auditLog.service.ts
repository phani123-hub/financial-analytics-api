import type { Prisma } from "@prisma/client";
import { AuditAction, AuditTargetType } from "@prisma/client";
import { prisma } from "../../config/db";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type AuditLogWriteInput = {
  performedById: string;
  /** If omitted, email is loaded from `User` (extra query). */
  performedByEmail?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetLabel?: string | null;
};

/**
 * Persists one audit row. Use inside `prisma.$transaction` and pass the transaction client as `db`.
 */
export async function insertAuditLog(db: DbClient, input: AuditLogWriteInput) {
  let email = input.performedByEmail;
  if (!email) {
    const actor = await db.user.findUnique({
      where: { id: input.performedById },
      select: { email: true },
    });
    if (!actor) throw new Error("Audit: performing user not found");
    email = actor.email;
  }

  return db.auditLog.create({
    data: {
      action: input.action,
      performedById: input.performedById,
      performedByEmail: email,
      targetType: input.targetType,
      targetId: input.targetId ?? undefined,
      targetLabel: input.targetLabel ?? undefined,
    },
  });
}

export type AuditLogApiRow = {
  action: string;
  performedBy: string;
  target: string;
  timestamp: string;
};

export async function listAuditLogs(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count(),
  ]);

  const items: AuditLogApiRow[] = rows.map((r) => ({
    action: r.action,
    performedBy: r.performedByEmail,
    target: r.targetLabel ?? r.targetId ?? "—",
    timestamp: r.createdAt.toISOString(),
  }));

  return { items, total, page, limit };
}
