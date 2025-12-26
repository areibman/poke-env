"""Pokemon battle AI agent that uses tools for damage calculation and matchup lookup.

This agent uses LLM function calling to iteratively reason about battles,
calling tools to calculate damage, check type matchups, and look up opponent roles
from the randbats dictionary.
"""

from __future__ import annotations

import asyncio
import html
import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

from litellm import completion

from poke_env.environment.battle import AbstractBattle
from poke_env.environment.move import Move
from poke_env.environment.pokemon import Pokemon
from poke_env.player import Player

import sys
from pathlib import Path

# Add examples directory to path for imports
_examples_dir = Path(__file__).parent
if str(_examples_dir) not in sys.path:
    sys.path.insert(0, str(_examples_dir))

from agent_tools import TOOL_DEFINITIONS, execute_tool
from battle_logger import BattleLogger


# ANSI escape codes for colors
CYAN = "\033[96m"
YELLOW = "\033[93m"
GREEN = "\033[92m"
RESET = "\033[0m"

MODEL_DEFAULT = "gemini/gemini-2.5-flash"
LLM_TIMEOUT_S = 45
MAX_TOOL_CALLS = 5  # Keep low to avoid turn timeouts (30s limit on Pokemon Showdown)


@dataclass
class ToolCall:
    """Record of a single tool call."""
    name: str
    arguments: Dict[str, Any]
    result: str


@dataclass
class TurnTrace:
    """Reasoning trace for a single turn."""
    turn: int
    pokemon_matchup: str  # e.g., "Pikachu vs Charizard"
    tool_calls: List[ToolCall] = field(default_factory=list)
    llm_reasoning: str = ""
    final_action: str = ""
    action_reasoning: str = ""


def _format_tool_result_summary(result: str, max_len: int = 150) -> str:
    """Format a tool result into a compact summary."""
    try:
        data = json.loads(result)
        # Handle damage calc results
        if "description" in data:
            desc = data.get("description", "")
            ko = data.get("ko_chance", "")
            if ko:
                return f"{desc} | {ko}"
            return desc
        # Handle type effectiveness
        if "multiplier" in data:
            return f"{data.get('attacking_type', '?')} vs {data.get('defending_types', [])} = {data['multiplier']}x ({data.get('effectiveness', '')})"
        # Handle ability info
        if "battle_effect" in data:
            return f"{data.get('name', '?')}: {data.get('battle_effect', '')}"
        # Handle pokemon info
        if "base_stats" in data:
            stats = data.get("base_stats", {})
            return f"{data.get('name', '?')} - {data.get('types', [])} (Atk:{stats.get('atk', '?')}/SpA:{stats.get('spa', '?')}/Spe:{stats.get('spe', '?')})"
        # Handle role lookup
        if "roles" in data:
            roles = data.get("roles", [])
            if roles:
                role_names = [r.get("role", "?") for r in roles[:2]]
                return f"Roles: {', '.join(role_names)}"
            return "No matching roles"
        # Generic fallback
        return result[:max_len] + "..." if len(result) > max_len else result
    except (json.JSONDecodeError, KeyError):
        return result[:max_len] + "..." if len(result) > max_len else result


def _format_trace_as_chat(trace: TurnTrace, username: str) -> List[str]:
    """Format a turn trace as Pokemon Showdown chat protocol lines.

    Returns lines like: |c|☆Username|message
    These appear in the battle log chat sidebar.
    """
    lines = []

    # Tool calls with results (compact format)
    for tc in trace.tool_calls:
        # Format: tool_name(key_args) → result_summary
        args_summary = ""
        if tc.arguments:
            # Pick the most important args to show
            key_args = []
            for key in ["move_name", "attacker_species", "defender_species", "attacking_type", "species", "ability_name"]:
                if key in tc.arguments:
                    key_args.append(str(tc.arguments[key]))
            if key_args:
                args_summary = ", ".join(key_args[:3])

        result_summary = _format_tool_result_summary(tc.result)
        if args_summary:
            lines.append(f"|c|☆{username}|🔧 {tc.name}({args_summary}) → {result_summary}")
        else:
            lines.append(f"|c|☆{username}|🔧 {tc.name} → {result_summary}")

    # Reasoning (the key insight)
    if trace.action_reasoning:
        # Truncate long reasoning but keep it readable
        reasoning = trace.action_reasoning
        if len(reasoning) > 300:
            reasoning = reasoning[:297] + "..."
        lines.append(f"|c|☆{username}|💭 {reasoning}")

    # Final action
    lines.append(f"|c|☆{username}|→ {trace.final_action}")

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

        # Check if this line is a turn marker: |turn|N
        if line.startswith('|turn|'):
            try:
                turn_num = int(line.split('|')[2])
                if turn_num in trace_by_turn:
                    trace = trace_by_turn[turn_num]
                    chat_lines = _format_trace_as_chat(trace, username)
                    new_lines.extend(chat_lines)
            except (IndexError, ValueError):
                pass

    with open(replay_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines))


