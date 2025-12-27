# # `ContextPlayer` - Context-Stuffed LLM Agent
#
# This agent automatically gathers ALL relevant battle information upfront
# (damage calcs, type matchups, opponent roles, speed checks, etc.) and
# provides it in a single prompt for the LLM to make an informed decision.
#
# Unlike the ToolUsingPlayer which lets the LLM decide what to look up,
# this agent pre-computes everything so the LLM can reason directly.
#

from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

from litellm import completion

from poke_env import RandomPlayer
from poke_env.data import GenData, RandbatsDex, to_id_str
from poke_env.damage_calc import DamageCalculator
from poke_env.environment.battle import AbstractBattle, Battle
from poke_env.environment.move import Move
from poke_env.environment.pokemon import Pokemon
from poke_env.environment.pokemon_type import PokemonType
from poke_env.environment.status import Status
from poke_env.player import Player

try:
    from battle_logger import BattleLogger
except ImportError:
    BattleLogger = None

# ANSI escape codes for colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"

# Load static data
RAND_BATS = RandbatsDex.load_gen9()
DAMAGE_CALC = DamageCalculator(gen=9)
GEN_DATA = GenData.from_gen(9)

MODEL_DEFAULT = "gemini/gemini-3-flash-preview"
LLM_TIMEOUT_S = 60


# =============================================================================
# Helper Functions
# =============================================================================

def _pokemon_type_to_calc(value: Optional[PokemonType]) -> Optional[str]:
    if not value:
        return None
    return value.name.title()


def _status_to_calc(status: Optional[Status]) -> Optional[str]:
    if not status:
        return None
    return status.name.lower()


def _clean_boosts(boosts: Dict[str, int]) -> Dict[str, int]:
    return {k: v for k, v in boosts.items() if k in {"atk", "def", "spa", "spd", "spe"}}


def _resolve_species_name(species: str) -> str:
    data = RAND_BATS.get_species(species)
    return data.name if data else species


def _extract_known_moves(mon: Pokemon) -> List[str]:
    return [move.id for move in mon.moves.values() if move]


def _find_role_for_moves(species: str, moves: Iterable[str]):
    roles = RAND_BATS.filter_roles_by_moves(species, moves)
    return roles[0] if roles else None


def _get_randbats_level(species: str) -> int:
    data = RAND_BATS.get_species(species)
    return data.level if data else 100


def _build_calc_pokemon(
    mon: Pokemon,
    *,
    fallback_role: Optional[Dict[str, Any]] = None,
    fallback_level: Optional[int] = None,
) -> Dict[str, Any]:
    role_data = fallback_role or {}
    return {
        "name": _resolve_species_name(mon.species),
        "level": mon.level or fallback_level or _get_randbats_level(mon.species),
        "ability": mon.ability or (role_data.get("abilities") or [None])[0],
        "item": mon.item or (role_data.get("items") or [None])[0],
        "nature": role_data.get("nature"),
        "evs": role_data.get("evs"),
        "ivs": role_data.get("ivs"),
        "boosts": _clean_boosts(mon.boosts),
        "status": _status_to_calc(mon.status),
        "teraType": _pokemon_type_to_calc(mon.tera_type),
        "curHP": mon.current_hp,
        "originalCurHP": mon.max_hp,
    }


def _get_type_effectiveness(attacking_type: str, defending_types: List[str]) -> float:
    """Calculate type effectiveness multiplier."""
    type_chart = GEN_DATA.type_chart
    attacking_upper = attacking_type.strip().upper()
    
    multiplier = 1.0
    for def_type in defending_types:
        if not def_type:
            continue
        def_upper = def_type.strip().upper()
        if def_upper in type_chart and attacking_upper in type_chart[def_upper]:
            multiplier *= type_chart[def_upper][attacking_upper]
    
    return multiplier


def _effectiveness_text(mult: float) -> str:
    if mult == 0:
        return "IMMUNE"
    elif mult >= 4:
        return "4x SUPER EFFECTIVE"
    elif mult >= 2:
        return "2x super effective"
    elif mult <= 0.25:
        return "4x resisted"
    elif mult <= 0.5:
        return "2x resisted"
    return "neutral"


# =============================================================================
# Context Building - Offensive Analysis
# =============================================================================

