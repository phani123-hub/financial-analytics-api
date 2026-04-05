import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { ApiError } from "../utils/apiError";

const roleRank: Record<Role, number> = {
  VIEWER: 1,
  ANALYST: 2,
  ADMIN: 3,
};

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !allowed.includes(req.userRole)) {
      next(new ApiError(403, "Forbidden", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}

export function requireMinRole(minRole: Role) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      next(new ApiError(403, "Forbidden", "You do not have permission to perform this action"));
      return;
    }
    if (roleRank[req.userRole] < roleRank[minRole]) {
      next(new ApiError(403, "Forbidden", "You do not have permission to perform this action"));
      return;
    }
    next();
  };
}