def _format_pokemon_summary(pokemon: Pokemon, is_opponent: bool = False) -> Dict[str, Any]:
    """Create a summary dict of a Pokemon's state."""
    summary = {
        "species": pokemon.species,
        "types": [t.name for t in pokemon.types if t],
        "hp_percent": round(pokemon.current_hp_fraction * 100, 1),
        "status": pokemon.status.name if pokemon.status else None,
        "boosts": {k: v for k, v in pokemon.boosts.items() if v != 0},
        "fainted": pokemon.fainted,
    }

    if not is_opponent:
        summary["ability"] = pokemon.ability
        summary["item"] = pokemon.item
        summary["moves"] = [
            {
                "id": move.id,
                "type": move.type.name if move.type else "???",
                "base_power": move.base_power,
                "accuracy": move.accuracy,
                "pp": move.current_pp,
                "category": move.category.name if move.category else "???",
            }
            for move in pokemon.moves.values()
        ]
    else:
        # For opponent, show what we know and what's possible
        summary["known_ability"] = pokemon.ability
        summary["possible_abilities"] = list(pokemon.possible_abilities) if pokemon.possible_abilities else []
        summary["known_item"] = pokemon.item
        summary["revealed_moves"] = [move.id for move in pokemon.moves.values()]

    return summary


def _format_battle_state(battle: AbstractBattle) -> Dict[str, Any]:
    """Create a comprehensive battle state dict."""
    state = {
        "turn": battle.turn,
        "weather": battle.weather.name if battle.weather else None,
        "terrain": None,
        "player_side_conditions": [sc.name for sc in battle.side_conditions],
        "opponent_side_conditions": [sc.name for sc in battle.opponent_side_conditions],
        "trapped": battle.trapped,
        "can_tera": battle.can_tera is not None,
        "active_pokemon": _format_pokemon_summary(battle.active_pokemon),
        "opponent_active": _format_pokemon_summary(battle.opponent_active_pokemon, is_opponent=True),
        "team": [
            _format_pokemon_summary(mon)
            for mon in battle.team.values()
            if not mon.active
        ],
        "opponent_team": [
            {"species": mon.species, "hp_percent": round(mon.current_hp_fraction * 100, 1), "fainted": mon.fainted}
            for mon in battle.opponent_team.values()
            if not mon.active
        ],
    }

    # Add field effects
    if battle.fields:
        state["fields"] = [f.name for f in battle.fields]

    return state


def _format_available_actions(battle: AbstractBattle) -> Dict[str, Any]:
    """Format available moves and switches."""
    moves = []
    for move in battle.available_moves:
        moves.append({
            "id": move.id,
            "name": move.entry.get("name", move.id),
            "type": move.type.name if move.type else "???",
            "base_power": move.base_power,
            "accuracy": move.accuracy,
            "category": move.category.name if move.category else "???",
            "priority": move.priority,
        })

    switches = []
    for i, pokemon in enumerate(battle.available_switches):
        switches.append({
            "action_id": f"switch-{i}",
            "species": pokemon.species,
            "types": [t.name for t in pokemon.types if t],
            "hp_percent": round(pokemon.current_hp_fraction * 100, 1),
        })

    return {"moves": moves, "switches": switches}


