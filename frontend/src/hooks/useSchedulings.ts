import { useState, useEffect, useCallback } from 'react';
import {
  SchedulingResponse,
  CreateSchedulingRequest,
  UpdateSchedulingRequest,
  ScheduleStatus,
} from '../types/scheduling';
import { schedulingsApi } from '../api/schedulingsApi';
import { extractErrorMessage } from '../api/client';

export function useSchedulings() {
  const [schedulings, setSchedulings] = useState<SchedulingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchedulings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await schedulingsApi.getAll();
      setSchedulings(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedulings();
  }, [fetchSchedulings]);

  const createScheduling = async (payload: CreateSchedulingRequest): Promise<SchedulingResponse> => {
    const created = await schedulingsApi.create(payload);
    setSchedulings((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
    return created;
  };

  const updateScheduling = async (
    id: string,
    payload: UpdateSchedulingRequest
  ): Promise<SchedulingResponse> => {
    const updated = await schedulingsApi.update(id, payload);
    setSchedulings((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const toggleStatus = async (
    id: string,
    currentStatus: ScheduleStatus
  ): Promise<SchedulingResponse> => {
    const nextStatus: ScheduleStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await schedulingsApi.update(id, { status: nextStatus });
    setSchedulings((prev) => prev.map((s) => (s.id === id ? updated : s)));
    return updated;
  };

  const deleteScheduling = async (id: string): Promise<void> => {
    await schedulingsApi.delete(id);
    setSchedulings((prev) => prev.filter((s) => s.id !== id));
  };

  return {
    schedulings,
    loading,
    error,
    reload: fetchSchedulings,
    createScheduling,
    updateScheduling,
    toggleStatus,
    deleteScheduling,
  };
}
