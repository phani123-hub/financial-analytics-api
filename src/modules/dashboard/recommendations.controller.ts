import type { Request, Response, NextFunction } from "express";
import { ok } from "../../utils/apiResponse";
import * as recommendationsService from "./recommendations.service";

export const recommendationsController = {
  async getRecommendations(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await recommendationsService.getFinancialRecommendations();
      res.json(ok(data, "Financial recommendations generated successfully"));
    } catch (e) {
      next(e);
    }
  },
};
