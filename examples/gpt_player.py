# # `PokeAgent` Gemini reasoning agent
#
# This example uses LiteLLM with Gemini 3 Pro Preview.
#

from __future__ import annotations

import asyncio
import json
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional, Tuple, Union

from litellm import completion

from poke_env import RandomPlayer
from poke_env.data import RandbatsDex, to_id_str
from poke_env.damage_calc import DamageCalculator
from poke_env.environment.battle import AbstractBattle, Battle
from poke_env.environment.move import Move
from poke_env.environment.pokemon import Pokemon
from poke_env.environment.pokemon_type import PokemonType
from poke_env.environment.status import Status
from poke_env.player import Player

from battle_logger import BattleLogger


# ANSI escape codes for colors
LIGHT_BLUE = "\033[94m"
LIGHT_RED = "\033[91m"
RESET_COLOR = "\033[0m"

RAND_BATS = RandbatsDex.load_gen9()
DAMAGE_CALC = DamageCalculator(gen=9)

MODEL_DEFAULT = "gemini/gemini-3-flash-preview"
LLM_TIMEOUT_S = 120  # Generous timeout - Pokemon Showdown has its own turn timer


# ## Prompt helpers

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
    if data:
        return data.name
    return species


def _extract_known_moves(mon: Pokemon) -> List[str]:
    return [move.id for move in mon.moves.values() if move]


def _find_role_for_moves(species: str, moves: Iterable[str]):
    roles = RAND_BATS.filter_roles_by_moves(species, moves)
    return roles[0] if roles else None


