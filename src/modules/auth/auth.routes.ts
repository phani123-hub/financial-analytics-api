import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { createAuthMiddleware } from "../../middlewares/auth.middleware";
import { loginSchema, registerSchema } from "./auth.schema";
import type { Env } from "../../config/env";
import { createAuthController } from "./auth.controller";

export function createAuthRoutes(getEnv: () => Env): Router {
  const router = Router();
  const ctrl = createAuthController(getEnv);
  const auth = createAuthMiddleware(getEnv);

  router.post("/register", validate({ body: registerSchema }), ctrl.register);
  router.post("/login", validate({ body: loginSchema }), ctrl.login);
  router.get("/me", auth, ctrl.me);

  return router;
}
