import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import type { Env } from "../src/config/env";

const testEnv: Env = {
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://localhost:5432/test",
  JWT_SECRET: "test-secret",
  JWT_EXPIRES_IN: "1h",
  PORT: 0,
  NODE_ENV: "test",
};

describe("API", () => {
  it("GET /health returns ok", async () => {
    const app = createApp(() => testEnv);
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
