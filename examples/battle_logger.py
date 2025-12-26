import json
import os
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path


class BattleLogger:
    def __init__(self, log_dir: str = "battle_logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        self.active_battles: Dict[str, Dict[str, Any]] = {}
    
    def start_battle(self, battle_id: str, player1_name: str, player1_model: str, 
                     player2_name: str, player2_model: str) -> None:
        timestamp = datetime.now().isoformat()
        self.active_battles[battle_id] = {
            "battle_id": battle_id,
            "timestamp": timestamp,
            "players": {
                player1_name: {
                    "model": player1_model,
                    "turns": []
                },
                player2_name: {
                    "model": player2_model,
                    "turns": []
                }
            },
            "outcome": None
        }
    
    def log_turn(self, battle_id: str, player_name: str, turn_number: int,
                 prompt: str, completion: str, chosen_move: str, 
                 battle_state: Optional[Dict[str, Any]] = None) -> None:
        if battle_id not in self.active_battles:
            return
        
        turn_data = {
            "turn": turn_number,
            "timestamp": datetime.now().isoformat(),
            "prompt": prompt,
            "completion": completion,
            "chosen_move": chosen_move,
            "battle_state": battle_state or {}
        }
        
        self.active_battles[battle_id]["players"][player_name]["turns"].append(turn_data)
    
    def end_battle(self, battle_id: str, winner: Optional[str] = None, 
                   outcome_details: Optional[Dict[str, Any]] = None) -> None:
        if battle_id not in self.active_battles:
            return
        
        self.active_battles[battle_id]["outcome"] = {
            "winner": winner,
            "end_timestamp": datetime.now().isoformat(),
            "details": outcome_details or {}
        }
        
        # Save the battle log
        self._save_battle_log(battle_id)
        
        # Remove from active battles
        del self.active_battles[battle_id]
    
    def _save_battle_log(self, battle_id: str) -> None:
        battle_data = self.active_battles[battle_id]
        timestamp = battle_data["timestamp"].replace(":", "-").replace(".", "-")
        
        # Create a directory for this battle
        battle_dir = self.log_dir / f"battle_{timestamp}_{battle_id}"
        battle_dir.mkdir(exist_ok=True)
        
        # Save the complete battle log
        with open(battle_dir / "battle_log.json", "w") as f:
            json.dump(battle_data, f, indent=2)
        
        # Save individual player logs
        for player_name, player_data in battle_data["players"].items():
            player_file = battle_dir / f"{player_name}_log.json"
            with open(player_file, "w") as f:
                player_log = {
                    "battle_id": battle_id,
                    "player_name": player_name,
                    "model": player_data["model"],
                    "turns": player_data["turns"],
                    "outcome": battle_data["outcome"]
                }
                json.dump(player_log, f, indent=2)
    
    def get_player_log(self, battle_id: str, player_name: str) -> Optional[Dict[str, Any]]:
        if battle_id in self.active_battles:
            return self.active_battles[battle_id]["players"].get(player_name)
        return None