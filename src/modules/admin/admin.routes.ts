import { Router } from "express";
import { Role } from "@prisma/client";
import { validate } from "../../middlewares/validate.middleware";
import { createAuthMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { listAuditLogsQuerySchema } from "./admin.schema";
import { auditController } from "./audit.controller";
import type { Env } from "../../config/env";

export function createAdminRoutes(getEnv: () => Env): Router {
  const router = Router();
  const auth = createAuthMiddleware(getEnv);

  router.use(auth, requireRole(Role.ADMIN));

  router.get("/audit-logs", validate({ query: listAuditLogsQuerySchema }), auditController.list);

  return router;
}
