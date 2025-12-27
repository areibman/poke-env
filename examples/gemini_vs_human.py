#!/usr/bin/env python3
"""Challenge a human on Pokemon Showdown using Gemini 3 Pro."""

from __future__ import annotations

import asyncio
import os

import random

from poke_env import AccountConfiguration, ShowdownServerConfiguration
from gpt_player import GeminiPlayer


async def main():
    opponent = os.environ.get("PS_OPPONENT")
    accept_only = os.environ.get("PS_ACCEPT_CHALLENGE") in {"1", "true", "TRUE", "yes", "YES"}

    guest_name = os.environ.get("PS_USERNAME") or f"GeminiGuest{random.randint(10000, 99999)}"

    player = GeminiPlayer(
        battle_format="gen9randombattle",
        account_configuration=AccountConfiguration(guest_name, None),
        server_configuration=ShowdownServerConfiguration,
        save_replays=True,
        start_timer_on_battle_start=False,
    )
    if opponent:
        if accept_only:
            print(f"Waiting for challenge from {opponent} as {player.username}...")
            await player.accept_challenges(opponent, n_challenges=1)
        else:
            print(f"Challenging {opponent} as {player.username}...")
            await player.send_challenges(opponent, n_challenges=1)
    else:
        n_battles = int(os.environ.get("PS_NUM_BATTLES", "5"))
        print(f"Searching ladder as {player.username} for {n_battles} battles...")
        await player.ladder(n_battles)

    target_battles = int(os.environ.get("PS_NUM_BATTLES", "5")) if not opponent else 1
    while player.n_finished_battles < target_battles:
        await asyncio.sleep(1)

    print(
        f"Finished: {player.n_won_battles}/{player.n_finished_battles} wins. "
        f"Replays saved to ./replays"
    )


if __name__ == "__main__":
    asyncio.run(main())
