import { Request, Response } from 'express';
import { z } from 'zod';
import { userService, UpdateUserProfileData } from './service';
// Removed user notification settings service - not documented
import { telegramService } from '../../services/telegram';
import { realTimeNotificationService } from '../../services/real-time-notifications';
import { prisma } from '../../lib/prisma';
import '../../lib/middleware';
// import { logger } from '../../utils/logger';

const updateProfileSchema = z.object({
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  phone: z.string().optional(),
  usdt_bep20_address: z.string().optional(),
  withdrawal_wallet_address: z.string().optional(),
  withdrawal_type: z.enum(['automatic', 'manual']).optional()
});

const linkTelegramSchema = z.object({
  telegram_user_id: z.string().min(1).optional(),
  telegram_username: z.string().min(1).optional()
}).refine((data) => data.telegram_user_id || data.telegram_username, {
  message: 'Either telegram_user_id or telegram_username is required'
});

// Removed notification settings schema - not documented

const userSettingsSecuritySchema = z.object({
  two_factor_enabled: z.boolean().optional(),
  login_notifications: z.boolean().optional(),
  password_last_changed: z.string().optional()
});

const userSettingsNotificationsSchema = z.object({
  earning_notifications: z.boolean().optional(),
  order_notifications: z.boolean().optional(),
  withdrawal_notifications: z.boolean().optional(),
  marketing_emails: z.boolean().optional()
});

const userSettingsPrivacySchema = z.object({
  profile_visibility: z.enum(['public', 'private']).optional(),
  data_sharing: z.boolean().optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Password confirmation is required')
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"]
});

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
  confirmation: z.literal('DELETE')
}).refine((data) => data.confirmation === 'DELETE', {
  message: 'You must type DELETE to confirm',
  path: ['confirmation']
});

const verifyWithdrawalWalletSchema = z.object({
  withdrawal_wallet_address: z.string().min(1, 'Withdrawal wallet address is required')
});

const confirmWithdrawalWalletOtpSchema = z.object({
  withdrawal_wallet_address: z.string().min(1, 'Withdrawal wallet address is required'),
  otp_code: z.string().min(6, 'OTP code must be 6 digits').max(6, 'OTP code must be 6 digits')
});

class UserController {
  /**
   * GET /api/v1/user/profile
   * Get current user's profile
   */
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const profile = await userService.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error getting user profile: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/user/profile
   * Update current user's profile
   */
  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = updateProfileSchema.parse(req.body);
      
      // Filter out undefined values
      const updateData: UpdateUserProfileData = {};
      if (validatedData.first_name !== undefined) updateData.first_name = validatedData.first_name;
      if (validatedData.last_name !== undefined) updateData.last_name = validatedData.last_name;
      if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
      if (validatedData.usdt_bep20_address !== undefined) updateData.usdt_bep20_address = validatedData.usdt_bep20_address;

