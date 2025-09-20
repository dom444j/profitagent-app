const express = require('express');
const router = express.Router();
const otpService = require('../services/otp-service');
const { authenticateToken } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiting for OTP endpoints
const otpRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP requests per window
  message: {
    error: 'Too many OTP requests. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const verifyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 verification attempts per window
  message: {
    error: 'Too many verification attempts. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * @route POST /api/otp/send
 * @desc Send OTP to user's Telegram
 * @access Private
 */
router.post('/send', authenticateToken, otpRateLimit, async (req, res) => {
  try {
    const { chatId, purpose = 'authentication' } = req.body;
    
    // Validate input
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Telegram chat ID is required'
      });
    }

    // Validate purpose
    const validPurposes = ['authentication', 'payment', 'withdrawal', 'settings', 'security'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP purpose'
      });
    }

    // Check if user already has an active OTP
    const existingOTP = otpService.getOTPStatus(chatId);
    if (existingOTP && existingOTP.timeRemaining > 0) {
      return res.status(429).json({
        success: false,
        error: 'OTP already sent. Please wait before requesting a new one.',
        timeRemaining: existingOTP.timeRemaining,
        expiresAt: existingOTP.expiresAt
      });
    }

    // Send OTP
    const otp = await otpService.sendOTP(chatId, purpose);
    
    res.json({
      success: true,
      message: 'OTP sent successfully to your Telegram',
      expiresIn: 5 * 60 * 1000, // 5 minutes
      purpose
    });

    // Log OTP request
    console.log(`📱 OTP sent to chat ${chatId} for ${purpose} by user ${req.user.id}`);
    
  } catch (error) {
    console.error('❌ Error sending OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send OTP. Please try again later.'
    });
  }
});

/**
 * @route POST /api/otp/verify
 * @desc Verify OTP code
 * @access Private
 */
router.post('/verify', authenticateToken, verifyRateLimit, async (req, res) => {
  try {
    const { chatId, code } = req.body;
    
    // Validate input
    if (!chatId || !code) {
      return res.status(400).json({
        success: false,
        error: 'Chat ID and OTP code are required'
      });
    }

    // Validate OTP format
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP format. Must be 6 digits.'
      });
    }

    // Verify OTP
    const isValid = await otpService.verifyOTP(chatId, code);
    
    if (isValid) {
      res.json({
        success: true,
        message: 'OTP verified successfully',
        verified: true
      });

      // Log successful verification
      console.log(`✅ OTP verified successfully for chat ${chatId} by user ${req.user.id}`);
    } else {
      // Get OTP status for detailed error
      const otpStatus = otpService.getOTPStatus(chatId);
      
      let errorMessage = 'Invalid or expired OTP';
      if (otpStatus && otpStatus.attempts >= otpStatus.maxAttempts) {
        errorMessage = 'Maximum verification attempts exceeded. Please request a new OTP.';
      } else if (!otpStatus) {
        errorMessage = 'No OTP found. Please request a new OTP.';
      }
      
      res.status(400).json({
        success: false,
        error: errorMessage,
        verified: false,
        attemptsRemaining: otpStatus ? otpStatus.maxAttempts - otpStatus.attempts : 0
      });

      // Log failed verification
      console.log(`❌ OTP verification failed for chat ${chatId} by user ${req.user.id}`);
    }
    
  } catch (error) {
    console.error('❌ Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP. Please try again later.'
    });
  }
});

/**
 * @route GET /api/otp/status/:chatId
 * @desc Get OTP status for a chat ID
 * @access Private
 */
router.get('/status/:chatId', authenticateToken, async (req, res) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Chat ID is required'
      });
    }

    const otpStatus = otpService.getOTPStatus(chatId);
    
    if (!otpStatus) {
      return res.json({
        success: true,
        hasActiveOTP: false,
        message: 'No active OTP found'
      });
    }

    res.json({
      success: true,
      hasActiveOTP: true,
      expiresAt: otpStatus.expiresAt,
      timeRemaining: otpStatus.timeRemaining,
      attempts: otpStatus.attempts,
      maxAttempts: otpStatus.maxAttempts,
      purpose: otpStatus.purpose
    });
    
  } catch (error) {
    console.error('❌ Error getting OTP status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OTP status'
    });
  }
});

/**
 * @route GET /api/otp/stats
 * @desc Get OTP service statistics
 * @access Private (Admin only)
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const stats = otpService.getStats();
    
    res.json({
      success: true,
      stats: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting OTP stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OTP statistics'
    });
  }
});

/**
 * @route POST /api/otp/cleanup
 * @desc Manually trigger cleanup of expired OTPs
 * @access Private (Admin only)
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    otpService.cleanupExpiredOTPs();
    
    res.json({
      success: true,
      message: 'Cleanup completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup expired OTPs'
    });
  }
});

/**
 * @route POST /api/otp/test
 * @desc Test OTP service configuration
 * @access Private (Admin only)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { chatId } = req.body;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Chat ID is required for testing'
      });
    }

    // Send test OTP
    await otpService.sendOTP(chatId, 'test');
    
    res.json({
      success: true,
      message: 'Test OTP sent successfully',
      note: 'This is a test OTP for configuration verification'
    });
    
  } catch (error) {
    console.error('❌ Error sending test OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test OTP',
      details: error.message
    });
  }
});

module.exports = router;