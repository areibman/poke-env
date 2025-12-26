# # `PokeAgent` Gemini reasoning agent
#
# This example uses LiteLLM with Gemini 3 Pro Preview.
#

from __future__ import annotations

import asyncio
import json
import os
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

MODEL_DEFAULT = "gemini/gemini-3-pro-preview"
LLM_TIMEOUT_S = 25


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

Return ONLY a JSON object with a single key `action` set to one of the allowed IDs. Example: {{"action": "earthquake"}}.
"""
    return prompt


def _extract_response_text(response: Any) -> str:
    if isinstance(response, dict):
        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
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
        if self.battle_logger and hasattr(battle, "battle_tag"):
            winner = None
            if battle.won:
                winner = self.username
            elif battle.lost:
                winner = battle.opponent_username

            self.battle_logger.end_battle(
                battle_id=battle.battle_tag,
                winner=winner,
                outcome_details={"final_turn": battle.turn},
            )

    def choose_max_damage_move(self, battle: Battle):
        return max(battle.available_moves, key=lambda move: move.base_power)

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

        if battle.available_moves:
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
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        completion,
                        model=self.model,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_message},
                        ],
                        reasoning_effort=self.reasoning_effort,
                        timeout=LLM_TIMEOUT_S,
                        api_key=api_key,
                    ),
                    timeout=LLM_TIMEOUT_S,
                )
            except Exception as e:
                print(f"{self.color}Error calling Gemini API: {e}{RESET_COLOR}")
                return self.create_order(
                    battle.available_moves[0]
                    if battle.available_moves
                    else battle.available_switches[0]
                )

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

        print(f"{self.color}No moves available calling random{RESET_COLOR}")
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