def _build_calc_pokemon(
    mon: Pokemon,
    *,
    fallback_role: Optional[Dict[str, Any]] = None,
    fallback_level: Optional[int] = None,
) -> Dict[str, Any]:
    role_data = fallback_role or {}
    return {
        "name": _resolve_species_name(mon.species),
        "level": mon.level or fallback_level,
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


def _build_damage_requests(
    battle: AbstractBattle,
    opponent_roles: List[Dict[str, Any]],
    max_roles: int = 3,
) -> Tuple[List[Dict[str, Any]], List[Tuple[str, str]]]:
    if not battle.available_moves or not opponent_roles:
        return [], []

    attacker_role = _find_role_for_moves(
        battle.active_pokemon.species,
        _extract_known_moves(battle.active_pokemon),
    )

    attacker_role_data = None
    if attacker_role:
        attacker_role_data = {
            "abilities": attacker_role.abilities,
            "items": attacker_role.items,
            "evs": attacker_role.evs,
            "ivs": attacker_role.ivs,
        }

    requests: List[Dict[str, Any]] = []
    labels: List[Tuple[str, str]] = []
    opponent_species = battle.opponent_active_pokemon.species
    opponent_data = RAND_BATS.get_species(opponent_species)
    opponent_level = opponent_data.level if opponent_data else None

    for move in battle.available_moves:
        move_name = move.entry.get("name", move.id)
        for role in opponent_roles[:max_roles]:
            requests.append(
                {
                    "attacker": _build_calc_pokemon(
                        battle.active_pokemon,
                        fallback_role=attacker_role_data,
                    ),
                    "defender": _build_calc_pokemon(
                        battle.opponent_active_pokemon,
                        fallback_role=role,
                        fallback_level=opponent_level,
                    ),
                    "move": {"name": move_name},
                }
            )
            labels.append((move.id, role.get("role", "Unknown")))

    return requests, labels


def _format_damage_summary(
    battle: AbstractBattle, opponent_roles: List[Dict[str, Any]]
) -> str:
    requests, labels = _build_damage_requests(battle, opponent_roles)
    if not requests:
        return "Damage calc: unavailable"

    results = DAMAGE_CALC.calculate_batch(requests)
    lines: List[str] = []
    for (move_id, role_name), result in zip(labels, results):
        if not result.ok:
            continue
        data = result.result or {}
        desc = data.get("desc")
        ko_text = (data.get("ko") or {}).get("text")
        if desc:
            line = f"- {move_id} vs {role_name}: {desc}"
            if ko_text:
                line += f" | {ko_text}"
            lines.append(line)

    if not lines:
        return "Damage calc: unavailable"

    return "Damage calc (approx):\n" + "\n".join(lines[:12])


# ## Logging helpers

def log_pokemon(pokemon: Pokemon, is_opponent: bool = False):
    lines = [
        f"[{pokemon.species} ({pokemon.name}) {'[FAINTED]' if pokemon.fainted else ''}]",
        f"Types: {[t.name for t in pokemon.types]}",
    ]

    if is_opponent:
        lines.append(f"Possible Tera types {pokemon.tera_type}")

    lines.extend(
        [
            f"HP: {pokemon.current_hp}/{pokemon.max_hp} ({pokemon.current_hp_fraction * 100:.1f}%)",
            f"Base stats: {pokemon.base_stats}",
            f"Stats: {pokemon.stats}",
            f"{'Possible abilities' if is_opponent else 'Ability'}: {pokemon.ability}",
            f"{'Possible items' if is_opponent else 'Item'}: {pokemon.item}",
            f"Status: {pokemon.status}",
        ]
    )

    if pokemon.status:
        lines.append(f"Status turn count: {pokemon.status_counter}")

    # Only show moves for the player's Pokémon, not the opponent's
    if not is_opponent:
        lines.append("Moves:")
        lines.extend(
            [
                "Move ID: `{}` Base Power: {} Accuracy: {}% PP: ({}/{}) Priority: {}".format(
                    move.id,
                    move.base_power,
                    move.accuracy * 100,
                    move.current_pp,
                    move.max_pp,
                    move.priority,
                )
                for move in pokemon.moves.values()
            ]
        )

    lines.extend([f"Stats: {pokemon.stats}", f"Boosts: {pokemon.boosts}"])

    return "\n".join(lines)


def log_player_info(battle: AbstractBattle):
    lines = [
        "== Player Info ==",
        "Active pokemon:",
        log_pokemon(battle.active_pokemon),
        f"Tera Type: {battle.can_tera}",
        "-" * 10,
        f"Team: {battle.team}",
    ]

    for _, mon in battle.team.items():
        if not mon.active:
            lines.append(log_pokemon(mon))
            lines.append("")

    return "\n".join(lines)


def log_opponent_info(battle: AbstractBattle):
    return "\n".join(
        [
            "== Opponent Info ==",
            "Opponent active pokemon:",
            log_pokemon(battle.opponent_active_pokemon, is_opponent=True),
            f"Opponent team: {battle.opponent_team}",
        ]
    )


def log_battle_info(battle: AbstractBattle):
    lines = ["== Battle Info ==", f"Turn: {battle.turn}"]

    # Field info
    if battle.weather:
        lines.append(f"Weather: {battle.weather}")
    if battle.fields:
        lines.append(f"Fields: {battle.fields}")
    if battle.side_conditions:
        lines.append(f"Player side conditions: {battle.side_conditions}")
    if battle.opponent_side_conditions:
        lines.append(f"Opponent side conditions: {battle.opponent_side_conditions}")
    if battle.trapped:
        lines.append(f"Trapped: {battle.trapped}")

    return "\n".join(lines)


def _format_opponent_roles(battle: AbstractBattle) -> List[Dict[str, Any]]:
    opponent = battle.opponent_active_pokemon
    if not opponent:
        return []

    known_moves = _extract_known_moves(opponent)
    return RAND_BATS.summarize_roles(opponent.species, known_moves)


def _roles_to_text(roles: List[Dict[str, Any]], max_roles: int = 4) -> str:
    if not roles:
        return "Opponent roles: unknown"

    lines = ["Opponent role candidates (Gen 9 randbats):"]
    for role in roles[:max_roles]:
        lines.append(
            "- {} | Moves: {} | Items: {} | Abilities: {} | Tera: {}".format(
                role.get("role", "Unknown"),
                ", ".join(role.get("moves", [])),
                ", ".join(role.get("items", [])),
                ", ".join(role.get("abilities", [])),
                ", ".join(role.get("tera_types", [])),
            )
        )
    return "\n".join(lines)


def create_prompt(
    battle_info: str,
    player_info: str,
    opponent_info: str,
    available_moves: List[Move],
    available_switches: List[str],
    opponent_roles: str,
    damage_summary: str,
) -> str:
    prompt = f"""
Here is the current state of the battle:

{battle_info}

Here is the current state of your team:

{player_info}

Here is the current state of the opponent's team:

{opponent_info}

{opponent_roles}

{damage_summary}

Your goal is to win the battle. You can only choose one move to make.

IMPORTANT: You can ONLY choose from these specific actions that are available this turn:

Available moves for your active Pokémon:
{available_moves}

Available switches (use "switch-0", "switch-1", etc. to switch):
{available_switches}

These are the ONLY actions you can select. Do NOT choose any moves from the opponent's Pokémon or any moves/switches not in this list.

Reason carefully about the best move to make. Consider things like the opponent's team, the weather, the side conditions (i.e. stealth rock, spikes, sticky web, etc.). Consider the effectiveness of the move against the opponent's team, but also consider the power of the move, and the accuracy. You may also switch to a different pokemon if you think it is a better option. Given the complexity of the game, you may also sometimes choose to "sacrifice" your pokemon to put your team in a better position.

Return a JSON object with two keys:
- "reasoning": A brief explanation of your strategic thinking (2-3 sentences)
- "action": One of the allowed action IDs

Example: {{"reasoning": "Earthquake is super effective against the opponent's Steel type and has high base power.", "action": "earthquake"}}
"""
    return prompt


def _extract_response_text(response: Any) -> str:
    # Handle dict response
    if isinstance(response, dict):
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            pass
    # Handle litellm ModelResponse object
    if hasattr(response, 'choices') and response.choices:
        try:
            content = response.choices[0].message.content
            if content:
                return content
        except (AttributeError, IndexError):
            pass
    return str(response)


def _parse_action(text: str, allowed: List[str]) -> Optional[str]:
    try:
        payload = json.loads(text)
        action = payload.get("action")
        if action in allowed:
            return action
    except (json.JSONDecodeError, AttributeError):
        pass

    cleaned = text.replace("`", " ").strip()
    for action in allowed:
        if action in cleaned:
            return action
    return None


@dataclass
class TurnTrace:
    """Reasoning trace for a single turn."""
    turn: int
    pokemon_matchup: str  # e.g., "Pikachu vs Charizard"
    prompt_summary: str = ""  # Condensed version of what the agent saw
    reasoning: str = ""
    final_action: str = ""
    raw_response: str = ""  # Full LLM response
    reasoning_time_ms: int = 0  # Time taken for full reasoning in milliseconds


def _analyze_speed(battle: AbstractBattle) -> str:
    """Analyze speed matchup between active Pokemon using @smogon/calc.
    
    Uses the official damage calculator for accurate speed stat calculation.
    Assumes max speed investment for opponent (worst case scenario).
    """
    player = battle.active_pokemon
    opponent = battle.opponent_active_pokemon
    
    player_spe_boost = player.boosts.get("spe", 0)
    opponent_spe_boost = opponent.boosts.get("spe", 0)
    
    # Use the official calculator for speed comparison
    # Both assume max speed investment for fair comparison
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
            verdict = "YOU ARE FASTER"
        elif speed_result.verdict == "POKEMON2_FASTER":
            verdict = "OPPONENT IS FASTER"
        else:
            verdict = "SPEED TIE"
        
        player_boost_str = f"+{player_spe_boost}" if player_spe_boost > 0 else str(player_spe_boost)
        opp_boost_str = f"+{opponent_spe_boost}" if opponent_spe_boost > 0 else str(opponent_spe_boost)
        
        return (
            f"⚡ SPEED: {verdict} | "
            f"You: {player.species} (base:{speed_result.pokemon1_base_spe}, eff:{speed_result.pokemon1_effective_spe}, boost:{player_boost_str}) | "
            f"Opp: {opponent.species} (base:{speed_result.pokemon2_base_spe}, eff:{speed_result.pokemon2_effective_spe}, boost:{opp_boost_str})"
        )
    else:
        # Fallback to base speed comparison if calc fails
        player_base_spe = player.base_stats.get("spe", 0)
        opponent_base_spe = opponent.base_stats.get("spe", 0)
        
        if player_base_spe > opponent_base_spe:
            verdict = "YOU ARE LIKELY FASTER"
        elif opponent_base_spe > player_base_spe:
            verdict = "OPPONENT IS LIKELY FASTER"
        else:
            verdict = "SPEED TIE"
        
        player_boost_str = f"+{player_spe_boost}" if player_spe_boost > 0 else str(player_spe_boost)
        opp_boost_str = f"+{opponent_spe_boost}" if opponent_spe_boost > 0 else str(opponent_spe_boost)
        
        return f"⚡ SPEED: {verdict} | You: {player.species} (base:{player_base_spe}, boost:{player_boost_str}) | Opp: {opponent.species} (base:{opponent_base_spe}, boost:{opp_boost_str})"


def _analyze_switches(battle: AbstractBattle) -> List[str]:
    """Analyze switch matchups against opponent."""
    if not battle.available_switches:
        return []
    
    opponent = battle.opponent_active_pokemon
    opponent_types = [t.name for t in opponent.types if t]
    
    lines = ["🔄 SWITCH OPTIONS:"]
    for i, pokemon in enumerate(battle.available_switches):
        pokemon_types = [t.name for t in pokemon.types if t]
        type_str = "/".join(pokemon_types)
        hp_str = f"{pokemon.current_hp_fraction * 100:.0f}%"
        status_str = f" [{pokemon.status.name}]" if pokemon.status else ""
        
        # Simple matchup analysis based on STAB types
        matchup_notes = []
        for opp_type in opponent_types:
            # Check if we resist their STAB
            effectiveness = 1.0
            for our_type in pokemon_types:
                type_chart = RAND_BATS._type_chart if hasattr(RAND_BATS, '_type_chart') else {}
                # Simplified - just note the types
            pass
        
        lines.append(f"  switch-{i}: {pokemon.species} ({type_str}) - {hp_str}{status_str}")
    
    return lines


def _create_prompt_summary_from_battle(battle: AbstractBattle, opponent_roles: List[Dict[str, Any]], damage_summary: str) -> str:
    """Create a detailed multi-line summary showing all precomputed information."""
    sections = []
    
    player = battle.active_pokemon
    opponent = battle.opponent_active_pokemon
    player_types = "/".join([t.name for t in player.types if t])
    opponent_types = "/".join([t.name for t in opponent.types if t])
    
    # === MATCHUP HEADER ===
    sections.append(f"⚔️ MATCHUP: {player.species} ({player_types}, {player.current_hp_fraction * 100:.0f}% HP) vs {opponent.species} ({opponent_types}, {opponent.current_hp_fraction * 100:.0f}% HP)")
    
    # === SPEED ANALYSIS ===
    sections.append(_analyze_speed(battle))
    
    # === YOUR MOVES + DAMAGE CALCS ===
    if battle.available_moves:
        move_lines = ["🎯 YOUR MOVES:"]
        for move in battle.available_moves:
            move_type = move.type.name if move.type else "???"
            category = move.category.name if move.category else "???"
            priority_str = f", Pri:{move.priority}" if move.priority != 0 else ""
            move_lines.append(f"  → {move.id} ({move_type}, {category}, BP:{move.base_power}, Acc:{move.accuracy}{priority_str})")
        sections.append("\n".join(move_lines))
    
    # === DAMAGE CALCULATIONS ===
    if damage_summary and "Damage calc" in damage_summary:
        dmg_lines = [l.strip() for l in damage_summary.split('\n') if l.strip().startswith('- ')]
        if dmg_lines:
            calc_section = ["📊 DAMAGE CALCS:"]
            for line in dmg_lines[:10]:  # Show up to 10 calcs
                calc_section.append(f"  {line}")
            sections.append("\n".join(calc_section))
    
    # === OPPONENT ROLES ===
    if opponent_roles:
        role_section = [f"🔍 OPPONENT LIKELY SETS ({opponent.species}):"]
        for role in opponent_roles[:3]:  # Show up to 3 roles
            role_name = role.get("role", "Unknown")
            moves = role.get("moves", [])
            abilities = role.get("abilities", [])
            items = role.get("items", [])
            tera = role.get("tera_types", [])
            
            role_section.append(f"  [{role_name}]")
            if moves:
                role_section.append(f"    Moves: {', '.join(moves[:6])}")
            if abilities:
                role_section.append(f"    Abilities: {', '.join(abilities[:3])}")
            if items:
                role_section.append(f"    Items: {', '.join(items[:3])}")
            if tera:
                role_section.append(f"    Tera: {', '.join(tera[:3])}")
        sections.append("\n".join(role_section))
    
    # === SWITCH OPTIONS ===
    if battle.available_switches:
        switch_section = ["🔄 SWITCH OPTIONS:"]
        for i, pokemon in enumerate(battle.available_switches):
            pokemon_types = "/".join([t.name for t in pokemon.types if t])
            hp_str = f"{pokemon.current_hp_fraction * 100:.0f}%"
            status_str = f" [{pokemon.status.name}]" if pokemon.status else ""
            switch_section.append(f"  switch-{i}: {pokemon.species} ({pokemon_types}) - {hp_str}{status_str}")
        sections.append("\n".join(switch_section))
    
    # === FIELD CONDITIONS ===
    field_info = []
    if battle.weather:
        field_info.append(f"Weather: {battle.weather.name}")
    if battle.fields:
        field_info.append(f"Terrain: {[f.name for f in battle.fields]}")
    if battle.side_conditions:
        field_info.append(f"Your side: {[sc.name for sc in battle.side_conditions]}")
    if battle.opponent_side_conditions:
        field_info.append(f"Opp side: {[sc.name for sc in battle.opponent_side_conditions]}")
    if field_info:
        sections.append("🌍 FIELD: " + " | ".join(field_info))
    
    return "\n\n".join(sections)


def _format_trace_as_chat(trace: TurnTrace, username: str) -> List[str]:
    """Format a turn trace as Pokemon Showdown chat protocol lines.

    Returns lines like: |c|☆Username|message
    These appear in the battle log chat sidebar.
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
    """Inject reasoning traces as chat messages into the replay battle log.

    Inserts chat lines after each |turn|N marker in the battle-log-data script.
    """
    if not os.path.exists(replay_path):
        return

    with open(replay_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Build a map of turn -> trace
    trace_by_turn: Dict[int, TurnTrace] = {}
    for trace in traces:
        # If multiple traces for same turn, keep the last one
        trace_by_turn[trace.turn] = trace

    # Find the battle-log-data script section and inject chat lines after |turn|N
    lines = content.split('\n')
    new_lines = []

    for line in lines:
        new_lines.append(line)

        # Check if this line is a turn marker: |turn|N (may have leading whitespace)
        stripped = line.strip()
        if stripped.startswith('|turn|'):
            try:
                turn_num = int(stripped.split('|')[2])
                if turn_num in trace_by_turn:
                    trace = trace_by_turn[turn_num]
                    chat_lines = _format_trace_as_chat(trace, username)
                    new_lines.extend(chat_lines)
            except (IndexError, ValueError):
                pass

    with open(replay_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))




class GeminiPlayer(Player):
    def __init__(
        self,
        model: str = MODEL_DEFAULT,
        reasoning_effort: str = "low",
        battle_logger: Optional[BattleLogger] = None,
        **player_kwargs: Any,
    ):
        super().__init__(**player_kwargs)
        if not model.startswith("gemini/"):
            raise ValueError("Only Gemini models are supported.")
        self.model = model
        self.reasoning_effort = reasoning_effort
        self.battle_logger = battle_logger
        self.color = LIGHT_BLUE
        # Store reasoning traces per battle for replay injection
        self._battle_traces: Dict[str, List[TurnTrace]] = {}

    async def _handle_battle_request(
        self,
        battle: AbstractBattle,
        from_teampreview_request: bool = False,
        maybe_default_order: bool = False,
    ):
        if getattr(battle, "_wait", False):
            return
        await super()._handle_battle_request(
            battle,
            from_teampreview_request=from_teampreview_request,
            maybe_default_order=maybe_default_order,
        )

    def _battle_finished_callback(self, battle: AbstractBattle):
        """Called when a battle finishes."""
        super()._battle_finished_callback(battle)

        battle_tag = getattr(battle, "battle_tag", None)
        if battle_tag:
            # Inject traces into replay HTML
            traces = self._battle_traces.get(battle_tag, [])
            if traces:
                # Find the replay file
                replay_folder = "replays"
                if hasattr(battle, "_save_replays") and isinstance(battle._save_replays, str):
                    replay_folder = battle._save_replays
                replay_path = os.path.join(
                    replay_folder, f"{self.username} - {battle_tag}.html"
                )
                inject_traces_into_replay(replay_path, traces, self.username)
                print(f"{self.color}Injected {len(traces)} reasoning traces into replay{RESET_COLOR}")

            # Clean up traces for this battle
            if battle_tag in self._battle_traces:
                del self._battle_traces[battle_tag]

        if self.battle_logger and battle_tag:
            winner = None
            if battle.won:
                winner = self.username
            elif battle.lost:
                winner = battle.opponent_username

            self.battle_logger.end_battle(
                battle_id=battle_tag,
                winner=winner,
                outcome_details={"final_turn": battle.turn},
            )

    def choose_max_damage_move(self, battle: Battle):
        return max(battle.available_moves, key=lambda move: move.base_power)

    def _store_trace(
        self,
        battle: AbstractBattle,
        reasoning: str,
        action: str,
        prompt_summary: str = "",
        raw_response: str = "",
        reasoning_time_ms: int = 0,
    ):
        """Store a reasoning trace for later injection into the replay."""
        battle_tag = getattr(battle, "battle_tag", None)
        if battle_tag:
            if battle_tag not in self._battle_traces:
                self._battle_traces[battle_tag] = []

            matchup = f"{battle.active_pokemon.species} vs {battle.opponent_active_pokemon.species}" if battle.active_pokemon and battle.opponent_active_pokemon else "unknown"
            trace = TurnTrace(
                turn=battle.turn,
                pokemon_matchup=matchup,
                prompt_summary=prompt_summary,
                reasoning=reasoning,
                final_action=action,
                raw_response=raw_response,
                reasoning_time_ms=reasoning_time_ms,
            )
            self._battle_traces[battle_tag].append(trace)

    async def choose_move(self, battle: AbstractBattle):
        # Check if this is the first turn and we need to start logging
        if self.battle_logger and hasattr(battle, "battle_tag") and battle.turn == 1:
            opponent_username = (
                battle.opponent_username if hasattr(battle, "opponent_username") else "Unknown"
            )
            self.battle_logger.start_battle(
                battle_id=battle.battle_tag,
                player1_name=self.username,
                player1_model=self.model,
                player2_name=opponent_username if opponent_username else "Unknown",
                player2_model="human",
            )

        def choose_order_from_id(
            move_id: str, battle: AbstractBattle
        ) -> Union[Move, Pokemon]:
            try:
                for move in battle.available_moves:
                    if move.id == move_id:
                        return move

                if move_id.startswith("switch-"):
                    try:
                        switch_index = int(move_id.split("-")[1])
                        available_switches = [p for p in battle.available_switches]
                        if 0 <= switch_index < len(available_switches):
                            return available_switches[switch_index]
                    except (ValueError, IndexError):
                        pass

                print(
                    f'{self.color}Warning: Move "{move_id}" not found in available moves.{RESET_COLOR}'
                )
                print(
                    f'{self.color}Available moves are: {[move.id for move in battle.available_moves]}{RESET_COLOR}'
                )
                print(
                    f'{self.color}Available switches are: {[f"switch-{i}" for i in range(len(battle.available_switches))]}{RESET_COLOR}'
                )
                print(f"{self.color}Defaulting to first available move.{RESET_COLOR}")
                return (
                    battle.available_moves[0]
                    if battle.available_moves
                    else battle.available_switches[0]
                )

            except Exception as e:
                print(f"{self.color}Error picking move: {e}{RESET_COLOR}")
                return (
                    battle.available_moves[0]
                    if battle.available_moves
                    else battle.available_switches[0]
                )

        # Handle both moves and forced switches (after KO)
        if battle.available_moves or battle.available_switches:
            # Start timing for full reasoning
            reasoning_start = time.perf_counter()
            
            available_switches_info = []
            for i, pokemon in enumerate(battle.available_switches):
                available_switches_info.append(
                    f"switch-{i}: Switch to {pokemon.species} (HP: {pokemon.current_hp_fraction * 100:.1f}%)"
                )

            opponent_roles = _format_opponent_roles(battle)
            damage_summary = await asyncio.to_thread(
                _format_damage_summary, battle, opponent_roles
            )

            system_prompt = create_prompt(
                log_battle_info(battle),
                log_player_info(battle),
                log_opponent_info(battle),
                battle.available_moves,
                available_switches_info,
                _roles_to_text(opponent_roles),
                damage_summary,
            )

            available_move_ids = [move.id for move in battle.available_moves]
            available_switch_ids = [
                f"switch-{i}" for i in range(len(battle.available_switches))
            ]
            all_actions = available_move_ids + available_switch_ids
            user_message = (
                "Select an action from ONLY these available options: "
                f"{all_actions}."
            )

            full_prompt = f"Instructions: {system_prompt}\n\nUser: {user_message}"

            api_key = os.environ.get("GEMINI_API_KEY")
            if not api_key:
                print(f"{self.color}Warning: GEMINI_API_KEY not set{RESET_COLOR}")
            try:
                response = await asyncio.to_thread(
                    completion,
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    reasoning_effort=self.reasoning_effort,
                    timeout=LLM_TIMEOUT_S,
                    api_key=api_key,
                )
            except Exception as e:
                reasoning_time_ms = int((time.perf_counter() - reasoning_start) * 1000)
                print(f"{self.color}Error calling Gemini API: {type(e).__name__}: {e}{RESET_COLOR}")
                fallback_action = battle.available_moves[0] if battle.available_moves else battle.available_switches[0]
                fallback_id = fallback_action.id if hasattr(fallback_action, 'id') else f"switch-0"
                prompt_summary = _create_prompt_summary_from_battle(battle, opponent_roles, damage_summary)
                self._store_trace(
                    battle,
                    f"[ERROR] {type(e).__name__}: {e} - using fallback",
                    fallback_id,
                    prompt_summary=prompt_summary,
                    raw_response=f"[API ERROR: {e}]",
                    reasoning_time_ms=reasoning_time_ms,
                )
                return self.create_order(fallback_action)
            
            # Calculate reasoning time
            reasoning_time_ms = int((time.perf_counter() - reasoning_start) * 1000)

            completion_text = _extract_response_text(response)
            chosen_move_id = _parse_action(completion_text, all_actions)
            if not chosen_move_id:
                print(f"{self.color}No valid action parsed, choosing first move{RESET_COLOR}")
                chosen_move_id = (
                    battle.available_moves[0].id
                    if battle.available_moves
                    else available_switch_ids[0]
                )

            chosen_order = choose_order_from_id(chosen_move_id, battle)

            # Store trace for replay injection
            # Extract reasoning from JSON response if possible
            reasoning_text = completion_text

            # Try to extract JSON from the response (may be wrapped in markdown code blocks)
            json_str = completion_text.strip()
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

            try:
                parsed = json.loads(json_str)
                if "reasoning" in parsed:
                    reasoning_text = parsed["reasoning"]
            except (json.JSONDecodeError, TypeError):
                # If not JSON, use the raw text but clean it up
                # Remove the ModelResponse wrapper if present
                if "content='" in completion_text:
                    start = completion_text.find("content='") + len("content='")
                    end = completion_text.find("', role=")
                    if end > start:
                        reasoning_text = completion_text[start:end]
            
            prompt_summary = _create_prompt_summary_from_battle(battle, opponent_roles, damage_summary)
            self._store_trace(
                battle,
                reasoning_text,
                chosen_move_id,
                prompt_summary=prompt_summary,
                raw_response=completion_text,
                reasoning_time_ms=reasoning_time_ms,
            )

            if self.battle_logger and hasattr(battle, "battle_tag"):
                battle_state = {
                    "active_pokemon": battle.active_pokemon.species
                    if battle.active_pokemon
                    else None,
                    "opponent_active_pokemon": battle.opponent_active_pokemon.species
                    if battle.opponent_active_pokemon
                    else None,
                    "available_moves": [move.id for move in battle.available_moves],
                    "team_status": {
                        mon.species: mon.current_hp_fraction
                        for _, mon in battle.team.items()
                    },
                    "opponent_team_status": {
                        mon.species: mon.current_hp_fraction
                        for _, mon in battle.opponent_team.items()
                    },
                }

                self.battle_logger.log_turn(
                    battle_id=battle.battle_tag,
                    player_name=self.username,
                    turn_number=battle.turn,
                    prompt=full_prompt,
                    completion=completion_text,
                    chosen_move=chosen_move_id,
                    battle_state=battle_state,
                )

            return self.create_order(chosen_order)

        print(f"{self.color}No moves/switches available (turn {battle.turn}, active: {battle.active_pokemon.species if battle.active_pokemon else 'none'}) - using random{RESET_COLOR}")
        fallback_summary = f"You: {battle.active_pokemon.species if battle.active_pokemon else '?'} | Opp: {battle.opponent_active_pokemon.species if battle.opponent_active_pokemon else '?'} | NO MOVES AVAILABLE"
        self._store_trace(
            battle,
            "[FALLBACK] No moves/switches available - using random",
            "random",
            prompt_summary=fallback_summary,
            raw_response="[NO LLM CALL - fallback]",
        )
        return self.choose_random_move(battle)


# Backwards-compatible alias
GPTPlayer = GeminiPlayer


# ## Run the Gemini Player


class MaxDamagePlayer(Player):
    def choose_move(self, battle):
        if battle.available_moves:
            best_move = max(battle.available_moves, key=lambda move: move.base_power)

            if battle.can_tera:
                return self.create_order(best_move, terastallize=True)

            return self.create_order(best_move)
        return self.choose_random_move(battle)


async def main():
    battle_logger = BattleLogger()
    random_player = RandomPlayer()
    gemini_player = GeminiPlayer(model=MODEL_DEFAULT, battle_logger=battle_logger)

    await gemini_player.battle_against(random_player, n_battles=1)

    print(
        f"Gemini player won {gemini_player.n_won_battles} / {gemini_player.n_finished_battles} battles"
    )

    print("\nBattle logs have been saved to the 'battle_logs' directory.")
    print("To view logs, run:")
    print("  python battle_log_viewer.py list")
    print("  python battle_log_viewer.py view <battle_dir> <player_name>")
    print("  python battle_log_viewer.py compare <battle_dir>")


if __name__ == "__main__":
    asyncio.run(main())
