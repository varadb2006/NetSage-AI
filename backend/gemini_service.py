from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    HAS_GENAI = False

from pydantic import BaseModel

class GeminiOutputSchema(BaseModel):
    root_cause: str
    osi_layer: int
    confidence: float
    evidence_for: list[str]
    evidence_against: list[str]
    next_command: str | None
    fix_steps: list[str]


@dataclass
class GeminiAnalyzer:
    """Small, lazy Gemini adapter so offline startup never needs an API key."""

    model_name: str = "gemini-3.5-flash"

    def __post_init__(self) -> None:
        self._model: Any | None = None

    @property
    def enabled(self) -> bool:
        if not HAS_GENAI:
            return False
        key = os.getenv("GEMINI_API_KEY", "").strip()
        return bool(key) and key != "your_gemini_api_key_here"

    def _get_model(self) -> Any:
        if not HAS_GENAI:
            raise ImportError("google-generativeai is not installed.")
        if self._model is None:
            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            # Load system instructions prompt from backend/prompts/diagnose_prompt.md
            prompt_path = Path(__file__).resolve().parent / "prompts" / "diagnose_prompt.md"
            try:
                system_instructions = prompt_path.read_text(encoding="utf-8")
            except Exception:
                system_instructions = "You are a Cisco IOS troubleshooting analyst. Return ONLY valid JSON matching the schema."
            self._model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instructions
            )
        return self._model

    def analyze(
        self,
        *,
        symptom: str,
        topology: str,
        cli_logs: str,
        deterministic_flag: dict[str, str],
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None

        prompt = """## CURRENT LAB WORKSPACE EVIDENCE
- **Target Device/Topology**: {topology}
- **Observed Symptom**: {symptom}
- **Deterministic Rule Flag**: {flag}
- **Raw Cisco CLI Logs**:
```
{cli_logs}
```
""".format(
            symptom=symptom[:1200],
            topology=topology[:1200],
            cli_logs=cli_logs[-6000:],
            flag=deterministic_flag.get("flag", "None"),
        )
        text = ""
        try:
            response = self._get_model().generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 2048,
                    "response_mime_type": "application/json",
                },
            )
            text = (response.text or "").strip()
            # Clean markdown code blocks if the model wrapped the JSON
            if text.startswith("```"):
                lines = text.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                text = "\n".join(lines).strip()
            return json.loads(text)
        except Exception as e:
            import traceback
            print(f"Gemini API Call Failed: {type(e).__name__}: {e}")
            if text:
                print(f"RAW TEXT RETURNED BY GEMINI:\n{text}\n--------------------")
            traceback.print_exc()
            return None