import axios, { AxiosInstance } from 'axios';
import { ApiResponse, User, License, LicenseEarning, Balance, Withdrawal, Product } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api/v1',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor (sin agregar Authorization; autenticación por cookie httpOnly)
    this.api.interceptors.request.use(
      (config) => config,
      (error) => Promise.reject(error)
    );

    // Response interceptor: no realizar efectos colaterales globales en 401
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP methods
  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.get(url, config);
    return response.data;
    }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  // Auth endpoints (según docs: respuesta con { user } y cookies httpOnly)
  async login(email: string, password: string): Promise<{ user: User }> {
    const response = await this.api.post('/auth/login', { email, password });
    return response.data;
  }

  async adminLogin(email: string, password: string): Promise<{ user: User }> {
    const response = await this.api.post('/auth/admin/login', { email, password });
    return response.data;
  }

  async register(
    email: string,
    password: string,
    sponsor_code: string,
    first_name?: string,
    last_name?: string
  ): Promise<{ user: User }> {
    const response = await this.api.post('/auth/register', {
      email,
      password,
      sponsor_code,
      first_name,
      last_name,
    });
    return response.data;
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  async getMe(): Promise<{ user: User }> {
    const response = await this.api.get('/auth/me');
    return response.data;
  }

  // Products
  async getProducts(): Promise<ApiResponse<Product[]>> {
    const response = await this.api.get('/licenses/products');
    return response.data;
  }

  // Licenses
  async getLicenses(status?: string): Promise<{ data: { licenses: License[] } } | { data: License[] } | { licenses: License[] }> {
    const params = status ? { status } : {};
    const response = await this.api.get('/licenses', { params });
    return response.data;
  }

  async getLicenseEarnings(licenseId: string): Promise<ApiResponse<LicenseEarning[]>> {
    const response = await this.api.get(`/licenses/${licenseId}/earnings`);
    return response.data;
  }

  // Balance
  async getBalance(): Promise<ApiResponse<Balance>> {
    const response = await this.api.get('/balance');
    return response.data;
  }

  // Withdrawals
  // User Withdrawals
  async getUserWithdrawals(): Promise<Withdrawal[]> {
    const response = await this.api.get('/withdrawals');
    return response.data.data || [];
  }

  async createWithdrawal(payload: { amount_usdt: number; payout_address: string }): Promise<Withdrawal> {
    const response = await this.api.post('/withdrawals', payload);
    return response.data;
  }



  async cancelWithdrawal(withdrawalId: string): Promise<any> {
    const response = await this.api.delete(`/withdrawals/${withdrawalId}`);
    return response.data;
  }

  // User Balance
  async getUserBalance(): Promise<any> {
    const response = await this.api.get('/balance');
    return response.data;
  }

  // Orders
  async createOrder(product_id: string): Promise<any> {
    const response = await this.api.post('/orders', { product_id });
    return response.data;
  }

  async getOrder(orderId: string): Promise<any> {
    const response = await this.api.get(`/orders/${orderId}`);
    return response.data;
  }

  async submitTransaction(orderId: string, tx_hash: string): Promise<any> {
    // Generate a unique idempotency key for this request
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await this.api.post(`/orders/${orderId}/submit-tx`, 
      { tx_hash },
      {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      }
    );
    return response.data;
  }

  async reassignOrder(orderId: string): Promise<any> {
    const response = await this.api.post(`/orders/${orderId}/reassign`);
    return response.data;
  }

  async getUserOrders(page = 1, limit = 20, status?: string): Promise<any> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (status && status !== 'all') {
      params.append('status', status);
    }
    const response = await this.api.get(`/orders?${params.toString()}`);
    return response.data;
  }

  // SSE Token endpoint for VPS mode
  async getSseToken(): Promise<{ token: string; exp: number }> {
    const response = await this.api.post('/auth/sse-token');
    return response.data;
  }

  // SSE Connection with mixed authentication (token for VPS, cookie for local)
  async createSSEConnection(): Promise<EventSource> {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const baseUrl = new URL('/api/v1/sse/events', apiBaseUrl.startsWith('http') ? apiBaseUrl.replace('/api/v1', '') : 'http://localhost:5000');
    
    try {
      // Try to get SSE token (will work in VPS mode, fail in local mode)
      const { token } = await this.getSseToken();
      
      // If we got a token, use it in query string (VPS mode)
      const url = new URL(baseUrl.toString());
      url.searchParams.set('token', token);
      
      console.log('SSE: Using token authentication for VPS mode');
      return new EventSource(url.toString());
    } catch (error) {
      // Fallback to cookie authentication (local mode)
      console.log('SSE: Using cookie authentication for local mode');
      return new EventSource(baseUrl.toString(), {
        withCredentials: true,
      } as any);
    }
  }

  // Admin endpoints
  async getAdminStats(): Promise<any> {
    const response = await this.api.get('/admin/stats');
    return response.data;
  }

  async getAdminOverview(): Promise<any> {
    const response = await this.api.get('/admin/overview');
    return response.data;
  }

  async getAdminProducts(page = 1, limit = 20): Promise<any> {
    const response = await this.api.get('/admin/products', { params: { page, limit } });
    return response.data;
  }

  // Admin Settings endpoints
  async getAdminSettings(): Promise<any> {
    const response = await this.api.get('/admin/settings');
    return response.data;
  }

  async updateAdminSystemSettings(settings: any): Promise<any> {
    const response = await this.api.put('/admin/settings/system', settings);
    return response.data;
  }

  async updateAdminSecuritySettings(settings: any): Promise<any> {
    const response = await this.api.put('/admin/settings/security', settings);
    return response.data;
  }

  async updateAdminNotificationSettings(settings: any): Promise<any> {
    const response = await this.api.put('/admin/settings/notifications', settings);
    return response.data;
  }

  async changeAdminPassword(passwordData: { current_password: string; new_password: string; confirm_password: string }): Promise<any> {
    const response = await this.api.post('/admin/settings/change-password', passwordData);
    return response.data;
  }

  async changeUserPassword(passwordData: { current_password: string; new_password: string; confirm_password: string }): Promise<any> {
    const response = await this.api.post('/user/settings/change-password', passwordData);
    return response.data;
  }

  async createAdminProduct(payload: {
    name: string;
    code: string;
    price_usdt: number;
    daily_rate: number;
    duration_days: number;
    description: string;
    sla_hours: number;
    badge?: string;
    target_user: string;
    max_cap_percentage: number;
    cashback_cap: number;
    potential_cap: number;
    active?: boolean;
  }): Promise<any> {
    const response = await this.api.post('/admin/products', payload);
    return response.data;
  }

  async updateAdminProduct(
    id: string,
    payload: {
      name: string;
      code: string;
      price_usdt: number;
      daily_rate: number;
      duration_days: number;
      description: string;
      sla_hours: number;
      badge?: string;
      target_user: string;
      max_cap_percentage: number;
      cashback_cap: number;
      potential_cap: number;
      active?: boolean;
    }
  ): Promise<any> {
    const response = await this.api.put(`/admin/products/${id}`, payload);
    return response.data;
  }

  async deleteAdminProduct(id: string): Promise<any> {
    const response = await this.api.delete(`/admin/products/${id}`);
    return response.data;
  }

  // Admin Users Management
  async getAdminUsers(page = 1, limit = 20, search?: string): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (search) {
      params.append('search', search);
    }
    
    return this.get(`/admin/users?${params.toString()}`);
  }

  async getAdminUserProfile(userId: string): Promise<any> {
    const response = await this.api.get(`/admin/users/${userId}/profile`);
    return response.data;
  }

  async updateUserStatus(userId: string, status: 'active' | 'disabled' | 'deleted', reason?: string): Promise<any> {
    const response = await this.api.post(`/admin/users/${userId}/status`, {
      status,
      reason
    });
    return response.data;
  }

  async pauseUserPotential(userId: string, pause: boolean, reason?: string): Promise<any> {
    const response = await this.api.post(`/admin/users/${userId}/pause-potential`, {
      pause,
      reason
    });
    return response.data;
  }

  async createUserBonus(userId: string, amountUsdt: number, reason: string): Promise<any> {
    const response = await this.api.post(`/admin/bonuses`, {
      user_id: userId,
      amount_usdt: amountUsdt,
      reason
    });
    return response.data;
  }

  async getAdminBonuses(page: number = 1, limit: number = 20, filters: any = {}): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
    });
    const response = await this.api.get(`/admin/bonuses?${params}`);
    return response.data;
  }

  async updateUser(userId: string, data: { first_name?: string; last_name?: string; email?: string }): Promise<any> {
    const response = await this.api.put(`/admin/users/${userId}`, data);
    return response.data;
  }

  // Admin Orders
  async getAdminOrders(page = 1, limit = 20, search?: string, status?: string): Promise<any> {
    const params: any = { page, limit };
    
    if (status && status !== 'all') {
      params.status = status;
    }
    
    if (search) {
      params.search = search;
    }
    
    const response = await this.api.get('/admin/orders', { params });
    return response.data;
  }

  async confirmAdminOrder(orderId: string): Promise<any> {
    const response = await this.api.post(`/admin/orders/${orderId}/confirm`);
    return response.data;
  }

  async rejectAdminOrder(orderId: string, reason: string): Promise<any> {
    const response = await this.api.post(`/admin/orders/${orderId}/reject`, {
      reason
    });
    return response.data;
  }

  // Admin Withdrawals - Implemented

  // Admin Wallets Management
  async getAdminWallets(): Promise<any> {
    const response = await this.api.get('/admin/wallets');
    return response.data;
  }

  async createAdminWallet(data: { label: string; address: string }): Promise<any> {
    const response = await this.api.post('/admin/wallets', data);
    return response.data;
  }

  async updateAdminWallet(walletId: string, data: { label?: string; status?: 'active' | 'inactive' }): Promise<any> {
    const response = await this.api.put(`/admin/wallets/${walletId}`, data);
    return response.data;
  }

  async deleteAdminWallet(walletId: string): Promise<any> {
    const response = await this.api.delete(`/admin/wallets/${walletId}`);
    return response.data;
  }

  // Admin Licenses
  async getAdminLicenses(page = 1, limit = 20, status?: string, userId?: string): Promise<any> {
    const params: any = { page, limit };
    
    if (status && status !== 'all') {
      params.status = status;
    }
    
    if (userId) {
      params.userId = userId;
    }
    
    const response = await this.api.get('/admin/licenses', { params });
    return response.data;
  }

  async pauseLicensePotential(licenseId: string, pause: boolean): Promise<any> {
    const response = await this.api.post(`/admin/licenses/${licenseId}/pause-potential`, {
      pause
    });
    return response.data;
  }

  // Manual license management
  async adjustLicenseDays(licenseId: string, days: number, reason: string): Promise<any> {
    return this.post(`/admin/licenses/${licenseId}/adjust-days`, {
      days,
      reason
    });
  }

  async adjustLicenseTiming(licenseId: string, totalMinutes: number, reason: string): Promise<any> {
    return this.post(`/admin/licenses/${licenseId}/adjust-timing`, {
      totalMinutes,
      reason
    });
  }

  async processLicenseEarnings(licenseId: string, force: boolean = false): Promise<any> {
    return this.post(`/admin/licenses/${licenseId}/process-earnings`, {
      force
    });
  }

  // Referral methods
  async getUserReferrals(page = 1, limit = 20): Promise<any> {
    return this.get(`/referrals?page=${page}&limit=${limit}`);
  }

  async getUserCommissions(page = 1, limit = 20): Promise<any> {
    return this.get(`/referrals/commissions?page=${page}&limit=${limit}`);
  }

  // Admin referral methods
  async getAdminReferrals(page = 1, limit = 20): Promise<any> {
    return this.get(`/admin/referrals?page=${page}&limit=${limit}`);
  }

  async releaseCommission(commissionId: string): Promise<any> {
    return this.post(`/admin/referrals/${commissionId}/release`);
  }

  async cancelCommission(commissionId: string): Promise<any> {
    return this.post(`/admin/referrals/${commissionId}/cancel`);
  }

  // Admin Withdrawals
  async getAdminWithdrawals(page = 1, limit = 20, status?: string): Promise<any> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    if (status) {
      params.append('status', status);
    }
    
    return this.get(`/admin/withdrawals?${params.toString()}`);
  }

  async approveWithdrawal(withdrawalId: string): Promise<any> {
    const response = await this.api.post(`/admin/withdrawals/${withdrawalId}/approve`);
    return response.data;
  }

  async markWithdrawalAsPaid(withdrawalId: string, txHash: string, notes?: string, skipValidation?: boolean): Promise<any> {
    // Generate unique idempotency key for this request
    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const response = await this.api.post(`/admin/withdrawals/${withdrawalId}/mark-paid`, {
      txHash,
      notes,
      skipValidation
    }, {
      headers: {
        'Idempotency-Key': idempotencyKey
      }
    });
    return response.data;
  }

  async rejectWithdrawal(withdrawalId: string, reason: string): Promise<any> {
    const response = await this.api.post(`/admin/withdrawals/${withdrawalId}/reject`, {
      reason
    });
    return response.data;
  }

  async exportAdminWithdrawals(): Promise<any> {
    const response = await this.api.get('/admin/withdrawals/export.json');
    return response.data;
  }

  // User Profile methods
  async getUserProfile(): Promise<any> {
    const response = await this.api.get('/user/profile');
    return response.data;
  }

  async updateUserProfile(data: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    withdrawal_wallet_address?: string;
  }): Promise<any> {
    const response = await this.api.put('/user/profile', data);
    return response.data;
  }

  async linkTelegram(telegramUserId?: string, telegramUsername?: string): Promise<any> {
    const payload: any = {};
    if (telegramUserId) payload.telegram_user_id = telegramUserId;
    if (telegramUsername) payload.telegram_username = telegramUsername;
    
    const response = await this.api.post('/user/telegram/link', payload);
    return response.data;
  }

  async unlinkTelegram(): Promise<any> {
    const response = await this.api.post('/user/telegram/unlink');
    return response.data;
  }

  // Withdrawal wallet verification
  async verifyWithdrawalWallet(withdrawalWalletAddress: string): Promise<any> {
    return this.post('/user/withdrawal-wallet/verify', { withdrawal_wallet_address: withdrawalWalletAddress });
  }

  async sendWithdrawalWalletOtp(withdrawalWalletAddress: string): Promise<any> {
    return this.post('/user/withdrawal-wallet/verify', { withdrawal_wallet_address: withdrawalWalletAddress });
  }

  async verifyWithdrawalWalletOtp(data: { withdrawal_wallet_address: string; otp_code: string }): Promise<any> {
    return this.post('/user/withdrawal-wallet/confirm', data);
  }

  async confirmWithdrawalWalletOtp(withdrawalWalletAddress: string, otpCode: string): Promise<any> {
    return this.post('/user/verify-withdrawal-wallet-otp', { 
      withdrawal_wallet_address: withdrawalWalletAddress, 
      otp_code: otpCode 
    });
  }

  // AI Configuration endpoints
  async getAISettings(): Promise<any> {
    const response = await this.api.get('/telegram-admin/ai/settings');
    return response.data;
  }

  async updateAISettings(settings: {
    enabled: boolean;
    autoResponse: boolean;
    responseDelay: number;
    maxTokens: number;
    temperature: number;
    systemPrompt: string;
  }): Promise<any> {
    const response = await this.api.put('/telegram-admin/ai/settings', settings);
    return response.data;
  }

  async getAIStats(): Promise<any> {
    const response = await this.api.get('/telegram-admin/ai/stats');
    return response.data;
  }

  async testAIResponse(message: string): Promise<any> {
    const response = await this.api.post('/telegram-admin/ai/test', { message });
    return response.data;
  }

}

export const apiService = new ApiService();
export default apiService;