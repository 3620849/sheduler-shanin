import axios, { AxiosError } from 'axios';
import { ApiResponse, ApiError } from '../types/api';

export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiResponse<any> | ApiError>;
    if (axiosErr.response?.data) {
      const data = axiosErr.response.data;
      if ('error' in data && data.error?.message) {
        return data.error.message;
      }
      if ('message' in data && typeof data.message === 'string') {
        return data.message;
      }
    }
    return axiosErr.message || 'Network error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
