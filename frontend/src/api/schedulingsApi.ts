import { apiClient } from './client';
import { ApiResponse, PageResponse } from '../types/api';
import {
  SchedulingResponse,
  CreateSchedulingRequest,
  UpdateSchedulingRequest,
  SchedulingStatsResponse,
} from '../types/scheduling';

export const schedulingsApi = {
  async getAll(page: number = 0, size: number = 10): Promise<PageResponse<SchedulingResponse>> {
    const response = await apiClient.get<ApiResponse<PageResponse<SchedulingResponse>>>('/schedulings', {
      params: { page, size, sort: 'createdAt,desc' },
    });
    return response.data.data;
  },

  async getStats(): Promise<SchedulingStatsResponse> {
    const response = await apiClient.get<ApiResponse<SchedulingStatsResponse>>('/schedulings/stats');
    return response.data.data;
  },

  async getById(id: string): Promise<SchedulingResponse> {
    const response = await apiClient.get<ApiResponse<SchedulingResponse>>(`/schedulings/${id}`);
    return response.data.data;
  },

  async create(payload: CreateSchedulingRequest): Promise<SchedulingResponse> {
    const response = await apiClient.post<ApiResponse<SchedulingResponse>>('/schedulings', payload);
    return response.data.data;
  },

  async update(id: string, payload: UpdateSchedulingRequest): Promise<SchedulingResponse> {
    const response = await apiClient.put<ApiResponse<SchedulingResponse>>(`/schedulings/${id}`, payload);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/schedulings/${id}`);
  },
};
