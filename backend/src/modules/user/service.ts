import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';

export interface UpdateUserProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  usdt_bep20_address?: string;
  withdrawal_wallet_address?: string;
  withdrawal_type?: 'automatic' | 'manual';
}

export interface UserProfileResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  ref_code: string;
  usdt_bep20_address: string | null;
  withdrawal_wallet_address: string | null;
  withdrawal_wallet_verified: boolean;
  withdrawal_type: 'automatic' | 'manual';
  telegram_user_id: string | null;
  telegram_username: string | null;
  telegram_link_status: string | null;
  status: string;
  role: string;
  balance: string;
  created_at: Date;
  sponsor?: {
    id: string;
    email: string;
    ref_code: string;
  } | null;
  total_licenses: number;
  active_licenses: number;
  total_orders: number;
  total_withdrawals: number;
}

class UserService {
  /**
   * Get complete user profile with balance and statistics
   */
  async getUserProfile(userId: string): Promise<UserProfileResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return null;
      }

      // Get user balance from ledger
      const balanceResult = await prisma.ledgerEntry.aggregate({
        where: {
          user_id: userId
        },
        _sum: {
          amount: true
        }
      });

      const balance = balanceResult._sum.amount || new Decimal(0);

      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        ref_code: user.ref_code,
        usdt_bep20_address: user.usdt_bep20_address,
        withdrawal_wallet_address: user.withdrawal_wallet_address,
        withdrawal_wallet_verified: user.withdrawal_wallet_verified || false,
        withdrawal_type: (user.withdrawal_type as 'automatic' | 'manual') || 'manual',
        telegram_user_id: user.telegram_user_id,
        telegram_username: user.telegram_username,
        telegram_link_status: user.telegram_link_status,
        status: user.status,
        role: user.role,
        balance: balance.toString(),
        created_at: user.created_at,
        sponsor: null,
        total_licenses: 0,
        active_licenses: 0,
        total_orders: 0,
        total_withdrawals: 0
      };
    } catch (error) {
      logger.error('Error getting user profile: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Update user profile information
   */
  async updateUserProfile(userId: string, data: UpdateUserProfileData): Promise<UserProfileResponse | null> {
    try {
      const updateData: Prisma.UserUpdateInput = {};
      if (data.first_name !== undefined) updateData.first_name = data.first_name;
      if (data.last_name !== undefined) updateData.last_name = data.last_name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.usdt_bep20_address !== undefined) updateData.usdt_bep20_address = data.usdt_bep20_address;
      if (data.withdrawal_wallet_address !== undefined) updateData.withdrawal_wallet_address = data.withdrawal_wallet_address;
      if (data.withdrawal_type !== undefined) updateData.withdrawal_type = data.withdrawal_type;

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: {
          // removed heavy relational includes to avoid type mismatches
        }
      });

      // Fetch sponsor info separately if present
      const sponsorData = updatedUser.sponsor_id
        ? await prisma.user.findUnique({
            where: { id: updatedUser.sponsor_id },
            select: { id: true, email: true, ref_code: true }
          })
        : null;
      // Get updated balance
      const balanceResult = await prisma.ledgerEntry.aggregate({
        where: {
          user_id: userId
        },
        _sum: {
          amount: true
        }
      });

      const balance = balanceResult._sum.amount || new Decimal(0);

      // Compute counts independently to avoid type issues with exact optional types
      const [totalLicenses, activeLicenses, totalOrders, totalWithdrawals] = await Promise.all([
        prisma.userLicense.count({ where: { user_id: userId } }),
        prisma.userLicense.count({ where: { user_id: userId, status: 'active' } }),
        prisma.orderDeposit.count({ where: { user_id: userId } }),
        prisma.withdrawal.count({ where: { user_id: userId } })
      ]);

      logger.info({ userId, updatedFields: Object.keys(data) }, 'User profile updated');

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        phone: updatedUser.phone,
        ref_code: updatedUser.ref_code,
        usdt_bep20_address: updatedUser.usdt_bep20_address,
        withdrawal_wallet_address: updatedUser.withdrawal_wallet_address,
        withdrawal_wallet_verified: updatedUser.withdrawal_wallet_verified,
        withdrawal_type: (updatedUser.withdrawal_type as 'automatic' | 'manual') || 'manual',
        telegram_user_id: updatedUser.telegram_user_id,
        telegram_username: updatedUser.telegram_username,
        telegram_link_status: updatedUser.telegram_link_status,
        status: updatedUser.status,
        role: updatedUser.role,
        balance: balance.toString(),
        created_at: updatedUser.created_at,
        sponsor: sponsorData,
         total_licenses: totalLicenses,
         active_licenses: activeLicenses,
         total_orders: totalOrders,
         total_withdrawals: totalWithdrawals
      };
    } catch (error) {
      logger.error('Error updating user profile: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Link Telegram account to user (supports both ID and username)
   */
  async linkTelegram(userId: string, telegramUserId?: string, telegramUsername?: string): Promise<boolean> {
    try {
      // Clean username by removing @ if present
      const cleanUsername = telegramUsername ? telegramUsername.replace('@', '') : undefined;
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          telegram_user_id: telegramUserId || null,
          telegram_username: cleanUsername || null,
          telegram_link_status: 'linked'
        }
      });

      logger.info({ 
        userId, 
        telegramUserId: telegramUserId || null, 
        telegramUsername: cleanUsername || null 
      }, 'Telegram account linked');
      return true;
    } catch (error) {
      logger.error('Error linking Telegram account: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Unlink Telegram account from user
   */
  async unlinkTelegram(userId: string): Promise<boolean> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          telegram_user_id: null,
          telegram_username: null,
          telegram_link_status: 'unlinked'
        }
      });

      logger.info({ userId }, 'Telegram account unlinked');
      return true;
    } catch (error) {
      logger.error('Error unlinking Telegram account: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Get user settings
   */
  async getUserSettings(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          created_at: true,
          updated_at: true
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get notification settings
      const notificationSettings = await prisma.userNotificationSettings.findMany({
        where: { user_id: userId }
      });

      // Convert to object for easier access
      const notificationMap = notificationSettings.reduce((acc, setting) => {
        acc[setting.notification_type] = {
          enabled: setting.enabled,
          email_enabled: setting.email_enabled,
          push_enabled: setting.push_enabled,
          telegram_enabled: setting.telegram_enabled
        };
        return acc;
      }, {} as any);

      // Get privacy settings from Settings table
      const profileVisibility = await prisma.setting.findUnique({
        where: { key: `user_${userId}_profile_visibility` }
      });
      const dataSharing = await prisma.setting.findUnique({
        where: { key: `user_${userId}_data_sharing` }
      });

      return {
        security: {
          two_factor_enabled: false, // Not implemented yet
          login_notifications: notificationMap.security?.enabled ?? true,
          password_last_changed: user.updated_at
        },
        notifications: {
          earning_notifications: notificationMap.earning?.enabled ?? true,
          order_notifications: notificationMap.order?.enabled ?? true,
          withdrawal_notifications: notificationMap.withdrawal?.enabled ?? true,
          marketing_emails: false // Not implemented yet
        },
        privacy: {
          profile_visibility: profileVisibility?.value || 'private',
          data_sharing: dataSharing?.value || false
        }
      };
    } catch (error) {
      logger.error('Error getting user settings: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(userId: string, settings: any) {
    try {
      // Update login notifications in UserNotificationSettings
      if (settings.login_notifications !== undefined) {
        await prisma.userNotificationSettings.upsert({
          where: {
            user_id_notification_type: {
              user_id: userId,
              notification_type: 'security'
            }
          },
          update: {
            enabled: settings.login_notifications
          },
          create: {
            user_id: userId,
            notification_type: 'security',
            enabled: settings.login_notifications,
            email_enabled: false,
            push_enabled: true,
            telegram_enabled: false
          }
        });
      }

      // Get current settings to return
      const notificationSettings = await prisma.userNotificationSettings.findUnique({
        where: {
          user_id_notification_type: {
            user_id: userId,
            notification_type: 'security'
          }
        }
      });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { updated_at: true }
      });

      return {
        two_factor_enabled: false, // Not implemented yet
        login_notifications: notificationSettings?.enabled ?? true,
        password_last_changed: user?.updated_at
      };
    } catch (error) {
      logger.error('Error updating security settings: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Update notification settings (v2)
   */
  async updateNotificationSettingsV2(userId: string, settings: any) {
    try {
      const notificationTypes = [
        { key: 'earning_notifications', type: 'earning' },
        { key: 'order_notifications', type: 'order' },
        { key: 'withdrawal_notifications', type: 'withdrawal' }
      ];

      // Update each notification type
      for (const { key, type } of notificationTypes) {
        if (settings[key] !== undefined) {
          await prisma.userNotificationSettings.upsert({
            where: {
              user_id_notification_type: {
                user_id: userId,
                notification_type: type as any
              }
            },
            update: {
              enabled: settings[key]
            },
            create: {
              user_id: userId,
              notification_type: type as any,
              enabled: settings[key],
              email_enabled: false,
              push_enabled: true,
              telegram_enabled: false
            }
          });
        }
      }

      // Get updated settings
      const notificationSettings = await prisma.userNotificationSettings.findMany({
        where: { 
          user_id: userId,
          notification_type: { in: ['earning', 'order', 'withdrawal'] }
        }
      });

      const notificationMap = notificationSettings.reduce((acc, setting) => {
        acc[setting.notification_type] = setting.enabled;
        return acc;
      }, {} as any);

      return {
        earning_notifications: notificationMap.earning ?? true,
        order_notifications: notificationMap.order ?? true,
        withdrawal_notifications: notificationMap.withdrawal ?? true,
        marketing_emails: false // Not implemented yet
      };
    } catch (error) {
      logger.error('Error updating notification settings: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId: string, settings: any) {
    try {
      // For now, we'll store privacy settings in the Settings table
      // since the User model doesn't have these fields yet
      
      if (settings.profile_visibility !== undefined) {
        await prisma.setting.upsert({
          where: { key: `user_${userId}_profile_visibility` },
          update: { value: settings.profile_visibility },
          create: {
            key: `user_${userId}_profile_visibility`,
            value: settings.profile_visibility
          }
        });
      }

      if (settings.data_sharing !== undefined) {
        await prisma.setting.upsert({
          where: { key: `user_${userId}_data_sharing` },
          update: { value: settings.data_sharing },
          create: {
            key: `user_${userId}_data_sharing`,
            value: settings.data_sharing
          }
        });
      }

      // Get current settings
      const profileVisibility = await prisma.setting.findUnique({
        where: { key: `user_${userId}_profile_visibility` }
      });
      const dataSharing = await prisma.setting.findUnique({
        where: { key: `user_${userId}_data_sharing` }
      });

      return {
        profile_visibility: profileVisibility?.value || 'private',
        data_sharing: dataSharing?.value || false
      };
    } catch (error) {
      logger.error('Error updating privacy settings: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: hashedNewPassword
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error changing password: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Request account deletion
   */
  async requestAccountDeletion(userId: string, password: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { password_hash: true, status: true }
      });

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return { success: false, error: 'Password is incorrect' };
      }

      // Mark account for deletion (soft delete)
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: 'deleted' // Using existing enum value
        }
      });

      return { success: true };
    } catch (error) {
      logger.error('Error requesting account deletion: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Update user password
   */
  async updateUserPassword(userId: string, passwordHash: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash
        }
      });

      logger.info({ userId }, 'User password updated successfully');
    } catch (error) {
      logger.error('Error updating user password: ' + (error as Error).message);
      throw error;
    }
  }

  /**
   * Verify withdrawal wallet (simplified without OTP)
   */
  async verifyWithdrawalWallet(userId: string, withdrawalWalletAddress: string): Promise<{ otp_sent: boolean }> {
    try {
      // Update user's withdrawal wallet directly
      await prisma.user.update({
        where: { id: userId },
        data: {
          withdrawal_wallet_address: withdrawalWalletAddress,
          withdrawal_wallet_verified: true,
          withdrawal_wallet_verified_at: new Date()
        }
      });

      logger.info({ userId, withdrawalWalletAddress }, 'Withdrawal wallet verified successfully');
      return { otp_sent: true };
    } catch (error) {
      logger.error({ userId, withdrawalWalletAddress, error }, 'Failed to verify withdrawal wallet');
      return { otp_sent: false };
    }
  }

  /**
   * Confirm withdrawal wallet OTP (simplified - directly verifies)
   */
  async confirmWithdrawalWalletOtp(userId: string, withdrawalWalletAddress: string, otpCode: string): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      // Since OTP system is removed, directly verify the wallet
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          withdrawal_wallet_address: withdrawalWalletAddress,
          withdrawal_wallet_verified: true,
          withdrawal_wallet_verified_at: new Date()
        }
      });

      logger.info({ userId, withdrawalWalletAddress }, 'Withdrawal wallet verified successfully');

      return {
        success: true,
        data: {
          withdrawal_wallet_address: updatedUser.withdrawal_wallet_address,
          withdrawal_wallet_verified: updatedUser.withdrawal_wallet_verified
        }
      };
    } catch (error) {
      logger.error({ userId, withdrawalWalletAddress, error }, 'Failed to confirm withdrawal wallet');
      return { success: false, error: 'Failed to verify withdrawal wallet' };
    }
  }
}

export const userService = new UserService();