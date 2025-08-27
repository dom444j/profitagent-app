import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

interface SystemSettings {
  min_withdrawal_amount: number;
  withdrawal_fee_usdt: number;
  daily_earning_rate: number;
  max_earning_days: number;
  earning_cap_percentage: number;
  referral_commission_rate: number;
  maintenance_mode: boolean;
  registration_enabled: boolean;
  withdrawal_enabled: boolean;
  maximum_withdrawal: number;
  password_min_length: number;
}

interface SecuritySettings {
  require_2fa: boolean;
  session_timeout: number;
  max_login_attempts: number;
  password_expiry_days: number;
}

interface NotificationSettings {
  telegram_bot_enabled: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
}

interface AdminSettings {
  system: SystemSettings;
  security: SecuritySettings;
  notifications: NotificationSettings;
}

class AdminSettingsService {
  private defaultSettings: AdminSettings = {
    system: {
      min_withdrawal_amount: 10.0,
      withdrawal_fee_usdt: 2.0,
      daily_earning_rate: 0.1,
      max_earning_days: 20,
      earning_cap_percentage: 2.0,
      referral_commission_rate: 0.1,
      maintenance_mode: false,
      registration_enabled: true,
      withdrawal_enabled: true,
      maximum_withdrawal: 50000.0,
      password_min_length: 8
    },
    security: {
      require_2fa: false,
      session_timeout: 3600,
      max_login_attempts: 5,
      password_expiry_days: 90
    },
    notifications: {
      telegram_bot_enabled: true,
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true
    }
  };

  async getSettings(): Promise<AdminSettings> {
    try {
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: [
              'admin_system_settings',
              'admin_security_settings', 
              'admin_notification_settings'
            ]
          }
        }
      });

      const result: AdminSettings = {
        system: this.defaultSettings.system,
        security: this.defaultSettings.security,
        notifications: this.defaultSettings.notifications
      };

      settings.forEach(setting => {
        switch (setting.key) {
          case 'admin_system_settings':
            if (setting.value && typeof setting.value === 'object') {
              result.system = { ...this.defaultSettings.system, ...(setting.value as any) };
            }
            break;
          case 'admin_security_settings':
            if (setting.value && typeof setting.value === 'object') {
              result.security = { ...this.defaultSettings.security, ...(setting.value as any) };
            }
            break;
          case 'admin_notification_settings':
            if (setting.value && typeof setting.value === 'object') {
              result.notifications = { ...this.defaultSettings.notifications, ...(setting.value as any) };
            }
            break;
        }
      });

      return result;
    } catch (error) {
      logger.error('Error getting admin settings: ' + (error as Error).message);
      throw new Error('Failed to get admin settings');
    }
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings.system, ...settings };

      await prisma.setting.upsert({
        where: { key: 'admin_system_settings' },
        update: {
          value: updatedSettings as any
        },
        create: {
          key: 'admin_system_settings',
          value: updatedSettings as any
        }
      });

      logger.info({ settings: updatedSettings }, 'Admin system settings updated');
      return updatedSettings;
    } catch (error) {
      logger.error('Error updating admin system settings: ' + (error as Error).message + ' - settings: ' + JSON.stringify(settings));
      throw new Error('Failed to update system settings');
    }
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings.security, ...settings };

      await prisma.setting.upsert({
        where: { key: 'admin_security_settings' },
        update: {
          value: updatedSettings as any
        },
        create: {
          key: 'admin_security_settings',
          value: updatedSettings as any
        }
      });

      logger.info({ settings: updatedSettings }, 'Admin security settings updated');
      return updatedSettings;
    } catch (error) {
      logger.error('Error updating admin security settings: ' + (error as Error).message + ' - settings: ' + JSON.stringify(settings));
      throw new Error('Failed to update security settings');
    }
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings.notifications, ...settings };

      await prisma.setting.upsert({
        where: { key: 'admin_notification_settings' },
        update: {
          value: updatedSettings as any
        },
        create: {
          key: 'admin_notification_settings',
          value: updatedSettings as any
        }
      });

      logger.info({ settings: updatedSettings }, 'Admin notification settings updated');
      return updatedSettings;
    } catch (error) {
      logger.error('Error updating admin notification settings: ' + (error as Error).message + ' - settings: ' + JSON.stringify(settings));
      throw new Error('Failed to update notification settings');
    }
  }
}

export const adminSettingsService = new AdminSettingsService();
export type { AdminSettings, SystemSettings, SecuritySettings, NotificationSettings };