import React from 'react';
import { ScheduleStatus, ScheduleType } from '../../types/scheduling';
import { TaskType } from '../../types/task';

interface StatusBadgeProps {
  status: ScheduleStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeClass = () => {
    switch (status) {
      case 'ACTIVE':
        return 'badge-active';
      case 'PAUSED':
        return 'badge-paused';
      case 'COMPLETED':
        return 'badge-completed';
      default:
        return 'badge-completed';
    }
  };

  return (
    <span className={`badge ${getBadgeClass()}`}>
      <span className="badge-dot" />
      {status}
    </span>
  );
};

interface TaskBadgeProps {
  taskType: TaskType;
}

export const TaskBadge: React.FC<TaskBadgeProps> = ({ taskType }) => {
  return <span className="badge badge-task">{taskType}</span>;
};

interface ScheduleTypeBadgeProps {
  scheduleType: ScheduleType;
}

export const ScheduleTypeBadge: React.FC<ScheduleTypeBadgeProps> = ({ scheduleType }) => {
  return <span className="badge badge-schedule">{scheduleType.replace('_', '-')}</span>;
};
