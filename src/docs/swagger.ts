import type { Express } from "express";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "./openapi";

/**
 * Swagger UI at `/api-docs`. `/docs` redirects here for older bookmarks.
 */
export function setupSwagger(app: Express): void {
  app.get("/docs", (_req, res) => {
    res.redirect(302, "/api-docs");
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
