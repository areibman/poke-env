# # `PokeAgent` LLM reasoning agents
#
# This example uses OpenAI's o3 and o4-mini reasoning models through the Responses API.
# These models excel at complex problem solving and multi-step reasoning.
#
# **Note**: this notebooks requires a locally running Pokémon Showdown server. Please see the [getting started section](../getting_started.rst) for help on how to set one up.
#


from poke_env import RandomPlayer
from poke_env.player import Player
from poke_env.environment.pokemon import Pokemon
from poke_env.environment.battle import Battle, AbstractBattle
import openai
from poke_env.environment.move import Move
from typing import List, Union
import json
import agentops
from agentops.sdk.decorators import agent
import asyncio
agentops.init()
client = openai.OpenAI()

# ANSI escape codes for colors
LIGHT_BLUE = "\033[94m"
LIGHT_RED = "\033[91m"
RESET_COLOR = "\033[0m"

# The RandomPlayer is a basic agent that makes decisions randomly,
# serving as a starting point for more complex agent development.
random_player = RandomPlayer()


# Here's one way to pretty print the results of the cross evaluation using `tabulate`:


# ## Building GPT Player


def log_pokemon(pokemon: Pokemon, is_opponent: bool = False):
    lines = [
        f"[{pokemon.species} ({pokemon.name}) {'[FAINTED]' if pokemon.fainted else ''}]",
        f"Types: {[t.name for t in pokemon.types]}"
    ]

    if is_opponent:
        lines.append(f'Possible Tera types {pokemon.tera_type}')

    lines.extend([
        f"HP: {pokemon.current_hp}/{pokemon.max_hp} ({pokemon.current_hp_fraction * 100:.1f}%)",
        f"Base stats: {pokemon.base_stats}",
        f"Stats: {pokemon.stats}",
        f"{'Possible abililities' if is_opponent else 'Ability'}: {pokemon.ability}",
        f"{'Possible items' if is_opponent else 'Item'}: {pokemon.item}",
        f"Status: {pokemon.status}"
    ])

    if pokemon.status:
        lines.append(f"Status turn count: {pokemon.status_counter}")

    lines.append("Moves:")
    lines.extend([
        f"Move ID: `{move.id}` Base Power: {move.base_power} Accuracy: {move.accuracy * 100}% PP: ({move.current_pp}/{move.max_pp}) Priority: {move.priority}  "
        for move in pokemon.moves.values()
    ])

    lines.extend([
        f"Stats: {pokemon.stats}",
        f"Boosts: {pokemon.boosts}"
    ])

    return "\n".join(lines)


def log_player_info(battle: AbstractBattle):
    lines = [
        "== Player Info ==",
        "Active pokemon:",
        log_pokemon(battle.active_pokemon),
        f"Tera Type: {battle.can_tera}",
        '-' * 10,
        f"Team: {battle.team}"
    ]

    for _, mon in battle.team.items():
        if not mon.active:
            lines.append(log_pokemon(mon))
            lines.append("")

    return "\n".join(lines)


def log_opponent_info(battle: AbstractBattle):
    return "\n".join([
        "== Opponent Info ==",
        "Opponent active pokemon:",
        log_pokemon(battle.opponent_active_pokemon, is_opponent=True),
        f"Opponent team: {battle.opponent_team}"
    ])


def log_battle_info(battle: AbstractBattle):
    lines = [
        "== Battle Info ==",
        f"Turn: {battle.turn}"
    ]

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


def create_prompt(battle_info, player_info, opponent_info, available_moves) -> str:
    prompt = f"""
Here is the current state of the battle:

{battle_info}

Here is the current state of your team:

{player_info}

Here is the current state of the opponent's team:

{opponent_info}

Your goal is to win the battle. You can only choose one move to make.

Here is the list of available moves:

{available_moves}

Reason carefully about the best move to make. Consider things like the opponent's team, the weather, the side conditions (i.e. stealth rock, spikes, sticky web, etc.). Consider the effectiveness of the move against the opponent's team, but also consider the power of the move, and the accuracy. You may also switch to a different pokemon if you think it is a better option. Given the complexity of the game, you may also sometimes choose to "sacrifice" your pokemon to put your team in a better position.

Finally, write a conclusion that includes the move you will make, and the reason you made that move.

"""
    return prompt


