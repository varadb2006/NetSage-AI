# NetSage AI

AI-assisted troubleshooting assistant for Cisco Packet Tracer labs with a strict Human-in-the-Loop (HITL) review architecture.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS v4 (TypeScript) |
| Backend | Python 3.11 + FastAPI + Uvicorn |
| AI Engine | Google Gemini (`gemini-2.5-flash`) via `google-generativeai` |

## Project Structure

```
netsageAI/
├── frontend/          React + Vite frontend
├── backend/           FastAPI backend
├── data/
│   └── cases.csv      Lab case definitions (source of truth)
└── README.md
```

## Getting Started & Teammate Setup

### 1. Frontend Setup
Navigate to the frontend folder, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev              # Runs on http://localhost:3000
```

### 2. Backend Setup
Navigate to the backend folder and install dependencies:
```bash
cd ../backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On macOS/Linux
# or: .\venv\Scripts\Activate.ps1 on Windows Powershell

# Install requirements
pip install -r requirements.txt
```

The included backend runs in offline mode by default. It loads `../data/cases.csv`,
uses deterministic diagnosis rules, and keeps sessions, reviews, and metrics in memory.
Gemini is not required for startup. To enable Gemini, copy `backend/.env.example` to `backend/.env`, set `GEMINI_API_KEY`, and restart Uvicorn.
The diagnosis prompt sends only the selected case context and the latest 6,000 characters
of CLI output, with a 600-token response cap.

### 3. Running the Dev Servers
Once configured, you can start the backend service:
```bash
uvicorn main:app --reload --port 8000
```

## Architecture

The system implements a dual-processing pipeline:

1. **Deterministic Rule Checker** — regex/string matching on raw CLI logs to detect known faults (interface down, duplicate IP, subnet mismatch, VLAN issues, missing routes).
2. **LLM Inference** — Gemini `gemini-2.5-flash` with structured JSON output enforcing the `DiagnosticTurn` schema.
3. **Agreement Engine** — compares rule flags against LLM output and sets `agreement_status`.
4. **Confidence Threshold** — `confidence < 0.75` triggers a multi-turn loop (user runs `next_command` and resubmits CLI output); `confidence >= 0.75` generates `fix_steps` for HITL review.
5. **HITL Review** — Accept / Edit / Reject with full audit logging to in-memory state.

### Offline API

The implemented local API exposes:

- `GET /health`
- `GET /cases`
- `POST /case/start`
- `POST /case/{case_id}/diagnose`
- `POST /case/{case_id}/review`
- `GET /dashboard/metrics`

Interactive API documentation is available at `http://localhost:8000/docs` after startup.
