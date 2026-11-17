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

  it('calls onViewExecutions when clicking View executions button', () => {
    const onViewExecutions = vi.fn();
    render(<SchedulingsTable {...defaultProps} onViewExecutions={onViewExecutions} />);
    const viewButtons = screen.getAllByTitle('View executions');
    expect(viewButtons.length).toBe(3);
    fireEvent.click(viewButtons[0]);
    expect(onViewExecutions).toHaveBeenCalledWith(mockSchedulings[0]);
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

  it('renders pagination menu and handles page & size changes when pagination props are supplied', () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    render(
      <SchedulingsTable
        {...defaultProps}
        page={0}
        pageSize={10}
        totalElements={25}
        totalPages={3}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );

    expect(screen.getByTestId('pagination-menu')).toBeInTheDocument();
    expect(screen.getByText(/Total:/i)).toHaveTextContent('Total: 25 jobs');

    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(1);

    const sizeSelect = screen.getByRole('combobox', { name: 'Rows per page' });
    fireEvent.change(sizeSelect, { target: { value: '20' } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });
});
