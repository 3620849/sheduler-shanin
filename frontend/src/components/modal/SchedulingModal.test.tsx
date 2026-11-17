import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchedulingModal } from './SchedulingModal';
import { mockTasks } from '../../test/mocks/mockTasks';
import { mockSchedulings } from '../../test/mocks/mockSchedulings';

describe('SchedulingModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    tasks: mockTasks,
    onSubmit: vi.fn().mockResolvedValue(undefined),
    loading: false,
  };

  it('renders nothing when isOpen is false', () => {
    render(<SchedulingModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Create New Scheduling')).not.toBeInTheDocument();
  });

  it('renders Create modal with initial empty inputs', () => {
    render(<SchedulingModal {...defaultProps} />);
    expect(screen.getByText('Create New Scheduling')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Nightly DB Health Check/i)).toHaveValue('');
  });

  it('pre-fills fields in Edit mode', () => {
    render(<SchedulingModal {...defaultProps} editingSchedule={mockSchedulings[0]} />);
    expect(screen.getByText('Edit Scheduling')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Heartbeat Ping')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Service alive check')).toBeInTheDocument();
  });

  it('validates schedule name on empty submit', async () => {
    render(<SchedulingModal {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: 'Create Schedule' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('Schedule name is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('validates required task parameter before submitting', async () => {
    render(<SchedulingModal {...defaultProps} />);
    // Type name
    const nameInput = screen.getByPlaceholderText(/Nightly DB Health Check/i);
    fireEvent.change(nameInput, { target: { value: 'Valid Schedule' } });

    // Submit with empty required parameter 'message' for LOG_TASK
    const submitBtn = screen.getByRole('button', { name: 'Create Schedule' });
    fireEvent.click(submitBtn);

    expect(await screen.findByText('message is required')).toBeInTheDocument();
    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits valid payload when all inputs are correct', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<SchedulingModal {...defaultProps} onSubmit={onSubmit} onClose={onClose} />);

    // Fill Name
    const nameInput = screen.getByPlaceholderText(/Nightly DB Health Check/i);
    fireEvent.change(nameInput, { target: { value: 'Production Alert' } });

    // Fill Message parameter
    const messageInput = screen.getByPlaceholderText('Message content to log');
    fireEvent.change(messageInput, { target: { value: 'System operating normally' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: 'Create Schedule' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Production Alert',
        taskType: 'LOG_TASK',
        taskParameters: { message: 'System operating normally' },
        scheduleType: 'INTERVAL',
        scheduleConfig: { intervalSeconds: 60 },
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
