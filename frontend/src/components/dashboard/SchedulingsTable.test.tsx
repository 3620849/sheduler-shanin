import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SchedulingsTable } from './SchedulingsTable';
import { mockSchedulings } from '../../test/mocks/mockSchedulings';

describe('SchedulingsTable', () => {
  const defaultProps = {
    schedulings: mockSchedulings,
    loading: false,
    onEdit: vi.fn(),
    onToggleStatus: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    onCreateNew: vi.fn(),
  };

  it('renders empty state when there are no schedulings', () => {
    render(<SchedulingsTable {...defaultProps} schedulings={[]} />);
    expect(screen.getByText('No Schedulings Found')).toBeInTheDocument();
    expect(screen.getByText('Create First Scheduling')).toBeInTheDocument();
  });

  it('calls onCreateNew when clicking empty state button', () => {
    const onCreateNew = vi.fn();
    render(<SchedulingsTable {...defaultProps} schedulings={[]} onCreateNew={onCreateNew} />);
    fireEvent.click(screen.getByText('Create First Scheduling'));
    expect(onCreateNew).toHaveBeenCalledTimes(1);
  });

  it('renders table headers and schedulings list', () => {
    render(<SchedulingsTable {...defaultProps} />);
    expect(screen.getByText('Schedule Name')).toBeInTheDocument();
    expect(screen.getByText('Heartbeat Ping')).toBeInTheDocument();
    expect(screen.getByText('Weekly Customer Summary')).toBeInTheDocument();
    expect(screen.getByText('Nightly Database Vacuum')).toBeInTheDocument();
    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
  });

  it('calls onEdit when clicking Edit button', () => {
    const onEdit = vi.fn();
    render(<SchedulingsTable {...defaultProps} onEdit={onEdit} />);
    const editButtons = screen.getAllByTitle('Edit scheduling');
    expect(editButtons.length).toBe(3);
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(mockSchedulings[0]);
  });

  it('calls onToggleStatus when clicking Pause / Resume button', async () => {
    const onToggleStatus = vi.fn().mockResolvedValue(undefined);
    render(<SchedulingsTable {...defaultProps} onToggleStatus={onToggleStatus} />);
    const pauseButton = screen.getByTitle('Pause scheduling');
    fireEvent.click(pauseButton);
    await waitFor(() => {
      expect(onToggleStatus).toHaveBeenCalledWith(mockSchedulings[0].id, 'ACTIVE');
    });
  });

  it('opens confirmation dialog on delete and triggers onDelete on confirm', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(<SchedulingsTable {...defaultProps} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByTitle('Delete scheduling');
    fireEvent.click(deleteButtons[0]);

    // Modal dialog is opened with message
    expect(screen.getByText(/Are you sure you want to delete "Heartbeat Ping"/i)).toBeInTheDocument();

    // Click confirm delete button in modal
    const confirmButton = screen.getByRole('button', { name: 'Delete Scheduling' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(mockSchedulings[0].id);
    });
  });
});
