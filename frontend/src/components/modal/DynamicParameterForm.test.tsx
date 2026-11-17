import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DynamicParameterForm } from './DynamicParameterForm';
import { mockTasks } from '../../test/mocks/mockTasks';

describe('DynamicParameterForm', () => {
  const defaultProps = {
    tasks: mockTasks,
    selectedTaskType: 'LOG_TASK' as const,
    onTaskTypeChange: vi.fn(),
    parameters: {},
    onParameterChange: vi.fn(),
    errors: {},
    disabled: false,
  };

  it('renders all tasks in select dropdown', () => {
    render(<DynamicParameterForm {...defaultProps} />);
    const select = screen.getByLabelText(/Task Type/i);
    expect(select).toBeInTheDocument();
    expect(screen.getByText(/Log Execution Task/i)).toBeInTheDocument();
    expect(screen.getByText(/Email Dispatch Task/i)).toBeInTheDocument();
    expect(screen.getByText(/Database Query Task/i)).toBeInTheDocument();
  });

  it('calls onTaskTypeChange when changing selected task', () => {
    const onTaskTypeChange = vi.fn();
    render(<DynamicParameterForm {...defaultProps} onTaskTypeChange={onTaskTypeChange} />);
    const select = screen.getByLabelText(/Task Type/i);
    fireEvent.change(select, { target: { value: 'EMAIL_TASK' } });
    expect(onTaskTypeChange).toHaveBeenCalledWith('EMAIL_TASK');
  });

  it('renders required message input for LOG_TASK', () => {
    render(<DynamicParameterForm {...defaultProps} selectedTaskType="LOG_TASK" />);
    const input = screen.getByPlaceholderText('Message content to log');
    expect(input).toBeInTheDocument();
    expect(screen.getAllByText('*').length).toBeGreaterThan(0);
  });

  it('renders email, subject, and body fields for EMAIL_TASK', () => {
    render(
      <DynamicParameterForm
        {...defaultProps}
        selectedTaskType="EMAIL_TASK"
        parameters={{ to: 'test@example.com', subject: 'Alert' }}
      />
    );
    expect(screen.getByPlaceholderText('Recipient email address')).toHaveValue('test@example.com');
    expect(screen.getByPlaceholderText('Subject line of the email')).toHaveValue('Alert');
    expect(screen.getByPlaceholderText('Body content of the email')).toBeInTheDocument();
  });

  it('renders textarea for query and number input for DB_QUERY_TASK', () => {
    render(<DynamicParameterForm {...defaultProps} selectedTaskType="DB_QUERY_TASK" />);
    const queryInput = screen.getByPlaceholderText('SQL query string to simulate');
    expect(queryInput.tagName).toBe('TEXTAREA');
    const timeoutInput = screen.getByPlaceholderText('Default: 30');
    expect(timeoutInput).toHaveAttribute('type', 'number');
  });

  it('calls onParameterChange with parsed number when typing in number input', () => {
    const onParameterChange = vi.fn();
    render(
      <DynamicParameterForm
        {...defaultProps}
        selectedTaskType="DB_QUERY_TASK"
        onParameterChange={onParameterChange}
      />
    );
    const timeoutInput = screen.getByPlaceholderText('Default: 30');
    fireEvent.change(timeoutInput, { target: { value: '60' } });
    expect(onParameterChange).toHaveBeenCalledWith('timeoutSeconds', 60);
  });

  it('displays field-level errors when provided', () => {
    render(
      <DynamicParameterForm
        {...defaultProps}
        selectedTaskType="LOG_TASK"
        errors={{ message: 'message is required' }}
      />
    );
    expect(screen.getByText('message is required')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Message content to log')).toHaveClass('has-error');
  });
});
