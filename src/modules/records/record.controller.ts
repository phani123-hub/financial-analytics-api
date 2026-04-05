import type { Request, Response, NextFunction } from "express";
import * as recordService from "./record.service";
import { ok } from "../../utils/apiResponse";
import type { ListRecordsQuery } from "./record.schema";

export const recordController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await recordService.createRecord(req.userId!, req.body);
      res.status(201).json(ok(record, "Record created successfully"));
    } catch (e) {
      next(e);
    }
  },
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await recordService.listRecords(req.query as unknown as ListRecordsQuery);
      res.json(ok(result, "Records fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const record = await recordService.getRecord(id);
      res.json(ok(record, "Record fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const record = await recordService.updateRecord(req.userId!, id, req.body);
      res.json(ok(record, "Record updated successfully"));
    } catch (e) {
      next(e);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await recordService.softDeleteRecord(req.userId!, id);
      res.json(ok({ id }, "Record deleted successfully"));
    } catch (e) {
      next(e);
    }
  },
};
