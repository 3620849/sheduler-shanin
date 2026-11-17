import { SchedulingResponse } from '../../types/scheduling';

export const mockSchedulings: SchedulingResponse[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Heartbeat Ping',
    taskType: 'LOG_TASK',
    taskParameters: { message: 'Service alive check' },
    scheduleType: 'INTERVAL',
    scheduleConfig: { intervalSeconds: 60 },
    status: 'ACTIVE',
    nextRunAt: '2026-11-17T17:00:00Z',
    createdAt: '2026-11-17T12:00:00Z',
    updatedAt: '2026-11-17T12:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Weekly Customer Summary',
    taskType: 'EMAIL_TASK',
    taskParameters: {
      to: 'team@company.com',
      subject: 'Weekly Metrics',
      body: 'Attached is the weekly report.',
    },
    scheduleType: 'WEEKLY',
    scheduleConfig: { daysOfWeek: ['MON', 'FRI'], timeOfDay: '09:00' },
    status: 'PAUSED',
    nextRunAt: null,
    createdAt: '2026-11-17T13:00:00Z',
    updatedAt: '2026-11-17T13:00:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Nightly Database Vacuum',
    taskType: 'DB_QUERY_TASK',
    taskParameters: {
      query: 'SELECT count(*) FROM users',
      timeoutSeconds: 45,
    },
    scheduleType: 'CRON',
    scheduleConfig: { cronExpression: '0 0 2 ? * *' },
    status: 'COMPLETED',
    nextRunAt: null,
    createdAt: '2026-11-17T14:00:00Z',
    updatedAt: '2026-11-17T14:00:00Z',
  },
];

export const mockPageResponse = {
  content: mockSchedulings,
  page: 0,
  size: 10,
  totalElements: mockSchedulings.length,
  totalPages: 1,
  last: true,
};
