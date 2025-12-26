import json
import sys
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime


class BattleLogViewer:
    def __init__(self, log_dir: str = "battle_logs"):
        self.log_dir = Path(log_dir)
    
    def list_battles(self) -> List[Dict[str, str]]:
        """List all available battle logs."""
        battles = []
        if not self.log_dir.exists():
            return battles
        
        for battle_dir in self.log_dir.iterdir():
            if battle_dir.is_dir() and battle_dir.name.startswith("battle_"):
                battle_log_path = battle_dir / "battle_log.json"
                if battle_log_path.exists():
                    with open(battle_log_path, "r") as f:
                        data = json.load(f)
                        battles.append({
                            "dir": str(battle_dir),
                            "battle_id": data["battle_id"],
                            "timestamp": data["timestamp"],
                            "players": list(data["players"].keys()),
                            "winner": data["outcome"]["winner"] if data["outcome"] else "Ongoing"
                        })
        
        return sorted(battles, key=lambda x: x["timestamp"], reverse=True)
    
    def display_player_log(self, battle_dir: str, player_name: str, 
                          show_full_prompt: bool = False, 
                          show_battle_state: bool = False) -> None:
        """Display the log for a specific player in a battle."""
        battle_dir_path = Path(battle_dir)
        player_log_path = battle_dir_path / f"{player_name}_log.json"
        
        if not player_log_path.exists():
            print(f"Log file not found for player {player_name}")
            return
        
        with open(player_log_path, "r") as f:
            data = json.load(f)
        
        print(f"\n{'='*80}")
        print(f"Battle Log for {player_name} (Model: {data['model']})")
        print(f"Battle ID: {data['battle_id']}")
        print(f"{'='*80}\n")
        
        for turn in data["turns"]:
            self._display_turn(turn, show_full_prompt, show_battle_state)
        
        if data["outcome"]:
            print(f"\n{'='*80}")
            print(f"Battle Outcome: Winner - {data['outcome']['winner']}")
            print(f"End Time: {data['outcome']['end_timestamp']}")
            print(f"{'='*80}\n")
    
    def _display_turn(self, turn: Dict, show_full_prompt: bool, 
                      show_battle_state: bool) -> None:
        """Display a single turn's information."""
        print(f"\n{'-'*60}")
        print(f"Turn {turn['turn']} - {turn['timestamp']}")
        print(f"{'-'*60}")
        
        if show_full_prompt:
            print("\nPROMPT:")
            print(turn["prompt"])
        else:
            # Show abbreviated prompt
            prompt_lines = turn["prompt"].split("\n")
            print("\nPROMPT (abbreviated):")
            print(f"... {len(prompt_lines)} lines total ...")
            if "available moves" in turn["prompt"].lower():
                # Extract and show available moves section
                for i, line in enumerate(prompt_lines):
                    if "available moves" in line.lower():
                        print("\nAvailable moves section:")
                        for j in range(i, min(i+10, len(prompt_lines))):
                            print(prompt_lines[j])
                        break
        
        print("\nCOMPLETION:")
        print(turn["completion"])
        
        print(f"\nCHOSEN MOVE: {turn['chosen_move']}")
        
        if show_battle_state and turn.get("battle_state"):
            print("\nBATTLE STATE:")
            state = turn["battle_state"]
            print(f"  Active Pokemon: {state.get('active_pokemon', 'None')}")
            print(f"  Opponent Active: {state.get('opponent_active_pokemon', 'None')}")
            print(f"  Team Status: {state.get('team_status', {})}")
            print(f"  Opponent Team Status: {state.get('opponent_team_status', {})}")
    
    def display_battle_comparison(self, battle_dir: str) -> None:
        """Display a side-by-side comparison of both players' logs."""
        battle_dir_path = Path(battle_dir)
        battle_log_path = battle_dir_path / "battle_log.json"
        
        if not battle_log_path.exists():
            print("Battle log not found")
            return
        
        with open(battle_log_path, "r") as f:
            data = json.load(f)
        
        players = list(data["players"].keys())
        if len(players) != 2:
            print("Battle comparison requires exactly 2 players")
            return
        
        print(f"\n{'='*120}")
        print(f"Battle Comparison: {players[0]} vs {players[1]}")
        print(f"Battle ID: {data['battle_id']}")
        print(f"{'='*120}\n")
        
        # Merge turns from both players
        all_turns = []
        for player in players:
            for turn in data["players"][player]["turns"]:
                all_turns.append({
                    "player": player,
                    "model": data["players"][player]["model"],
                    **turn
                })
        
        # Sort by turn number
        all_turns.sort(key=lambda x: (x["turn"], x["timestamp"]))
        
        # Display turns
        current_turn = -1
        for turn_data in all_turns:
            if turn_data["turn"] != current_turn:
                current_turn = turn_data["turn"]
                print(f"\n{'='*120}")
                print(f"TURN {current_turn}")
                print(f"{'='*120}")
            
            print(f"\n[{turn_data['player']} - {turn_data['model']}]")
            print(f"Chosen Move: {turn_data['chosen_move']}")
            print(f"Reasoning: {turn_data['completion'][:200]}..." if len(turn_data['completion']) > 200 else f"Reasoning: {turn_data['completion']}")
        
        if data["outcome"]:
            print(f"\n{'='*120}")
            print(f"FINAL OUTCOME: {data['outcome']['winner']} wins!")
            print(f"{'='*120}\n")


def main():
    viewer = BattleLogViewer()
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python battle_log_viewer.py list")
        print("  python battle_log_viewer.py view <battle_dir> <player_name> [--full-prompt] [--battle-state]")
        print("  python battle_log_viewer.py compare <battle_dir>")
        return
    
    command = sys.argv[1]
    
    if command == "list":
        battles = viewer.list_battles()
        if not battles:
            print("No battle logs found.")
        else:
            print("\nAvailable Battle Logs:")
            print(f"{'Battle ID':<30} {'Players':<40} {'Winner':<20} {'Directory'}")
            print("-" * 120)
            for battle in battles:
                players_str = " vs ".join(battle["players"])
                print(f"{battle['battle_id']:<30} {players_str:<40} {battle['winner']:<20} {battle['dir']}")
    
    elif command == "view":
        if len(sys.argv) < 4:
            print("Usage: python battle_log_viewer.py view <battle_dir> <player_name> [--full-prompt] [--battle-state]")
            return
        
        battle_dir = sys.argv[2]
        player_name = sys.argv[3]
        show_full_prompt = "--full-prompt" in sys.argv
        show_battle_state = "--battle-state" in sys.argv
        
        viewer.display_player_log(battle_dir, player_name, show_full_prompt, show_battle_state)
    
    elif command == "compare":
        if len(sys.argv) < 3:
            print("Usage: python battle_log_viewer.py compare <battle_dir>")
            return
        
        battle_dir = sys.argv[2]
        viewer.display_battle_comparison(battle_dir)


if __name__ == "__main__":
    main()