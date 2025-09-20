import { useState, useEffect } from 'react';
import { License, LicenseEarning } from '../types';
import apiService from '../services/api';

export const useLicenses = (status?: string) => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLicenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLicenses(status);
      // El backend devuelve { data: { licenses: [...], total, page, totalPages } }
      if ('data' in response && response.data) {
        if (typeof response.data === 'object' && 'licenses' in response.data && Array.isArray(response.data.licenses)) {
          setLicenses(response.data.licenses);
        } else if (Array.isArray(response.data)) {
          setLicenses(response.data);
        } else {
          setLicenses([]);
        }
      } else if ('licenses' in response && Array.isArray(response.licenses)) {
        setLicenses(response.licenses);
      } else {
        setLicenses([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch licenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicenses();
  }, [status]);

  return {
    licenses,
    loading,
    error,
    refetch: fetchLicenses,
  };
};

export const useLicenseEarnings = (licenseId: string | null) => {
  const [earnings, setEarnings] = useState<LicenseEarning[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = async () => {
    if (!licenseId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getLicenseEarnings(licenseId);
      setEarnings(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch earnings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, [licenseId]);

  return {
    earnings,
    loading,
    error,
    refetch: fetchEarnings,
  };
};