import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleTimingSelector } from './ScheduleTimingSelector';

describe('ScheduleTimingSelector', () => {
  const defaultProps = {
    scheduleType: 'INTERVAL' as const,
    onScheduleTypeChange: vi.fn(),
    config: { intervalSeconds: 60 },
    onConfigChange: vi.fn(),
    errors: {},
  };

  it('renders timing tabs for all schedule types', () => {
    render(<ScheduleTimingSelector {...defaultProps} />);
    expect(screen.getByRole('tab', { name: /One-Time/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Interval/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Weekly/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Cron/i })).toBeInTheDocument();
  });

  it('calls onScheduleTypeChange when clicking another tab', () => {
    const onScheduleTypeChange = vi.fn();
    render(<ScheduleTimingSelector {...defaultProps} onScheduleTypeChange={onScheduleTypeChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Weekly/i }));
    expect(onScheduleTypeChange).toHaveBeenCalledWith('WEEKLY');
  });

  it('handles interval amount and unit changes correctly', () => {
    const onConfigChange = vi.fn();
    render(
      <ScheduleTimingSelector
        {...defaultProps}
        scheduleType="INTERVAL"
        config={{ intervalSeconds: 60 }}
        onConfigChange={onConfigChange}
      />
    );
    const amountInput = screen.getByLabelText(/Interval Duration/i);
    expect(amountInput).toHaveValue(1);

    fireEvent.change(amountInput, { target: { value: '5' } });
    expect(onConfigChange).toHaveBeenCalledWith({ intervalSeconds: 300 }); // 5 * 60s
  });

  it('toggles weekly days of week when chips are clicked', () => {
    const onConfigChange = vi.fn();
    render(
      <ScheduleTimingSelector
        {...defaultProps}
        scheduleType="WEEKLY"
        config={{ daysOfWeek: ['MON'], timeOfDay: '09:00' }}
        onConfigChange={onConfigChange}
      />
    );
    const friChip = screen.getByRole('button', { name: 'Fri' });
    fireEvent.click(friChip);
    expect(onConfigChange).toHaveBeenCalledWith({
      daysOfWeek: ['MON', 'FRI'],
      timeOfDay: '09:00',
    });
  });

  it('applies preset cron expression when clicking preset chip', () => {
    const onConfigChange = vi.fn();
    render(
      <ScheduleTimingSelector
        {...defaultProps}
        scheduleType="CRON"
        config={{ cronExpression: '' }}
        onConfigChange={onConfigChange}
      />
    );
    const preset = screen.getByRole('button', { name: /Every 5 min/i });
    fireEvent.click(preset);
    expect(onConfigChange).toHaveBeenCalledWith({ cronExpression: '0 */5 * ? * *' });
  });

  it('renders timing validation errors when present', () => {
    render(
      <ScheduleTimingSelector
        {...defaultProps}
        scheduleType="INTERVAL"
        errors={{ intervalSeconds: 'Interval must be greater than 0' }}
      />
    );
    expect(screen.getByText('Interval must be greater than 0')).toBeInTheDocument();
  });
});
