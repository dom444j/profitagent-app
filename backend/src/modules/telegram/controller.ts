import { Request, Response } from 'express';
import { telegramService } from '../../services/telegram';
import { logger } from '../../utils/logger';

// Test OTP message sending
export const testOTPMessage = async (req: Request, res: Response) => {
  try {
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'userId and amount are required'
      });
    }
    
    const result = await telegramService.sendWithdrawalOTP(
      userId,
      'test-withdrawal-' + Date.now(),
      amount
    );
    
    return res.json({
      success: result.success,
      message: result.success ? 'OTP message sent successfully' : 'Failed to send OTP message',
      otpId: result.otpId
    });
    
  } catch (error) {
    logger.error('Error in testOTPMessage: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Test alert message sending
export const testAlertMessage = async (req: Request, res: Response) => {
  try {
    const { title, message, level } = req.body;
    
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'title and message are required'
      });
    }
    
    const result = await telegramService.sendSystemAlert(
      title,
      message,
      level || 'info'
    );
    
    return res.json({
      success: result,
      message: result ? 'Alert message sent successfully' : 'Failed to send alert message'
    });
    
  } catch (error) {
    logger.error('Error in testAlertMessage: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Test withdrawal alert
export const testWithdrawalAlert = async (req: Request, res: Response) => {
  try {
    const { type, withdrawalData } = req.body;
    
    if (!type || !withdrawalData) {
      return res.status(400).json({
        success: false,
        message: 'type and withdrawalData are required'
      });
    }
    
    const result = await telegramService.sendWithdrawalAlert(type, withdrawalData);
    
    return res.json({
      success: result,
      message: result ? 'Withdrawal alert sent successfully' : 'Failed to send withdrawal alert'
    });
    
  } catch (error) {
    logger.error('Error in testWithdrawalAlert: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Verify OTP
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { otpId, code } = req.body;
    
    if (!otpId || !code) {
      return res.status(400).json({
        success: false,
        message: 'otpId and code are required'
      });
    }
    
    const result = await telegramService.verifyOTP(otpId, code);
    
    return res.json({
      success: result.valid,
      message: result.valid ? 'OTP verified successfully' : 'Invalid or expired OTP',
      userId: result.userId,
      type: result.type
    });
    
  } catch (error) {
    logger.error('Error in verifyOTP: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get OTP statistics
export const getOTPStats = async (req: Request, res: Response) => {
  try {
    const stats = await telegramService.getOTPStats();
    
    return res.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Error in getOTPStats: ' + (error as Error).message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};