// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export type TabType = 'diagnosis' | 'review_log' | 'analytics';

// ---------------------------------------------------------------------------
// OSI Model
// ---------------------------------------------------------------------------
export type OSILayer = 7 | 6 | 5 | 4 | 3 | 2 | 1;

export interface OSILayerInfo {
  layer: OSILayer;
  name: string;
  isFault: boolean;
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Agreement & Confidence (mirrors backend agreement_engine output)
// ---------------------------------------------------------------------------
export type AgreementStatus = 'agree' | 'disagree' | 'rule_only' | 'llm_only';

export type ConfidenceState = 'high' | 'low';

// ---------------------------------------------------------------------------
// Rule Flags (from rule_checker.py)
// ---------------------------------------------------------------------------
export interface RuleFlag {
  flag: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ---------------------------------------------------------------------------
// DiagnosticTurn — the core LLM response schema (mirrors backend Pydantic model)
// ---------------------------------------------------------------------------
export interface DiagnosticTurn {
  turn: number;
  root_cause: string;
  osi_layer: OSILayer;
  osi_layer_name: string;
  /** 0.0 – 1.0 scale. Threshold: < 0.75 = low confidence (multi-turn), >= 0.75 = fix ready */
  confidence: number;
  evidence: string;
  evidence_for: string[];
  evidence_against: string[];
  /** Populated when confidence < 0.75 — next CLI command the user should run */
  next_command: string | null;
  /** Populated when confidence >= 0.75 — ordered fix steps */
  fix_steps: string[];
  rule_flags: RuleFlag[];
  agreement_status: AgreementStatus;
  confidence_state: ConfidenceState;
}

// ---------------------------------------------------------------------------
// Lab Cases (loaded from backend /cases — backed by cases.csv)
// ---------------------------------------------------------------------------
export interface LabCase {
  id: string;
  title: string;
  device: string;
  symptoms: string;
  /** Raw CLI log context pre-loaded from the case definition */
  cli_context?: string;
}

// ---------------------------------------------------------------------------
// Human Review
// ---------------------------------------------------------------------------
export type ReviewAction = 'ACCEPT' | 'EDIT' | 'REJECT';

export type FailureReason =
  | 'OVER-CORRECTION'
  | 'TOPOLOGY DRIFT'
  | 'SCOPE MISS'
  | 'HALLUCINATED INTERFACE'
  | 'SECURITY CONSTRAINT';

export interface ReviewPayload {
  session_id: string;
  action: ReviewAction;
  final_fix?: string;
  human_rationale?: string;
  failure_reason?: FailureReason;
  correction_notes?: string;
}

// ---------------------------------------------------------------------------
// Audit Logs (returned by /dashboard/metrics)
// ---------------------------------------------------------------------------
export interface FailureLogEntry {
  id: string;
  case_id: string;
  case_title?: string;
  initial_ai_output: string;
  human_correction: string;
  failure_reason: FailureReason;
  timestamp: string;
  device: string;
  engineer: string;
}

export interface ReviewLogEntry {
  id: string;
  case_id: string;
  title: string;
  device: string;
  outcome: 'ACCEPTED' | 'OVERRIDDEN' | 'REJECTED';
  ai_suggested_fix: string;
  final_fix_applied: string;
  human_rationale?: string;
  engineer: string;
  timestamp: string;
  time_to_resolve: string;
}

// ---------------------------------------------------------------------------
// Dashboard Metrics
// ---------------------------------------------------------------------------
export interface DashboardMetrics {
  total_cases: number;
  agreement_rate: number;
  avg_turns_to_resolution: number;
  total_overrides: number;
  issue_distribution: { name: string; value: number; color: string }[];
  calibration_curve: { confidence: number; model_accuracy: number; ideal: number }[];
  agreement_progress: { label: string; percentage: number }[];
  failure_log: FailureLogEntry[];
  review_log: ReviewLogEntry[];
}

// ---------------------------------------------------------------------------
// Toast Notifications
// ---------------------------------------------------------------------------
export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface LegacyLabCase extends LabCase {
  sessionId: string;
  targetDevice: string;
  defaultConfidence: ConfidenceState;
  terminalInitial: string;
  quickCommands: { command: string; output: string }[];
  nextSuggestedAction: { command: string; rationale: string; expectedOutcome: string };
  aiSuggestedFix: { rootCause: string; fixScript: string };
  actualKnownFix: { title: string; steps: string[]; script: string };
  defaultHumanOverride: string;
  finalScript: { ai: string[]; override: string[] };
  osiFault: { layer: number; name: string; confidence: number };
  deterministicAgreement: { status: string; rule: string };
  isRuleOnly?: boolean;
}
