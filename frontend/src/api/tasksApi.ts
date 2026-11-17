import { apiClient } from './client';
import { ApiResponse } from '../types/api';
import { TaskDefinitionResponse, TaskType } from '../types/task';

export const tasksApi = {
  async getAll(): Promise<TaskDefinitionResponse[]> {
    const response = await apiClient.get<ApiResponse<TaskDefinitionResponse[]>>('/tasks');
    return response.data.data;
  },

  async getByType(taskType: TaskType): Promise<TaskDefinitionResponse> {
    const response = await apiClient.get<ApiResponse<TaskDefinitionResponse>>(`/tasks/${taskType}`);
    return response.data.data;
  },
};
