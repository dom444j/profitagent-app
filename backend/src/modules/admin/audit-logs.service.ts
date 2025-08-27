import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export interface AuditLogFilters {
  actor_user_id?: string | undefined;
  action?: string | undefined;
  entity?: string | undefined;
  entity_id?: string | undefined;
  start_date?: string | undefined;
  end_date?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface AuditLogResponse {
  id: string;
  actor_user_id: string | null;
  actor_email?: string | null;
  actor_name?: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: any;
  new_values: any;
  diff: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface PaginatedAuditLogs {
  logs: AuditLogResponse[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class AuditLogsService {
  async getAuditLogs(filters: AuditLogFilters): Promise<PaginatedAuditLogs> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 50, 100); // Max 100 per page
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (filters.actor_user_id) {
        where.actor_user_id = filters.actor_user_id;
      }

      if (filters.action) {
        where.action = {
          contains: filters.action,
          mode: 'insensitive'
        };
      }

      if (filters.entity) {
        where.entity = {
          contains: filters.entity,
          mode: 'insensitive'
        };
      }

      if (filters.entity_id) {
        where.entity_id = filters.entity_id;
      }

      if (filters.start_date || filters.end_date) {
        where.created_at = {};
        if (filters.start_date) {
          where.created_at.gte = new Date(filters.start_date);
        }
        if (filters.end_date) {
          where.created_at.lte = new Date(filters.end_date);
        }
      }

      // Get total count
      const total = await prisma.auditLog.count({ where });

      // Get logs with actor information
      const logs = await prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              email: true,
              first_name: true,
              last_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip,
        take: limit
      });

      // Format response
      const formattedLogs: AuditLogResponse[] = logs.map(log => ({
        id: log.id,
        actor_user_id: log.actor_user_id,
        actor_email: log.actor?.email || null,
        actor_name: log.actor ? `${log.actor.first_name || ''} ${log.actor.last_name || ''}`.trim() || null : null,
        action: log.action,
        entity: log.entity,
        entity_id: log.entity_id,
        old_values: log.old_values as any,
        new_values: log.new_values as any,
        diff: log.diff as any,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at
      }));

      const pages = Math.ceil(total / limit);

      return {
        logs: formattedLogs,
        pagination: {
          total,
          page,
          limit,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error getting audit logs: ' + (error instanceof Error ? error.message : String(error)));
      throw new Error('Failed to get audit logs');
    }
  }

  /**
   * Create an audit log entry
   */
  async createAuditLog(data: {
    actor_user_id?: string | undefined;
    action: string;
    entity: string;
    entity_id?: string | undefined;
    old_values?: any | undefined;
    new_values?: any | undefined;
    diff?: any | undefined;
    ip_address?: string | undefined;
    user_agent?: string | undefined;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          actor_user_id: data.actor_user_id || null,
          action: data.action,
          entity: data.entity,
          entity_id: data.entity_id || null,
          old_values: data.old_values || null,
          new_values: data.new_values || null,
          diff: data.diff || null,
          ip_address: data.ip_address || null,
          user_agent: data.user_agent || null
        }
      });
    } catch (error) {
      logger.error('Error creating audit log: ' + (error instanceof Error ? error.message : String(error)));
      // Don't throw error to avoid breaking main operations
    }
  }

  /**
   * Get audit log statistics
   */
  async getAuditLogStats(): Promise<{
    total_logs: number;
    logs_today: number;
    logs_this_week: number;
    top_actions: Array<{ action: string; count: number }>;
    top_actors: Array<{ actor_email: string; count: number }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const [totalLogs, logsToday, logsThisWeek, topActions, topActors] = await Promise.all([
        // Total logs
        prisma.auditLog.count(),
        
        // Logs today
        prisma.auditLog.count({
          where: {
            created_at: {
              gte: today
            }
          }
        }),
        
        // Logs this week
        prisma.auditLog.count({
          where: {
            created_at: {
              gte: weekAgo
            }
          }
        }),
        
        // Top actions
        prisma.auditLog.groupBy({
          by: ['action'],
          _count: {
            action: true
          },
          orderBy: {
            _count: {
              action: 'desc'
            }
          },
          take: 10
        }),
        
        // Top actors
        prisma.auditLog.groupBy({
          by: ['actor_user_id'],
          _count: {
            actor_user_id: true
          },
          where: {
            actor_user_id: {
              not: null
            }
          },
          orderBy: {
            _count: {
              actor_user_id: 'desc'
            }
          },
          take: 10
        })
      ]);

      // Get actor emails for top actors
      const actorIds = topActors.map(actor => actor.actor_user_id).filter(Boolean);
      const actors = await prisma.user.findMany({
        where: {
          id: {
            in: actorIds as string[]
          }
        },
        select: {
          id: true,
          email: true
        }
      });

      const actorMap = new Map(actors.map(actor => [actor.id, actor.email]));

      return {
        total_logs: totalLogs,
        logs_today: logsToday,
        logs_this_week: logsThisWeek,
        top_actions: topActions.map(action => ({
          action: action.action,
          count: action._count.action
        })),
        top_actors: topActors.map(actor => ({
          actor_email: actorMap.get(actor.actor_user_id!) || 'Unknown',
          count: actor._count.actor_user_id
        }))
      };
    } catch (error) {
      logger.error('Error getting audit log stats: ' + (error instanceof Error ? error.message : String(error)));
      throw new Error('Failed to get audit log statistics');
    }
  }
}

export const auditLogsService = new AuditLogsService();