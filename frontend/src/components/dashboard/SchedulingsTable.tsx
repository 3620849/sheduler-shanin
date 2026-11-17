import React, { useState } from 'react';
import { SchedulingResponse, ScheduleStatus } from '../../types/scheduling';
import { StatusBadge, TaskBadge, ScheduleTypeBadge } from '../common/Badge';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Button } from '../common/Button';
import { Pagination } from '../common/Pagination';
import {
  Play,
  Pause,
  Edit3,
  Trash2,
  CalendarX,
  Plus,
  Clock,
  Layers,
} from 'lucide-react';

interface SchedulingsTableProps {
  schedulings: SchedulingResponse[];
  loading: boolean;
  onEdit: (schedule: SchedulingResponse) => void;
  onToggleStatus: (id: string, currentStatus: ScheduleStatus) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateNew: () => void;
  page?: number;
  pageSize?: number;
  totalElements?: number;
  totalPages?: number;
  onPageChange?: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
}

export const SchedulingsTable: React.FC<SchedulingsTableProps> = ({
  schedulings,
  loading,
  onEdit,
  onToggleStatus,
  onDelete,
  onCreateNew,
  page = 0,
  pageSize = 10,
  totalElements,
  totalPages = 1,
  onPageChange,
  onPageSizeChange,
}) => {
  const [deleteCandidate, setDeleteCandidate] = useState<SchedulingResponse | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);

  const handleToggle = async (schedule: SchedulingResponse) => {
    try {
      setActionInProgressId(schedule.id);
      await onToggleStatus(schedule.id, schedule.status);
    } finally {
      setActionInProgressId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setActionInProgressId(deleteCandidate.id);
      await onDelete(deleteCandidate.id);
      setDeleteCandidate(null);
    } finally {
      setActionInProgressId(null);
    }
  };

  const formatScheduleDetail = (schedule: SchedulingResponse) => {
    const config = schedule.scheduleConfig || {};
    switch (schedule.scheduleType) {
      case 'ONE_TIME': {
        if (!config.startAt) return 'One-time';
        const d = new Date(config.startAt);
        return isNaN(d.getTime()) ? config.startAt : d.toLocaleString();
      }
      case 'INTERVAL': {
        const sec = Number(config.intervalSeconds) || 60;
        if (sec >= 3600 && sec % 3600 === 0) return `Every ${sec / 3600}h`;
        if (sec >= 60 && sec % 60 === 0) return `Every ${sec / 60}m`;
        return `Every ${sec}s`;
      }
      case 'WEEKLY': {
        const days = Array.isArray(config.daysOfWeek) ? config.daysOfWeek.join(', ') : 'MON';
        const time = config.timeOfDay || '09:00';
        return `${days} @ ${time}`;
      }
      case 'CRON':
        return config.cronExpression || 'Custom Cron';
      default:
        return 'N/A';
    }
  };

  const formatNextRunTime = (nextRunAt: string | null, status: ScheduleStatus) => {
    if (status === 'COMPLETED') {
      return <span style={{ color: 'var(--text-muted)' }}>Finished</span>;
    }
    if (status === 'PAUSED') {
      return <span style={{ color: 'var(--warning)' }}>Suspended</span>;
    }
    if (!nextRunAt) {
      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
    }
    const d = new Date(nextRunAt);
    if (isNaN(d.getTime())) return nextRunAt;
    return (
      <span title={d.toISOString()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
        <Clock size={14} style={{ color: 'var(--text-muted)' }} />
        {d.toLocaleString()}
      </span>
    );
  };

  if (!loading && schedulings.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon">
            <CalendarX size={32} />
          </div>
          <div className="empty-title">No Schedulings Found</div>
          <div className="empty-description">
            Get started by creating your first scheduled job. Select from predefined task definitions with dynamic parameter validation.
          </div>
          <Button variant="primary" onClick={onCreateNew} icon={<Plus size={16} />}>
            Create First Scheduling
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Scheduled Jobs</div>
            <div className="card-description">
              Live status, triggers, and execution parameters managed by Quartz
            </div>
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {totalElements !== undefined ? (
              <>Total: <strong>{totalElements}</strong> {totalElements === 1 ? 'job' : 'jobs'}</>
            ) : (
              <>Showing <strong>{schedulings.length}</strong> {schedulings.length === 1 ? 'task' : 'tasks'}</>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Schedule Name</th>
                <th>Task Type</th>
                <th>Schedule Type</th>
                <th>Next Run Time</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedulings.map((s) => {
                const isItemLoading = actionInProgressId === s.id;
                return (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.name}
                      </div>
                      {s.taskParameters && Object.keys(s.taskParameters).length > 0 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                            marginTop: '0.25rem',
                            maxWidth: '320px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={JSON.stringify(s.taskParameters)}
                        >
                          <Layers size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {Object.entries(s.taskParameters)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <TaskBadge taskType={s.taskType} />
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div>
                          <ScheduleTypeBadge scheduleType={s.scheduleType} />
                        </div>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            fontFamily: s.scheduleType === 'CRON' ? 'monospace' : 'inherit',
                          }}
                        >
                          {formatScheduleDetail(s)}
                        </span>
                      </div>
                    </td>
                    <td>{formatNextRunTime(s.nextRunAt, s.status)}</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td>
                      <div className="action-buttons-group" style={{ justifyContent: 'flex-end' }}>
                        {/* Pause / Resume toggle button */}
                        {s.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            className={`btn-icon ${
                              s.status === 'ACTIVE'
                                ? 'btn-icon-warning'
                                : 'btn-icon-success'
                            }`}
                            onClick={() => handleToggle(s)}
                            disabled={isItemLoading}
                            title={s.status === 'ACTIVE' ? 'Pause scheduling' : 'Resume scheduling'}
                          >
                            {s.status === 'ACTIVE' ? <Pause size={15} /> : <Play size={15} />}
                          </button>
                        )}

                        {/* Edit button */}
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => onEdit(s)}
                          disabled={isItemLoading}
                          title="Edit scheduling"
                        >
                          <Edit3 size={15} />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setDeleteCandidate(s)}
                          disabled={isItemLoading}
                          title="Delete scheduling"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {onPageChange && onPageSizeChange && (
          <Pagination
            page={page}
            pageSize={pageSize}
            totalElements={totalElements ?? schedulings.length}
            totalPages={totalPages}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            disabled={loading}
          />
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!deleteCandidate}
        title="Delete Scheduling"
        message={`Are you sure you want to delete "${deleteCandidate?.name}"? This action will permanently unschedule its Quartz trigger and remove its configuration.`}
        confirmLabel="Delete Scheduling"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={actionInProgressId === deleteCandidate?.id}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteCandidate(null)}
      />
    </>
  );
};
