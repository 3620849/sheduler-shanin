import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTasks } from './useTasks';
import { tasksApi } from '../api/tasksApi';
import { mockTasks } from '../test/mocks/mockTasks';

vi.mock('../api/tasksApi', () => ({
  tasksApi: {
    getAll: vi.fn(),
  },
}));

describe('useTasks hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and sets tasks on mount', async () => {
    vi.mocked(tasksApi.getAll).mockResolvedValueOnce(mockTasks);

    const { result } = renderHook(() => useTasks());

    expect(result.current.loading).toBe(true);
    expect(result.current.tasks).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.error).toBeNull();
    });
  });

  it('sets error state when api fails', async () => {
    vi.mocked(tasksApi.getAll).mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useTasks());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Network failure');
      expect(result.current.tasks).toEqual([]);
    });
  });
});
