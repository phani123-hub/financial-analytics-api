import { z } from "zod";

export const recordTypeEnum = z.enum(["INCOME", "EXPENSE"]);
export type RecordType = z.infer<typeof recordTypeEnum>;

export const createRecordSchema = z.object({
  amount: z.coerce.number().positive(),
  type: recordTypeEnum,
  category: z.string().min(1),
  date: z.coerce.date(),
  description: z.string().optional(),
});

export const updateRecordSchema = createRecordSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const recordIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: recordTypeEnum.optional(),
  category: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  sort: z.enum(["date", "amount"]).default("date"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
