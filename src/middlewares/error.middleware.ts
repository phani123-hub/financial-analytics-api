import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { fail } from "../utils/apiResponse";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(fail(err.message, err.details));
    return;
  }
  console.error(err);
  res.status(500).json(fail("Internal server error"));
}
