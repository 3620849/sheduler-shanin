export type TaskType = 'LOG_TASK' | 'EMAIL_TASK' | 'DB_QUERY_TASK';

export type ParameterType = 'STRING' | 'NUMBER';

export interface ParameterDefinition {
  name: string;
  type: ParameterType;
  required: boolean;
  description: string;
  defaultValue?: any;
  format?: string | null;
  min?: number | null;
  max?: number | null;
}

export interface TaskDefinitionResponse {
  taskType: TaskType;
  displayName: string;
  description: string;
  parameters: ParameterDefinition[];
}
