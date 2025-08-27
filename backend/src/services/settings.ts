import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

class SettingsService {
  private cache = new Map<string, string>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getSetting(key: string, defaultValue?: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = this.cache.get(key);
      const expiry = this.cacheExpiry.get(key);
      
      if (cached && expiry && Date.now() < expiry) {
        return cached;
      }

      // Fetch from database
      const setting = await prisma.setting.findUnique({
        where: { key }
      });

      const value = setting?.value ? setting.value.toString() : defaultValue || null;
      
      // Cache the result
      if (value) {
        this.cache.set(key, value);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
      }

      return value;
    } catch (error) {
      logger.error(`Error getting setting ${key}:`, error);
      return defaultValue || null;
    }
  }

  async getOrderExpirationMinutes(): Promise<number> {
    try {
      const setting = await prisma.setting.findUnique({
        where: { key: 'order_expiration_minutes' }
      });
      
      if (setting?.value) {
        const minutes = typeof setting.value === 'number' ? setting.value : parseInt(setting.value.toString(), 10);
        return isNaN(minutes) ? 30 : minutes;
      }
      
      return 30; // Default fallback
    } catch (error) {
      logger.error('Error getting order expiration minutes:', error);
      return 30; // Default fallback
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  clearCacheForKey(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }
}

export const settingsService = new SettingsService();