def _calculate_offensive_damage(
    battle: AbstractBattle,
    opponent_roles: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Calculate damage for all available moves against the opponent."""
    if not battle.available_moves:
        return []
    
    attacker = battle.active_pokemon
    defender = battle.opponent_active_pokemon
    
    # Get attacker's role data for accurate calcs
    attacker_role = _find_role_for_moves(attacker.species, _extract_known_moves(attacker))
    attacker_role_data = None
    if attacker_role:
        attacker_role_data = {
            "abilities": attacker_role.abilities,
            "items": attacker_role.items,
            "evs": attacker_role.evs,
            "ivs": attacker_role.ivs,
        }
    
    results = []
    
    for move in battle.available_moves:
        move_name = move.entry.get("name", move.id)
        move_type = move.type.name if move.type else "???"
        defender_types = [t.name for t in defender.types if t]
        effectiveness = _get_type_effectiveness(move_type, defender_types)
        
        # Calculate against each possible opponent role
        role_calcs = []
        for role in opponent_roles[:2]:  # Top 2 likely roles
            request = {
                "attacker": _build_calc_pokemon(attacker, fallback_role=attacker_role_data),
                "defender": _build_calc_pokemon(
                    defender,
                    fallback_role=role,
                    fallback_level=_get_randbats_level(defender.species),
                ),
                "move": {"name": move_name},
            }
            
            calc_results = DAMAGE_CALC.calculate_batch([request])
            if calc_results and calc_results[0].ok:
                data = calc_results[0].result or {}
                role_calcs.append({
                    "vs_role": role.get("role", "Unknown"),
                    "damage": data.get("desc", "???"),
                    "ko_chance": (data.get("ko") or {}).get("text", ""),
                })
        
        results.append({
            "move_id": move.id,
            "move_name": move_name,
            "type": move_type,
            "base_power": move.base_power,
            "accuracy": move.accuracy,
            "priority": move.priority,
            "category": move.category.name if move.category else "???",
            "pp": f"{move.current_pp}/{move.max_pp}",
            "effectiveness": _effectiveness_text(effectiveness),
            "effectiveness_mult": effectiveness,
            "damage_calcs": role_calcs,
        })
    
    return results


# =============================================================================
# Context Building - Defensive Analysis
# =============================================================================

def _calculate_defensive_damage(
    battle: AbstractBattle,
    opponent_roles: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Calculate damage from opponent's likely moves against us."""
    attacker = battle.opponent_active_pokemon
    defender = battle.active_pokemon
    
    if not opponent_roles:
        return []
    
    # Get defender's role data
    defender_role = _find_role_for_moves(defender.species, _extract_known_moves(defender))
    defender_role_data = None
    if defender_role:
        defender_role_data = {
            "abilities": defender_role.abilities,
            "items": defender_role.items,
            "evs": defender_role.evs,
            "ivs": defender_role.ivs,
        }
    
    results = []
    seen_moves = set()
    
    # Check damage from moves in each role
    for role in opponent_roles[:2]:
        role_moves = role.get("moves", [])
        role_name = role.get("role", "Unknown")
        
        for move_id in role_moves[:4]:  # Top 4 moves per role
            if move_id in seen_moves:
                continue
            seen_moves.add(move_id)
            
            # Get move info
            move_data = GEN_DATA.moves.get(to_id_str(move_id), {})
            if not move_data:
                continue
            
            move_name = move_data.get("name", move_id)
            move_type = move_data.get("type", "???")
            base_power = move_data.get("basePower", 0)
            
            if base_power == 0:  # Skip status moves
                continue
            
            defender_types = [t.name for t in defender.types if t]
            effectiveness = _get_type_effectiveness(move_type, defender_types)
            
            # Calculate damage
            request = {
                "attacker": _build_calc_pokemon(
                    attacker,
                    fallback_role=role,
                    fallback_level=_get_randbats_level(attacker.species),
                ),
                "defender": _build_calc_pokemon(defender, fallback_role=defender_role_data),
                "move": {"name": move_name},
            }
            
            calc_results = DAMAGE_CALC.calculate_batch([request])
            damage_desc = "???"
            ko_chance = ""
            if calc_results and calc_results[0].ok:
                data = calc_results[0].result or {}
                damage_desc = data.get("desc", "???")
                ko_chance = (data.get("ko") or {}).get("text", "")
            
            results.append({
                "move_name": move_name,
                "type": move_type,
                "base_power": base_power,
                "from_role": role_name,
                "effectiveness": _effectiveness_text(effectiveness),
                "damage": damage_desc,
                "ko_chance": ko_chance,
            })
    
    # Sort by danger (effectiveness * base power)
    results.sort(key=lambda x: x.get("base_power", 0) * (2 if "super" in x.get("effectiveness", "").lower() else 1), reverse=True)
    
    return results[:6]  # Top 6 threats


# =============================================================================
# Context Building - Speed Analysis
# =============================================================================

def _analyze_speed(battle: AbstractBattle, opponent_roles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Analyze speed matchup using @smogon/calc.
    
    Uses the official damage calculator for accurate speed stat calculation.
    Assumes max speed investment for both Pokemon (worst case scenario).
    """
    player = battle.active_pokemon
    opponent = battle.opponent_active_pokemon
    
    player_spe_boost = player.boosts.get("spe", 0)
    opponent_spe_boost = opponent.boosts.get("spe", 0)
    
    # Use the official calculator for speed comparison
    speed_result = DAMAGE_CALC.compare_speed(
        pokemon1_name=player.species,
        pokemon2_name=opponent.species,
        pokemon1_boosts={"spe": player_spe_boost} if player_spe_boost else None,
        pokemon2_boosts={"spe": opponent_spe_boost} if opponent_spe_boost else None,
        pokemon1_item=player.item if player.item else None,
        pokemon2_item=None,  # Unknown opponent item
        pokemon1_ability=player.ability if player.ability else None,
        pokemon2_ability=opponent.ability if opponent.ability else None,
    )
    
    if speed_result.ok:
        if speed_result.verdict == "POKEMON1_FASTER":
            speed_verdict = "YOU ARE FASTER"
        elif speed_result.verdict == "POKEMON2_FASTER":
            speed_verdict = "OPPONENT IS FASTER"
        else:
            speed_verdict = "SPEED TIE"
        
        player_boost_str = f"+{player_spe_boost}" if player_spe_boost > 0 else str(player_spe_boost)
        opp_boost_str = f"+{opponent_spe_boost}" if opponent_spe_boost > 0 else str(opponent_spe_boost)
        
        return {
            "your_pokemon": player.species,
            "your_base_speed": speed_result.pokemon1_base_spe,
            "your_effective_speed": speed_result.pokemon1_effective_spe,
            "your_speed_boost": player_boost_str,
            "opponent_pokemon": opponent.species,
            "opponent_base_speed": speed_result.pokemon2_base_spe,
            "opponent_effective_speed": speed_result.pokemon2_effective_spe,
            "opponent_speed_boost": opp_boost_str,
            "verdict": speed_verdict,
        }
    else:
        # Fallback to base speed comparison if calc fails
        player_base_spe = player.base_stats.get("spe", 0)
        opponent_base_spe = opponent.base_stats.get("spe", 0)
        
        if player_base_spe > opponent_base_spe:
            speed_verdict = "YOU ARE LIKELY FASTER"
        elif opponent_base_spe > player_base_spe:
            speed_verdict = "OPPONENT IS LIKELY FASTER"
        else:
            speed_verdict = "SPEED TIE"
        
        player_boost_str = f"+{player_spe_boost}" if player_spe_boost > 0 else str(player_spe_boost)
        opp_boost_str = f"+{opponent_spe_boost}" if opponent_spe_boost > 0 else str(opponent_spe_boost)
        
        return {
            "your_pokemon": player.species,
            "your_base_speed": player_base_spe,
            "your_effective_speed": 0,  # Unknown
            "your_speed_boost": player_boost_str,
            "opponent_pokemon": opponent.species,
            "opponent_base_speed": opponent_base_spe,
            "opponent_effective_speed": 0,  # Unknown
            "opponent_speed_boost": opp_boost_str,
            "verdict": speed_verdict,
        }


# =============================================================================
# Context Building - Switch Analysis
# =============================================================================

def _analyze_switches(
    battle: AbstractBattle,
    opponent_roles: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Analyze how each switch option matches up."""
    results = []
    opponent = battle.opponent_active_pokemon
    opponent_types = [t.name for t in opponent.types if t]
    
    # Get opponent's likely STAB types
    opponent_stab_types = opponent_types.copy()
    
    for i, pokemon in enumerate(battle.available_switches):
        pokemon_types = [t.name for t in pokemon.types if t]
        
        # Check type matchup vs opponent's STAB
        worst_incoming = 1.0
        for stab_type in opponent_stab_types:
            mult = _get_type_effectiveness(stab_type, pokemon_types)
            worst_incoming = max(worst_incoming, mult)
        
        # Check our STAB vs opponent
        best_outgoing = 0.0
        for our_type in pokemon_types:
            mult = _get_type_effectiveness(our_type, opponent_types)
            best_outgoing = max(best_outgoing, mult)
        
        # Rate the switch
        if worst_incoming <= 0.5 and best_outgoing >= 2:
            matchup = "EXCELLENT - resists their STAB, hits them super effectively"
        elif worst_incoming <= 0.5:
            matchup = "GOOD DEFENSIVE - resists their STAB"
        elif best_outgoing >= 2:
            matchup = "GOOD OFFENSIVE - hits them super effectively"
        elif worst_incoming >= 2:
            matchup = "RISKY - weak to their STAB"
        else:
            matchup = "NEUTRAL"
        
        results.append({
            "action_id": f"switch-{i}",
            "pokemon": pokemon.species,
            "types": pokemon_types,
            "hp_percent": f"{pokemon.current_hp_fraction * 100:.1f}%",
            "status": pokemon.status.name if pokemon.status else None,
            "matchup_vs_opponent": matchup,
            "incoming_effectiveness": _effectiveness_text(worst_incoming),
            "outgoing_effectiveness": _effectiveness_text(best_outgoing),
        })
    
    return results


# =============================================================================
# Context Building - Opponent Roles
# =============================================================================

def _format_opponent_roles(battle: AbstractBattle) -> List[Dict[str, Any]]:
    """Get opponent's possible roles from randbats data."""
    opponent = battle.opponent_active_pokemon
    if not opponent:
        return []
    
    known_moves = _extract_known_moves(opponent)
    return RAND_BATS.summarize_roles(opponent.species, known_moves)


# =============================================================================
# Main Context Builder
# =============================================================================

def build_battle_context(battle: AbstractBattle) -> Dict[str, Any]:
    """Build comprehensive battle context with all pre-computed analysis."""
    
    opponent_roles = _format_opponent_roles(battle)
    
    # Core battle state
    context = {
        "turn": battle.turn,
        "field_conditions": {
            "weather": battle.weather.name if battle.weather else None,
            "terrain": [f.name for f in battle.fields] if battle.fields else [],
            "your_side": [sc.name for sc in battle.side_conditions],
            "opponent_side": [sc.name for sc in battle.opponent_side_conditions],
        },
        "trapped": battle.trapped,
        "can_terastallize": battle.can_tera is not None,
    }
    
    # Your active Pokemon
    player = battle.active_pokemon
    context["your_pokemon"] = {
        "species": player.species,
        "types": [t.name for t in player.types if t],
        "hp": f"{player.current_hp}/{player.max_hp} ({player.current_hp_fraction * 100:.1f}%)",
        "status": player.status.name if player.status else None,
        "ability": player.ability,
        "item": player.item,
        "boosts": {k: v for k, v in player.boosts.items() if v != 0},
    }
    
    # Opponent Pokemon
    opponent = battle.opponent_active_pokemon
    context["opponent_pokemon"] = {
        "species": opponent.species,
        "types": [t.name for t in opponent.types if t],
        "hp_percent": f"{opponent.current_hp_fraction * 100:.1f}%",
        "status": opponent.status.name if opponent.status else None,
        "known_ability": opponent.ability,
        "known_item": opponent.item,
        "revealed_moves": [m.id for m in opponent.moves.values()],
        "boosts": {k: v for k, v in opponent.boosts.items() if v != 0},
    }
    
    # Opponent's possible roles (what they might have)
    context["opponent_possible_roles"] = [
        {
            "role": role.get("role"),
            "likely_moves": role.get("moves", [])[:6],
            "likely_abilities": role.get("abilities", []),
            "likely_items": role.get("items", [])[:3],
            "tera_types": role.get("tera_types", [])[:3],
        }
        for role in opponent_roles[:3]
    ]
    
    # Speed analysis
    context["speed_analysis"] = _analyze_speed(battle, opponent_roles)
    
    # Offensive analysis (your moves)
    context["your_moves_analysis"] = _calculate_offensive_damage(battle, opponent_roles)
    
    # Defensive analysis (what they can do to you)
    context["threats_to_you"] = _calculate_defensive_damage(battle, opponent_roles)
    
    # Switch analysis
    context["switch_options"] = _analyze_switches(battle, opponent_roles)
    
    # Team overview
    context["your_team_remaining"] = [
        {
            "species": mon.species,
            "hp_percent": f"{mon.current_hp_fraction * 100:.1f}%",
            "fainted": mon.fainted,
        }
        for mon in battle.team.values()
        if not mon.active
    ]
    
    context["opponent_team_revealed"] = [
        {
            "species": mon.species,
            "hp_percent": f"{mon.current_hp_fraction * 100:.1f}%",
            "fainted": mon.fainted,
        }
        for mon in battle.opponent_team.values()
        if not mon.active
    ]
    
    return context


# =============================================================================
# Prompt Generation
# =============================================================================

SYSTEM_PROMPT = """You are an expert Pokemon battle AI playing Gen 9 Random Battles.

You will receive comprehensive battle analysis including:
- Damage calculations for YOUR moves against the opponent
- Damage calculations for OPPONENT'S likely moves against you
- Speed comparison (who moves first)
- Switch options with type matchup analysis
- Opponent's possible movesets/roles from the randbats database

DECISION FRAMEWORK:
1. CAN I KO? Check your move analysis - is there a move that KOs or threatens KO?
2. CAN THEY KO ME? Check threats analysis - can they KO you this turn?
3. SPEED CHECK - If you're faster, you can attack first. If slower, you might get hit first.
4. SWITCH EVALUATION - Is there a better matchup on your bench?

KEY PRINCIPLES:
- If you can KO and are faster: ATTACK
- If they can KO you and are faster: SWITCH (if good option) or sacrifice (if no good switch)
- If you're slower but can survive + threaten KO next turn: ATTACK
- Priority moves ignore speed - check move priority
- Immunities are huge (Ground immune via Levitate, etc.)

Respond with JSON: {"action": "<move_id or switch-N>", "reasoning": "<brief explanation>"}
The action MUST be one of the available options listed."""


def create_context_prompt(context: Dict[str, Any]) -> str:
    """Format the context as a readable prompt."""
    lines = []
    
    lines.append(f"=== TURN {context['turn']} ===\n")
    
    # Field conditions
    field = context["field_conditions"]
    if any([field["weather"], field["terrain"], field["your_side"], field["opponent_side"]]):
        lines.append("FIELD CONDITIONS:")
        if field["weather"]:
            lines.append(f"  Weather: {field['weather']}")
        if field["terrain"]:
            lines.append(f"  Terrain: {', '.join(field['terrain'])}")
        if field["your_side"]:
            lines.append(f"  Your side: {', '.join(field['your_side'])}")
        if field["opponent_side"]:
            lines.append(f"  Opponent side: {', '.join(field['opponent_side'])}")
        lines.append("")
    
    # Speed analysis (using @smogon/calc for accurate stats)
    speed = context["speed_analysis"]
    your_eff = speed.get('your_effective_speed', 0)
    opp_eff = speed.get('opponent_effective_speed', 0)
    lines.append(f"⚡ SPEED: {speed['verdict']}")
    lines.append(f"   You: {speed['your_pokemon']} (base:{speed['your_base_speed']}, eff:{your_eff}, boost:{speed['your_speed_boost']})")
    lines.append(f"   Opp: {speed['opponent_pokemon']} (base:{speed['opponent_base_speed']}, eff:{opp_eff}, boost:{speed['opponent_speed_boost']})")
    lines.append("")
    
    # Your Pokemon
    you = context["your_pokemon"]
    lines.append(f"YOUR POKEMON: {you['species']} ({'/'.join(you['types'])})")
    lines.append(f"  HP: {you['hp']}")
    if you["status"]:
        lines.append(f"  Status: {you['status']}")
    if you["ability"]:
        lines.append(f"  Ability: {you['ability']}")
    if you["boosts"]:
        lines.append(f"  Boosts: {you['boosts']}")
    lines.append("")
    
    # Opponent Pokemon
    opp = context["opponent_pokemon"]
    lines.append(f"OPPONENT: {opp['species']} ({'/'.join(opp['types'])})")
    lines.append(f"  HP: {opp['hp_percent']}")
    if opp["status"]:
        lines.append(f"  Status: {opp['status']}")
    if opp["known_ability"]:
        lines.append(f"  Known ability: {opp['known_ability']}")
    if opp["revealed_moves"]:
        lines.append(f"  Revealed moves: {', '.join(opp['revealed_moves'])}")
    if opp["boosts"]:
        lines.append(f"  Boosts: {opp['boosts']}")
    lines.append("")
    
    # Opponent possible roles
    if context["opponent_possible_roles"]:
        lines.append("OPPONENT LIKELY SETS:")
        for role in context["opponent_possible_roles"]:
            lines.append(f"  [{role['role']}]")
            lines.append(f"    Moves: {', '.join(role['likely_moves'])}")
            if role["likely_abilities"]:
                lines.append(f"    Abilities: {', '.join(role['likely_abilities'])}")
        lines.append("")
    
    # Your moves analysis
    lines.append("═══ YOUR AVAILABLE MOVES ═══")
    for move in context["your_moves_analysis"]:
        lines.append(f"\n→ {move['move_id']} ({move['type']}, {move['category']}, BP:{move['base_power']}, Acc:{move['accuracy']}, Pri:{move['priority']})")
        lines.append(f"  Type effectiveness: {move['effectiveness']}")
        for calc in move["damage_calcs"]:
            ko_info = f" | {calc['ko_chance']}" if calc["ko_chance"] else ""
            lines.append(f"  vs {calc['vs_role']}: {calc['damage']}{ko_info}")
    lines.append("")
    
    # Threats to you
    if context["threats_to_you"]:
        lines.append("═══ THREATS TO YOU (opponent's likely moves) ═══")
        for threat in context["threats_to_you"]:
            ko_info = f" | {threat['ko_chance']}" if threat["ko_chance"] else ""
            lines.append(f"  {threat['move_name']} ({threat['type']}, BP:{threat['base_power']}): {threat['damage']}{ko_info}")
        lines.append("")
    
    # Switch options
    if context["switch_options"]:
        lines.append("═══ SWITCH OPTIONS ═══")
        for switch in context["switch_options"]:
            status_info = f" [{switch['status']}]" if switch["status"] else ""
            lines.append(f"\n→ {switch['action_id']}: {switch['pokemon']} ({'/'.join(switch['types'])}) - {switch['hp_percent']}{status_info}")
            lines.append(f"  Matchup: {switch['matchup_vs_opponent']}")
        lines.append("")
    
    # Available actions summary
    move_ids = [m["move_id"] for m in context["your_moves_analysis"]]
    switch_ids = [s["action_id"] for s in context["switch_options"]]
    all_actions = move_ids + switch_ids
    
    lines.append(f"AVAILABLE ACTIONS: {all_actions}")
    
    if context.get("can_terastallize"):
        lines.append("(You can also Terastallize this turn)")
    
    return "\n".join(lines)


# =============================================================================
# Trace / Replay Injection
# =============================================================================

@dataclass
class TurnTrace:
    """Reasoning trace for a single turn."""
    turn: int
    pokemon_matchup: str
    prompt_summary: str = ""  # Condensed version of what the agent saw
    reasoning: str = ""       # Agent's reasoning
    final_action: str = ""    # The chosen action
    raw_response: str = ""    # Full LLM response
    reasoning_time_ms: int = 0  # Time taken for full reasoning in milliseconds


def _create_prompt_summary(context: Dict[str, Any]) -> str:
    """Create a detailed multi-line summary showing all precomputed information."""
    sections = []
    
    # === MATCHUP HEADER ===
    you = context.get("your_pokemon", {})
    opp = context.get("opponent_pokemon", {})
    you_types = "/".join(you.get("types", []))
    opp_types = "/".join(opp.get("types", []))
    sections.append(f"⚔️ MATCHUP: {you.get('species', '?')} ({you_types}, {you.get('hp', '?')}) vs {opp.get('species', '?')} ({opp_types}, {opp.get('hp_percent', '?')})")
    
    # === SPEED ANALYSIS ===
    speed = context.get("speed_analysis", {})
    if speed:
        your_eff = speed.get('your_effective_speed', 0)
        opp_eff = speed.get('opponent_effective_speed', 0)
        your_eff_str = f", eff:{your_eff}" if your_eff else ""
        opp_eff_str = f", eff:{opp_eff}" if opp_eff else ""
        sections.append(
            f"⚡ SPEED: {speed.get('verdict', '?')} | "
            f"You: {speed.get('your_pokemon', '?')} (base:{speed.get('your_base_speed', '?')}{your_eff_str}, boost:{speed.get('your_speed_boost', '0')}) | "
            f"Opp: {speed.get('opponent_pokemon', '?')} (base:{speed.get('opponent_base_speed', '?')}{opp_eff_str}, boost:{speed.get('opponent_speed_boost', '0')})"
        )
    
    # === YOUR MOVES + DAMAGE CALCS ===
    moves = context.get("your_moves_analysis", [])
    if moves:
        move_section = ["🎯 YOUR MOVES:"]
        for move in moves:
            priority_str = f", Pri:{move.get('priority', 0)}" if move.get('priority', 0) != 0 else ""
            move_section.append(f"  → {move.get('move_id', '?')} ({move.get('type', '?')}, {move.get('category', '?')}, BP:{move.get('base_power', 0)}, Acc:{move.get('accuracy', '?')}{priority_str})")
            move_section.append(f"    Effectiveness: {move.get('effectiveness', '?')}")
            for calc in move.get("damage_calcs", []):
                ko_info = f" | {calc.get('ko_chance', '')}" if calc.get('ko_chance') else ""
                move_section.append(f"    vs {calc.get('vs_role', '?')}: {calc.get('damage', '?')}{ko_info}")
        sections.append("\n".join(move_section))
    
    # === THREATS TO YOU ===
    threats = context.get("threats_to_you", [])
    if threats:
        threat_section = ["⚠️ THREATS TO YOU:"]
        for threat in threats:
            ko_info = f" | {threat.get('ko_chance', '')}" if threat.get('ko_chance') else ""
            threat_section.append(f"  {threat.get('move_name', '?')} ({threat.get('type', '?')}, BP:{threat.get('base_power', 0)}): {threat.get('damage', '?')}{ko_info}")
        sections.append("\n".join(threat_section))
    
    # === OPPONENT ROLES ===
    opponent_roles = context.get("opponent_possible_roles", [])
    if opponent_roles:
        role_section = [f"🔍 OPPONENT LIKELY SETS ({opp.get('species', '?')}):"]
        for role in opponent_roles:
            role_section.append(f"  [{role.get('role', '?')}]")
            if role.get("likely_moves"):
                role_section.append(f"    Moves: {', '.join(role.get('likely_moves', []))}")
            if role.get("likely_abilities"):
                role_section.append(f"    Abilities: {', '.join(role.get('likely_abilities', []))}")
            if role.get("likely_items"):
                role_section.append(f"    Items: {', '.join(role.get('likely_items', []))}")
            if role.get("tera_types"):
                role_section.append(f"    Tera: {', '.join(role.get('tera_types', []))}")
        sections.append("\n".join(role_section))
    
    # === SWITCH OPTIONS ===
    switches = context.get("switch_options", [])
    if switches:
        switch_section = ["🔄 SWITCH OPTIONS:"]
        for switch in switches:
            types_str = "/".join(switch.get("types", []))
            status_str = f" [{switch.get('status')}]" if switch.get("status") else ""
            switch_section.append(f"  {switch.get('action_id', '?')}: {switch.get('pokemon', '?')} ({types_str}) - {switch.get('hp_percent', '?')}{status_str}")
            switch_section.append(f"    Matchup: {switch.get('matchup_vs_opponent', '?')}")
        sections.append("\n".join(switch_section))
    
    # === FIELD CONDITIONS ===
    field = context.get("field_conditions", {})
    field_info = []
    if field.get("weather"):
        field_info.append(f"Weather: {field['weather']}")
    if field.get("terrain"):
        field_info.append(f"Terrain: {field['terrain']}")
    if field.get("your_side"):
        field_info.append(f"Your side: {field['your_side']}")
    if field.get("opponent_side"):
        field_info.append(f"Opp side: {field['opponent_side']}")
    if field_info:
        sections.append("🌍 FIELD: " + " | ".join(field_info))
    
    return "\n\n".join(sections)


def _format_trace_as_chat(trace: TurnTrace, username: str) -> List[str]:
    """Format a turn trace as Pokemon Showdown chat protocol lines.
    
    Includes: prompt summary, reasoning, and final action with timing.
    """
    lines = []
    
    # Prompt summary - each line gets its own chat message for readability
    if trace.prompt_summary:
        # Split by double newlines (sections) and single newlines (within sections)
        for section in trace.prompt_summary.split("\n\n"):
            for line in section.split("\n"):
                if line.strip():
                    lines.append(f"|c|☆{username}|{line.strip()}")
    
    # Reasoning
    if trace.reasoning:
        # Truncate very long reasoning for readability
        reasoning = trace.reasoning
        if len(reasoning) > 500:
            reasoning = reasoning[:497] + "..."
        lines.append(f"|c|☆{username}|💭 {reasoning}")
    
    # Final action with timing
    time_str = ""
    if trace.reasoning_time_ms > 0:
        if trace.reasoning_time_ms >= 1000:
            time_str = f" ({trace.reasoning_time_ms / 1000:.1f}s)"
        else:
            time_str = f" ({trace.reasoning_time_ms}ms)"
    lines.append(f"|c|☆{username}|✓ ACTION: {trace.final_action}{time_str}")
    
    return lines


def inject_traces_into_replay(
    replay_path: str, traces: List[TurnTrace], username: str
) -> None:
    if not os.path.exists(replay_path):
        return
    
    with open(replay_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    trace_by_turn = {trace.turn: trace for trace in traces}
    
    lines = content.split('\n')
    new_lines = []
    
    for line in lines:
        new_lines.append(line)
        stripped = line.strip()
        if stripped.startswith('|turn|'):
            try:
                turn_num = int(stripped.split('|')[2])
                if turn_num in trace_by_turn:
                    chat_lines = _format_trace_as_chat(trace_by_turn[turn_num], username)
                    new_lines.extend(chat_lines)
            except (IndexError, ValueError):
                pass
    
    with open(replay_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))


# =============================================================================
# Response Parsing
# =============================================================================

def _extract_response_text(response: Any) -> str:
    if isinstance(response, dict):
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            pass
    if hasattr(response, 'choices') and response.choices:
        try:
            content = response.choices[0].message.content
            if content:
                return content
        except (AttributeError, IndexError):
            pass
    return str(response)


def _parse_action(text: str, allowed: List[str]) -> Tuple[Optional[str], str]:
    """Parse action and reasoning from response."""
    reasoning = ""
    action = None
    
    # Try JSON parse
    try:
        # Handle markdown code blocks
        json_str = text.strip()
        if "```json" in json_str:
            start = json_str.find("```json") + 7
            end = json_str.find("```", start)
            if end > start:
                json_str = json_str[start:end].strip()
        elif "```" in json_str:
            start = json_str.find("```") + 3
            end = json_str.find("```", start)
            if end > start:
                json_str = json_str[start:end].strip()
        
        payload = json.loads(json_str)
        action = payload.get("action")
        reasoning = payload.get("reasoning", "")
        if action not in allowed:
            action = None
    except (json.JSONDecodeError, AttributeError):
        pass
    
    # Fallback: look for action in text
    if not action:
        cleaned = text.replace("`", " ").strip().lower()
        for act in allowed:
            if act in cleaned:
                action = act
                reasoning = text[:300] if len(text) > 300 else text
                break
    
    return action, reasoning


# =============================================================================
# The Context Player
# =============================================================================

class ContextPlayer(Player):
    """AI player that uses pre-computed context for single-call LLM decisions."""
    
    def __init__(
        self,
        model: str = MODEL_DEFAULT,
        battle_logger: Optional[Any] = None,
        verbose: bool = True,
        **player_kwargs: Any,
    ):
        super().__init__(**player_kwargs)
        self.model = model
        self.battle_logger = battle_logger
        self.verbose = verbose
        self._battle_traces: Dict[str, List[TurnTrace]] = {}
    
    def _log(self, message: str, color: str = CYAN):
        if self.verbose:
            print(f"{color}{message}{RESET}", flush=True)
    
    def _battle_finished_callback(self, battle: AbstractBattle):
        super()._battle_finished_callback(battle)
        
        battle_tag = getattr(battle, "battle_tag", None)
        if battle_tag:
            traces = self._battle_traces.get(battle_tag, [])
            if traces:
                replay_folder = "replays"
                if hasattr(battle, "_save_replays") and isinstance(battle._save_replays, str):
                    replay_folder = battle._save_replays
                replay_path = os.path.join(replay_folder, f"{self.username} - {battle_tag}.html")
                inject_traces_into_replay(replay_path, traces, self.username)
                self._log(f"Injected {len(traces)} traces into replay", GREEN)
            
            if battle_tag in self._battle_traces:
                del self._battle_traces[battle_tag]
        
        if self.battle_logger and battle_tag:
            winner = self.username if battle.won else (battle.opponent_username if battle.lost else None)
            self.battle_logger.end_battle(
                battle_id=battle_tag,
                winner=winner,
                outcome_details={"final_turn": battle.turn},
            )
    
    async def choose_move(self, battle: AbstractBattle):
        """Choose a move using pre-computed context + single LLM call."""
        
        battle_tag = getattr(battle, "battle_tag", None)
        
        if battle_tag and battle_tag not in self._battle_traces:
            self._battle_traces[battle_tag] = []
        
        # Start logging on first turn
        if self.battle_logger and battle_tag and battle.turn == 1:
            opponent_username = getattr(battle, "opponent_username", "Unknown")
            self.battle_logger.start_battle(
                battle_id=battle_tag,
                player1_name=self.username,
                player1_model=self.model,
                player2_name=opponent_username or "Unknown",
                player2_model="human",
            )
        
        # If no actions available
        if not battle.available_moves and not battle.available_switches:
            self._log("No actions available, using random", YELLOW)
            return self.choose_random_move(battle)
        
        # Build comprehensive context
        self._log(f"\n{'='*60}")
        self._log(f"Turn {battle.turn}: {battle.active_pokemon.species} vs {battle.opponent_active_pokemon.species}")
        
        # Start timing
        reasoning_start = time.perf_counter()
        
        context = await asyncio.to_thread(build_battle_context, battle)
        user_message = create_context_prompt(context)
        
        # Get available actions
        move_ids = [m["move_id"] for m in context["your_moves_analysis"]]
        switch_ids = [s["action_id"] for s in context["switch_options"]]
        all_actions = move_ids + switch_ids
        
        # Single LLM call
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    completion,
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    timeout=LLM_TIMEOUT_S,
                ),
                timeout=LLM_TIMEOUT_S,
            )
        except Exception as e:
            self._log(f"LLM error: {e}", RED)
            fallback = battle.available_moves[0] if battle.available_moves else battle.available_switches[0]
            return self.create_order(fallback)
        
        # Calculate reasoning time
        reasoning_time_ms = int((time.perf_counter() - reasoning_start) * 1000)
        
        # Parse response
        response_text = _extract_response_text(response)
        action, reasoning = _parse_action(response_text, all_actions)
        
        if not action:
            self._log(f"Failed to parse action, using first available", YELLOW)
            action = all_actions[0] if all_actions else None
            reasoning = "Fallback - could not parse LLM response"
        
        self._log(f"  Decision: {action} ({reasoning_time_ms}ms)", GREEN)
        if reasoning:
            self._log(f"  Reasoning: {reasoning[:100]}...", CYAN)
        
        # Store trace with full context
        if battle_tag:
            matchup = f"{battle.active_pokemon.species} vs {battle.opponent_active_pokemon.species}"
            prompt_summary = _create_prompt_summary(context)
            self._battle_traces[battle_tag].append(TurnTrace(
                turn=battle.turn,
                pokemon_matchup=matchup,
                prompt_summary=prompt_summary,
                reasoning=reasoning,
                final_action=action,
                raw_response=response_text,
                reasoning_time_ms=reasoning_time_ms,
            ))
        
        # Log turn
        if self.battle_logger and battle_tag:
            self.battle_logger.log_turn(
                battle_id=battle_tag,
                player_name=self.username,
                turn_number=battle.turn,
                prompt=user_message,
                completion=response_text,
                chosen_move=action,
                battle_state=context,
            )
        
        # Convert action to order
        order = self._action_to_order(action, battle)
        return self.create_order(order)
    
    def _action_to_order(self, action: str, battle: AbstractBattle) -> Union[Move, Pokemon]:
        """Convert action string to Move or Pokemon."""
        for move in battle.available_moves:
            if move.id == action:
                return move
        
        if action.startswith("switch-"):
            try:
                idx = int(action.split("-")[1])
                if 0 <= idx < len(battle.available_switches):
                    return battle.available_switches[idx]
            except (ValueError, IndexError):
                pass
        
        # Fallback
        return battle.available_moves[0] if battle.available_moves else battle.available_switches[0]