      const updatedProfile = await userService.updateUserProfile(userId, updateData);
      if (!updatedProfile) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues
        });
      }

      console.error('Error updating user profile: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/user/telegram/link
   * Link Telegram account to user (supports both ID and username)
   */
  async linkTelegram(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { telegram_user_id, telegram_username } = linkTelegramSchema.parse(req.body);
      
      const success = await userService.linkTelegram(userId, telegram_user_id, telegram_username);
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to link Telegram account'
        });
      }

      // Get user information for notifications
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          first_name: true,
          last_name: true,
          email: true
        }
      });

      if (user) {
        const userName = `${user.first_name} ${user.last_name}`.trim();
        
        // Send Telegram confirmation message with fallback support
      if (telegram_user_id) {
        try {
          // Try with ID first, use username as fallback if available
          const confirmationSent = await telegramService.sendTelegramLinkConfirmation(
            telegram_user_id, 
            userName, 
            telegram_username
          );
          if (!confirmationSent) {
            console.warn(`Failed to send Telegram confirmation to user ${userId} with ID ${telegram_user_id} and fallback username ${telegram_username || 'none'}`);
          }
        } catch (telegramError) {
          console.error('Failed to send Telegram confirmation:', telegramError);
          // Don't fail the request if Telegram message fails
        }
      } else if (telegram_username) {
        try {
          // Only username available, try to send directly to username
          const confirmationSent = await telegramService.sendTelegramLinkConfirmation(
            `@${telegram_username}`, 
            userName
          );
          if (confirmationSent) {
            console.info(`Telegram confirmation sent to username @${telegram_username} for user ${userId}`);
          } else {
            console.warn(`Failed to send Telegram confirmation to username @${telegram_username} for user ${userId}`);
          }
        } catch (telegramError) {
          console.error('Failed to send Telegram confirmation via username:', telegramError);
        }
      }

        // Send real-time notification to user
        try {
          await realTimeNotificationService.sendToUser(userId, {
            type: 'security',
            title: '🔗 Telegram Vinculado',
            message: 'Tu cuenta de Telegram ha sido vinculada exitosamente. Ahora recibirás códigos OTP y notificaciones importantes.',
            severity: 'success',
            metadata: {
              telegram_user_id: telegram_user_id || null,
              linked_at: new Date().toISOString()
            }
          });
        } catch (notificationError) {
          console.error('Failed to send real-time notification:', notificationError);
          // Don't fail the request if notification fails
        }
      }

      return res.json({
        success: true,
        message: 'Telegram account linked successfully',
        linked_via: 'id'
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.issues
        });
      }

      console.error('Error linking Telegram account: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/user/telegram/unlink
   * Unlink Telegram account from user
   */
  async unlinkTelegram(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const success = await userService.unlinkTelegram(userId);
      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to unlink Telegram account'
        });
      }

      return res.json({
        success: true,
        message: 'Telegram account unlinked successfully'
      });
    } catch (error) {
      console.error('Error unlinking Telegram account: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/v1/user/notification-settings
   * Get current user's notification settings
   * TEMPORARILY DISABLED - Service not available
   */
  async getNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // TODO: Implement notification settings service
      const settings = {};
      
      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting notification settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/user/notification-settings
   * Update current user's notification settings
   * TEMPORARILY DISABLED - Service not available
   */
  async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // TODO: Implement notification settings validation and service
      console.log('User notification settings update requested:', { userId, body: req.body });

      return res.json({
        success: true,
        data: {},
        message: 'Notification settings update temporarily disabled'
      });
    } catch (error) {
      console.error('Error updating notification settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/v1/user/settings
   * Get current user's settings
   */
  async getSettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const settings = await userService.getUserSettings(userId);
      
      return res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error getting user settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/user/settings/security
   * Update current user's security settings
   */
  async updateSecuritySettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validationResult = userSettingsSecuritySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        });
      }

      const updatedSettings = await userService.updateSecuritySettings(userId, validationResult.data);

      console.log('User security settings updated:', { userId, updates: validationResult.data });

      return res.json({
        success: true,
        data: updatedSettings,
        message: 'Security settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating security settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/user/settings/notifications
   * Update current user's notification settings
   */
  async updateNotificationSettingsV2(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validationResult = userSettingsNotificationsSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        });
      }

      const updatedSettings = await userService.updateNotificationSettingsV2(userId, validationResult.data);

      console.log('User notification settings updated:', { userId, updates: validationResult.data });

      return res.json({
        success: true,
        data: updatedSettings,
        message: 'Notification settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating notification settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * PUT /api/v1/user/settings/privacy
   * Update current user's privacy settings
   */
  async updatePrivacySettings(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validationResult = userSettingsPrivacySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        });
      }

      const updatedSettings = await userService.updatePrivacySettings(userId, validationResult.data);

      console.log('User privacy settings updated:', { userId, updates: validationResult.data });

      return res.json({
        success: true,
        data: updatedSettings,
        message: 'Privacy settings updated successfully'
      });
    } catch (error) {
      console.error('Error updating privacy settings: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/user/settings/change-password
   * Change current user's password
   */
  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validationResult = changePasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        });
      }

      const result = await userService.changePassword(userId, validationResult.data.current_password, validationResult.data.new_password);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      console.log('User password changed successfully:', { userId });

      return res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      console.error('Error changing password: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * DELETE /api/v1/user/settings/delete-account
   * Request account deletion
   */
  async deleteAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validationResult = deleteAccountSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: validationResult.error.issues
        });
      }

      const result = await userService.requestAccountDeletion(userId, validationResult.data.password);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      console.log('Account deletion requested:', { userId });

      return res.json({
        success: true,
        message: 'Account deletion request submitted successfully'
      });
    } catch (error) {
      console.error('Error requesting account deletion: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get Telegram service health status
  async getTelegramHealth(req: Request, res: Response) {
    try {
      // Simplified health check without OTP stats
      return res.json({
        success: true,
        data: {
          status: 'active',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error getting Telegram health:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get Telegram service health'
      });
    }
  }

  /**
   * POST /api/v1/user/withdrawal-wallet/verify
   * Verify withdrawal wallet with OTP
   */
  async verifyWithdrawalWallet(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validation = verifyWithdrawalWalletSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const { withdrawal_wallet_address } = validation.data;

      const result = await userService.verifyWithdrawalWallet(userId, withdrawal_wallet_address);
      
      return res.json({
        success: true,
        message: 'OTP sent successfully',
        data: result
      });
    } catch (error) {
      console.error('Error verifying withdrawal wallet: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * POST /api/v1/user/withdrawal-wallet/confirm
   * Confirm withdrawal wallet OTP
   */
  async confirmWithdrawalWalletOtp(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validation = confirmWithdrawalWalletOtpSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.error.issues
        });
      }

      const { withdrawal_wallet_address, otp_code } = validation.data;

      const result = await userService.confirmWithdrawalWalletOtp(userId, withdrawal_wallet_address, otp_code);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error
        });
      }

      return res.json({
        success: true,
        message: 'Withdrawal wallet verified successfully',
        data: result.data
      });
    } catch (error) {
      console.error('Error confirming withdrawal wallet OTP: ' + (error as Error).message);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export const userController = new UserController();