import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { createAuthMiddleware } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import { Role } from "@prisma/client";
import { userController } from "./user.controller";
import type { Env } from "../../config/env";
import { adminUpdateUserSchema, listUsersQuerySchema, userIdParamSchema } from "./user.schema";

export function createUserRoutes(getEnv: () => Env): Router {
  const router = Router();
  const auth = createAuthMiddleware(getEnv);

  router.use(auth, requireRole(Role.ADMIN));

  router.get("/", validate({ query: listUsersQuerySchema }), userController.list);
  router.get("/:id", validate({ params: userIdParamSchema }), userController.getById);
  router.patch(
    "/:id",
    validate({ params: userIdParamSchema, body: adminUpdateUserSchema }),
    userController.updateById
  );
  router.delete("/:id", validate({ params: userIdParamSchema }), userController.deactivate);

  return router;
}
