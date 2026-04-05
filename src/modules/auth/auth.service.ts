import bcrypt from "bcrypt";
import { AuditAction, AuditTargetType, Role } from "@prisma/client";
import { prisma } from "../../config/db";
import { insertAuditLog } from "../admin/auditLog.service";
import { ApiError } from "../../utils/apiError";
import { signAccessToken } from "../../utils/jwt";
import type { Env } from "../../config/env";
import type { LoginInput, RegisterInput } from "./auth.schema";

export async function register(input: RegisterInput, env: Env) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing && !existing.isDeleted) throw new ApiError(409, "Conflict", "Email already registered");

  const password = await bcrypt.hash(input.password, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        password,
        name: input.name,
        role: Role.VIEWER,
      },
      select: { id: true, email: true, name: true, role: true, status: true, createdAt: true },
    });

    await insertAuditLog(tx, {
      performedById: user.id,
      performedByEmail: user.email,
      action: AuditAction.USER_CREATED,
      targetType: AuditTargetType.USER,
      targetId: user.id,
      targetLabel: user.email,
    });

    const token = signAccessToken({ sub: user.id, role: user.role }, env);
    return { user, token };
  });
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, status: true, createdAt: true, isDeleted: true },
  });
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw new ApiError(404, "Not found", "User not found");
  }
  const { isDeleted: _removed, ...safe } = user;
  return safe;
}

export async function login(input: LoginInput, env: Env) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new ApiError(401, "Unauthorized", "Invalid credentials");
  if (user.isDeleted || user.status !== "ACTIVE") throw new ApiError(403, "Forbidden", "Account is inactive");

  const match = await bcrypt.compare(input.password, user.password);
  if (!match) throw new ApiError(401, "Unauthorized", "Invalid credentials");

  const token = signAccessToken({ sub: user.id, role: user.role }, env);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
    token,
  };
}
