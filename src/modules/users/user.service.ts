import { AuditAction, AuditTargetType } from "@prisma/client";
import { prisma } from "../../config/db";
import { insertAuditLog } from "../admin/auditLog.service";
import { ApiError } from "../../utils/apiError";
import type { AdminUpdateUserInput, ListUsersQuery } from "./user.schema";

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      isDeleted: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user || user.isDeleted) throw new ApiError(404, "Not found", "User not found");
  return user;
}

export async function updateUserById(actorId: string, targetUserId: string, input: AdminUpdateUserInput) {
  await getUserById(targetUserId);

  if (input.email) {
    const taken = await prisma.user.findFirst({
      where: { email: input.email, NOT: { id: targetUserId }, isDeleted: false },
    });
    if (taken) throw new ApiError(409, "Conflict", "Email already exists");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: input,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    await insertAuditLog(tx, {
      performedById: actorId,
      action: AuditAction.USER_UPDATED,
      targetType: AuditTargetType.USER,
      targetId: updated.id,
      targetLabel: updated.email,
    });
    return updated;
  });
}

export async function deactivateUser(actorId: string, targetUserId: string) {
  await getUserById(targetUserId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { status: "INACTIVE" },
      select: { id: true, email: true, name: true, role: true, status: true, updatedAt: true },
    });
    await insertAuditLog(tx, {
      performedById: actorId,
      action: AuditAction.USER_DEACTIVATED,
      targetType: AuditTargetType.USER,
      targetId: updated.id,
      targetLabel: updated.email,
    });
    return updated;
  });
}

export async function listUsers(query: ListUsersQuery) {
  const skip = (query.page - 1) * query.limit;
  const take = query.limit;

  const where = {
    isDeleted: false,
    ...(query.status ? { status: query.status } : {}),
    ...(query.role ? { role: query.role } : {}),
    ...(query.search
      ? {
          OR: [
            { email: { contains: query.search, mode: "insensitive" as const } },
            { name: { contains: query.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.user.count({ where }),
  ]);
  return { items, total };
}
