import { useState, useEffect, useCallback } from 'react';
import { fetchCases, startCase, LabCaseSummary, ApiError } from '../services/api';

interface UseCasesState {
  cases: LabCaseSummary[];
  loading: boolean;
  error: ApiError | null;
  activeCase: LabCaseSummary | null;
  sessionId: string | null;
  sessionLoading: boolean;
  sessionError: ApiError | null;
}

export function useCases() {
  const [state, setState] = useState<UseCasesState>({
    cases: [],
    loading: false,
    error: null,
    activeCase: null,
    sessionId: null,
    sessionLoading: false,
    sessionError: null,
  });

  const loadCases = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const cases = await fetchCases();
      setState((prev) => ({
        ...prev,
        cases,
        loading: false,
        activeCase: cases.length > 0 ? cases[0] : null,
      }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: err as ApiError }));
    }
  }, []);

  useEffect(() => { loadCases(); }, [loadCases]);

  const selectCase = useCallback(async (caseItem: LabCaseSummary) => {
    setState((prev) => ({
      ...prev,
      activeCase: caseItem,
      sessionId: null,
      sessionLoading: true,
      sessionError: null,
    }));
    try {
      const response = await startCase(caseItem.id);
      setState((prev) => ({ ...prev, sessionId: response.session_id, sessionLoading: false }));
    } catch (err) {
      setState((prev) => ({ ...prev, sessionLoading: false, sessionError: err as ApiError }));
    }
  }, []);

  return { ...state, loadCases, selectCase };
}
