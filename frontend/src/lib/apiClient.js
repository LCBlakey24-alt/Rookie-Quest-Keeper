import axios from 'axios';
import { API_BASE } from '@/lib/api';
import { clearAuthToken, getAuthToken } from '@/lib/auth';

import { formatApiErrorDetail } from '@/lib/apiErrors';
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 20000,
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.data?.detail) {
      error.formattedDetail = formatApiErrorDetail(error.response.data.detail);
    }
    if (error?.response?.status === 401) {
      clearAuthToken();
      localStorage.removeItem('dm_username');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
