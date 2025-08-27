import * as crypto from 'crypto';

/**
 * Generate a unique referral code
 * Format: 6 characters, alphanumeric, uppercase
 */
export function generateRefCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate OTP code
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format USDT amount for display
 */
export function formatUSDT(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

/**
 * Validate wallet address format (basic validation)
 */
export function isValidWalletAddress(address: string): boolean {
  // Basic validation for Ethereum-like addresses
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}