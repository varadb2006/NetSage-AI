import { useState, useCallback, useRef } from 'react';
import { runDiagnosis, DiagnosticTurn, DiagnoseRequest, ApiError } from '../services/api';

export type DiagnosisPhase =
  | 'idle'
  | 'running'
  | 'low_confidence'
  | 'high_confidence'
  | 'reviewed'
  | 'error';

export interface DiagnosisTurnHistory {
  turn: number;
  cliLogsSubmitted: string;
  result: DiagnosticTurn;
}

interface UseDiagnosisState {
  phase: DiagnosisPhase;
  turns: DiagnosisTurnHistory[];
  currentTurn: DiagnosticTurn | null;
  error: ApiError | null;
}

const CONFIDENCE_THRESHOLD = 0.75;

export function useDiagnosis(caseId: string, sessionId: string) {
  const [state, setState] = useState<UseDiagnosisState>({
    phase: 'idle',
    turns: [],
    currentTurn: null,
    error: null,
  });

  const turnCounterRef = useRef(0);

  const submitDiagnosticTurn = useCallback(
    async (symptom: string, cliLogs: string): Promise<DiagnosticTurn | null> => {
      setState((prev) => ({ ...prev, phase: 'running', error: null }));

      const payload: DiagnoseRequest = { session_id: sessionId, symptom, cli_logs: cliLogs };

      try {
        const result = await runDiagnosis(caseId, payload);
        turnCounterRef.current += 1;

        const nextPhase: DiagnosisPhase =
          result.confidence >= CONFIDENCE_THRESHOLD ? 'high_confidence' : 'low_confidence';

        setState((prev) => ({
          ...prev,
          phase: nextPhase,
          turns: [...prev.turns, { turn: turnCounterRef.current, cliLogsSubmitted: cliLogs, result }],
          currentTurn: result,
          error: null,
        }));

        return result;
      } catch (err) {
        setState((prev) => ({ ...prev, phase: 'error', error: err as ApiError, currentTurn: null }));
        return null;
      }
    },
    [caseId, sessionId]
  );

  const markReviewed = useCallback(() => setState((prev) => ({ ...prev, phase: 'reviewed' })), []);

  const reset = useCallback(() => {
    turnCounterRef.current = 0;
    setState({ phase: 'idle', turns: [], currentTurn: null, error: null });
  }, []);

  return { ...state, submitDiagnosticTurn, markReviewed, reset, turnCount: turnCounterRef.current, confidenceThreshold: CONFIDENCE_THRESHOLD };
}
