from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


ReviewAction = Literal["ACCEPT", "EDIT", "REJECT"]
Severity = Literal["HIGH", "MEDIUM", "LOW"]
AgreementStatus = Literal["agree", "disagree", "rule_only", "llm_only"]
ConfidenceState = Literal["high", "low"]


class LabCaseSummary(BaseModel):
    id: str
    title: str
    device: str
    symptoms: str
    cli_context: str | None = None


class StartCaseRequest(BaseModel):
    case_id: str = Field(min_length=1)


class StartCaseResponse(BaseModel):
    session_id: str
    case_id: str
    message: str


class StartCustomCaseRequest(BaseModel):
    device: str = Field(min_length=1)
    symptom: str = Field(min_length=1)
    cli_logs: str = ""


class DiagnoseRequest(BaseModel):
    session_id: str = Field(min_length=1)
    symptom: str = Field(min_length=1)
    cli_logs: str = ""


class RuleFlag(BaseModel):
    flag: str
    description: str
    severity: Severity


class DiagnosticTurn(BaseModel):
    turn: int
    root_cause: str
    osi_layer: int = Field(ge=1, le=7)
    osi_layer_name: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: str
    evidence_for: list[str]
    evidence_against: list[str]
    next_command: str | None
    fix_steps: list[str]
    rule_flags: list[RuleFlag]
    agreement_status: AgreementStatus
    confidence_state: ConfidenceState


class ReviewRequest(BaseModel):
    session_id: str = Field(min_length=1)
    action: ReviewAction
    final_fix: str | None = None
    human_rationale: str | None = None
    failure_reason: str | None = None
    correction_notes: str | None = None


class ReviewResponse(BaseModel):
    status: str
    review_id: str
    message: str


class ReviewLogEntry(BaseModel):
    id: str
    case_id: str
    title: str
    device: str
    outcome: Literal["ACCEPTED", "OVERRIDDEN", "REJECTED"]
    ai_suggested_fix: str
    final_fix_applied: str
    human_rationale: str
    engineer: str
    timestamp: str
    time_to_resolve: str


class FailureLogEntry(BaseModel):
    id: str
    case_id: str
    case_title: str
    initial_ai_output: str
    human_correction: str
    failure_reason: str
    timestamp: str
    device: str
    engineer: str


class DashboardMetrics(BaseModel):
    total_cases: int
    agreement_rate: float
    avg_turns_to_resolution: float
    total_overrides: int
    issue_distribution: list[dict[str, str | int]]
    calibration_curve: list[dict[str, float]]
    agreement_progress: list[dict[str, str | float]]
    failure_log: list[FailureLogEntry]
    review_log: list[ReviewLogEntry]