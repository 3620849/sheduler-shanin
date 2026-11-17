import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, TaskBadge, ScheduleTypeBadge } from './Badge';

describe('Badge components', () => {
  describe('StatusBadge', () => {
    it('renders ACTIVE status with badge-active class', () => {
      render(<StatusBadge status="ACTIVE" />);
      const badge = screen.getByText('ACTIVE');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.badge')).toHaveClass('badge-active');
    });

    it('renders PAUSED status with badge-paused class', () => {
      render(<StatusBadge status="PAUSED" />);
      const badge = screen.getByText('PAUSED');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.badge')).toHaveClass('badge-paused');
    });

    it('renders COMPLETED status with badge-completed class', () => {
      render(<StatusBadge status="COMPLETED" />);
      const badge = screen.getByText('COMPLETED');
      expect(badge).toBeInTheDocument();
      expect(badge.closest('.badge')).toHaveClass('badge-completed');
    });
  });

  describe('TaskBadge', () => {
    it('renders task type label with badge-task class', () => {
      render(<TaskBadge taskType="LOG_TASK" />);
      const badge = screen.getByText('LOG_TASK');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-task');
    });
  });

  describe('ScheduleTypeBadge', () => {
    it('renders formatted ONE-TIME label for ONE_TIME schedule type', () => {
      render(<ScheduleTypeBadge scheduleType="ONE_TIME" />);
      const badge = screen.getByText('ONE-TIME');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge-schedule');
    });

    it('renders INTERVAL label', () => {
      render(<ScheduleTypeBadge scheduleType="INTERVAL" />);
      expect(screen.getByText('INTERVAL')).toBeInTheDocument();
    });
  });
});
