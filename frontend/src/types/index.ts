export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  ref_code: string;
  usdt_bep20_address?: string;
  telegram_link_status: 'not_linked' | 'pending' | 'linked';
  status: 'active' | 'inactive' | 'suspended';
  role: 'user' | 'admin';
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  price_usdt: string;
  daily_rate: string;
  duration_days: number;
  description: string;
  sla_hours: number;
  badge: string | null;
  target_user: string;
  max_cap_percentage: string;
  cashback_cap: string;
  potential_cap: string;
  active?: boolean;
}

export interface License {
  id: string;
  user_id?: string;
  product_id?: string;
  product: {
    id: string;
    name: string;
    description: string;
    sla_hours: number;
    badge: string | null;
    target_user: string;
    price_usdt: string;
    duration_days: number;
    daily_rate?: string;
    days_active?: number;
  };
  principalUSDT?: string;
  principal_usdt: string;
  status: 'active' | 'completed' | 'paused' | 'canceled';
  days_generated: number;
  daysGenerated?: number; // Alias for days_generated in camelCase
  duration_days?: number;
  days_active?: number;
  daily_rate?: number | string;
  cashback_accum?: string;
  potential_accum?: string;
  accruedUSDT?: string;
  accrued_usdt: string;
  potentialAccum?: string;
  capUSDT?: string;
  remainingUSDT?: string;
  pause_potential?: boolean;
  flags: {
    pause_potential: boolean;
  };
  startedAt?: string;
  started_at?: string;
  endsAt?: string;
  ends_at?: string;
  completed_at?: string;
  created_at?: string;
  name?: string;
  description?: string;
  price_usdt?: string;
}

export interface LicenseEarning {
  id: string;
  license_id: string;
  day_index: number;
  daily_amount: string;
  amount_usdt: string;
  applied_to_balance: boolean;
  is_paused: boolean;
  earning_date: string;
  applied_at?: string;
  created_at: string;
}

export interface Balance {
  available: string;
  on_hold_potential: string;
  pending_commissions: string;
  total_earned: string;
  total_withdrawn: string;
}

export interface Withdrawal {
  id: string;
  user_id?: string;
  amount_usdt: string;
  payout_address: string;
  usdt_address?: string;
  status: 'requested' | 'otp_sent' | 'otp_verified' | 'approved' | 'paid' | 'rejected' | 'pending' | 'canceled';
  tx_hash?: string;
  paid_tx_hash?: string;
  notes?: string;
  requested_at?: string;
  processed_at?: string;
  created_at: string;
  paid_at?: string;
  data?: any;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SSEEvent {
  type: 'connected' | 'earningPaid' | 'licensePaused' | 'licenseCompleted' | 'orderUpdated' | 'withdrawalUpdated' | 'commissionReleased';
  data: any;
  timestamp: string;
}