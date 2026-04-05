import type { Request, Response, NextFunction } from "express";
import { ok } from "../../utils/apiResponse";
import * as anomaliesService from "./anomalies.service";

export const anomaliesController = {
  async getAnomalies(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await anomaliesService.getSpendingAnomalies();
      res.json(ok(data, "Spending anomalies detected successfully"));
    } catch (e) {
      next(e);
    }
  },
};
