from __future__ import annotations

import csv
import asyncio
import re
import json
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4
import sqlite3

from models import (
    DashboardMetrics,
    DiagnosticTurn,
    FailureLogEntry,
    LabCaseSummary,
    ReviewLogEntry,
    ReviewRequest,
    ReviewResponse,
)
from gemini_service import GeminiAnalyzer


OSI_LAYER_NAMES = {
    1: "Physical",
    2: "Data Link",
    3: "Network",
    4: "Transport",
    5: "Session",
    6: "Presentation",
    7: "Application",
}


@dataclass(frozen=True)
class LabCase:
    case_id: str
    concept_tag: str
    osi_layer: int
    severity: str
    symptom: str
    topology_note: str
    show_outputs: str
    expected_fault: str
    correct_fix: str

    @property
    def title(self) -> str:
        return f"{self.concept_tag} troubleshooting: {self.symptom}"

    @property
    def device(self) -> str:
        devices = re.findall(r"\b(?:SW\d+|R\d+|PC\d+|WLC|AP|CoreSW)\b", self.topology_note)
        return devices[0] if devices else "Cisco device"

    def summary(self) -> LabCaseSummary:
        return LabCaseSummary(
            id=self.case_id,
            title=self.title,
            device=self.device,
            symptoms=self.symptom,
            cli_context=self.show_outputs,
        )


