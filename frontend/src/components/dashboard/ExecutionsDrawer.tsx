import React, { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { TaskExecution } from '../../types/execution';
import { SchedulingResponse } from '../../types/scheduling';
import { executionsApi } from '../../api/executionsApi';

interface ExecutionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedScheduling: SchedulingResponse | null;
}

export const ExecutionsDrawer: React.FC<ExecutionsDrawerProps> = ({
  isOpen,
  onClose,
  selectedScheduling,
}) => {
  const [executions, setExecutions] = useState<TaskExecution[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await executionsApi.getExecutions(selectedScheduling ? selectedScheduling.id : undefined);
      setExecutions(data);
    } catch (err) {
      console.error('Failed to load executions:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedScheduling]);

  useEffect(() => {
    if (isOpen) {
      fetchExecutions();
    }
  }, [isOpen, fetchExecutions]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchExecutions();
    }, 3000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, fetchExecutions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay" onClick={onClose} data-testid="executions-drawer-overlay">
      <div className="drawer-right" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--surface-color)'
        }}>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {selectedScheduling ? `Executions: ${selectedScheduling.name}` : 'Live Execution Stream'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {selectedScheduling
                ? `Job ID: #${selectedScheduling.id.substring(0, 8)}`
                : 'Recent triggers across all scheduled jobs'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Toggle live auto polling every 3s"
              data-testid="toggle-auto-refresh"
            >
              <span className={`pulse-dot ${autoRefresh ? 'pulse-green' : 'pulse-yellow'}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </button>
            <button
              onClick={fetchExecutions}
              className="btn-icon"
              title="Refresh executions"
              data-testid="refresh-executions"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="btn-icon"
              title="Close drawer"
              data-testid="close-drawer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {executions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
              <p style={{ fontWeight: 500 }}>No execution records found yet.</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
                Executions will appear here when Quartz triggers the task.
              </p>
            </div>
          ) : (
            executions.map((exec) => (
              <div
                key={exec.id}
                data-testid={`execution-item-${exec.id}`}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {exec.status === 'SUCCESS' ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <XCircle size={16} color="var(--danger)" />
                    )}
                    <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {exec.taskName}
                    </span>
                    {exec.schedulingId && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        #{exec.schedulingId.substring(0, 8)}
                      </span>
                    )}
                  </div>

                  <span className={`badge ${exec.status === 'SUCCESS' ? 'badge-success' : 'badge-failed'}`}>
                    {exec.status}
                  </span>
                </div>

                <div style={{
                  backgroundColor: 'var(--bg-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 10px',
                  fontSize: '0.775rem',
                  color: 'var(--text-secondary)',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                  {exec.output}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Fired: {new Date(exec.fireTime).toLocaleTimeString()} ({new Date(exec.fireTime).toLocaleDateString()})</span>
                  <span>Duration: {exec.durationMs}ms</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
