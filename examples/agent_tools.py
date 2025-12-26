"""Tools for the Pokemon battle AI agent.

This module provides tool definitions and implementations that the AI agent
can call during battle reasoning to look up damage calculations, type matchups,
and opponent role information from the randbats dictionary.
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from poke_env.data import GenData, to_id_str
from poke_env.data.randbats import RandbatsDex
from poke_env.damage_calc import DamageCalculator


# Load static data
RANDBATS_DEX = RandbatsDex.load_gen9()
DAMAGE_CALC = DamageCalculator(gen=9)
GEN_DATA = GenData.from_gen(9)


# Type effectiveness mapping from typechart values
# 0 = normal (1x), 1 = super effective (2x), 2 = not very effective (0.5x), 3 = immune (0x)
EFFECTIVENESS_MAP = {0: 1.0, 1: 2.0, 2: 0.5, 3: 0.0}


# Comprehensive ability database for competitive Pokemon
# Format: ability_id -> {name, description, battle_effect, category}
ABILITY_DATABASE = {
    # Immunities and Absorptions
    "levitate": {"name": "Levitate", "description": "Immune to Ground-type moves.", "battle_effect": "Ground immunity", "category": "immunity"},
    "flashfire": {"name": "Flash Fire", "description": "Fire-type moves boost Fire moves by 50% instead of dealing damage.", "battle_effect": "Fire immunity + boost", "category": "immunity"},
    "waterabsorb": {"name": "Water Absorb", "description": "Water-type moves heal 25% HP instead of dealing damage.", "battle_effect": "Water immunity + heal", "category": "immunity"},
    "voltabsorb": {"name": "Volt Absorb", "description": "Electric-type moves heal 25% HP instead of dealing damage.", "battle_effect": "Electric immunity + heal", "category": "immunity"},
    "lightningrod": {"name": "Lightning Rod", "description": "Draws Electric moves to self, immune and boosts SpA.", "battle_effect": "Electric immunity + SpA boost", "category": "immunity"},
    "stormdrain": {"name": "Storm Drain", "description": "Draws Water moves to self, immune and boosts SpA.", "battle_effect": "Water immunity + SpA boost", "category": "immunity"},
    "motordrive": {"name": "Motor Drive", "description": "Electric-type moves boost Speed instead of dealing damage.", "battle_effect": "Electric immunity + Speed boost", "category": "immunity"},
    "sapsipper": {"name": "Sap Sipper", "description": "Grass-type moves boost Attack instead of dealing damage.", "battle_effect": "Grass immunity + Atk boost", "category": "immunity"},
    "dryskin": {"name": "Dry Skin", "description": "Water heals 25%, Fire deals 25% extra. Rain heals, Sun damages.", "battle_effect": "Water immunity, Fire weakness", "category": "immunity"},
    "eartheater": {"name": "Earth Eater", "description": "Ground-type moves heal 25% HP instead of dealing damage.", "battle_effect": "Ground immunity + heal", "category": "immunity"},
    "wellbakedbody": {"name": "Well-Baked Body", "description": "Fire-type moves boost Defense by 2 stages instead of dealing damage.", "battle_effect": "Fire immunity + Def boost", "category": "immunity"},

    # Stat Boosting Abilities
    "intimidate": {"name": "Intimidate", "description": "Lowers opponent's Attack by 1 stage on switch-in.", "battle_effect": "Lowers foe Atk on entry", "category": "stat_change"},
    "download": {"name": "Download", "description": "Boosts Atk or SpA based on opponent's lower defense stat.", "battle_effect": "Boosts Atk or SpA on entry", "category": "stat_change"},
    "intrepidsword": {"name": "Intrepid Sword", "description": "Boosts Attack by 1 stage on switch-in (once per battle).", "battle_effect": "Boosts Atk on entry", "category": "stat_change"},
    "dauntlessshield": {"name": "Dauntless Shield", "description": "Boosts Defense by 1 stage on switch-in (once per battle).", "battle_effect": "Boosts Def on entry", "category": "stat_change"},
    "beastboost": {"name": "Beast Boost", "description": "Boosts highest stat by 1 stage when KOing an opponent.", "battle_effect": "Stat boost on KO", "category": "stat_change"},
    "moxie": {"name": "Moxie", "description": "Boosts Attack by 1 stage when KOing an opponent.", "battle_effect": "Atk boost on KO", "category": "stat_change"},
    "soulheart": {"name": "Soul-Heart", "description": "Boosts SpA by 1 stage when any Pokemon faints.", "battle_effect": "SpA boost on any faint", "category": "stat_change"},
    "speedboost": {"name": "Speed Boost", "description": "Speed increases by 1 stage at the end of each turn.", "battle_effect": "Auto Speed boost each turn", "category": "stat_change"},
    "moody": {"name": "Moody", "description": "Raises one stat by 2 stages and lowers another by 1 each turn.", "battle_effect": "Random stat changes each turn", "category": "stat_change"},
    "competitive": {"name": "Competitive", "description": "SpA rises by 2 stages when a stat is lowered.", "battle_effect": "+2 SpA when stats lowered", "category": "stat_change"},
    "defiant": {"name": "Defiant", "description": "Attack rises by 2 stages when a stat is lowered.", "battle_effect": "+2 Atk when stats lowered", "category": "stat_change"},
    "contrary": {"name": "Contrary", "description": "Stat changes are reversed (boosts become drops and vice versa).", "battle_effect": "Inverts all stat changes", "category": "stat_change"},
    "unaware": {"name": "Unaware", "description": "Ignores opponent's stat changes when attacking or being attacked.", "battle_effect": "Ignores foe stat boosts", "category": "stat_change"},
    "clearbody": {"name": "Clear Body", "description": "Prevents stat reduction from opponent's moves/abilities.", "battle_effect": "Prevents stat drops", "category": "stat_change"},
    "whitesmoke": {"name": "White Smoke", "description": "Prevents stat reduction from opponent's moves/abilities.", "battle_effect": "Prevents stat drops", "category": "stat_change"},

    # Damage Modifying Abilities
    "hugepower": {"name": "Huge Power", "description": "Doubles Attack stat.", "battle_effect": "2x Attack", "category": "damage"},
    "purepower": {"name": "Pure Power", "description": "Doubles Attack stat.", "battle_effect": "2x Attack", "category": "damage"},
    "adaptability": {"name": "Adaptability", "description": "STAB bonus is 2x instead of 1.5x.", "battle_effect": "2x STAB bonus", "category": "damage"},
    "technician": {"name": "Technician", "description": "Moves with 60 or less base power deal 1.5x damage.", "battle_effect": "1.5x for weak moves", "category": "damage"},
    "sheerforce": {"name": "Sheer Force", "description": "Moves with secondary effects deal 1.3x damage but lose effects.", "battle_effect": "1.3x damage, no secondary effects", "category": "damage"},
    "toughclaws": {"name": "Tough Claws", "description": "Contact moves deal 1.3x damage.", "battle_effect": "1.3x contact move damage", "category": "damage"},
    "strongjaw": {"name": "Strong Jaw", "description": "Biting moves deal 1.5x damage.", "battle_effect": "1.5x bite move damage", "category": "damage"},
    "ironfist": {"name": "Iron Fist", "description": "Punching moves deal 1.2x damage.", "battle_effect": "1.2x punch move damage", "category": "damage"},
    "megalauncher": {"name": "Mega Launcher", "description": "Pulse and aura moves deal 1.5x damage.", "battle_effect": "1.5x pulse/aura moves", "category": "damage"},
    "sandforce": {"name": "Sand Force", "description": "Rock/Ground/Steel moves deal 1.3x damage in sand.", "battle_effect": "1.3x in sand (Rock/Ground/Steel)", "category": "damage"},
    "analytic": {"name": "Analytic", "description": "Deals 1.3x damage if moving last.", "battle_effect": "1.3x if moving last", "category": "damage"},
    "sniper": {"name": "Sniper", "description": "Critical hits deal 2.25x damage instead of 1.5x.", "battle_effect": "Stronger crits", "category": "damage"},
    "rockhead": {"name": "Rock Head", "description": "No recoil damage from recoil moves.", "battle_effect": "No recoil", "category": "damage"},
    "reckless": {"name": "Reckless", "description": "Recoil moves deal 1.2x damage.", "battle_effect": "1.2x recoil moves", "category": "damage"},
    "guts": {"name": "Guts", "description": "Attack is 1.5x when statused. Burn Atk drop ignored.", "battle_effect": "1.5x Atk when statused", "category": "damage"},
    "toxicboost": {"name": "Toxic Boost", "description": "Attack is 1.5x when poisoned.", "battle_effect": "1.5x Atk when poisoned", "category": "damage"},
    "flareboost": {"name": "Flare Boost", "description": "SpA is 1.5x when burned.", "battle_effect": "1.5x SpA when burned", "category": "damage"},

    # Defensive Abilities
    "multiscale": {"name": "Multiscale", "description": "Halves damage taken at full HP.", "battle_effect": "0.5x damage at full HP", "category": "defense"},
    "shadowshield": {"name": "Shadow Shield", "description": "Halves damage taken at full HP.", "battle_effect": "0.5x damage at full HP", "category": "defense"},
    "furcoat": {"name": "Fur Coat", "description": "Halves damage from physical moves.", "battle_effect": "0.5x physical damage", "category": "defense"},
    "icescales": {"name": "Ice Scales", "description": "Halves damage from special moves.", "battle_effect": "0.5x special damage", "category": "defense"},
    "marvelscale": {"name": "Marvel Scale", "description": "Defense is 1.5x when statused.", "battle_effect": "1.5x Def when statused", "category": "defense"},
    "solidrock": {"name": "Solid Rock", "description": "Super effective moves deal 0.75x damage.", "battle_effect": "Reduces super effective damage", "category": "defense"},
    "filter": {"name": "Filter", "description": "Super effective moves deal 0.75x damage.", "battle_effect": "Reduces super effective damage", "category": "defense"},
    "prismarmor": {"name": "Prism Armor", "description": "Super effective moves deal 0.75x damage.", "battle_effect": "Reduces super effective damage", "category": "defense"},
    "thickfat": {"name": "Thick Fat", "description": "Fire and Ice moves deal 0.5x damage.", "battle_effect": "Resists Fire and Ice", "category": "defense"},
    "heatproof": {"name": "Heatproof", "description": "Fire moves deal 0.5x damage. Burn damage halved.", "battle_effect": "Resists Fire, reduced burn", "category": "defense"},
    "fluffy": {"name": "Fluffy", "description": "Contact moves deal 0.5x, Fire moves deal 2x damage.", "battle_effect": "Resists contact, weak to Fire", "category": "defense"},
    "stamina": {"name": "Stamina", "description": "Defense rises by 1 stage when hit by an attack.", "battle_effect": "+1 Def when hit", "category": "defense"},
    "waterbubble": {"name": "Water Bubble", "description": "Fire damage halved, Water moves doubled, can't be burned.", "battle_effect": "Fire resist, 2x Water, burn immune", "category": "defense"},

    # Priority/Speed Abilities
    "prankster": {"name": "Prankster", "description": "Status moves gain +1 priority. Doesn't affect Dark-types.", "battle_effect": "+1 priority on status moves", "category": "priority"},
    "galewings": {"name": "Gale Wings", "description": "Flying moves gain +1 priority at full HP.", "battle_effect": "+1 priority Flying at full HP", "category": "priority"},
    "triage": {"name": "Triage", "description": "Healing moves gain +3 priority.", "battle_effect": "+3 priority on healing", "category": "priority"},
    "quickdraw": {"name": "Quick Draw", "description": "30% chance to move first.", "battle_effect": "30% chance to go first", "category": "priority"},
    "stall": {"name": "Stall", "description": "Always moves last.", "battle_effect": "Always last", "category": "priority"},
    "quickfeet": {"name": "Quick Feet", "description": "Speed is 1.5x when statused.", "battle_effect": "1.5x Speed when statused", "category": "priority"},
    "chlorophyll": {"name": "Chlorophyll", "description": "Speed doubles in sun.", "battle_effect": "2x Speed in sun", "category": "priority"},
    "swiftswim": {"name": "Swift Swim", "description": "Speed doubles in rain.", "battle_effect": "2x Speed in rain", "category": "priority"},
    "sandrush": {"name": "Sand Rush", "description": "Speed doubles in sand.", "battle_effect": "2x Speed in sand", "category": "priority"},
    "slushrush": {"name": "Slush Rush", "description": "Speed doubles in snow/hail.", "battle_effect": "2x Speed in snow", "category": "priority"},
    "surgesurfer": {"name": "Surge Surfer", "description": "Speed doubles on Electric Terrain.", "battle_effect": "2x Speed on Electric Terrain", "category": "priority"},
    "unburden": {"name": "Unburden", "description": "Speed doubles when item is lost.", "battle_effect": "2x Speed when item lost", "category": "priority"},

    # Weather/Terrain Abilities
    "drought": {"name": "Drought", "description": "Sets sun for 5 turns on switch-in.", "battle_effect": "Auto sun", "category": "weather"},
    "drizzle": {"name": "Drizzle", "description": "Sets rain for 5 turns on switch-in.", "battle_effect": "Auto rain", "category": "weather"},
    "sandstream": {"name": "Sand Stream", "description": "Sets sandstorm for 5 turns on switch-in.", "battle_effect": "Auto sand", "category": "weather"},
    "snowwarning": {"name": "Snow Warning", "description": "Sets snow for 5 turns on switch-in.", "battle_effect": "Auto snow", "category": "weather"},
    "electricsurge": {"name": "Electric Surge", "description": "Sets Electric Terrain for 5 turns on switch-in.", "battle_effect": "Auto Electric Terrain", "category": "weather"},
    "psychicsurge": {"name": "Psychic Surge", "description": "Sets Psychic Terrain for 5 turns on switch-in.", "battle_effect": "Auto Psychic Terrain", "category": "weather"},
    "grassysurge": {"name": "Grassy Surge", "description": "Sets Grassy Terrain for 5 turns on switch-in.", "battle_effect": "Auto Grassy Terrain", "category": "weather"},
    "mistysurge": {"name": "Misty Surge", "description": "Sets Misty Terrain for 5 turns on switch-in.", "battle_effect": "Auto Misty Terrain", "category": "weather"},
    "desolateland": {"name": "Desolate Land", "description": "Sets extreme sun. Water moves fail.", "battle_effect": "Extreme sun, blocks Water", "category": "weather"},
    "primordialsea": {"name": "Primordial Sea", "description": "Sets extreme rain. Fire moves fail.", "battle_effect": "Extreme rain, blocks Fire", "category": "weather"},
    "deltastream": {"name": "Delta Stream", "description": "Removes Flying weaknesses.", "battle_effect": "Flying type loses weaknesses", "category": "weather"},

    # Recovery/Sustain Abilities
    "regenerator": {"name": "Regenerator", "description": "Heals 33% HP on switch-out.", "battle_effect": "Heal on switch", "category": "recovery"},
    "naturalcure": {"name": "Natural Cure", "description": "Cures status on switch-out.", "battle_effect": "Cure status on switch", "category": "recovery"},
    "poisonheal": {"name": "Poison Heal", "description": "Heals 12.5% HP each turn when poisoned instead of taking damage.", "battle_effect": "Poison heals instead", "category": "recovery"},
    "icebody": {"name": "Ice Body", "description": "Heals 6.25% HP each turn in snow/hail.", "battle_effect": "Heal in snow", "category": "recovery"},
    "raindish": {"name": "Rain Dish", "description": "Heals 6.25% HP each turn in rain.", "battle_effect": "Heal in rain", "category": "recovery"},

    # Status/Disruption Abilities
    "magicbounce": {"name": "Magic Bounce", "description": "Reflects status moves back at user.", "battle_effect": "Reflects status moves", "category": "disruption"},
    "magicguard": {"name": "Magic Guard", "description": "Only takes damage from direct attacks.", "battle_effect": "Immune to indirect damage", "category": "disruption"},
    "sturdy": {"name": "Sturdy", "description": "Cannot be OHKOed from full HP. Survives with 1 HP.", "battle_effect": "Survives OHKO at full HP", "category": "disruption"},
    "disguise": {"name": "Disguise", "description": "First hit is blocked (breaks disguise).", "battle_effect": "Blocks first hit", "category": "disruption"},
    "wonderguard": {"name": "Wonder Guard", "description": "Only super effective moves can hit.", "battle_effect": "Only SE moves hit", "category": "disruption"},
    "moldbreaker": {"name": "Mold Breaker", "description": "Ignores target's ability when attacking.", "battle_effect": "Ignores defensive abilities", "category": "disruption"},
    "teravolt": {"name": "Teravolt", "description": "Ignores target's ability when attacking.", "battle_effect": "Ignores defensive abilities", "category": "disruption"},
    "turboblaze": {"name": "Turboblaze", "description": "Ignores target's ability when attacking.", "battle_effect": "Ignores defensive abilities", "category": "disruption"},
    "neutralizinggas": {"name": "Neutralizing Gas", "description": "Suppresses all other abilities while on field.", "battle_effect": "Disables all abilities", "category": "disruption"},
    "pressure": {"name": "Pressure", "description": "Opponent's moves use 2 PP instead of 1.", "battle_effect": "Double PP usage", "category": "disruption"},
    "shadowtag": {"name": "Shadow Tag", "description": "Prevents opponent from switching (except Ghost-types).", "battle_effect": "Traps opponent", "category": "disruption"},
    "arenatrap": {"name": "Arena Trap", "description": "Prevents grounded opponents from switching.", "battle_effect": "Traps grounded foes", "category": "disruption"},
    "magnetpull": {"name": "Magnet Pull", "description": "Prevents Steel-types from switching.", "battle_effect": "Traps Steel-types", "category": "disruption"},

    # Contact/Attack Trigger Abilities
    "roughskin": {"name": "Rough Skin", "description": "Attacker takes 12.5% damage on contact.", "battle_effect": "Damages attacker on contact", "category": "contact"},
    "ironbarbs": {"name": "Iron Barbs", "description": "Attacker takes 12.5% damage on contact.", "battle_effect": "Damages attacker on contact", "category": "contact"},
    "flamebody": {"name": "Flame Body", "description": "30% chance to burn attacker on contact.", "battle_effect": "May burn on contact", "category": "contact"},
    "static": {"name": "Static", "description": "30% chance to paralyze attacker on contact.", "battle_effect": "May paralyze on contact", "category": "contact"},
    "poisonpoint": {"name": "Poison Point", "description": "30% chance to poison attacker on contact.", "battle_effect": "May poison on contact", "category": "contact"},
    "effectspore": {"name": "Effect Spore", "description": "30% chance to inflict status on contact.", "battle_effect": "May status on contact", "category": "contact"},
    "cursedbody": {"name": "Cursed Body", "description": "30% chance to disable move that hit.", "battle_effect": "May disable attacker's move", "category": "contact"},
    "gooey": {"name": "Gooey", "description": "Lowers attacker's Speed on contact.", "battle_effect": "Lowers Speed on contact", "category": "contact"},
    "tanglinghair": {"name": "Tangling Hair", "description": "Lowers attacker's Speed on contact.", "battle_effect": "Lowers Speed on contact", "category": "contact"},
    "perishbody": {"name": "Perish Body", "description": "Both Pokemon faint in 3 turns if hit by contact.", "battle_effect": "Perish Song on contact", "category": "contact"},

    # Type-changing Abilities
    "protean": {"name": "Protean", "description": "Changes type to match move used (once per switch-in).", "battle_effect": "Type changes to move type", "category": "type"},
    "libero": {"name": "Libero", "description": "Changes type to match move used (once per switch-in).", "battle_effect": "Type changes to move type", "category": "type"},
    "colorchange": {"name": "Color Change", "description": "Changes type to match move that hit it.", "battle_effect": "Type changes when hit", "category": "type"},
    "multitype": {"name": "Multitype", "description": "Type changes based on held Plate.", "battle_effect": "Type matches held Plate", "category": "type"},
    "rkssystem": {"name": "RKS System", "description": "Type changes based on held Memory.", "battle_effect": "Type matches held Memory", "category": "type"},

    # Signature/Unique Abilities
    "protosynthesis": {"name": "Protosynthesis", "description": "Boosts highest stat by 30% (50% for Speed) in sun or with Booster Energy.", "battle_effect": "Boosts best stat in sun", "category": "signature"},
    "quarkdrive": {"name": "Quark Drive", "description": "Boosts highest stat by 30% (50% for Speed) on Electric Terrain or with Booster Energy.", "battle_effect": "Boosts best stat on E-Terrain", "category": "signature"},
    "orichalcumpulse": {"name": "Orichalcum Pulse", "description": "Sets sun, 1.33x Attack in sun.", "battle_effect": "Auto sun + Atk boost", "category": "signature"},
    "hadronengine": {"name": "Hadron Engine", "description": "Sets Electric Terrain, 1.33x SpA on terrain.", "battle_effect": "Auto E-Terrain + SpA boost", "category": "signature"},
    "swordofruin": {"name": "Sword of Ruin", "description": "Lowers Defense of all other Pokemon by 25%.", "battle_effect": "Lowers all Def by 25%", "category": "signature"},
    "beadsofruin": {"name": "Beads of Ruin", "description": "Lowers SpD of all other Pokemon by 25%.", "battle_effect": "Lowers all SpD by 25%", "category": "signature"},
    "tabletsofruin": {"name": "Tablets of Ruin", "description": "Lowers Attack of all other Pokemon by 25%.", "battle_effect": "Lowers all Atk by 25%", "category": "signature"},
    "vesselofruin": {"name": "Vessel of Ruin", "description": "Lowers SpA of all other Pokemon by 25%.", "battle_effect": "Lowers all SpA by 25%", "category": "signature"},
    "thermalexchange": {"name": "Thermal Exchange", "description": "Boosts Attack when hit by Fire. Can't be burned.", "battle_effect": "Fire hits boost Atk, burn immune", "category": "signature"},
    "supremeoverlord": {"name": "Supreme Overlord", "description": "Atk/SpA boosted by 10% per fainted ally.", "battle_effect": "Stronger per fainted ally", "category": "signature"},
}


# Tool definitions for LLM function calling
TOOL_DEFINITIONS = [
    {
        "type": "function",
        "function": {
            "name": "calculate_damage",
            "description": "Calculate damage range for a move from attacker to defender. Returns damage percentages and KO probability.",
            "parameters": {
                "type": "object",
                "properties": {
                    "attacker_species": {
                        "type": "string",
                        "description": "The attacking Pokemon's species name (e.g., 'Dragapult', 'Garchomp')"
                    },
                    "defender_species": {
                        "type": "string",
                        "description": "The defending Pokemon's species name"
                    },
                    "move_name": {
                        "type": "string",
                        "description": "The move being used (e.g., 'Earthquake', 'Draco Meteor')"
                    },
                    "attacker_level": {
                        "type": "integer",
                        "description": "Attacker's level (default 100 for randbats)"
                    },
                    "defender_level": {
                        "type": "integer",
                        "description": "Defender's level (default 100 for randbats)"
                    },
                    "attacker_item": {
                        "type": "string",
                        "description": "Attacker's held item (optional)"
                    },
                    "defender_item": {
                        "type": "string",
                        "description": "Defender's held item (optional)"
                    },
                    "attacker_ability": {
                        "type": "string",
                        "description": "Attacker's ability (optional)"
                    },
                    "defender_ability": {
                        "type": "string",
                        "description": "Defender's ability (optional)"
                    },
                    "attacker_boosts": {
                        "type": "object",
                        "description": "Attacker's stat boosts (e.g., {'atk': 2, 'spe': 1})"
                    },
                    "defender_boosts": {
                        "type": "object",
                        "description": "Defender's stat boosts"
                    },
                    "defender_hp_percent": {
                        "type": "number",
                        "description": "Defender's current HP as percentage (0-100)"
                    }
                },
                "required": ["attacker_species", "defender_species", "move_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_type_effectiveness",
            "description": "Get type effectiveness multiplier for an attacking type against defending type(s). Returns 0, 0.25, 0.5, 1, 2, or 4.",
            "parameters": {
                "type": "object",
                "properties": {
                    "attacking_type": {
                        "type": "string",
                        "description": "The attacking move's type (e.g., 'Fire', 'Dragon', 'Electric')"
                    },
                    "defending_type1": {
                        "type": "string",
                        "description": "The defender's primary type"
                    },
                    "defending_type2": {
                        "type": "string",
                        "description": "The defender's secondary type (optional)"
                    }
                },
                "required": ["attacking_type", "defending_type1"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "lookup_pokemon_roles",
            "description": "Look up possible roles/sets for a Pokemon in Gen 9 Random Battles. Shows possible moves, items, abilities, and tera types for each role.",
            "parameters": {
                "type": "object",
                "properties": {
                    "species": {
                        "type": "string",
                        "description": "The Pokemon's species name (e.g., 'Dragapult', 'Garchomp')"
                    },
                    "known_moves": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Moves already revealed by this Pokemon, to filter possible roles"
                    }
                },
                "required": ["species"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_pokemon_info",
            "description": "Get basic information about a Pokemon species including base stats, types, and abilities.",
            "parameters": {
                "type": "object",
                "properties": {
                    "species": {
                        "type": "string",
                        "description": "The Pokemon's species name"
                    }
                },
                "required": ["species"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_move_info",
            "description": "Get information about a move including type, power, accuracy, and effects.",
            "parameters": {
                "type": "object",
                "properties": {
                    "move_name": {
                        "type": "string",
                        "description": "The move's name (e.g., 'Earthquake', 'Draco Meteor')"
                    }
                },
                "required": ["move_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_ability_info",
            "description": "Get information about a Pokemon ability and its battle effects. Critical for understanding immunities (Levitate, Flash Fire, Water Absorb), damage modifiers (Huge Power, Adaptability), and defensive effects (Multiscale, Sturdy).",
            "parameters": {
                "type": "object",
                "properties": {
                    "ability_name": {
                        "type": "string",
                        "description": "The ability's name (e.g., 'Levitate', 'Intimidate', 'Flash Fire')"
                    }
                },
                "required": ["ability_name"]
            }
        }
    }
]


def calculate_damage(
    attacker_species: str,
    defender_species: str,
    move_name: str,
    attacker_level: Optional[int] = None,
    defender_level: Optional[int] = None,
    attacker_item: Optional[str] = None,
    defender_item: Optional[str] = None,
    attacker_ability: Optional[str] = None,
    defender_ability: Optional[str] = None,
    attacker_boosts: Optional[Dict[str, int]] = None,
    defender_boosts: Optional[Dict[str, int]] = None,
    defender_hp_percent: Optional[float] = None,
) -> Dict[str, Any]:
    """Calculate damage for a move."""

    # Get randbats data for levels if not specified
    attacker_data = RANDBATS_DEX.get_species(attacker_species)
    defender_data = RANDBATS_DEX.get_species(defender_species)

    if attacker_level is None:
        attacker_level = attacker_data.level if attacker_data else 100
    if defender_level is None:
        defender_level = defender_data.level if defender_data else 100

    # Build attacker Pokemon dict
    attacker = {
        "name": attacker_data.name if attacker_data else attacker_species,
        "level": attacker_level,
    }
    if attacker_item:
        attacker["item"] = attacker_item
    if attacker_ability:
        attacker["ability"] = attacker_ability
    if attacker_boosts:
        attacker["boosts"] = attacker_boosts

    # Build defender Pokemon dict
    defender = {
        "name": defender_data.name if defender_data else defender_species,
        "level": defender_level,
    }
    if defender_item:
        defender["item"] = defender_item
    if defender_ability:
        defender["ability"] = defender_ability
    if defender_boosts:
        defender["boosts"] = defender_boosts

    # Build request
    request = {
        "attacker": attacker,
        "defender": defender,
        "move": {"name": move_name},
    }

    results = DAMAGE_CALC.calculate_batch([request])
    if not results or not results[0].ok:
        error = results[0].error if results else "Unknown error"
        return {"error": error}

    result = results[0].result or {}
    return {
        "description": result.get("desc", ""),
        "damage_range": result.get("range", []),
        "ko_chance": result.get("ko", {}).get("text", ""),
        "full_description": result.get("full_desc", ""),
    }


def get_type_effectiveness(
    attacking_type: str,
    defending_type1: str,
    defending_type2: Optional[str] = None,
) -> Dict[str, Any]:
    """Get type effectiveness multiplier."""

    type_chart = GEN_DATA.type_chart

    # poke-env's type_chart uses UPPERCASE keys and direct multipliers
    # Format: type_chart[DEFENDER_TYPE][ATTACKER_TYPE] = multiplier
    attacking_upper = attacking_type.strip().upper()
    defending1_upper = defending_type1.strip().upper()

    if defending1_upper not in type_chart:
        return {"error": f"Unknown type: {defending_type1}"}

    defender1_chart = type_chart[defending1_upper]
    if attacking_upper not in defender1_chart:
        return {"error": f"Unknown attacking type: {attacking_type}"}

    multiplier1 = defender1_chart[attacking_upper]
    final_multiplier = multiplier1

    if defending_type2:
        defending2_upper = defending_type2.strip().upper()
        if defending2_upper in type_chart:
            defender2_chart = type_chart[defending2_upper]
            if attacking_upper in defender2_chart:
                multiplier2 = defender2_chart[attacking_upper]
                final_multiplier = multiplier1 * multiplier2

    effectiveness_text = "neutral"
    if final_multiplier == 0:
        effectiveness_text = "immune"
    elif final_multiplier < 1:
        effectiveness_text = "not very effective"
    elif final_multiplier > 1:
        effectiveness_text = "super effective"

    return {
        "attacking_type": attacking_type.title(),
        "defending_types": [defending_type1] + ([defending_type2] if defending_type2 else []),
        "multiplier": final_multiplier,
        "effectiveness": effectiveness_text,
    }


def lookup_pokemon_roles(
    species: str,
    known_moves: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Look up possible roles for a Pokemon in randbats."""

    known_moves = known_moves or []
    roles = RANDBATS_DEX.summarize_roles(species, known_moves)

    if not roles:
        # Try to get basic species info even if no roles found
        species_data = RANDBATS_DEX.get_species(species)
        if species_data:
            return {
                "species": species_data.name,
                "level": species_data.level,
                "roles": [],
                "note": "No matching roles found for known moves",
            }
        return {"error": f"Pokemon not found in randbats data: {species}"}

    species_data = RANDBATS_DEX.get_species(species)
    return {
        "species": species_data.name if species_data else species,
        "level": species_data.level if species_data else 100,
        "roles": roles,
        "filtered_by_moves": known_moves if known_moves else None,
    }


