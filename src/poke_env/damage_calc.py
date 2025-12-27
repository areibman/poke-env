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


@dataclass
class SpeedCompareResult:
    """Result of a speed comparison between two Pokemon."""
    ok: bool
    pokemon1_name: str = ""
    pokemon1_base_spe: int = 0
    pokemon1_effective_spe: int = 0
    pokemon2_name: str = ""
    pokemon2_base_spe: int = 0
    pokemon2_effective_spe: int = 0
    verdict: str = ""  # "POKEMON1_FASTER", "POKEMON2_FASTER", "SPEED_TIE"
    error: Optional[str] = None


class DamageCalculator:
    """Thin wrapper around @smogon/calc for damage ranges and speed comparisons."""

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

    def _run_calc(self, requests: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Run the calculator with the given requests."""
        if not os.path.exists(self.script_path):
            return [{"ok": False, "error": "Damage calc script not found"} for _ in requests]

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
            return [{"ok": False, "error": f"Node not found: {exc}"} for _ in requests]

        if result.returncode != 0:
            error = result.stderr.strip() or "Damage calc failed"
            return [{"ok": False, "error": error} for _ in requests]

        try:
            data = json.loads(result.stdout)
        except json.JSONDecodeError as exc:
            return [{"ok": False, "error": f"Invalid JSON from calc: {exc}"} for _ in requests]

        return data.get("results", [])

    def calculate_batch(self, requests: List[Dict[str, Any]]) -> List[DamageCalcResult]:
        """Calculate damage for a batch of requests."""
        raw_results = self._run_calc(requests)
        
        results: List[DamageCalcResult] = []
        for entry in raw_results:
            if entry.get("ok"):
                results.append(DamageCalcResult(ok=True, result=entry.get("result")))
            else:
                results.append(
                    DamageCalcResult(ok=False, error=entry.get("error", "Unknown error"))
                )
        return results

    def compare_speed(
        self,
        pokemon1_name: str,
        pokemon2_name: str,
        pokemon1_boosts: Optional[Dict[str, int]] = None,
        pokemon2_boosts: Optional[Dict[str, int]] = None,
        pokemon1_item: Optional[str] = None,
        pokemon2_item: Optional[str] = None,
        pokemon1_ability: Optional[str] = None,
        pokemon2_ability: Optional[str] = None,
        pokemon1_actual_stats: bool = False,
        pokemon2_actual_stats: bool = False,
    ) -> SpeedCompareResult:
        """Compare speed between two Pokemon.
        
        By default, assumes max speed investment for both Pokemon (worst case scenario).
        Use actual_stats=True if you have the exact stats.
        
        Args:
            pokemon1_name: Name of first Pokemon (your Pokemon)
            pokemon2_name: Name of second Pokemon (opponent)
            pokemon1_boosts: Speed boosts for first Pokemon {"spe": N}
            pokemon2_boosts: Speed boosts for second Pokemon {"spe": N}
            pokemon1_item: Item for first Pokemon (e.g., "Choice Scarf")
            pokemon2_item: Item for second Pokemon
            pokemon1_ability: Ability for first Pokemon
            pokemon2_ability: Ability for second Pokemon
            pokemon1_actual_stats: Use actual stats instead of max investment
            pokemon2_actual_stats: Use actual stats instead of max investment
            
        Returns:
            SpeedCompareResult with speed comparison details
        """
        request = {
            "type": "speed",
            "pokemon1": {
                "name": pokemon1_name,
                "boosts": pokemon1_boosts or {},
                "item": pokemon1_item,
                "ability": pokemon1_ability,
                "actualStats": pokemon1_actual_stats,
            },
            "pokemon2": {
                "name": pokemon2_name,
                "boosts": pokemon2_boosts or {},
                "item": pokemon2_item,
                "ability": pokemon2_ability,
                "actualStats": pokemon2_actual_stats,
            },
        }
        
        raw_results = self._run_calc([request])
        
        if not raw_results or not raw_results[0].get("ok"):
            error = raw_results[0].get("error", "Speed calc failed") if raw_results else "No result"
            return SpeedCompareResult(ok=False, error=error)
        
        result = raw_results[0].get("result", {})
        p1 = result.get("pokemon1", {})
        p2 = result.get("pokemon2", {})
        
        return SpeedCompareResult(
            ok=True,
            pokemon1_name=p1.get("name", pokemon1_name),
            pokemon1_base_spe=p1.get("baseSpe", 0),
            pokemon1_effective_spe=p1.get("effectiveSpe", 0),
            pokemon2_name=p2.get("name", pokemon2_name),
            pokemon2_base_spe=p2.get("baseSpe", 0),
            pokemon2_effective_spe=p2.get("effectiveSpe", 0),
            verdict=result.get("verdict", "UNKNOWN"),
        )

    def get_pokemon_stats(
        self,
        pokemon_name: str,
        max_speed: bool = True,
        boosts: Optional[Dict[str, int]] = None,
        item: Optional[str] = None,
        ability: Optional[str] = None,
        nature: Optional[str] = None,
        evs: Optional[Dict[str, int]] = None,
        ivs: Optional[Dict[str, int]] = None,
    ) -> DamageCalcResult:
        """Get calculated stats for a Pokemon.
        
        Args:
            pokemon_name: Name of the Pokemon
            max_speed: Assume max speed investment (default True)
            boosts: Stat boosts {"atk": N, "spe": N, etc.}
            item: Item name
            ability: Ability name
            nature: Nature name (ignored if max_speed=True)
            evs: EV spread (ignored if max_speed=True)
            ivs: IV spread
            
        Returns:
            DamageCalcResult with stats in the result dict
        """
        request = {
            "type": "stats",
            "maxSpeed": max_speed,
            "pokemon": {
                "name": pokemon_name,
                "boosts": boosts or {},
                "item": item,
                "ability": ability,
                "nature": nature,
                "evs": evs,
                "ivs": ivs,
            },
        }
        
        raw_results = self._run_calc([request])
        
        if not raw_results:
            return DamageCalcResult(ok=False, error="No result from calc")
        
        entry = raw_results[0]
        if entry.get("ok"):
            return DamageCalcResult(ok=True, result=entry.get("result"))
        else:
            return DamageCalcResult(ok=False, error=entry.get("error", "Unknown error"))
