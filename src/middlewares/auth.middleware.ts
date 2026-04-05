import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";
import type { Env } from "../config/env";
import { prisma } from "../config/db";

export function createAuthMiddleware(getEnv: () => Env) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      next(new ApiError(401, "Unauthorized", "Missing or invalid Bearer token"));
      return;
    }
    const token = header.slice(7);
    try {
      const payload = verifyAccessToken(token, getEnv().JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, isDeleted: true },
      });
      if (!user || user.isDeleted || user.status !== "ACTIVE") {
        next(new ApiError(401, "Unauthorized", "Session is no longer valid"));
        return;
      }

      req.userId = user.id;
      req.userRole = user.role;
      next();
    } catch {
      next(new ApiError(401, "Unauthorized", "Invalid or expired token"));
    }
  };
}
