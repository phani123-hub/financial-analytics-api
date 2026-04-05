import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "./dashboard.service";
import { ok } from "../../utils/apiResponse";
import type { RecentActivityQuery } from "./dashboard.schema";

export const dashboardController = {
  async summary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getSummary();
      res.json(ok(data, "Dashboard summary fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async categoryBreakdown(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getCategoryBreakdown();
      res.json(ok(data, "Category breakdown fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async monthlyTrends(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getMonthlyTrends();
      res.json(ok(data, "Monthly trends fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async recentActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as unknown as RecentActivityQuery;
      const data = await dashboardService.getRecentActivity(q.limit);
      res.json(ok(data, "Recent activity fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async insights(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getInsights();
      res.json(ok(data, "Insights fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
};
