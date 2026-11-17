import { APIRequestContext, request } from '@playwright/test';

export interface CreateSchedulePayload {
  name: string;
  taskType: 'LOG_TASK' | 'EMAIL_TASK' | 'DB_QUERY_TASK';
  taskParameters: Record<string, any>;
  scheduleType: 'ONE_TIME' | 'INTERVAL' | 'WEEKLY' | 'CRON';
  scheduleConfig: Record<string, any>;
}

export class ApiTestHelper {
  private apiBaseUrl: string;

  constructor(apiBaseUrl?: string) {
    this.apiBaseUrl = apiBaseUrl || process.env.BACKEND_API_URL || 'http://localhost:8081/api';
  }

  private async getContext(): Promise<APIRequestContext> {
    return await request.newContext();
  }

  async getAllSchedulings(): Promise<any[]> {
    const context = await this.getContext();
    try {
      const response = await context.get(`${this.apiBaseUrl}/schedulings?page=0&size=100`);
      if (!response.ok()) {
        return [];
      }
      const data = await response.json();
      return data?.data?.content || [];
    } catch {
      return [];
    } finally {
      await context.dispose();
    }
  }

  async createScheduling(payload: CreateSchedulePayload): Promise<any> {
    const context = await this.getContext();
    try {
      const response = await context.post(`${this.apiBaseUrl}/schedulings`, {
        data: payload,
      });
      if (!response.ok()) {
        const errorText = await response.text();
        throw new Error(`Failed to create scheduling: ${response.status()} - ${errorText}`);
      }
      const data = await response.json();
      return data?.data;
    } finally {
      await context.dispose();
    }
  }

  async deleteScheduling(id: string): Promise<void> {
    const context = await this.getContext();
    try {
      await context.delete(`${this.apiBaseUrl}/schedulings/${id}`);
    } finally {
      await context.dispose();
    }
  }

  async deleteAllSchedulings(): Promise<void> {
    const schedulings = await this.getAllSchedulings();
    for (const s of schedulings) {
      await this.deleteScheduling(s.id);
    }
  }

  async getExecutions(schedulingId?: string): Promise<any[]> {
    const context = await this.getContext();
    try {
      const url = schedulingId
        ? `${this.apiBaseUrl}/executions?schedulingId=${encodeURIComponent(schedulingId)}`
        : `${this.apiBaseUrl}/executions`;
      const response = await context.get(url);
      if (!response.ok()) {
        return [];
      }
      const data = await response.json();
      return data?.data || [];
    } catch {
      return [];
    } finally {
      await context.dispose();
    }
  }

  async waitForExecutionCount(
    schedulingId: string,
    minCount: number,
    timeoutMs: number = 20000,
    pollIntervalMs: number = 1000
  ): Promise<any[]> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const executions = await this.getExecutions(schedulingId);
      if (executions.length >= minCount) {
        return executions;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    const finalExecutions = await this.getExecutions(schedulingId);
    return finalExecutions;
  }
}
