from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional

from poke_env.data.normalize import to_id_str


@dataclass(frozen=True)
class RandbatsRole:
    name: str
    moves: List[str]
    abilities: List[str]
    items: List[str]
    tera_types: List[str]
    evs: Dict[str, int]
    ivs: Dict[str, int]


@dataclass(frozen=True)
class RandbatsSpecies:
    name: str
    level: int
    abilities: List[str]
    items: List[str]
    roles: List[RandbatsRole]
    evs: Dict[str, int]
    ivs: Dict[str, int]


class RandbatsDex:
    """Gen 9 randbats data helper.

    Loads the curated randbats JSON and provides simple role/move filtering for
    opponent inference during battles.
    """

    def __init__(self, raw_data: Mapping[str, Any]):
        self._raw = dict(raw_data)
        self._id_to_name = {to_id_str(name): name for name in self._raw.keys()}

    @classmethod
    def load_gen9(cls) -> "RandbatsDex":
        path = os.path.join(
            os.path.dirname(os.path.realpath(__file__)),
            "static",
            "randbats",
            "gen9randombattle.json",
        )
        with open(path, "r", encoding="utf-8") as handle:
            return cls(json.load(handle))

    def _get_raw_species(self, species: str) -> Optional[Mapping[str, Any]]:
        name = self._id_to_name.get(to_id_str(species))
        if not name:
            return None
        return self._raw.get(name)

    @staticmethod
    def _merge_stats(
        base_stats: Optional[Mapping[str, int]],
        role_stats: Optional[Mapping[str, int]],
    ) -> Dict[str, int]:
        merged: Dict[str, int] = {}
        if base_stats:
            merged.update(base_stats)
        if role_stats:
            merged.update(role_stats)
        return merged

    def get_species(self, species: str) -> Optional[RandbatsSpecies]:
        data = self._get_raw_species(species)
        if not data:
            return None
        canonical_name = self._id_to_name.get(to_id_str(species), species)

        base_evs = data.get("evs", {}) or {}
        base_ivs = data.get("ivs", {}) or {}
        roles: List[RandbatsRole] = []
        for role_name, role_data in (data.get("roles") or {}).items():
            roles.append(
                RandbatsRole(
                    name=role_name,
                    moves=list(role_data.get("moves", [])),
                    abilities=list(role_data.get("abilities", data.get("abilities", []))),
                    items=list(role_data.get("items", data.get("items", []))),
                    tera_types=list(role_data.get("teraTypes", [])),
                    evs=self._merge_stats(base_evs, role_data.get("evs")),
                    ivs=self._merge_stats(base_ivs, role_data.get("ivs")),
                )
            )

        return RandbatsSpecies(
            name=canonical_name,
            level=int(data.get("level", 100)),
            abilities=list(data.get("abilities", [])),
            items=list(data.get("items", [])),
            roles=roles,
            evs=dict(base_evs),
            ivs=dict(base_ivs),
        )

    def filter_roles_by_moves(
        self, species: str, known_moves: Iterable[str]
    ) -> List[RandbatsRole]:
        data = self.get_species(species)
        if not data:
            return []

        normalized_known = {to_id_str(move) for move in known_moves if move}
        if not normalized_known:
            return list(data.roles)

        matches: List[RandbatsRole] = []
        for role in data.roles:
            normalized_moves = {to_id_str(move) for move in role.moves}
            if normalized_known.issubset(normalized_moves):
                matches.append(role)

        return matches

    def summarize_roles(
        self, species: str, known_moves: Iterable[str] = ()
    ) -> List[Dict[str, Any]]:
        roles = self.filter_roles_by_moves(species, known_moves)
        return [
            {
                "role": role.name,
                "moves": role.moves,
                "abilities": role.abilities,
                "items": role.items,
                "tera_types": role.tera_types,
                "evs": role.evs,
                "ivs": role.ivs,
            }
            for role in roles
        ]

    def possible_moves(self, species: str) -> List[str]:
        data = self.get_species(species)
        if not data:
            return []
        moves: List[str] = []
        for role in data.roles:
            moves.extend(role.moves)
        return sorted({to_id_str(move) for move in moves})
