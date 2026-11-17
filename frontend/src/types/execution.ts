export type ExecutionStatus = 'SUCCESS' | 'FAILED';

export interface TaskExecution {
  id: string;
  schedulingId: string | null;
  taskName: string;
  taskType: string;
  status: ExecutionStatus;
  output: string;
  durationMs: number;
  fireTime: string;
  createdAt: string;
}
