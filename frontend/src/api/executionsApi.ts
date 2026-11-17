import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import { TaskExecution } from '../types/execution';

export const executionsApi = {
  getExecutions: async (schedulingId?: string): Promise<TaskExecution[]> => {
    const url = schedulingId
      ? `/executions?schedulingId=${encodeURIComponent(schedulingId)}`
      : '/executions';
    const response = await apiClient.get<ApiResponse<TaskExecution[]>>(url);
    return response.data.data;
  },
};
