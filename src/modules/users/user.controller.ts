import type { Request, Response, NextFunction } from "express";
import * as userService from "./user.service";
import { ok } from "../../utils/apiResponse";

export const userController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await userService.listUsers(req.query as any);
      res.json(ok(result, "Users fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id as string);
      res.json(ok(user, "User fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.updateUserById(req.userId!, req.params.id as string, req.body);
      res.json(ok(user, "User updated successfully"));
    } catch (e) {
      next(e);
    }
  },
  async deactivate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.deactivateUser(req.userId!, req.params.id as string);
      res.json(ok(user, "User deactivated successfully"));
    } catch (e) {
      next(e);
    }
  },
};
