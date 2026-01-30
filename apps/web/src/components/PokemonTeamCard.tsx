/**
 * Pokemon Team Card Components
 * Displays Pokemon teams with enhanced visuals including sprites, types, items, and moves
 */

import { Card, Text, Flex } from '@tremor/react'
import {
  getPokemonSprite,
  getTypeIcon,
  getItemIcon,
  getTypeColors,
} from '../utils/sprites'
import type { PokemonDetails } from '../data/sample-teams'
import { getPokemonTypes } from '../data/sample-teams'
import type { PokemonType } from '../utils/sprites'

// Type badge component using PSD type icons
export function TypeBadge({ type, size = 'sm' }: { type: PokemonType; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4',
    md: 'h-5',
    lg: 'h-6',
  }
  
  return (
    <img
      src={getTypeIcon(type)}
      alt={`${type} type`}
      className={`${sizeClasses[size]} object-contain`}
      loading="lazy"
    />
  )
}

// Type badge with text fallback
export function TypeBadgeWithText({ type, size = 'sm' }: { type: PokemonType; size?: 'sm' | 'md' }) {
  const colors = getTypeColors(type)
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded ${colors.bg} ${colors.text} ${sizeClasses[size]} font-medium`}>
      <img
        src={getTypeIcon(type)}
        alt=""
        className="h-3 object-contain"
        loading="lazy"
      />
      <span>{type}</span>
    </span>
  )
}

// Move pill with type icon
export function MovePill({ name, type }: { name: string; type: PokemonType }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
      <img
        src={getTypeIcon(type)}
        alt={`${type} type`}
        className="h-3.5 object-contain"
        loading="lazy"
      />
      <span className="truncate">{name}</span>
    </div>
  )
}

// Item display with icon
export function ItemDisplay({ item }: { item: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <img
        src={getItemIcon(item)}
        alt={`${item}`}
        className="h-6 w-6 object-contain"
        loading="lazy"
        onError={(e) => {
          // Hide broken item images
          e.currentTarget.style.display = 'none'
        }}
      />
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item}</span>
    </div>
  )
}

// Full Pokemon card (VGC style like reference image)
interface PokemonCardProps {
  pokemon: PokemonDetails
  compact?: boolean
}

export function PokemonCard({ pokemon, compact = false }: PokemonCardProps) {
  if (compact) {
    return <CompactPokemonCard pokemon={pokemon} />
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-700 to-rose-800 p-3 shadow-lg">
      {/* Header with name and types */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Pokemon name */}
          <h3 className="text-sm font-bold text-white uppercase tracking-wide truncate">
            {pokemon.name.replace(/-/g, ' ')}
          </h3>
          {/* Type icons */}
          <div className="flex items-center gap-1 mt-1">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="md" />
            ))}
          </div>
        </div>
        {/* Pokemon sprite */}
        <img
          src={getPokemonSprite(pokemon.name)}
          alt={pokemon.name}
          className="h-16 w-16 object-contain drop-shadow-lg"
          loading="lazy"
        />
      </div>

      {/* Ability and Item row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5">
          <span className="text-[10px] font-semibold text-slate-700">{pokemon.ability}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5">
          <img
            src={getItemIcon(pokemon.item)}
            alt=""
            className="h-4 w-4 object-contain"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="text-[10px] font-semibold text-slate-700">{pokemon.item}</span>
        </div>
      </div>

      {/* Moves list */}
      <div className="mt-2 space-y-1">
        {pokemon.moves.map((move) => (
          <div
            key={move.name}
            className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-0.5"
          >
            <img
              src={getTypeIcon(move.type)}
              alt=""
              className="h-3.5 w-3.5 object-contain"
              loading="lazy"
            />
            <span className="text-[10px] font-medium text-slate-700">{move.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Compact Pokemon card for list views
function CompactPokemonCard({ pokemon }: { pokemon: PokemonDetails }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2">
      <img
        src={getPokemonSprite(pokemon.name)}
        alt={pokemon.name}
        className="h-12 w-12 object-contain"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {pokemon.name}
          </span>
          <div className="flex items-center gap-0.5">
            {pokemon.types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">{pokemon.ability}</span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{pokemon.item}</span>
        </div>
      </div>
    </div>
  )
}

// Simple Pokemon sprite with name for basic team display
interface SimplePokemonBadgeProps {
  name: string
  showTypes?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function SimplePokemonBadge({ name, showTypes = true, size = 'md' }: SimplePokemonBadgeProps) {
  const types = getPokemonTypes(name)
  const sizeConfig = {
    sm: { sprite: 'h-8 w-8', text: 'text-xs' },
    md: { sprite: 'h-12 w-12', text: 'text-sm' },
    lg: { sprite: 'h-16 w-16', text: 'text-base' },
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getPokemonSprite(name)}
        alt={name}
        className={`${sizeConfig[size].sprite} object-contain`}
        loading="lazy"
      />
      <span className={`${sizeConfig[size].text} font-medium text-slate-700 dark:text-slate-300 text-center leading-tight`}>
        {name.replace(/-/g, ' ')}
      </span>
      {showTypes && (
        <div className="flex items-center gap-0.5">
          {types.map((type) => (
            <TypeBadge key={type} type={type} size="sm" />
          ))}
        </div>
      )}
    </div>
  )
}

// Team grid display (6 Pokemon in a grid)
interface TeamGridProps {
  team: PokemonDetails[]
  columns?: 2 | 3 | 6
}

export function TeamGrid({ team, columns = 3 }: TeamGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-3`}>
      {team.map((pokemon) => (
        <PokemonCard key={pokemon.name} pokemon={pokemon} />
      ))}
    </div>
  )
}

// Simple team row with larger sprites
interface SimpleTeamRowProps {
  team: string[]
  label?: string
}

export function SimpleTeamRow({ team, label }: SimpleTeamRowProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </Text>
      )}
      <div className="flex flex-wrap gap-3 justify-start">
        {team.map((pokemon) => (
          <SimplePokemonBadge key={pokemon} name={pokemon} size="md" />
        ))}
      </div>
    </div>
  )
}

// Enhanced match card with better team display
interface EnhancedMatchCardProps {
  match: {
    id: string
    outcome: string
    termination: string
    turns: number
    agentTeam: string[]
    opponentTeam: string[]
    timestamp: string
  }
  onViewReplay?: () => void
}

export function EnhancedMatchCard({ match, onViewReplay }: EnhancedMatchCardProps) {
  const outcomeColor = match.outcome === 'Win' 
    ? 'bg-emerald-500' 
    : 'bg-rose-500'
  const terminationColor = {
    normal: 'bg-teal-500',
    timeout: 'bg-amber-500',
    forfeit: 'bg-rose-500',
  }[match.termination] || 'bg-slate-500'

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${outcomeColor}`}>
            {match.outcome}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold text-white ${terminationColor}`}>
            {match.termination.charAt(0).toUpperCase() + match.termination.slice(1)}
          </span>
        </div>
        <div className="text-right">
          <Text className="text-xs text-slate-500">Turn {match.turns}</Text>
          <Text className="text-xs text-slate-400">{match.timestamp}</Text>
        </div>
      </div>

      {/* Teams */}
      <div className="space-y-4">
        <SimpleTeamRow team={match.agentTeam} label="Agent Team" />
        <div className="border-t border-slate-200 dark:border-slate-700" />
        <SimpleTeamRow team={match.opponentTeam} label="Opponent Team" />
      </div>

      {/* Actions */}
      {onViewReplay && (
        <button
          onClick={onViewReplay}
          className="mt-4 w-full px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors"
        >
          View Replay
        </button>
      )}
    </Card>
  )
}
