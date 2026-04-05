import { Router } from "express";
import { Role } from "@prisma/client";
import { createAuthMiddleware } from "../../middlewares/auth.middleware";
import { requireMinRole } from "../../middlewares/role.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { recentActivityQuerySchema } from "./dashboard.schema";
import { dashboardController } from "./dashboard.controller";
import { healthScoreController } from "./healthScore.controller";
import { recommendationsController } from "./recommendations.controller";
import { anomaliesController } from "./anomalies.controller";
import type { Env } from "../../config/env";

export function createDashboardRoutes(getEnv: () => Env): Router {
  const router = Router();
  const auth = createAuthMiddleware(getEnv);

  router.use(auth);

  router.get("/summary", dashboardController.summary);

  router.get("/health-score", healthScoreController.getHealthScore);

  router.get("/recommendations", recommendationsController.getRecommendations);

  router.get("/anomalies", anomaliesController.getAnomalies);

  router.get(
    "/category-breakdown",
    requireMinRole(Role.ANALYST),
    dashboardController.categoryBreakdown
  );

  router.get("/monthly-trends", requireMinRole(Role.ANALYST), dashboardController.monthlyTrends);

  router.get(
    "/recent-activity",
    validate({ query: recentActivityQuerySchema }),
    dashboardController.recentActivity
  );

  router.get("/insights", requireMinRole(Role.ANALYST), dashboardController.insights);

  return router;
}