SYSTEM_PROMPT = """You are an expert Pokemon battle AI playing Gen 9 Random Battles on Pokemon Showdown.

TIME CONSTRAINT: You have ~20 seconds per turn. Use 3-5 tool calls wisely, then decide.

Your goal is to win by making informed decisions. Available tools:
1. calculate_damage - damage ranges and KO chances (works both ways: your moves AND opponent's moves)
2. get_type_effectiveness - type multipliers
3. lookup_pokemon_roles - opponent's possible moves/sets/abilities/items
4. get_pokemon_info - base stats and types
5. get_move_info - move details
6. get_ability_info - ability effects

DECISION PROCESS (3-5 tool calls):
1. SCOUT OPPONENT: Use lookup_pokemon_roles to see what moves/abilities the opponent likely has
2. CALCULATE OFFENSE: Check damage for your 1-2 best moves against the opponent
3. CALCULATE DEFENSE: Check damage from opponent's likely STAB/coverage moves against YOU
   - Use calculate_damage with opponent as attacker and your Pokemon as defender
   - This tells you if you can survive a hit or need to switch
4. DECIDE: Based on whether you can KO them vs whether they can KO you

SURVIVAL QUESTIONS TO ANSWER:
- Can I KO them before they KO me? (Speed matters!)
- If I'm slower, can I survive their hit to attack next turn?
- Should I switch to something that tanks their STAB?

KEY ABILITY IMMUNITIES:
- Levitate: Ground immune | Flash Fire: Fire immune | Water Absorb/Storm Drain: Water immune
- Volt Absorb/Motor Drive: Electric immune | Earth Eater: Ground immune | Sap Sipper: Grass immune

EXAMPLE TOOL SEQUENCE:
1. lookup_pokemon_roles("Garchomp") -> sees Earthquake, Dragon Claw, Swords Dance likely
2. calculate_damage(my_mon, Garchomp, "Ice Beam") -> 85% damage, won't KO
3. calculate_damage(Garchomp, my_mon, "Earthquake") -> 120% damage, I get KO'd!
4. Decision: Switch to a Flying-type or Levitate user

When ready, respond with JSON: {"action": "<move_id or switch-N>", "reasoning": "<brief explanation>"}

The action MUST be one of the available moves or switches provided."""


