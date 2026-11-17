import { useState, useCallback } from 'react';
import { useTasks } from './hooks/useTasks';
import { useSchedulings } from './hooks/useSchedulings';
import { Header } from './components/dashboard/Header';
import { SchedulingsTable } from './components/dashboard/SchedulingsTable';
import { SchedulingModal } from './components/modal/SchedulingModal';
import { ExecutionsDrawer } from './components/dashboard/ExecutionsDrawer';
import { ToastContainer, ToastMessage } from './components/common/Toast';
import {
  SchedulingResponse,
  ScheduleStatus,
  CreateSchedulingRequest,
  UpdateSchedulingRequest,
} from './types/scheduling';
import { extractErrorMessage } from './api/client';
import { Clock, CheckCircle2, PauseCircle, AlertTriangle, FileText } from 'lucide-react';

export function App() {
  const { tasks, loading: tasksLoading, error: tasksError } = useTasks();
  const {
    schedulings,
    loading: schedulingsLoading,
    error: schedulingsError,
    page,
    pageSize,
    totalElements,
    totalPages,
    setPage,
    setPageSize,
    reload,
    createScheduling,
    updateScheduling,
    toggleStatus,
    deleteScheduling,
  } = useSchedulings();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SchedulingResponse | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedScheduleForDrawer, setSelectedScheduleForDrawer] = useState<SchedulingResponse | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: SchedulingResponse) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleOpenExecutionsDrawer = (schedule: SchedulingResponse | null = null) => {
    setSelectedScheduleForDrawer(schedule);
    setIsDrawerOpen(true);
  };

  const handleCloseExecutionsDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedScheduleForDrawer(null);
  };

  const handleModalSubmit = async (
    payload: CreateSchedulingRequest | UpdateSchedulingRequest
  ) => {
    try {
      setModalSubmitting(true);
      if (editingSchedule) {
        await updateScheduling(editingSchedule.id, payload as UpdateSchedulingRequest);
        addToast(
          'success',
          'Schedule Updated',
          `Successfully updated "${payload.name || editingSchedule.name}".`
        );
      } else {
        await createScheduling(payload as CreateSchedulingRequest);
        addToast(
          'success',
          'Schedule Created',
          `Successfully registered "${payload.name}" with Quartz.`
        );
      }
    } catch (err) {
      const msg = extractErrorMessage(err);
      addToast('error', 'Operation Failed', msg);
      throw err;
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: ScheduleStatus) => {
    try {
      const nextStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await toggleStatus(id, currentStatus);
      addToast(
        'info',
        nextStatus === 'PAUSED' ? 'Schedule Paused' : 'Schedule Resumed',
        `Job has been ${nextStatus.toLowerCase()} successfully.`
      );
    } catch (err) {
      addToast('error', 'Status Update Failed', extractErrorMessage(err));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteScheduling(id);
      addToast('success', 'Schedule Deleted', 'Job was unscheduled and removed.');
    } catch (err) {
      addToast('error', 'Deletion Failed', extractErrorMessage(err));
    }
  };

  // Stats
  const totalCount = totalElements;
  const activeCount = schedulings.filter((s) => s.status === 'ACTIVE').length;
  const pausedCount = schedulings.filter((s) => s.status === 'PAUSED').length;

  return (
    <div className="app-layout">
      <Header
        schedulings={schedulings}
        onOpenCreateModal={handleOpenCreateModal}
        onRefresh={reload}
        onOpenExecutions={() => handleOpenExecutionsDrawer(null)}
        loading={schedulingsLoading}
      />

      <main className="main-content">
        {/* API Error Banners */}
        {(tasksError || schedulingsError) && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1.5rem',
            }}
          >
            <AlertTriangle size={20} />
            <div>
              <div style={{ fontWeight: 600 }}>Backend Connection Alert</div>
              <div style={{ fontSize: '0.8125rem', opacity: 0.9 }}>
                {tasksError || schedulingsError}
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
              <Clock size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{totalCount}</div>
              <div className="stat-label">Total Schedulings</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{activeCount}</div>
              <div className="stat-label">Active Jobs</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
              <PauseCircle size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{pausedCount}</div>
              <div className="stat-label">Suspended Jobs</div>
            </div>
          </div>

          <div
            className="stat-card"
            style={{ cursor: 'pointer', transition: 'border-color 0.15s ease' }}
            onClick={() => handleOpenExecutionsDrawer(null)}
            title="Click to view live execution log stream"
            data-testid="open-execution-logs"
          >
            <div className="stat-icon" style={{ backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <FileText size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-value" style={{ fontSize: '1rem', color: '#c084fc', fontWeight: 600 }}>
                Live Stream →
              </div>
              <div className="stat-label">Execution Logs</div>
            </div>
          </div>
        </section>

        {/* Schedulings Table */}
        <SchedulingsTable
          schedulings={schedulings}
          loading={schedulingsLoading || tasksLoading}
          onEdit={handleOpenEditModal}
          onViewExecutions={handleOpenExecutionsDrawer}
          onToggleStatus={handleToggleStatus}
          onDelete={handleDelete}
          onCreateNew={handleOpenCreateModal}
          page={page}
          pageSize={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </main>

      {/* Create / Edit Modal */}
      <SchedulingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tasks={tasks}
        editingSchedule={editingSchedule}
        onSubmit={handleModalSubmit}
        loading={modalSubmitting}
      />

      {/* Execution Logs Drawer */}
      <ExecutionsDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseExecutionsDrawer}
        selectedScheduling={selectedScheduleForDrawer}
      />

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
