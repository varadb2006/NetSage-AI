from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any


@dataclass
class GeminiAnalyzer:
    """Small, lazy Gemini adapter so offline startup never needs an API key."""

    model_name: str = "gemini-2.5-flash"

    def __post_init__(self) -> None:
        self._model: Any | None = None

    @property
    def enabled(self) -> bool:
        key = os.getenv("GEMINI_API_KEY", "").strip()
        return bool(key) and key != "your_gemini_api_key_here"

    def _get_model(self) -> Any:
        if self._model is None:
            import google.generativeai as genai

            genai.configure(api_key=os.environ["GEMINI_API_KEY"])
            self._model = genai.GenerativeModel(self.model_name)
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

        prompt = """You are a Cisco IOS troubleshooting analyst.
Return ONLY valid JSON with exactly these keys:
root_cause (string), osi_layer (integer 1-7), confidence (number 0-1),
evidence_for (array of strings), evidence_against (array of strings),
next_command (string or null), fix_steps (array of strings).
Use only the supplied symptom, topology, and CLI output. Never invent interfaces,
addresses, or commands. If evidence is incomplete, confidence must be below 0.75,
next_command must contain one safe show command, and fix_steps must be [].

SYMPTOM: {symptom}
TOPOLOGY: {topology}
CLI OUTPUT: {cli_logs}
DETERMINISTIC FLAG: {flag}
""".format(
            symptom=symptom[:1200],
            topology=topology[:1200],
            cli_logs=cli_logs[-6000:],
            flag=deterministic_flag["flag"],
        )
        try:
            response = self._get_model().generate_content(
                prompt,
                generation_config={
                    "temperature": 0.1,
                    "max_output_tokens": 600,
                    "response_mime_type": "application/json",
                },
            )
            text = (response.text or "").strip()
            return json.loads(text)
        except Exception:
            return None