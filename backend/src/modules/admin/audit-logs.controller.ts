import { Request, Response } from 'express';
import { auditLogsService, AuditLogFilters } from './audit-logs.service';
import { logger } from '../../utils/logger';

export class AuditLogsController {
  /**
   * GET /admin/audit-logs
   * Get audit logs with filters and pagination
   */
  async getAuditLogs(req: Request, res: Response) {
    try {
      const {
        actor_user_id,
        action,
        entity,
        entity_id,
        start_date,
        end_date,
        page,
        limit
      } = req.query;

      const filters: AuditLogFilters = {
        actor_user_id: actor_user_id ? String(actor_user_id) : undefined,
        action: action ? String(action) : undefined,
        entity: entity ? String(entity) : undefined,
        entity_id: entity_id ? String(entity_id) : undefined,
        start_date: start_date ? String(start_date) : undefined,
        end_date: end_date ? String(end_date) : undefined,
        page: page ? parseInt(String(page)) : undefined,
        limit: limit ? parseInt(String(limit)) : undefined
      };

      const result = await auditLogsService.getAuditLogs(filters);

      // Log the audit logs access
      await auditLogsService.createAuditLog({
        actor_user_id: req.user?.id,
        action: 'VIEW_AUDIT_LOGS',
        entity: 'audit_logs',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination
      });
    } catch (error) {
      logger.error('Error getting audit logs: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({
        success: false,
        error: 'Failed to get audit logs'
      });
    }
  }

  /**
   * GET /admin/audit-logs/stats
   * Get audit logs statistics
   */
  async getAuditLogStats(req: Request, res: Response) {
    try {
      const stats = await auditLogsService.getAuditLogStats();

      // Log the audit stats access
      await auditLogsService.createAuditLog({
        actor_user_id: req.user?.id,
        action: 'VIEW_AUDIT_STATS',
        entity: 'audit_logs',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      logger.error('Error getting audit log stats: ' + (error instanceof Error ? error.message : String(error)));
      res.status(500).json({
        success: false,
        error: 'Failed to get audit log statistics'
      });
    }
  }
}

export const auditLogsController = new AuditLogsController();