def get_pokemon_info(species: str) -> Dict[str, Any]:
    """Get basic Pokemon information."""

    species_id = to_id_str(species)
    pokedex = GEN_DATA.pokedex

    if species_id not in pokedex:
        return {"error": f"Pokemon not found: {species}"}

    entry = pokedex[species_id]

    # Also get randbats level if available
    randbats_data = RANDBATS_DEX.get_species(species)

    return {
        "name": entry.get("name", species),
        "types": entry.get("types", []),
        "base_stats": entry.get("baseStats", {}),
        "abilities": list(entry.get("abilities", {}).values()),
        "randbats_level": randbats_data.level if randbats_data else None,
    }


def get_move_info(move_name: str) -> Dict[str, Any]:
    """Get move information."""

    move_id = to_id_str(move_name)
    moves = GEN_DATA.moves

    if move_id not in moves:
        return {"error": f"Move not found: {move_name}"}

    entry = moves[move_id]

    return {
        "name": entry.get("name", move_name),
        "type": entry.get("type", "???"),
        "category": entry.get("category", "???"),
        "base_power": entry.get("basePower", 0),
        "accuracy": entry.get("accuracy", True),
        "pp": entry.get("pp", 0),
        "priority": entry.get("priority", 0),
        "description": entry.get("desc", entry.get("shortDesc", "")),
        "flags": list(entry.get("flags", {}).keys()),
    }


def get_ability_info(ability_name: str) -> Dict[str, Any]:
    """Get information about an ability and its battle effects."""

    ability_id = to_id_str(ability_name)

    if ability_id in ABILITY_DATABASE:
        return ABILITY_DATABASE[ability_id]

    # Return a generic response for unknown abilities
    return {
        "name": ability_name,
        "description": "Ability effect not in database. Use lookup_pokemon_roles to see what abilities a Pokemon can have.",
        "battle_effect": "Unknown",
        "category": "unknown",
    }


def execute_tool(tool_name: str, arguments: Dict[str, Any]) -> str:
    """Execute a tool by name with the given arguments. Returns JSON string."""

    tool_functions = {
        "calculate_damage": calculate_damage,
        "get_type_effectiveness": get_type_effectiveness,
        "lookup_pokemon_roles": lookup_pokemon_roles,
        "get_pokemon_info": get_pokemon_info,
        "get_move_info": get_move_info,
        "get_ability_info": get_ability_info,
    }

    if tool_name not in tool_functions:
        return json.dumps({"error": f"Unknown tool: {tool_name}"})

    try:
        result = tool_functions[tool_name](**arguments)
        return json.dumps(result, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})