# =============================================================================
# Main
# =============================================================================

async def main():
    """Test the context player."""
    import random
    from poke_env import AccountConfiguration, ShowdownServerConfiguration
    
    opponent = os.environ.get("PS_OPPONENT")
    accept_only = os.environ.get("PS_ACCEPT_CHALLENGE") in {"1", "true", "yes"}
    
    guest_name = os.environ.get("PS_USERNAME") or f"CtxAgent{random.randint(10000, 99999)}"
    
    battle_logger = BattleLogger() if BattleLogger else None
    player = ContextPlayer(
        model=MODEL_DEFAULT,
        battle_logger=battle_logger,
        battle_format="gen9randombattle",
        account_configuration=AccountConfiguration(guest_name, None),
        server_configuration=ShowdownServerConfiguration,
        save_replays=True,
        start_timer_on_battle_start=False,
    )
    
    if opponent:
        if accept_only:
            print(f"Waiting for challenge from {opponent} as {player.username}...", flush=True)
            await player.accept_challenges(opponent, n_challenges=1)
        else:
            print(f"Challenging {opponent} as {player.username}...", flush=True)
            await player.send_challenges(opponent, n_challenges=1)
    else:
        print(f"Searching ladder as {player.username}...", flush=True)
        await player.ladder(1)
    
    while player.n_finished_battles < 1:
        await asyncio.sleep(1)
    
    print(f"\nFinished: {player.n_won_battles}/{player.n_finished_battles} wins")
    print("Replays saved to ./replays")


if __name__ == "__main__":
    asyncio.run(main())

