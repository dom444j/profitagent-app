import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import '../../lib/middleware'; // Import to ensure Request type extension is available
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { adminSettingsService, type SystemSettings, type SecuritySettings, type NotificationSettings } from './settings.service';
import { authService } from '../auth/service';
import { logger } from '../../utils/logger';

// Validation schemas
const systemSettingsSchema = z.object({
  min_withdrawal_amount: z.number().positive().optional(),
  withdrawal_fee_usdt: z.number().min(0).optional(),
  daily_earning_rate: z.number().min(0).max(1).optional(),
  max_earning_days: z.number().int().positive().optional(),
  earning_cap_percentage: z.number().positive().optional(),
  referral_commission_rate: z.number().min(0).max(1).optional(),
  maintenance_mode: z.boolean().optional(),
  registration_enabled: z.boolean().optional(),
  withdrawal_enabled: z.boolean().optional(),
  maximum_withdrawal: z.number().positive().optional(),
  password_min_length: z.number().int().min(4).max(50).optional()
});

const securitySettingsSchema = z.object({
  require_2fa: z.boolean().optional(),
  session_timeout: z.number().int().positive().optional(),
  max_login_attempts: z.number().int().positive().optional(),
  password_expiry_days: z.number().int().positive().optional()
});

const notificationSettingsSchema = z.object({
  telegram_bot_enabled: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

// Helper to remove keys set to undefined so they don't violate exactOptionalPropertyTypes
function removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) cleaned[k] = v;
  }
  return cleaned as Partial<T>;
}

class AdminSettingsController {
  /**
   * GET /api/v1/admin/settings
   * Get all admin settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const settings = await adminSettingsService.getSettings();
      
      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      logger.error('Error getting admin settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/admin/settings/system
   * Update system settings
   */
  async updateSystemSettings(req: Request, res: Response) {
    try {
      const validation = systemSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validation.error.issues
        });
      }

      // Strip undefined values to satisfy exactOptionalPropertyTypes and avoid undefined assignment
      const cleaned = removeUndefined(validation.data) as Partial<SystemSettings>;
      const updatedSettings = await adminSettingsService.updateSystemSettings(cleaned);
      
      return res.json({
        success: true,
        message: 'System settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      logger.error('Error updating system settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/admin/settings/security
   * Update security settings
   */
  async updateSecuritySettings(req: Request, res: Response) {
    try {
      const validation = securitySettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validation.error.issues
        });
      }

      const cleaned = removeUndefined(validation.data) as Partial<SecuritySettings>;
      const updatedSettings = await adminSettingsService.updateSecuritySettings(cleaned);
      
      return res.json({
        success: true,
        message: 'Security settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      logger.error('Error updating security settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/admin/settings/notifications
   * Update notification settings
   */
  async updateNotificationSettings(req: Request, res: Response) {
    try {
      const validation = notificationSettingsSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validation.error.issues
        });
      }

      const cleaned = removeUndefined(validation.data) as Partial<NotificationSettings>;
      const updatedSettings = await adminSettingsService.updateNotificationSettings(cleaned);
      
      return res.json({
        success: true,
        message: 'Notification settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      logger.error('Error updating notification settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/admin/settings/change-password
   * Change admin password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const validation = changePasswordSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validation.error.issues
        });
      }

      const { current_password, new_password } = validation.data;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      // Get current user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          password_hash: true
        }
      });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Hash new password
      const saltRounds = 12;
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: newPasswordHash
        }
      });

      logger.info({ userId }, 'Admin password changed successfully');
      
      return res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      logger.error('Error changing admin password: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const adminSettingsController = new AdminSettingsController();