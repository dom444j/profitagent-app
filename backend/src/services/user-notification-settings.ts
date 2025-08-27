import { PrismaClient, NotificationType, UserNotificationSettings } from '@prisma/client';

const prisma = new PrismaClient();

export interface NotificationSettingsUpdate {
  notification_type: NotificationType;
  enabled?: boolean;
  email_enabled?: boolean;
  push_enabled?: boolean;
  telegram_enabled?: boolean;
}

export interface UserNotificationSettingsResponse {
  [key: string]: {
    enabled: boolean;
    email_enabled: boolean;
    push_enabled: boolean;
    telegram_enabled: boolean;
  };
}

class UserNotificationSettingsService {
  /**
   * Obtiene las configuraciones de notificaciones de un usuario
   * Si no existen, crea las configuraciones por defecto
   */
  async getUserSettings(userId: string): Promise<UserNotificationSettingsResponse> {
    try {
      // Obtener configuraciones existentes
      const existingSettings = await prisma.userNotificationSettings.findMany({
        where: { user_id: userId }
      });

      // Crear mapa de configuraciones existentes
      const settingsMap = new Map<NotificationType, UserNotificationSettings>();
      existingSettings.forEach(setting => {
        settingsMap.set(setting.notification_type, setting);
      });

      // Tipos de notificación disponibles
      const notificationTypes: NotificationType[] = [
        'withdrawal',
        'order', 
        'earning',
        'system',
        'security',
        'bonus',
        'referral'
      ];

      const result: UserNotificationSettingsResponse = {};

      // Para cada tipo de notificación, usar configuración existente o crear por defecto
      for (const type of notificationTypes) {
        const existing = settingsMap.get(type);
        
        if (existing) {
          result[type] = {
            enabled: existing.enabled,
            email_enabled: existing.email_enabled,
            push_enabled: existing.push_enabled,
            telegram_enabled: existing.telegram_enabled
          };
        } else {
          // Crear configuración por defecto
          const defaultSetting = await this.createDefaultSetting(userId, type);
          result[type] = {
            enabled: defaultSetting.enabled,
            email_enabled: defaultSetting.email_enabled,
            push_enabled: defaultSetting.push_enabled,
            telegram_enabled: defaultSetting.telegram_enabled
          };
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting user notification settings:', error);
      throw new Error('Failed to get notification settings');
    }
  }

  /**
   * Actualiza las configuraciones de notificaciones de un usuario
   */
  async updateUserSettings(
    userId: string, 
    updates: NotificationSettingsUpdate[]
  ): Promise<UserNotificationSettingsResponse> {
    try {
      // Actualizar cada configuración
      for (const update of updates) {
        await prisma.userNotificationSettings.upsert({
          where: {
            user_id_notification_type: {
              user_id: userId,
              notification_type: update.notification_type
            }
          },
          update: {
            ...(update.enabled !== undefined && { enabled: update.enabled }),
            ...(update.email_enabled !== undefined && { email_enabled: update.email_enabled }),
            ...(update.push_enabled !== undefined && { push_enabled: update.push_enabled }),
            ...(update.telegram_enabled !== undefined && { telegram_enabled: update.telegram_enabled })
          },
          create: {
            user_id: userId,
            notification_type: update.notification_type,
            enabled: update.enabled ?? true,
            email_enabled: update.email_enabled ?? false,
            push_enabled: update.push_enabled ?? true,
            telegram_enabled: update.telegram_enabled ?? false
          }
        });
      }

      // Retornar configuraciones actualizadas
      return await this.getUserSettings(userId);
    } catch (error) {
      console.error('Error updating user notification settings:', error);
      throw new Error('Failed to update notification settings');
    }
  }

  /**
   * Verifica si un usuario tiene habilitado un tipo de notificación
   */
  async isNotificationEnabled(
    userId: string, 
    notificationType: NotificationType,
    channel: 'push' | 'email' | 'telegram' = 'push'
  ): Promise<boolean> {
    try {
      const setting = await prisma.userNotificationSettings.findUnique({
        where: {
          user_id_notification_type: {
            user_id: userId,
            notification_type: notificationType
          }
        }
      });

      if (!setting) {
        // Si no existe configuración, usar valores por defecto
        return this.getDefaultChannelValue(channel);
      }

      // Verificar si la notificación está habilitada en general
      if (!setting.enabled) {
        return false;
      }

      // Verificar canal específico
      switch (channel) {
        case 'push':
          return setting.push_enabled;
        case 'email':
          return setting.email_enabled;
        case 'telegram':
          return setting.telegram_enabled;
        default:
          return setting.enabled;
      }
    } catch (error) {
      console.error('Error checking notification enabled:', error);
      // En caso de error, permitir notificación por defecto
      return true;
    }
  }

  /**
   * Crea configuración por defecto para un tipo de notificación
   */
  private async createDefaultSetting(
    userId: string, 
    notificationType: NotificationType
  ): Promise<UserNotificationSettings> {
    return await prisma.userNotificationSettings.create({
      data: {
        user_id: userId,
        notification_type: notificationType,
        enabled: true,
        email_enabled: false,
        push_enabled: true,
        telegram_enabled: false
      }
    });
  }

  /**
   * Obtiene valor por defecto para un canal
   */
  private getDefaultChannelValue(channel: 'push' | 'email' | 'telegram'): boolean {
    switch (channel) {
      case 'push':
        return true;
      case 'email':
        return false;
      case 'telegram':
        return false;
      default:
        return true;
    }
  }

  /**
   * Obtiene estadísticas de configuraciones de notificaciones
   */
  async getNotificationStats() {
    try {
      const stats = await prisma.userNotificationSettings.groupBy({
        by: ['notification_type'],
        _count: {
          id: true,
          enabled: true,
          email_enabled: true,
          push_enabled: true,
          telegram_enabled: true
        }
      });

      return stats.map(stat => ({
        type: stat.notification_type,
        total_users: stat._count.id,
        enabled_percentage: Math.round(((stat._count.enabled || 0) / (stat._count.id || 1)) * 100),
        email_percentage: Math.round(((stat._count.email_enabled || 0) / (stat._count.id || 1)) * 100),
        push_percentage: Math.round(((stat._count.push_enabled || 0) / (stat._count.id || 1)) * 100),
        telegram_percentage: Math.round(((stat._count.telegram_enabled || 0) / (stat._count.id || 1)) * 100)
      }));
    } catch (error) {
      console.error('Error getting notification stats:', error);
      throw new Error('Failed to get notification statistics');
    }
  }
}

export const userNotificationSettingsService = new UserNotificationSettingsService();
export default userNotificationSettingsService;