import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { ok } from "../../utils/apiResponse";
import type { Env } from "../../config/env";

export function createAuthController(getEnv: () => Env) {
  return {
    async register(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await authService.register(req.body, getEnv());
        res.status(201).json(ok(result, "Registration successful"));
      } catch (e) {
        next(e);
      }
    },
    async login(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await authService.login(req.body, getEnv());
        res.json(ok(result, "Login successful"));
      } catch (e) {
        next(e);
      }
    },
    async me(req: Request, res: Response, next: NextFunction) {
      try {
        const user = await authService.getCurrentUser(req.userId!);
        res.json(ok(user, "Current user fetched successfully"));
      } catch (e) {
        next(e);
      }
    },
  };
}
