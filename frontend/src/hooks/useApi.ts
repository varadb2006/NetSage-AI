import { useState, useCallback } from 'react';
import { ApiError } from '../services/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
}

export function useApi<T, Args extends unknown[]>(apiFn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: false, error: null });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });
      try {
        const result = await apiFn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err) {
        setState({ data: null, loading: false, error: err as ApiError });
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => setState({ data: null, loading: false, error: null }), []);

  return { ...state, execute, reset };
}
