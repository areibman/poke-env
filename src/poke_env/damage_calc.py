from __future__ import annotations

import json
import os
import subprocess
from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class DamageCalcResult:
    ok: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class DamageCalculator:
    """Thin wrapper around @smogon/calc for damage ranges."""

    def __init__(self, gen: int = 9, script_path: Optional[str] = None) -> None:
        self.gen = gen
        if script_path:
            self.script_path = script_path
        else:
            self.script_path = os.path.realpath(
                os.path.join(
                    os.path.dirname(__file__),
                    "..",
                    "..",
                    "tools",
                    "damage_calc",
                    "calc.js",
                )
            )

    def calculate_batch(self, requests: List[Dict[str, Any]]) -> List[DamageCalcResult]:
        if not os.path.exists(self.script_path):
            return [
                DamageCalcResult(ok=False, error="Damage calc script not found")
                for _ in requests
            ]

        payload = json.dumps({"gen": self.gen, "requests": requests})
        try:
            result = subprocess.run(
                ["node", self.script_path],
                input=payload,
                text=True,
                capture_output=True,
                check=False,
            )
        except FileNotFoundError as exc:
            return [
                DamageCalcResult(ok=False, error=f"Node not found: {exc}")
                for _ in requests
            ]

        if result.returncode != 0:
            error = result.stderr.strip() or "Damage calc failed"
            return [DamageCalcResult(ok=False, error=error) for _ in requests]

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            return [
                DamageCalcResult(ok=False, error=f"Invalid JSON from calc: {exc}")
                for _ in requests
            ]

        results: List[DamageCalcResult] = []
        for entry in data.get("results", []):
            if entry.get("ok"):
                results.append(DamageCalcResult(ok=True, result=entry.get("result")))
            else:
                results.append(
                    DamageCalcResult(ok=False, error=entry.get("error", "Unknown error"))
                )
        return results
