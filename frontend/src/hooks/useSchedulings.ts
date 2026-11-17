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
  const [page, setPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const fetchSchedulings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await schedulingsApi.getAll(page, pageSize);
      setSchedulings(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchSchedulings();
  }, [fetchSchedulings]);

  const handleSetPageSize = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  const createScheduling = async (payload: CreateSchedulingRequest): Promise<SchedulingResponse> => {
    const created = await schedulingsApi.create(payload);
    await fetchSchedulings();
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
    if (schedulings.length === 1 && page > 0) {
      setPage((prev) => prev - 1);
    } else {
      await fetchSchedulings();
    }
  };

  return {
    schedulings,
    loading,
    error,
    page,
    pageSize,
    totalElements,
    totalPages,
    setPage,
    setPageSize: handleSetPageSize,
    reload: fetchSchedulings,
    createScheduling,
    updateScheduling,
    toggleStatus,
    deleteScheduling,
  };
}
