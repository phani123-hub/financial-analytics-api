import { Router } from "express";
import { Role } from "@prisma/client";
import { validate } from "../../middlewares/validate.middleware";
import { createAuthMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import {
  createRecordSchema,
  listRecordsQuerySchema,
  recordIdParamSchema,
  updateRecordSchema,
} from "./record.schema";
import { recordController } from "./record.controller";
import type { Env } from "../../config/env";

export function createRecordRoutes(getEnv: () => Env): Router {
  const router = Router();
  const auth = createAuthMiddleware(getEnv);

  router.use(auth);

  router.post("/", requireRole(Role.ADMIN), validate({ body: createRecordSchema }), recordController.create);

  router.get("/", validate({ query: listRecordsQuerySchema }), recordController.list);

  router.get("/:id", validate({ params: recordIdParamSchema }), recordController.get);

  router.patch(
    "/:id",
    requireRole(Role.ADMIN),
    validate({ params: recordIdParamSchema, body: updateRecordSchema }),
    recordController.update
  );

  router.delete("/:id", requireRole(Role.ADMIN), validate({ params: recordIdParamSchema }), recordController.remove);

  return router;
}
