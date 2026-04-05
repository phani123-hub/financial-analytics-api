import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";

export const userIdParamSchema = z.object({
  id: z.string().min(1),
});

export const adminUpdateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.nativeEnum(Role).optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.nativeEnum(Role).optional(),
  search: z.string().min(1).optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
