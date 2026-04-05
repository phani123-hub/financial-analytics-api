import type { Request, Response, NextFunction } from "express";
import { ok } from "../../utils/apiResponse";
import * as auditLogService from "./auditLog.service";
import type { ListAuditLogsQuery } from "./admin.schema";

export const auditController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const q = req.query as unknown as ListAuditLogsQuery;
      const data = await auditLogService.listAuditLogs(q.page, q.limit);
      res.json(ok(data, "Audit logs fetched successfully"));
    } catch (e) {
      next(e);
    }
  },
};
