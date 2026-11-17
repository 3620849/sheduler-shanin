import { TaskType } from './task';

export type ScheduleType = 'ONE_TIME' | 'INTERVAL' | 'WEEKLY' | 'CRON';

export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export interface SchedulingResponse {
  id: string;
  name: string;
  taskType: TaskType;
  taskParameters: Record<string, any>;
  scheduleType: ScheduleType;
  scheduleConfig: Record<string, any>;
  status: ScheduleStatus;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchedulingRequest {
  name: string;
  taskType: TaskType;
  taskParameters: Record<string, any>;
  scheduleType: ScheduleType;
  scheduleConfig: Record<string, any>;
}

export interface UpdateSchedulingRequest {
  name?: string;
  taskType?: TaskType;
  taskParameters?: Record<string, any>;
  scheduleType?: ScheduleType;
  scheduleConfig?: Record<string, any>;
  status?: ScheduleStatus;
}
