import { z } from "zod";

export const recentActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(10).default(10),
});

export type RecentActivityQuery = z.infer<typeof recentActivityQuerySchema>;
