import type { Request, Response, NextFunction } from "express";
import { ok } from "../../utils/apiResponse";
import * as healthScoreService from "./healthScore.service";

export const healthScoreController = {
  async getHealthScore(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await healthScoreService.getFinanceHealthScore();
      res.json(ok(data, "Finance health score calculated successfully"));
    } catch (e) {
      next(e);
    }
  },
};
