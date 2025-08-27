import { useState } from 'react';
import axios from 'axios';

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = axios.create({
    baseURL: '/api/v1',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // No Authorization header; auth via httpOnly cookie
  api.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
  );

  api.interceptors.response.use(
    (response) => response,
    (error) => Promise.reject(error)
  );

  const get = async <T = any>(url: string, config?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url, config);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const post = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const put = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const del = async <T = any>(url: string, config?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const patch = async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.patch(url, data, config);
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Request failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, get, post, put, del, patch };
};