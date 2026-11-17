import { describe, it, expect, vi, beforeEach } from 'vitest';
import { schedulingsApi } from './schedulingsApi';
import { apiClient } from './client';
import { mockSchedulings, mockPageResponse } from '../test/mocks/mockSchedulings';

vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('schedulingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll sends default pagination parameters', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockPageResponse,
      },
    });

    const result = await schedulingsApi.getAll();

    expect(apiClient.get).toHaveBeenCalledWith('/schedulings', {
      params: { page: 0, size: 10, sort: 'createdAt,desc' },
    });
    expect(result.content).toEqual(mockSchedulings);
    expect(result.page).toBe(0);
    expect(result.size).toBe(10);
    expect(result.totalElements).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.last).toBe(true);
  });

  it('getAll sends custom page and size parameters', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          content: [mockSchedulings[0]],
          page: 2,
          size: 1,
          totalElements: 3,
          totalPages: 3,
          last: false,
        },
      },
    });

    const result = await schedulingsApi.getAll(2, 1);

    expect(apiClient.get).toHaveBeenCalledWith('/schedulings', {
      params: { page: 2, size: 1, sort: 'createdAt,desc' },
    });
    expect(result.page).toBe(2);
    expect(result.size).toBe(1);
    expect(result.content.length).toBe(1);
  });

  it('getById calls correct endpoint', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockSchedulings[0],
      },
    });

    const result = await schedulingsApi.getById(mockSchedulings[0].id);

    expect(apiClient.get).toHaveBeenCalledWith(`/schedulings/${mockSchedulings[0].id}`);
    expect(result.name).toBe('Heartbeat Ping');
  });

  it('create posts payload and returns created scheduling', async () => {
    const payload = {
      name: 'New Schedule',
      taskType: 'LOG_TASK' as const,
      taskParameters: { message: 'hello' },
      scheduleType: 'INTERVAL' as const,
      scheduleConfig: { intervalSeconds: 30 },
    };

    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        success: true,
        data: { ...mockSchedulings[0], name: 'New Schedule' },
      },
    });

    const result = await schedulingsApi.create(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/schedulings', payload);
    expect(result.name).toBe('New Schedule');
  });

  it('delete sends delete request', async () => {
    vi.mocked(apiClient.delete).mockResolvedValueOnce({ status: 204 });

    await schedulingsApi.delete(mockSchedulings[0].id);

    expect(apiClient.delete).toHaveBeenCalledWith(`/schedulings/${mockSchedulings[0].id}`);
  });
});
