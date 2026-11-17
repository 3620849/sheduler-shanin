import { useState, useEffect, useCallback } from 'react';
import { TaskDefinitionResponse } from '../types/task';
import { tasksApi } from '../api/tasksApi';
import { extractErrorMessage } from '../api/client';

export function useTasks() {
  const [tasks, setTasks] = useState<TaskDefinitionResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tasksApi.getAll();
      setTasks(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, reload: fetchTasks };
}
