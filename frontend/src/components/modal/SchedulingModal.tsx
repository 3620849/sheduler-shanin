import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { GeneralInfoStep } from './GeneralInfoStep';
import { DynamicParameterForm } from './DynamicParameterForm';
import { ScheduleTimingSelector } from './ScheduleTimingSelector';
import { TaskDefinitionResponse, TaskType } from '../../types/task';
import {
  ScheduleType,
  SchedulingResponse,
  CreateSchedulingRequest,
  UpdateSchedulingRequest,
} from '../../types/scheduling';
import { CalendarPlus, Edit3 } from 'lucide-react';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: TaskDefinitionResponse[];
  editingSchedule?: SchedulingResponse | null;
  onSubmit: (
    payload: CreateSchedulingRequest | UpdateSchedulingRequest
  ) => Promise<void>;
  loading?: boolean;
}

export const SchedulingModal: React.FC<SchedulingModalProps> = ({
  isOpen,
  onClose,
  tasks,
  editingSchedule,
  onSubmit,
  loading = false,
}) => {
  const isEditMode = !!editingSchedule;

  const [name, setName] = useState<string>('');
  const [taskType, setTaskType] = useState<TaskType>('LOG_TASK');
  const [taskParameters, setTaskParameters] = useState<Record<string, any>>({});
  const [scheduleType, setScheduleType] = useState<ScheduleType>('INTERVAL');
  const [scheduleConfig, setScheduleConfig] = useState<Record<string, any>>({
    intervalSeconds: 60,
  });

  const [nameError, setNameError] = useState<string>('');
  const [paramErrors, setParamErrors] = useState<Record<string, string>>({});
  const [timingErrors, setTimingErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Initialize or reset state when modal opens or editingSchedule changes
  useEffect(() => {
    if (!isOpen) return;

    setGeneralError(null);
    setNameError('');
    setParamErrors({});
    setTimingErrors({});

    if (editingSchedule) {
      setName(editingSchedule.name);
      setTaskType(editingSchedule.taskType);
      setTaskParameters(editingSchedule.taskParameters ? { ...editingSchedule.taskParameters } : {});
      setScheduleType(editingSchedule.scheduleType);
      setScheduleConfig(
        editingSchedule.scheduleConfig ? { ...editingSchedule.scheduleConfig } : {}
      );
    } else {
      setName('');
      const defaultTask = tasks[0]?.taskType || 'LOG_TASK';
      setTaskType(defaultTask);
      setTaskParameters({});
      setScheduleType('INTERVAL');
      setScheduleConfig({ intervalSeconds: 60 });
    }
  }, [isOpen, editingSchedule, tasks]);

  // When taskType changes, reset parameters to defaults where applicable
  const handleTaskTypeChange = (newType: TaskType) => {
    setTaskType(newType);
    const def = tasks.find((t) => t.taskType === newType);
    const initialParams: Record<string, any> = {};
    if (def?.parameters) {
      def.parameters.forEach((p) => {
        if (p.defaultValue !== null && p.defaultValue !== undefined) {
          initialParams[p.name] = p.defaultValue;
        }
      });
    }
    setTaskParameters(initialParams);
    setParamErrors({});
  };

  const handleParameterChange = (paramName: string, val: any) => {
    setTaskParameters((prev) => {
      const next = { ...prev };
      if (val === undefined || val === '') {
        delete next[paramName];
      } else {
        next[paramName] = val;
      }
      return next;
    });

    if (paramErrors[paramName]) {
      setParamErrors((prev) => {
        const next = { ...prev };
        delete next[paramName];
        return next;
      });
    }
  };

  const handleScheduleTypeChange = (newType: ScheduleType) => {
    setScheduleType(newType);
    setTimingErrors({});
    if (newType === 'ONE_TIME') {
      const defaultFuture = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      setScheduleConfig({ startAt: defaultFuture });
    } else if (newType === 'INTERVAL') {
      setScheduleConfig({ intervalSeconds: 60 });
    } else if (newType === 'WEEKLY') {
      setScheduleConfig({ daysOfWeek: ['MON'], timeOfDay: '09:00' });
    } else if (newType === 'CRON') {
      setScheduleConfig({ cronExpression: '0 0 12 ? * MON-FRI' });
    }
  };

  // Validation logic
  const validateForm = (): boolean => {
    let isValid = true;
    setGeneralError(null);

    // 1. Name validation
    if (!name.trim()) {
      setNameError('Schedule name is required');
      isValid = false;
    } else if (name.length > 255) {
      setNameError('Schedule name cannot exceed 255 characters');
      isValid = false;
    } else {
      setNameError('');
    }

    // 2. Dynamic Parameters validation
    const currentTaskDef = tasks.find((t) => t.taskType === taskType);
    const newParamErrors: Record<string, string> = {};

    if (currentTaskDef?.parameters) {
      for (const param of currentTaskDef.parameters) {
        const val = taskParameters[param.name];

        if (param.required) {
          if (val === undefined || val === null || val === '') {
            newParamErrors[param.name] = `${param.name} is required`;
            isValid = false;
            continue;
          }
        }

        if (val !== undefined && val !== null && val !== '') {
          if (param.type === 'NUMBER') {
            const num = Number(val);
            if (isNaN(num)) {
              newParamErrors[param.name] = `${param.name} must be a valid number`;
              isValid = false;
            } else {
              if (param.min !== null && param.min !== undefined && num < param.min) {
                newParamErrors[param.name] = `${param.name} must be >= ${param.min}`;
                isValid = false;
              }
              if (param.max !== null && param.max !== undefined && num > param.max) {
                newParamErrors[param.name] = `${param.name} must be <= ${param.max}`;
                isValid = false;
              }
            }
          } else if (param.type === 'STRING') {
            if (param.format === 'email') {
              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!emailRegex.test(String(val))) {
                newParamErrors[param.name] = 'Must be a valid email address';
                isValid = false;
              }
            }
          }
        }
      }
    }
    setParamErrors(newParamErrors);

    // 3. Timing validation
    const newTimingErrors: Record<string, string> = {};
    if (scheduleType === 'ONE_TIME') {
      if (!scheduleConfig.startAt) {
        newTimingErrors.startAt = 'Execution date and time is required';
        isValid = false;
      } else {
        const d = new Date(scheduleConfig.startAt);
        if (isNaN(d.getTime())) {
          newTimingErrors.startAt = 'Invalid date format';
          isValid = false;
        }
      }
    } else if (scheduleType === 'INTERVAL') {
      const sec = Number(scheduleConfig.intervalSeconds);
      if (isNaN(sec) || sec <= 0) {
        newTimingErrors.intervalSeconds = 'Interval must be a positive number';
        isValid = false;
      }
    } else if (scheduleType === 'WEEKLY') {
      const days = scheduleConfig.daysOfWeek;
      if (!Array.isArray(days) || days.length === 0) {
        newTimingErrors.daysOfWeek = 'Select at least one day of the week';
        isValid = false;
      }
      const timeOfDay = scheduleConfig.timeOfDay;
      if (!timeOfDay || !/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) {
        newTimingErrors.timeOfDay = 'Invalid time format (HH:mm)';
        isValid = false;
      }
    } else if (scheduleType === 'CRON') {
      const cron = scheduleConfig.cronExpression;
      if (!cron || !cron.trim()) {
        newTimingErrors.cronExpression = 'Cron expression is required';
        isValid = false;
      } else {
        const parts = cron.trim().split(/\s+/);
        if (parts.length < 6 || parts.length > 7) {
          newTimingErrors.cronExpression =
            'Quartz cron requires 6 or 7 whitespace-separated fields';
          isValid = false;
        }
      }
    }
    setTimingErrors(newTimingErrors);

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    try {
      const payload: CreateSchedulingRequest = {
        name: name.trim(),
        taskType,
        taskParameters,
        scheduleType,
        scheduleConfig,
      };
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to save scheduling');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Scheduling' : 'Create New Scheduling'}
      icon={
        isEditMode ? (
          <Edit3 size={20} style={{ color: 'var(--primary)' }} />
        ) : (
          <CalendarPlus size={20} style={{ color: 'var(--primary)' }} />
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {isEditMode ? 'Save Changes' : 'Create Schedule'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {generalError && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--danger)',
              fontSize: '0.875rem',
              marginBottom: '1rem',
            }}
          >
            {generalError}
          </div>
        )}

        <GeneralInfoStep
          name={name}
          onNameChange={setName}
          error={nameError}
        />

        <DynamicParameterForm
          tasks={tasks}
          selectedTaskType={taskType}
          onTaskTypeChange={handleTaskTypeChange}
          parameters={taskParameters}
          onParameterChange={handleParameterChange}
          errors={paramErrors}
        />

        <ScheduleTimingSelector
          scheduleType={scheduleType}
          onScheduleTypeChange={handleScheduleTypeChange}
          config={scheduleConfig}
          onConfigChange={setScheduleConfig}
          errors={timingErrors}
        />
      </form>
    </Modal>
  );
};
