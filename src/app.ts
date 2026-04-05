import express from "express";
import cors from "cors";
import helmet from "helmet";
import { errorHandler } from "./middlewares/error.middleware";
import { setupSwagger } from "./docs/swagger";
import { createAuthRoutes } from "./modules/auth/auth.routes";
import { createUserRoutes } from "./modules/users/user.routes";
import { createRecordRoutes } from "./modules/records/record.routes";
import { createDashboardRoutes } from "./modules/dashboard/dashboard.routes";
import { createAdminRoutes } from "./modules/admin/admin.routes";
import type { Env } from "./config/env";

export function createApp(getEnv: () => Env) {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  setupSwagger(app);

  app.get("/", (_req, res) => {
    res.json({
      service: "finsight-api",
      health: "/health",
      apiDocs: "/api-docs",
    });
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRoutes(getEnv));
  app.use("/api/users", createUserRoutes(getEnv));
  app.use("/api/records", createRecordRoutes(getEnv));
  app.use("/api/dashboard", createDashboardRoutes(getEnv));
  app.use("/api/admin", createAdminRoutes(getEnv));

  app.use(errorHandler);

  return app;
}
