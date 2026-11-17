import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExecutionsDrawer } from './ExecutionsDrawer';
import { executionsApi } from '../../api/executionsApi';
import { TaskExecution } from '../../types/execution';
import { SchedulingResponse } from '../../types/scheduling';

vi.mock('../../api/executionsApi', () => ({
  executionsApi: {
    getExecutions: vi.fn(),
  },
}));

describe('ExecutionsDrawer', () => {
  const mockExecutions: TaskExecution[] = [
    {
      id: 'exec-1',
      schedulingId: 'sched-1',
      taskName: 'Heartbeat Ping',
      taskType: 'LOG_TASK',
      status: 'SUCCESS',
      output: '[LOG_TASK] Executed: System is healthy',
      durationMs: 42,
      fireTime: '2026-11-17T12:00:00Z',
      createdAt: '2026-11-17T12:00:00Z',
    },
    {
      id: 'exec-2',
      schedulingId: 'sched-1',
      taskName: 'Heartbeat Ping',
      taskType: 'LOG_TASK',
      status: 'FAILED',
      output: 'Execution failed: Connection timed out',
      durationMs: 120,
      fireTime: '2026-11-17T12:05:00Z',
      createdAt: '2026-11-17T12:05:00Z',
    },
  ];

  const mockSelectedScheduling: SchedulingResponse = {
    id: 'sched-1',
    name: 'Heartbeat Ping',
    taskType: 'LOG_TASK',
    taskParameters: { message: 'alive' },
    scheduleType: 'INTERVAL',
    scheduleConfig: { intervalSeconds: 60 },
    status: 'ACTIVE',
    nextRunAt: '2026-11-17T12:10:00Z',
    createdAt: '2026-11-17T10:00:00Z',
    updatedAt: '2026-11-17T10:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ExecutionsDrawer
        isOpen={false}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders live execution stream header when no scheduling selected', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );

    expect(screen.getByText('Live Execution Stream')).toBeInTheDocument();
    expect(screen.getByText('Recent triggers across all scheduled jobs')).toBeInTheDocument();

    await waitFor(() => {
      expect(executionsApi.getExecutions).toHaveBeenCalledWith(undefined);
    });
  });

  it('renders specific schedule title and passes scheduling id to API', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue(mockExecutions);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={mockSelectedScheduling}
      />
    );

    expect(screen.getByText('Executions: Heartbeat Ping')).toBeInTheDocument();
    expect(screen.getByText('Job ID: #sched-1')).toBeInTheDocument();

    await waitFor(() => {
      expect(executionsApi.getExecutions).toHaveBeenCalledWith('sched-1');
    });
  });

  it('renders empty state when no executions returned', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No execution records found yet.')).toBeInTheDocument();
    });
  });

  it('renders execution items with status, output, duration and timestamps', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue(mockExecutions);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('execution-item-exec-1')).toBeInTheDocument();
      expect(screen.getByTestId('execution-item-exec-2')).toBeInTheDocument();
    });

    expect(screen.getByText('[LOG_TASK] Executed: System is healthy')).toBeInTheDocument();
    expect(screen.getByText('Execution failed: Connection timed out')).toBeInTheDocument();
    expect(screen.getByText('Duration: 42ms')).toBeInTheDocument();
    expect(screen.getByText('Duration: 120ms')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('calls onClose when clicking close button or overlay', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);
    const onClose = vi.fn();

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={onClose}
        selectedScheduling={null}
      />
    );

    fireEvent.click(screen.getByTestId('close-drawer'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('executions-drawer-overlay'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on Escape key press', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);
    const onClose = vi.fn();

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={onClose}
        selectedScheduling={null}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('toggles auto-refresh button state between Live and Paused', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );

    const toggleBtn = screen.getByTestId('toggle-auto-refresh');
    expect(toggleBtn).toHaveTextContent('Live');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Paused');

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Live');
  });

  it('calls API again when clicking manual refresh button', async () => {
    vi.mocked(executionsApi.getExecutions).mockResolvedValue([]);

    render(
      <ExecutionsDrawer
        isOpen={true}
        onClose={vi.fn()}
        selectedScheduling={null}
      />
    );

    await waitFor(() => {
      expect(executionsApi.getExecutions).toHaveBeenCalledTimes(1);
    });

    const refreshBtn = screen.getByTestId('refresh-executions');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(executionsApi.getExecutions).toHaveBeenCalledTimes(2);
    });
  });
});
