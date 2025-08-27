import { useState, useEffect } from 'react';
import { Balance } from '../types';
import apiService from '../services/api';

export const useBalance = () => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getBalance();
      setBalance(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  return {
    balance,
    loading,
    error,
    refetch: fetchBalance,
  };
};