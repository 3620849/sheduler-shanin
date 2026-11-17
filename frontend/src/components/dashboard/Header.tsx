import React from 'react';
import { Button } from '../common/Button';
import { Plus, RefreshCw, CalendarCheck2, FileText } from 'lucide-react';
import { SchedulingResponse } from '../../types/scheduling';

interface HeaderProps {
  schedulings: SchedulingResponse[];
  onOpenCreateModal: () => void;
  onRefresh: () => void;
  onOpenExecutions?: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  schedulings,
  onOpenCreateModal,
  onRefresh,
  onOpenExecutions,
  loading,
}) => {
  const activeCount = schedulings.filter((s) => s.status === 'ACTIVE').length;
  const pausedCount = schedulings.filter((s) => s.status === 'PAUSED').length;

  return (
    <header className="dashboard-header">
      <div className="brand-section">
        <div className="brand-icon">
          <CalendarCheck2 size={24} />
        </div>
        <div>
          <h1 className="brand-title">Distributed Task Scheduler</h1>
          <p className="brand-subtitle">
            Manage clustered Quartz schedulings & dynamic worker executions
          </p>
        </div>
      </div>

      <div className="header-actions">
        {onOpenExecutions && (
          <Button
            variant="secondary"
            onClick={onOpenExecutions}
            icon={<FileText size={16} />}
            title="Live Execution Stream"
          >
            Executions
          </Button>
        )}

        <Button
          variant="secondary"
          onClick={onRefresh}
          loading={loading}
          icon={<RefreshCw size={16} className={loading ? 'spinner' : ''} />}
          title="Reload Schedulings"
        >
          Refresh
        </Button>

        <Button
          variant="primary"
          onClick={onOpenCreateModal}
          icon={<Plus size={16} />}
        >
          Create Scheduling
        </Button>
      </div>
    </header>
  );
};