@agent
class GPTPlayer(Player):

    def __init__(self, model: str = "o3"):
        super().__init__()
        self.model = model
        if self.model == "o3":
            self.color = LIGHT_BLUE
        elif self.model == "o4-mini":
            self.color = LIGHT_RED
        else:
            self.color = RESET_COLOR  # Default or no color

    def choose_max_damage_move(self, battle: Battle):
        return max(battle.available_moves, key=lambda move: move.base_power)

    def choose_move(self, battle: AbstractBattle):

        def choose_order_from_id(move_id: str, battle: AbstractBattle) -> Union[Move, Pokemon]:
            try:
                return list(filter(lambda move: move.id == move_id, battle.available_moves))[0]
            except Exception as e:
                print(f'{self.color}Error picking move: {e}{RESET_COLOR}')
                return battle.available_moves[0]

        # Chooses a move with the highest base power when possible
        if battle.available_moves:
            # Define tool call dsl
            tools = [{
                "type": "function",
                "name": "choose_order_from_id",
                "description": "Choose a move from the list of available moves.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "move_id": {
                            "type": "string",
                            "description": "The id (name of move) of the move to choose"
                        }
                    },
                    "required": [
                        "move_id"
                    ],
                    "additionalProperties": False
                }
            }]

            # Pass state of game to the Agent
            system_prompt = create_prompt(
                log_battle_info(battle),
                log_player_info(battle),
                log_opponent_info(battle),
                battle.available_moves
            )

            # Combined reasoning and tool selection in one call for o3/o4 models
            response = client.responses.create(
                model=self.model,
                input=[{"role": "system", "content": system_prompt},
                       {"role": "user", "content": f"Select a move based on the move id (the name of the move) {battle.available_moves}"},],
                tools=tools,
                tool_choice="required"
            )

            # Handle the response structure for o3/o4 models
            # The output might contain reasoning items and function calls
            tool_call = None
            for output_item in response.output:
                if output_item.type == 'function_call':
                    tool_call = output_item
                    break
                elif output_item.type == 'message' and hasattr(output_item, 'content'):
                    # This is the actual message content
                    for content in output_item.content:
                        if hasattr(content, 'text'):
                            print(f'{self.color}Response: {content.text}{RESET_COLOR}')

            if tool_call:
                args = json.loads(tool_call.arguments)
                print(f'{self.color}Available moves: {battle.available_moves}{RESET_COLOR}')
                chosen_order = choose_order_from_id(args["move_id"], battle)
                print(f'{self.color}Chosen order: {chosen_order}{RESET_COLOR}')
            else:
                print(f'{self.color}No tool call found, choosing first available move{RESET_COLOR}')
                chosen_order = battle.available_moves[0]

            # Iterating over available moves to find the one with the highest base power
            # best_move = max(battle.available_moves, key=lambda move: move.base_power)
            # Creating an order for the selected move
            return self.create_order(chosen_order)

        else:
            print(f'{self.color}No moves available calling random{RESET_COLOR}')
            # If no attacking move is available, perform a random switch
            # This involves choosing a random move, which could be a switch or another available action
            return self.choose_random_move(battle)


# ## Run the GPT Player
#
# Next, we'll test our `GPT Player` against a `RandomPlayer` in a series of battles:
#


# Max damage player
class MaxDamagePlayer(Player):
    def choose_move(self, battle):
        if battle.available_moves:
            best_move = max(battle.available_moves, key=lambda move: move.base_power)

            if battle.can_tera:
                return self.create_order(best_move, terastallize=True)

            return self.create_order(best_move)
        else:
            return self.choose_random_move(battle)


# Creating players
random_player = RandomPlayer()
max_damage_player = MaxDamagePlayer()
gpt_player = GPTPlayer(model="o3")
gpt_player_o4_mini = GPTPlayer(model="o4-mini")


async def main():
    # Running battles
    # await gpt_player.battle_against(max_damage_player, n_battles=3)
    await gpt_player.battle_against(gpt_player_o4_mini, n_battles=3)

    # Displaying results
    print(
        f"GPT player won {gpt_player.n_won_battles} / {gpt_player.n_finished_battles} battles")


if __name__ == "__main__":
    asyncio.run(main())
