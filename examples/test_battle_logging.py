#!/usr/bin/env python3
"""
Test script to demonstrate the battle logging system.
This will run a battle between two GPT players and save detailed logs.
"""

import asyncio
from gpt_player import GeminiPlayer
from battle_logger import BattleLogger


async def main():
    # Initialize battle logger
    battle_logger = BattleLogger(log_dir="test_battle_logs")
    
    # Create two GPT players with different models
    print("Creating GPT players...")
    player1 = GeminiPlayer(battle_logger=battle_logger)
    player2 = GeminiPlayer(battle_logger=battle_logger)
    
    # Run a single battle
    print("\nStarting battle...")
    print(f"{player1.username} (gemini) vs {player2.username} (gemini)")
    
    await player1.battle_against(player2, n_battles=1)
    
    # Display results
    print(f"\nBattle completed!")
    print(f"{player1.username} won {player1.n_won_battles} / {player1.n_finished_battles} battles")
    print(f"{player2.username} won {player2.n_won_battles} / {player2.n_finished_battles} battles")
    
    print("\n" + "="*60)
    print("Battle logs have been saved to the 'test_battle_logs' directory.")
    print("\nTo view the logs, use the battle_log_viewer.py script:")
    print("  1. List all battles:")
    print("     python battle_log_viewer.py list")
    print("\n  2. View a specific player's log:")
    print("     python battle_log_viewer.py view <battle_dir> <player_name>")
    print("     Add --full-prompt to see complete prompts")
    print("     Add --battle-state to see battle state details")
    print("\n  3. Compare both players side-by-side:")
    print("     python battle_log_viewer.py compare <battle_dir>")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
