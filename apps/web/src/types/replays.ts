/**
 * Types for replay data and battle logs
 */

export interface ReplayMatch {
  id: string
  battleId: string
  timestamp: string
  outcome: 'Win' | 'Loss' | 'Unknown'
  termination: 'normal' | 'timeout' | 'forfeit'
  turns: number
  agentName: string
  agentModel: string
  opponentName: string
  agentTeam: string[]
  opponentTeam: string[]
  replayUrl: string
  hasReplayHtml: boolean
  hasReasoning: boolean
}

export interface ReplayManifest {
  generated: string
  replays: ReplayMatch[]
  byAgent: Record<string, ReplayMatch[]>
}

export interface BattleState {
  turn: number
  weather: string | null
  terrain: string | null
  player_side_conditions: string[]
  opponent_side_conditions: string[]
  trapped: boolean
  can_tera: boolean
  active_pokemon: PokemonState
  opponent_active: OpponentPokemonState
  team: PokemonState[]
  opponent_team: OpponentPokemonState[]
}

export interface PokemonState {
  species: string
  types: string[]
  hp_percent: number
  status: string | null
  boosts: Record<string, number>
  fainted: boolean
  ability: string
  item: string
  moves: MoveState[]
}

export interface OpponentPokemonState {
  species: string
  types: string[]
  hp_percent: number
  status: string | null
  boosts: Record<string, number>
  fainted: boolean
  known_ability: string | null
  possible_abilities: string[]
  known_item: string
  revealed_moves: string[]
}

export interface MoveState {
  id: string
  type: string
  base_power: number
  accuracy: number
  pp: number
  category: 'PHYSICAL' | 'SPECIAL' | 'STATUS'
}

export interface TurnTrace {
  turn: number
  timestamp: string
  prompt: string
  completion: string
  chosen_move: string
  battle_state: BattleState
}

export interface PlayerLog {
  battle_id: string
  player_name: string
  model: string
  turns: TurnTrace[]
  outcome: {
    winner: string | null
    end_timestamp: string
    details: Record<string, unknown>
  } | null
}