class ToolUsingPlayer(Player):
    """AI player that uses LLM function calling with Pokemon battle tools."""

    def __init__(
        self,
        model: str = MODEL_DEFAULT,
        battle_logger: Optional[BattleLogger] = None,
        verbose: bool = True,
        **player_kwargs: Any,
    ):
        super().__init__(**player_kwargs)
        self.model = model
        self.battle_logger = battle_logger
        self.verbose = verbose
        # Store reasoning traces per battle
        self._battle_traces: Dict[str, List[TurnTrace]] = {}

    def _log(self, message: str, color: str = CYAN):
        """Print a message if verbose mode is on."""
        if self.verbose:
            print(f"{color}{message}{RESET}", flush=True)

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
                self._log(f"Injected {len(traces)} reasoning traces into replay", GREEN)

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

    async def choose_move(self, battle: AbstractBattle):
        """Choose a move using tool-calling LLM reasoning."""

        battle_tag = getattr(battle, "battle_tag", None)

        # Initialize traces list for this battle
        if battle_tag and battle_tag not in self._battle_traces:
            self._battle_traces[battle_tag] = []

        # Start battle logging on first turn
        if self.battle_logger and battle_tag and battle.turn == 1:
            opponent_username = getattr(battle, "opponent_username", "Unknown")
            self.battle_logger.start_battle(
                battle_id=battle_tag,
                player1_name=self.username,
                player1_model=self.model,
                player2_name=opponent_username or "Unknown",
                player2_model="human",
            )

        # If no moves available, use random
        if not battle.available_moves and not battle.available_switches:
            self._log("No actions available, using random")
            return self.choose_random_move(battle)

        # Build initial state message
        battle_state = _format_battle_state(battle)
        available_actions = _format_available_actions(battle)

        user_message = f"""Turn {battle.turn} - Choose your action.

BATTLE STATE:
{json.dumps(battle_state, indent=2)}

AVAILABLE ACTIONS:
{json.dumps(available_actions, indent=2)}

Use the tools to analyze the situation, then choose the best action. Your final response must be a JSON with "action" and "reasoning" keys."""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ]

        matchup = f"{battle.active_pokemon.species} vs {battle.opponent_active_pokemon.species}"
        self._log(f"\n{'='*60}")
        self._log(f"Turn {battle.turn}: {matchup}")

        # Create trace for this turn
        current_trace = TurnTrace(
            turn=battle.turn,
            pokemon_matchup=matchup,
        )

        # Tool calling loop
        tool_calls_made = 0
        final_action = None
        action_reasoning = ""

        while tool_calls_made < MAX_TOOL_CALLS:
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        completion,
                        model=self.model,
                        messages=messages,
                        tools=TOOL_DEFINITIONS,
                        tool_choice="auto",
                        timeout=LLM_TIMEOUT_S,
                    ),
                    timeout=LLM_TIMEOUT_S,
                )
            except Exception as e:
                self._log(f"LLM error: {e}", YELLOW)
                break

            # Check for empty response
            if not response.choices:
                self._log("LLM returned empty response, retrying...", YELLOW)
                continue

            response_message = response.choices[0].message

            # Check if we have tool calls
            if response_message.tool_calls:
                messages.append(response_message)

                for tool_call in response_message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        tool_args = {}

                    self._log(f"  Tool: {tool_name}({json.dumps(tool_args)})", YELLOW)

                    # Execute the tool
                    tool_result = await asyncio.to_thread(execute_tool, tool_name, tool_args)
                    tool_calls_made += 1

                    # Record tool call in trace
                    current_trace.tool_calls.append(ToolCall(
                        name=tool_name,
                        arguments=tool_args,
                        result=tool_result,
                    ))

                    # Add tool response to messages
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": tool_result,
                    })

            else:
                # No tool calls - should be final response
                content = response_message.content or ""

                # Try to parse as action JSON and extract reasoning
                final_action, action_reasoning = self._parse_final_action_with_reasoning(content, battle)
                if final_action:
                    self._log(f"  Decision: {final_action}", GREEN)
                break

        # Fallback if no valid action was parsed
        if not final_action:
            self._log("Failed to get valid action, using first available", YELLOW)
            if battle.available_moves:
                final_action = battle.available_moves[0].id
            else:
                final_action = "switch-0"
            action_reasoning = "Fallback - no valid action parsed from LLM"

        # Complete the trace
        current_trace.final_action = final_action
        current_trace.action_reasoning = action_reasoning

        # Store trace
        if battle_tag:
            self._battle_traces[battle_tag].append(current_trace)

        # Convert action to order
        order = self._action_to_order(final_action, battle)

        # Log the turn
        if self.battle_logger and hasattr(battle, "battle_tag"):
            self.battle_logger.log_turn(
                battle_id=battle.battle_tag,
                player_name=self.username,
                turn_number=battle.turn,
                prompt=user_message,
                completion=final_action,
                chosen_move=final_action,
                battle_state=battle_state,
            )

        return self.create_order(order)

    def _parse_final_action_with_reasoning(
        self, content: str, battle: AbstractBattle
    ) -> tuple[Optional[str], str]:
        """Parse the final action and reasoning from LLM response.

        Returns:
            Tuple of (action, reasoning). Action may be None if not found.
        """
        # Build list of valid actions
        valid_actions = [move.id for move in battle.available_moves]
        valid_actions.extend(f"switch-{i}" for i in range(len(battle.available_switches)))

        action = None
        reasoning = ""

        # Try to parse JSON
        try:
            # Find JSON in the response
            start = content.find("{")
            end = content.rfind("}") + 1
            if start >= 0 and end > start:
                data = json.loads(content[start:end])
                action = data.get("action", "")
                reasoning = data.get("reasoning", "")
                if action not in valid_actions:
                    action = None
        except (json.JSONDecodeError, KeyError):
            pass

        # Fallback: look for valid action in text
        if not action:
            for act in valid_actions:
                if act in content.lower():
                    action = act
                    # Use the whole content as reasoning if we couldn't parse JSON
                    reasoning = content[:500] if len(content) > 500 else content
                    break

        return action, reasoning

    def _action_to_order(self, action: str, battle: AbstractBattle) -> Union[Move, Pokemon]:
        """Convert action string to Move or Pokemon object."""
        # Check moves
        for move in battle.available_moves:
            if move.id == action:
                return move

        # Check switches
        if action.startswith("switch-"):
            try:
                idx = int(action.split("-")[1])
                if 0 <= idx < len(battle.available_switches):
                    return battle.available_switches[idx]
            except (ValueError, IndexError):
                pass

        # Fallback
        if battle.available_moves:
            return battle.available_moves[0]
        return battle.available_switches[0]


async def main():
    """Test the tool-using player against a local battle."""
    from poke_env import AccountConfiguration, ShowdownServerConfiguration
    import random

    opponent = os.environ.get("PS_OPPONENT")
    accept_only = os.environ.get("PS_ACCEPT_CHALLENGE") in {"1", "true", "yes"}

    guest_name = os.environ.get("PS_USERNAME") or f"ToolAgent{random.randint(10000, 99999)}"

    battle_logger = BattleLogger()
    player = ToolUsingPlayer(
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
