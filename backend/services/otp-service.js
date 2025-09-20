const crypto = require('crypto');
// node-fetch será importado dinámicamente
const paymentConfig = require('../config/payment-config');

/**
 * ProFitAgent OTP Service
 * Handles OTP generation, validation and Telegram delivery using ProFitAgent OTP Bot
 */
class OTPService {
  constructor() {
    this.otpStore = new Map(); // In production, use Redis or database
    this.otpExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxAttempts = 3;
  }

  /**
   * Generate a 6-digit OTP code
   * @returns {string} OTP code
   */
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Send OTP via ProFitAgent Telegram OTP Bot
   * @param {string} chatId - Telegram chat ID
   * @param {string} purpose - Purpose of OTP (login, payment, etc.)
   * @returns {Promise<string>} OTP code
   */
  async sendOTP(chatId, purpose = 'authentication') {
    try {
      const otp = this.generateOTP();
      const expiresAt = Date.now() + this.otpExpiry;
      
      // Store OTP with metadata
      this.otpStore.set(chatId, {
        code: otp,
        expiresAt,
        attempts: 0,
        purpose,
        createdAt: Date.now()
      });

      // Send OTP via ProFitAgent OTP Bot
      const botToken = process.env.TELEGRAM_OTP_BOT_TOKEN || paymentConfig.telegram.otpBot.token;
      if (!botToken) {
        throw new Error('ProFitAgent OTP bot token not configured');
      }

      const message = `🔐 *ProFitAgent Security Code*\n\n` +
                     `Your verification code is: \`${otp}\`\n\n` +
                     `Purpose: ${purpose}\n` +
                     `Valid for: 5 minutes\n\n` +
                     `⚠️ Do not share this code with anyone!`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const fetch = (await import('node-fetch')).default;
      const response = await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to send OTP: ${error}`);
      }

      console.log(`✅ OTP sent successfully to chat ${chatId} for ${purpose}`);
      return otp;
    } catch (error) {
      console.error('❌ Failed to send OTP:', error);
      throw error;
    }
  }

  /**
   * Verify OTP code
   * @param {string} chatId - Telegram chat ID
   * @param {string} code - OTP code to verify
   * @returns {Promise<boolean>} Verification result
   */
  async verifyOTP(chatId, code) {
    try {
      const otpData = this.otpStore.get(chatId);
      
      if (!otpData) {
        console.log(`❌ No OTP found for chat ${chatId}`);
        return false;
      }

      // Check if OTP has expired
      if (Date.now() > otpData.expiresAt) {
        this.otpStore.delete(chatId);
        console.log(`❌ OTP expired for chat ${chatId}`);
        return false;
      }

      // Check attempts limit
      if (otpData.attempts >= this.maxAttempts) {
        this.otpStore.delete(chatId);
        console.log(`❌ Max attempts exceeded for chat ${chatId}`);
        return false;
      }

      // Increment attempts
      otpData.attempts++;

      // Verify code
      if (otpData.code === code) {
        this.otpStore.delete(chatId);
        console.log(`✅ OTP verified successfully for chat ${chatId}`);
        
        // Send success notification
        await this.sendSuccessNotification(chatId, otpData.purpose);
        return true;
      } else {
        console.log(`❌ Invalid OTP for chat ${chatId}. Attempts: ${otpData.attempts}/${this.maxAttempts}`);
        
        // Send failure notification if max attempts reached
        if (otpData.attempts >= this.maxAttempts) {
          await this.sendFailureNotification(chatId);
          this.otpStore.delete(chatId);
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      return false;
    }
  }

  /**
   * Send success notification
   * @param {string} chatId - Telegram chat ID
   * @param {string} purpose - Purpose of OTP
   */
  async sendSuccessNotification(chatId, purpose) {
    try {
      const botToken = process.env.TELEGRAM_OTP_BOT_TOKEN || paymentConfig.telegram.otpBot.token;
      if (!botToken) return;

      const message = `✅ *ProFitAgent - Verification Successful*\n\n` +
                     `Your ${purpose} has been verified successfully!\n\n` +
                     `Time: ${new Date().toLocaleString()}`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const fetch = (await import('node-fetch')).default;
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (error) {
      console.error('❌ Failed to send success notification:', error);
    }
  }

  /**
   * Send failure notification
   * @param {string} chatId - Telegram chat ID
   */
  async sendFailureNotification(chatId) {
    try {
      const botToken = process.env.TELEGRAM_OTP_BOT_TOKEN || paymentConfig.telegram.otpBot.token;
      if (!botToken) return;

      const message = `❌ *ProFitAgent - Verification Failed*\n\n` +
                     `Maximum verification attempts exceeded.\n` +
                     `Please request a new code.\n\n` +
                     `Time: ${new Date().toLocaleString()}`;

      const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      await fetch(telegramUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });
    } catch (error) {
      console.error('❌ Failed to send failure notification:', error);
    }
  }

  /**
   * Get OTP status
   * @param {string} chatId - Telegram chat ID
   * @returns {Object|null} OTP status
   */
  getOTPStatus(chatId) {
    const otpData = this.otpStore.get(chatId);
    if (!otpData) return null;

    return {
      exists: true,
      expiresAt: otpData.expiresAt,
      attempts: otpData.attempts,
      maxAttempts: this.maxAttempts,
      purpose: otpData.purpose,
      timeRemaining: Math.max(0, otpData.expiresAt - Date.now())
    };
  }

  /**
   * Clear expired OTPs (cleanup job)
   */
  cleanupExpiredOTPs() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [chatId, otpData] of this.otpStore.entries()) {
      if (now > otpData.expiresAt) {
        this.otpStore.delete(chatId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired OTPs`);
    }
  }

  /**
   * Get service statistics
   * @returns {Object} Service stats
   */
  getStats() {
    return {
      activeOTPs: this.otpStore.size,
      otpExpiry: this.otpExpiry,
      maxAttempts: this.maxAttempts,
      botConfigured: !!(process.env.TELEGRAM_OTP_BOT_TOKEN || paymentConfig.telegram.otpBot.token)
    };
  }
}

// Create singleton instance
const otpService = new OTPService();

// Setup cleanup interval (every 5 minutes)
setInterval(() => {
  otpService.cleanupExpiredOTPs();
}, 5 * 60 * 1000);

module.exports = otpService;