interface SystemConfig {
  min_withdrawal_amount: number;
  withdrawal_fee_usdt: number;
  maintenance_mode: boolean;
}

class SystemConfigService {
  private config: SystemConfig | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getConfig(): Promise<SystemConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.config && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.config;
    }

    try {
      const response = await fetch('/api/v1/system/config');
      if (!response.ok) {
        throw new Error('Failed to fetch system config');
      }
      
      const result = await response.json();
      this.config = result.data;
      this.lastFetch = now;
      
      return this.config!; // Non-null assertion since we just assigned it
    } catch (error) {
      console.error('Error fetching system config:', error);
      // Return default values if API fails
      return {
        min_withdrawal_amount: 10,
        withdrawal_fee_usdt: 2,
        maintenance_mode: false
      };
    }
  }

  async getWithdrawalFee(): Promise<number> {
    const config = await this.getConfig();
    return config.withdrawal_fee_usdt;
  }

  async getMinWithdrawal(): Promise<number> {
    const config = await this.getConfig();
    return config.min_withdrawal_amount;
  }

  // Clear cache to force refresh
  clearCache(): void {
    this.config = null;
    this.lastFetch = 0;
  }
}

export const systemConfigService = new SystemConfigService();
export type { SystemConfig };