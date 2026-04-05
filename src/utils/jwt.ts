import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import type { Env } from "../config/env";

export type JwtPayload = {
  sub: string;
  role: Role;
};

export function signAccessToken(payload: JwtPayload, env: Pick<Env, "JWT_SECRET" | "JWT_EXPIRES_IN">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}
