import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSchedulings } from './useSchedulings';
import { schedulingsApi } from '../api/schedulingsApi';
import { mockSchedulings, mockPageResponse } from '../test/mocks/mockSchedulings';

vi.mock('../api/schedulingsApi', () => ({
  schedulingsApi: {
    getAll: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useSchedulings hook with pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(schedulingsApi.getStats).mockResolvedValue({
      totalCount: 3,
      activeCount: 2,
      pausedCount: 1,
    });
  });

  it('fetches paginated schedulings on mount and loads global stats', async () => {
    vi.mocked(schedulingsApi.getAll).mockResolvedValueOnce(mockPageResponse);

    const { result } = renderHook(() => useSchedulings());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.schedulings).toEqual(mockSchedulings);
      expect(result.current.page).toBe(0);
      expect(result.current.pageSize).toBe(10);
      expect(result.current.totalElements).toBe(3);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.stats).toEqual({
        totalCount: 3,
        activeCount: 2,
        pausedCount: 1,
      });
    });

    expect(schedulingsApi.getAll).toHaveBeenCalledWith(0, 10);
    expect(schedulingsApi.getStats).toHaveBeenCalled();
  });

  it('changes page and re-fetches', async () => {
    vi.mocked(schedulingsApi.getAll).mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useSchedulings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(1);
    });

    await waitFor(() => {
      expect(schedulingsApi.getAll).toHaveBeenCalledWith(1, 10);
      expect(result.current.page).toBe(1);
    });
  });

  it('changes page size and resets page to 0', async () => {
    vi.mocked(schedulingsApi.getAll).mockResolvedValue(mockPageResponse);

    const { result } = renderHook(() => useSchedulings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });

    act(() => {
      result.current.setPageSize(25);
    });

    await waitFor(() => {
      expect(result.current.pageSize).toBe(25);
      expect(result.current.page).toBe(0);
      expect(schedulingsApi.getAll).toHaveBeenCalledWith(0, 25);
    });
  });

  it('updates stats when toggleStatus is invoked', async () => {
    vi.mocked(schedulingsApi.getAll).mockResolvedValue(mockPageResponse);
    vi.mocked(schedulingsApi.update).mockResolvedValue({
      ...mockSchedulings[0],
      status: 'PAUSED',
    });
    vi.mocked(schedulingsApi.getStats)
      .mockResolvedValueOnce({ totalCount: 3, activeCount: 2, pausedCount: 1 })
      .mockResolvedValueOnce({ totalCount: 3, activeCount: 1, pausedCount: 2 });

    const { result } = renderHook(() => useSchedulings());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.stats.activeCount).toBe(2);
    });

    await act(async () => {
      await result.current.toggleStatus(mockSchedulings[0].id, 'ACTIVE');
    });

    expect(schedulingsApi.update).toHaveBeenCalledWith(mockSchedulings[0].id, { status: 'PAUSED' });
    await waitFor(() => {
      expect(result.current.stats.activeCount).toBe(1);
      expect(result.current.stats.pausedCount).toBe(2);
    });
  });
});
