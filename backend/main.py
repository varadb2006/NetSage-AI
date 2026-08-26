from __future__ import annotations

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables at the very top before other imports
BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env", override=True)

import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from models import (
    DashboardMetrics,
    DiagnoseRequest,
    DiagnosticTurn,
    LabCaseSummary,
    ReviewRequest,
    ReviewResponse,
    StartCaseRequest,
    StartCaseResponse,
    StartCustomCaseRequest,
)
from services import OfflineBackend


CSV_PATH = BACKEND_DIR / os.getenv("CASES_CSV_PATH", "../data/cases.csv")
backend = OfflineBackend(CSV_PATH.resolve())

app = FastAPI(
    title="NetSage AI Backend",
    description="Cisco troubleshooting API with optional Gemini analysis and an offline fallback.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, object]:
    gemini_enabled = backend.gemini.enabled
    return {
        "status": "ok",
        "mode": "gemini" if gemini_enabled else "offline",
        "gemini_enabled": gemini_enabled,
        "cases_loaded": len(backend.cases),
    }


@app.get("/cases", response_model=list[LabCaseSummary])
def get_cases() -> list[LabCaseSummary]:
    return backend.list_cases()


@app.post("/case/start", response_model=StartCaseResponse)
def start_case(request: StartCaseRequest) -> StartCaseResponse:
    try:
        session_id, case = backend.start_case(request.case_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown case: {request.case_id}") from error
    return StartCaseResponse(session_id=session_id, case_id=case.case_id, message="Case session started.")


@app.post("/case/custom/start", response_model=StartCaseResponse)
def start_custom_case(request: StartCustomCaseRequest) -> StartCaseResponse:
    session_id, case = backend.start_custom_case(request.device, request.symptom, request.cli_logs)
    return StartCaseResponse(session_id=session_id, case_id=case.case_id, message="Custom case session started.")


# Store request timestamps per client IP to enforce rate limiting
rate_limit_records: dict[str, list[float]] = {}

def check_rate_limit(client_ip: str) -> bool:
    current_time = time.time()
    # Retain only timestamps from the last 60 seconds
    timestamps = rate_limit_records.get(client_ip, [])
    timestamps = [t for t in timestamps if current_time - t < 60]
    rate_limit_records[client_ip] = timestamps
    
    if len(timestamps) >= 3:
        return False
        
    timestamps.append(current_time)
    return True


@app.post("/case/{case_id}/diagnose", response_model=DiagnosticTurn)
async def diagnose(case_id: str, request: DiagnoseRequest, req: Request) -> DiagnosticTurn:
    client_ip = req.client.host if req.client else "unknown"
    if not check_rate_limit(client_ip):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Maximum 3 diagnostic requests per minute allowed to protect Gemini quota."
        )
    try:
        return await backend.diagnose(case_id, request.session_id, request.symptom, request.cli_logs)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}") from error


@app.post("/case/{case_id}/review", response_model=ReviewResponse)
def review(case_id: str, request: ReviewRequest) -> ReviewResponse:
    try:
        return backend.submit_review(case_id, request)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except KeyError as error:
        raise HTTPException(status_code=404, detail=f"Unknown case: {case_id}") from error


@app.get("/dashboard/metrics", response_model=DashboardMetrics)
def dashboard_metrics() -> DashboardMetrics:
    return backend.metrics()