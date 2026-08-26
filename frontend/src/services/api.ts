import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

export interface ApiError {
  status: number;
  detail: string;
  isRateLimit: boolean;
}

function normalizeError(err: unknown): ApiError {
  if (err instanceof AxiosError && err.response) {
    const status = err.response.status;
    const detail = err.response.data?.detail ?? err.response.data?.message ?? err.message;
    return { status, detail, isRateLimit: status === 429 };
  }
  return { status: 0, detail: err instanceof Error ? err.message : 'Network error', isRateLimit: false };
}

export interface LabCaseSummary {
  id: string;
  title: string;
  device: string;
  symptoms: string;
  cli_context?: string;
}

export interface StartCaseResponse {
  session_id: string;
  case_id: string;
  message: string;
}

export interface CustomCaseRequest {
  device: string;
  symptom: string;
  cli_logs: string;
}

export interface DiagnoseRequest {
  session_id: string;
  symptom: string;
  cli_logs: string;
}

export interface RuleFlag {
  flag: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface DiagnosticTurn {
  turn: number;
  root_cause: string;
  osi_layer: number;
  osi_layer_name: string;
  confidence: number;
  evidence: string;
  evidence_for: string[];
  evidence_against: string[];
  next_command: string | null;
  fix_steps: string[];
  rule_flags: RuleFlag[];
  agreement_status: 'agree' | 'disagree' | 'rule_only' | 'llm_only';
  confidence_state: 'high' | 'low';
}

export interface ReviewRequest {
  session_id: string;
  action: 'ACCEPT' | 'EDIT' | 'REJECT';
  final_fix?: string;
  human_rationale?: string;
  failure_reason?: string;
  correction_notes?: string;
}

export interface ReviewResponse {
  status: string;
  review_id: string;
  message: string;
}

export interface DashboardMetrics {
  total_cases: number;
  agreement_rate: number;
  avg_turns_to_resolution: number;
  total_overrides: number;
  issue_distribution: { name: string; value: number; color: string }[];
  calibration_curve: { confidence: number; model_accuracy: number; ideal: number }[];
  agreement_progress: { label: string; percentage: number }[];
  failure_log: {
    id: string;
    case_id: string;
    case_title: string;
    initial_ai_output: string;
    human_correction: string;
    failure_reason: string;
    timestamp: string;
    device: string;
    engineer: string;
  }[];
  review_log: {
    id: string;
    case_id: string;
    title: string;
    device: string;
    outcome: 'ACCEPTED' | 'OVERRIDDEN' | 'REJECTED';
    ai_suggested_fix: string;
    final_fix_applied: string;
    human_rationale: string;
    engineer: string;
    timestamp: string;
    time_to_resolve: string;
  }[];
}

export async function fetchCases(): Promise<LabCaseSummary[]> {
  try {
    const { data } = await client.get<LabCaseSummary[]>('/cases');
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function startCase(caseId: string): Promise<StartCaseResponse> {
  try {
    const { data } = await client.post<StartCaseResponse>('/case/start', { case_id: caseId });
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function startCustomCase(payload: CustomCaseRequest): Promise<StartCaseResponse> {
  try {
    const { data } = await client.post<StartCaseResponse>('/case/custom/start', payload);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function runDiagnosis(caseId: string, payload: DiagnoseRequest): Promise<DiagnosticTurn> {
  try {
    const { data } = await client.post<DiagnosticTurn>(`/case/${caseId}/diagnose`, payload);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function submitReview(caseId: string, payload: ReviewRequest): Promise<ReviewResponse> {
  try {
    const { data } = await client.post<ReviewResponse>(`/case/${caseId}/review`, payload);
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function fetchMetrics(): Promise<DashboardMetrics> {
  try {
    const { data } = await client.get<DashboardMetrics>('/dashboard/metrics');
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}

export async function fetchHealth(): Promise<{ status: string; mode: string; gemini_enabled: boolean; cases_loaded: number }> {
  try {
    const { data } = await client.get('/health');
    return data;
  } catch (err) {
    throw normalizeError(err);
  }
}
