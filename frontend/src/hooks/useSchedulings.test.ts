import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSchedulings } from './useSchedulings';
import { schedulingsApi } from '../api/schedulingsApi';
import { mockSchedulings, mockPageResponse } from '../test/mocks/mockSchedulings';

vi.mock('../api/schedulingsApi', () => ({
  schedulingsApi: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('useSchedulings hook with pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches paginated schedulings on mount', async () => {
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
    });

    expect(schedulingsApi.getAll).toHaveBeenCalledWith(0, 10);
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
});