class OfflineBackend:
    def __init__(self, csv_path: Path) -> None:
        self.csv_path = csv_path
        self.cases = self._load_cases(csv_path)
        self.sessions: dict[str, str] = {}
        self.diagnoses: dict[str, list[DiagnosticTurn]] = {}
        self.review_logs: list[ReviewLogEntry] = []
        self.failure_logs: list[FailureLogEntry] = []
        self.gemini = GeminiAnalyzer()
        self.db_path = csv_path.parent / "netsage.db"
        self._init_sqlite_db()
        self._load_persisted_state()
        
        # Clean up obsolete persisted_state.json if it exists
        old_json = csv_path.parent / "persisted_state.json"
        if old_json.exists():
            try:
                old_json.unlink()
            except Exception:
                pass

    def _init_sqlite_db(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS review_logs (
                        id TEXT PRIMARY KEY,
                        case_id TEXT,
                        title TEXT,
                        device TEXT,
                        outcome TEXT,
                        ai_suggested_fix TEXT,
                        final_fix_applied TEXT,
                        human_rationale TEXT,
                        engineer TEXT,
                        timestamp TEXT,
                        time_to_resolve TEXT
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS failure_logs (
                        id TEXT PRIMARY KEY,
                        case_id TEXT,
                        case_title TEXT,
                        initial_ai_output TEXT,
                        human_correction TEXT,
                        failure_reason TEXT,
                        timestamp TEXT,
                        device TEXT,
                        engineer TEXT
                    )
                """)
                conn.commit()
        except Exception as e:
            print(f"Failed to initialize SQLite database: {e}")

    def _load_persisted_state(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                cursor.execute("SELECT * FROM review_logs")
                self.review_logs = [
                    ReviewLogEntry(
                        id=row["id"],
                        case_id=row["case_id"],
                        title=row["title"],
                        device=row["device"],
                        outcome=row["outcome"],
                        ai_suggested_fix=row["ai_suggested_fix"],
                        final_fix_applied=row["final_fix_applied"],
                        human_rationale=row["human_rationale"],
                        engineer=row["engineer"],
                        timestamp=row["timestamp"],
                        time_to_resolve=row["time_to_resolve"]
                    )
                    for row in cursor.fetchall()
                ]
                
                cursor.execute("SELECT * FROM failure_logs")
                self.failure_logs = [
                    FailureLogEntry(
                        id=row["id"],
                        case_id=row["case_id"],
                        case_title=row["case_title"],
                        initial_ai_output=row["initial_ai_output"],
                        human_correction=row["human_correction"],
                        failure_reason=row["failure_reason"],
                        timestamp=row["timestamp"],
                        device=row["device"],
                        engineer=row["engineer"]
                    )
                    for row in cursor.fetchall()
                ]
        except Exception as e:
            print(f"Failed to load persisted state from SQLite: {e}")

    def _save_persisted_state(self) -> None:
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM review_logs")
                for log in self.review_logs:
                    cursor.execute("""
                        INSERT INTO review_logs (
                            id, case_id, title, device, outcome, ai_suggested_fix,
                            final_fix_applied, human_rationale, engineer, timestamp, time_to_resolve
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        log.id, log.case_id, log.title, log.device, log.outcome, log.ai_suggested_fix,
                        log.final_fix_applied, log.human_rationale, log.engineer, log.timestamp, log.time_to_resolve
                    ))
                
                cursor.execute("DELETE FROM failure_logs")
                for log in self.failure_logs:
                    cursor.execute("""
                        INSERT INTO failure_logs (
                            id, case_id, case_title, initial_ai_output, human_correction,
                            failure_reason, timestamp, device, engineer
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        log.id, log.case_id, log.case_title, log.initial_ai_output, log.human_correction,
                        log.failure_reason, log.timestamp, log.device, log.engineer
                    ))
                conn.commit()
        except Exception as e:
            print(f"Failed to save persisted state to SQLite: {e}")

    @staticmethod
    def _load_cases(csv_path: Path) -> dict[str, LabCase]:
        if not csv_path.exists():
            raise FileNotFoundError(f"Cases CSV not found: {csv_path}")
        with csv_path.open("r", encoding="utf-8-sig", newline="") as file:
            rows = csv.DictReader(file)
            return {
                row["case_id"]: LabCase(
                    case_id=row["case_id"],
                    concept_tag=row["concept_tag"],
                    osi_layer=int(row["osi_layer"]),
                    severity=row["severity"].upper(),
                    symptom=row["symptom"],
                    topology_note=row["topology_note"],
                    show_outputs=row["show_outputs"],
                    expected_fault=row["expected_fault"],
                    correct_fix=row["correct_fix"],
                )
                for row in rows
            }

    def list_cases(self) -> list[LabCaseSummary]:
        return [case.summary() for case in self.cases.values()]

    def start_case(self, case_id: str) -> tuple[str, LabCase]:
        case = self.cases.get(case_id)
        if case is None:
            raise KeyError(case_id)
        session_id = f"ses_{uuid4().hex}"
        self.sessions[session_id] = case_id
        self.diagnoses[session_id] = []
        return session_id, case

    def start_custom_case(self, device: str, symptom: str, cli_logs: str) -> tuple[str, LabCase]:
        case_id = f"custom_{uuid4().hex}"
        case = LabCase(
            case_id=case_id,
            concept_tag="Custom",
            osi_layer=3,
            severity="MEDIUM",
            symptom=symptom,
            topology_note=device,
            show_outputs=cli_logs,
            expected_fault="Insufficient evidence for a confirmed offline diagnosis.",
            correct_fix="! Offline mode: please set a valid GEMINI_API_KEY in the backend to analyze custom inputs.",
        )
        self.cases[case_id] = case
        session_id = f"ses_{uuid4().hex}"
        self.sessions[session_id] = case_id
        self.diagnoses[session_id] = []
        return session_id, case

    def _find_case(self, case_id: str, symptom: str, cli_logs: str) -> LabCase:
        case = self.cases.get(case_id)
        if case is not None:
            return case
        combined = f"{symptom} {cli_logs}".lower()
        best_case = max(
            self.cases.values(),
            key=lambda candidate: self._similarity(combined, candidate),
            default=None,
        )
        if best_case is None or self._similarity(combined, best_case) == 0:
            raise KeyError(case_id)
        return best_case

    @staticmethod
    def _similarity(text: str, case: LabCase) -> int:
        words = set(re.findall(r"[a-z0-9]+", text.lower()))
        reference = set(re.findall(r"[a-z0-9]+", f"{case.symptom} {case.expected_fault}".lower()))
        return len(words & reference)

    @staticmethod
    def _rule_flag(case: LabCase) -> dict[str, str]:
        return {
            "flag": f"{case.concept_tag.upper()}_CONFIGURATION",
            "description": case.expected_fault,
            "severity": case.severity,
        }

    async def diagnose(self, case_id: str, session_id: str, symptom: str, cli_logs: str) -> DiagnosticTurn:
        if self.sessions.get(session_id) != case_id:
            raise ValueError("Session does not belong to this case")
        case = self._find_case(case_id, symptom, cli_logs)
        turn_number = len(self.diagnoses[session_id]) + 1
        matched_evidence = bool(cli_logs.strip())
        rule_flag = self._rule_flag(case)
        ai_result = await asyncio.to_thread(
            self.gemini.analyze,
            symptom=symptom,
            topology=case.topology_note,
            cli_logs=cli_logs,
            deterministic_flag=rule_flag,
        )
        if ai_result is not None:
            confidence = max(0.0, min(1.0, float(ai_result.get("confidence", 0.0))))
            root_cause = str(ai_result.get("root_cause", "Insufficient evidence for a diagnosis."))
            osi_layer = max(1, min(7, int(ai_result.get("osi_layer", case.osi_layer))))
            evidence_for = [str(item) for item in ai_result.get("evidence_for", [])]
            evidence_against = [str(item) for item in ai_result.get("evidence_against", [])]
            next_command = ai_result.get("next_command")
            fix_steps = ai_result.get("fix_steps", [])
            if isinstance(fix_steps, str):
                fix_steps = fix_steps.splitlines()
            fix_steps = [str(item) for item in fix_steps]
            if confidence < 0.75:
                fix_steps = []
                next_command = str(next_command or "show running-config")
            else:
                next_command = None
            agreement_status = "agree" if matched_evidence else "rule_only"
            evidence = evidence_for[0] if evidence_for else "Gemini requested more CLI evidence."
        else:
            is_custom = case.concept_tag == "Custom"
            confidence = 0.0 if is_custom else (0.96 if matched_evidence else 0.62)
            root_cause = case.expected_fault
            osi_layer = case.osi_layer
            evidence_for = [case.show_outputs] if (matched_evidence and not is_custom) else []
            evidence_against = (
                ["Offline fallback cannot analyze custom inputs. A valid GEMINI_API_KEY is required in backend/.env."]
                if is_custom
                else ([] if matched_evidence else ["Required Cisco CLI evidence has not been submitted yet."])
            )
            next_command = "show running-config" if (not matched_evidence or is_custom) else None
            fix_steps = ([] if is_custom else (case.correct_fix.splitlines() if matched_evidence else []))
            agreement_status = "rule_only"
            evidence = (
                "Custom diagnostics are unavailable offline. Please set a valid GEMINI_API_KEY."
                if is_custom
                else (case.show_outputs if matched_evidence else "The symptom is consistent with this case, but CLI output is still needed.")
            )
        turn = DiagnosticTurn(
            turn=turn_number,
            root_cause=root_cause,
            osi_layer=osi_layer,
            osi_layer_name=OSI_LAYER_NAMES.get(osi_layer, "Unknown"),
            confidence=confidence,
            evidence=evidence,
            evidence_for=evidence_for,
            evidence_against=evidence_against,
            next_command=next_command,
            fix_steps=fix_steps,
            rule_flags=[rule_flag],
            agreement_status=agreement_status,
            confidence_state="high" if confidence >= 0.75 else "low",
        )
        self.diagnoses[session_id].append(turn)
        return turn

    def submit_review(self, case_id: str, request: ReviewRequest) -> ReviewResponse:
        if self.sessions.get(request.session_id) != case_id:
            raise ValueError("Session does not belong to this case")
        turns = self.diagnoses.get(request.session_id, [])
        if not turns:
            raise ValueError("Run a diagnosis before submitting a review")
        case = self.cases[case_id]
        latest = turns[-1]
        outcome = {"ACCEPT": "ACCEPTED", "EDIT": "OVERRIDDEN", "REJECT": "REJECTED"}[request.action]
        final_fix = request.final_fix or ("\n".join(latest.fix_steps) if latest.fix_steps else "")
        timestamp = datetime.now(timezone.utc).isoformat()
        review_id = f"rev_{uuid4().hex}"
        self.review_logs.insert(
            0,
            ReviewLogEntry(
                id=review_id,
                case_id=case_id,
                title=case.title,
                device=case.device,
                outcome=outcome,
                ai_suggested_fix="\n".join(latest.fix_steps),
                final_fix_applied=final_fix,
                human_rationale=request.human_rationale or request.correction_notes or "Reviewed by network engineer.",
                engineer="Network Engineer",
                timestamp=timestamp,
                time_to_resolve=f"{len(turns)} turn(s)",
            ),
        )
        if request.action in ("EDIT", "REJECT"):
            self.failure_logs.insert(
                0,
                FailureLogEntry(
                    id=f"fl_{uuid4().hex}",
                    case_id=case_id,
                    case_title=case.title,
                    initial_ai_output=latest.root_cause,
                    human_correction=request.correction_notes or final_fix or "Rejected by engineer.",
                    failure_reason=request.failure_reason or "SCOPE MISS",
                    timestamp=timestamp,
                    device=case.device,
                    engineer="Network Engineer",
                ),
            )
        self._save_persisted_state()
        return ReviewResponse(status=outcome, review_id=review_id, message=f"Review {outcome.lower()} and recorded.")

    def metrics(self) -> DashboardMetrics:
        total_diagnoses = sum(len(turns) for turns in self.diagnoses.values())
        high_confidence = sum(
            1 for turns in self.diagnoses.values() for turn in turns if turn.confidence >= 0.75
        )
        accepted = sum(1 for review in self.review_logs if review.outcome == "ACCEPTED")
        overrides = len(self.review_logs) - accepted
        distribution: dict[str, int] = {}
        for case_id in self.sessions.values():
            concept = self.cases[case_id].concept_tag
            distribution[concept] = distribution.get(concept, 0) + 1
        return DashboardMetrics(
            total_cases=total_diagnoses,
            agreement_rate=round(accepted / len(self.review_logs), 3) if self.review_logs else 0.0,
            avg_turns_to_resolution=round(
                sum(len(turns) for turns in self.diagnoses.values()) / len(self.diagnoses), 2
            ) if self.diagnoses else 0.0,
            total_overrides=overrides,
            issue_distribution=[
                {"name": name, "value": value, "color": "#68d6ff"}
                for name, value in distribution.items()
            ],
            calibration_curve=[
                {"confidence": 0.62, "model_accuracy": 0.0, "ideal": 0.62},
                {"confidence": 0.96, "model_accuracy": 1.0, "ideal": 0.96},
            ],
            agreement_progress=[
                {"label": "Agreement", "percentage": round(accepted / len(self.review_logs) * 100, 1) if self.review_logs else 0.0},
                {"label": "Overrides", "percentage": round(overrides / len(self.review_logs) * 100, 1) if self.review_logs else 0.0},
            ],
            failure_log=self.failure_logs,
            review_log=self.review_logs,
        )