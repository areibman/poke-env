/**
 * Pokemon Team Display Component
 * 
 * A visually appealing display for Pokemon teams with large sprites,
 * type icons, and optional item/move information.
 */

import { Badge, Card, Flex, Text } from '@tremor/react'
import { getPokemonSprite, getTypeIcon, getItemIcon, formatPokemonName, TYPE_COLORS, type PokemonType } from '@/utils/sprites'

// Pokemon data with optional detailed information
export interface PokemonData {
  name: string
  types?: PokemonType[]
  item?: string
  ability?: string
  moves?: string[]
}

interface PokemonCardProps {
  pokemon: PokemonData | string
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

/**
 * Single Pokemon card with sprite and info
 */
export function PokemonCard({ pokemon, size = 'md', showDetails = true }: PokemonCardProps) {
  const data: PokemonData = typeof pokemon === 'string' ? { name: pokemon } : pokemon
  const displayName = formatPokemonName(data.name)
  
  const sizeConfig = {
    sm: { sprite: 'h-12 w-12', card: 'p-2', text: 'text-xs' },
    md: { sprite: 'h-16 w-16', card: 'p-3', text: 'text-sm' },
    lg: { sprite: 'h-20 w-20', card: 'p-4', text: 'text-base' },
  }
  
  const config = sizeConfig[size]
  
  return (
    <div className={`flex flex-col items-center gap-1 ${config.card} rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 min-w-[80px]`}>
      <img
        src={getPokemonSprite(data.name)}
        alt={`${displayName} sprite`}
        className={`${config.sprite} object-contain drop-shadow-md`}
        loading="lazy"
        onError={(e) => {
          // Fallback to gen5ani if gen5 fails
          const img = e.target as HTMLImageElement
          if (!img.src.includes('gen5ani')) {
            img.src = getPokemonSprite(data.name, { gen: 'gen5ani' })
          }
        }}
      />
      <Text className={`${config.text} font-medium text-center leading-tight truncate max-w-full`}>
        {displayName.split(' (')[0]}
      </Text>
      {data.types && data.types.length > 0 && showDetails && (
        <div className="flex gap-0.5">
          {data.types.map((type) => (
            <img
              key={type}
              src={getTypeIcon(type)}
              alt={`${type} type`}
              className="h-4"
              loading="lazy"
            />
          ))}
        </div>
      )}
      {data.item && showDetails && (
        <div className="flex items-center gap-1 mt-0.5">
          <img
            src={getItemIcon(data.item)}
            alt={`${data.item}`}
            className="h-4 w-4"
            loading="lazy"
          />
          <Text className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[60px]">
            {data.item}
          </Text>
        </div>
      )}
    </div>
  )
}

interface PokemonTeamRowProps {
  pokemon: (PokemonData | string)[]
  label?: string
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
}

/**
 * Horizontal row of Pokemon cards
 */
export function PokemonTeamRow({ pokemon, label, size = 'md', showDetails = true }: PokemonTeamRowProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </Text>
      )}
      <div className="flex flex-wrap gap-2">
        {pokemon.map((p, index) => (
          <PokemonCard 
            key={typeof p === 'string' ? `${p}-${index}` : `${p.name}-${index}`} 
            pokemon={p} 
            size={size}
            showDetails={showDetails}
          />
        ))}
      </div>
    </div>
  )
}

interface PokemonTeamGridProps {
  pokemon: (PokemonData | string)[]
  label?: string
  columns?: 2 | 3 | 6
  showDetails?: boolean
}

/**
 * Grid layout for Pokemon team (3x2 or 2x3)
 */
export function PokemonTeamGrid({ pokemon, label, columns = 3, showDetails = true }: PokemonTeamGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    6: 'grid-cols-6',
  }
  
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
          {label}
        </Text>
      )}
      <div className={`grid ${gridCols[columns]} gap-2`}>
        {pokemon.map((p, index) => (
          <PokemonCard 
            key={typeof p === 'string' ? `${p}-${index}` : `${p.name}-${index}`} 
            pokemon={p}
            size="md"
            showDetails={showDetails}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Compact inline team display with just sprites
 */
interface PokemonTeamInlineProps {
  pokemon: (PokemonData | string)[]
  spriteSize?: 'xs' | 'sm' | 'md'
}

export function PokemonTeamInline({ pokemon, spriteSize = 'sm' }: PokemonTeamInlineProps) {
  const sizeClass = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
  }
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {pokemon.map((p, index) => {
        const name = typeof p === 'string' ? p : p.name
        return (
          <div 
            key={`${name}-${index}`}
            className="relative group"
            title={formatPokemonName(name)}
          >
            <img
              src={getPokemonSprite(name)}
              alt={`${formatPokemonName(name)} sprite`}
              className={`${sizeClass[spriteSize]} object-contain drop-shadow-sm hover:drop-shadow-md transition-all hover:scale-110`}
              loading="lazy"
            />
          </div>
        )
      })}
    </div>
  )
}

/**
 * Battle matchup display showing both teams
 */
interface BattleMatchupProps {
  agentTeam: (PokemonData | string)[]
  opponentTeam: (PokemonData | string)[]
  agentLabel?: string
  opponentLabel?: string
  layout?: 'row' | 'stacked'
  compact?: boolean
}

export function BattleMatchup({ 
  agentTeam, 
  opponentTeam, 
  agentLabel = 'Agent team',
  opponentLabel = 'Opponent team',
  layout = 'stacked',
  compact = false
}: BattleMatchupProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
            {agentLabel}
          </Text>
          <PokemonTeamInline pokemon={agentTeam} spriteSize="sm" />
        </div>
        <div className="flex flex-col gap-1">
          <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 font-medium">
            {opponentLabel}
          </Text>
          <PokemonTeamInline pokemon={opponentTeam} spriteSize="sm" />
        </div>
      </div>
    )
  }
  
  if (layout === 'row') {
    return (
      <div className="flex gap-6 flex-wrap">
        <PokemonTeamRow pokemon={agentTeam} label={agentLabel} size="sm" showDetails={false} />
        <div className="hidden sm:flex items-center">
          <div className="w-px h-16 bg-slate-300 dark:bg-slate-600" />
        </div>
        <PokemonTeamRow pokemon={opponentTeam} label={opponentLabel} size="sm" showDetails={false} />
      </div>
    )
  }
  
  return (
    <div className="flex flex-col gap-4">
      <PokemonTeamRow pokemon={agentTeam} label={agentLabel} size="sm" showDetails={false} />
      <PokemonTeamRow pokemon={opponentTeam} label={opponentLabel} size="sm" showDetails={false} />
    </div>
  )
}

export default {
  PokemonCard,
  PokemonTeamRow,
  PokemonTeamGrid,
  PokemonTeamInline,
  BattleMatchup,
}
