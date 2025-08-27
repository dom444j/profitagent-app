import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format USDT amount with proper decimal places
 */
export const formatUSDT = (amount: string | number, decimals: number = 6): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0.000000';
  return num.toFixed(decimals);
};

/**
 * Format USDT amount for display (removes trailing zeros)
 */
export const formatUSDTDisplay = (amount: string | number): string => {
  const formatted = formatUSDT(amount);
  return parseFloat(formatted).toString();
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  if (isNaN(value) || !isFinite(value)) return '0.00%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format date to readable string
 */
export const formatDate = (date: string | Date): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, 'MMM dd, yyyy');
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Format date with time
 */
export const formatDateTime = (date: string | Date): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, 'MMM dd, yyyy HH:mm');
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date: string | Date): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Truncate wallet address for display
 */
export const truncateAddress = (address: string): string => {
  if (address.length <= 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

/**
 * Calculate progress percentage
 */
export const calculateProgress = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.min((current / total) * 100, 100);
};

/**
 * Format license status for display
 */
export const formatLicenseStatus = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Active';
    case 'completed':
      return 'Completed';
    case 'paused':
      return 'Paused';
    case 'canceled':
      return 'Canceled';
    default:
      return status;
  }
};

/**
 * Get status badge color class
 */
export const getStatusBadgeClass = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'badge-success';
    case 'completed':
      return 'badge-primary';
    case 'paused':
      return 'badge-warning';
    case 'canceled':
    case 'rejected':
      return 'badge-danger';
    case 'pending':
      return 'badge-warning';
    case 'approved':
    case 'paid':
      return 'badge-success';
    default:
      return 'badge-secondary';
  }
};