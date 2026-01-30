import { Card, Text, Flex, Badge } from '@tremor/react'
import { RichPokemon } from '../data/mock-team-data'

const SPRITE_BASE_URL = 'https://play.pokemonshowdown.com/sprites/gen5/'
const TYPE_ICON_BASE_URL = 'https://play.pokemonshowdown.com/sprites/types/'
const ITEM_ICON_BASE_URL = 'https://play.pokemonshowdown.com/sprites/itemicons/'

// Pokemon form suffixes that should preserve the hyphen in sprite URLs
const FORM_SUFFIXES = new Set([
  'wellspring', 'hearthflame', 'cornerstone', 'teal', // Ogerpon
  'therian', 'incarnate', // Forces of Nature
  'hisui', 'alola', 'galar', 'paldea', // Regional forms
  'origin', 'altered', // Giratina, Dialga, Palkia
  'primal', // Kyogre, Groudon
  'mega', 'megax', 'megay', // Mega evolutions
  'gmax', // Gigantamax
  'crowned', // Zacian, Zamazenta
  'rapidstrike', 'singlestrike', // Urshifu
  'dusk', 'midnight', // Lycanroc
  'lowkey', 'amped', // Toxtricity
  'bloodmoon', // Ursaluna
])

const toSpriteId = (name: string) => {
  const lower = name.toLowerCase()
  const hyphenIndex = lower.lastIndexOf('-')

  if (hyphenIndex > 0) {
    const suffix = lower.slice(hyphenIndex + 1).replace(/[^a-z]/g, '')
    if (FORM_SUFFIXES.has(suffix)) {
      const base = lower.slice(0, hyphenIndex).replace(/[^a-z0-9]/g, '')
      return `${base}-${suffix}`
    }
  }
  return lower.replace(/[^a-z0-9]/g, '')
}

const FALLBACK_SPRITE = 'https://play.pokemonshowdown.com/sprites/gen5/substitute.png'
const FALLBACK_TYPE = 'https://play.pokemonshowdown.com/sprites/types/Normal.png'
const FALLBACK_ITEM = 'https://play.pokemonshowdown.com/sprites/itemicons/pokeball.png'

const getSpriteUrl = (name: string) => `${SPRITE_BASE_URL}${toSpriteId(name)}.png`
const getTypeIcon = (type: string) => `${TYPE_ICON_BASE_URL}${type}.png`
const getItemIcon = (item: string) => {
  // Handle special cases for items that don't follow the standard naming convention
  const specialCases: Record<string, string> = {
    'Booster Energy': 'boosterenergy',
    'Heavy-Duty Boots': 'heavydutyboots',
    'Rocky Helmet': 'rockyhelmet',
    'Weakness Policy': 'weaknesspolicy',
    'Assault Vest': 'assaultvest',
    'Focus Sash': 'focussash',
    'Life Orb': 'lifeorb',
    'Choice Scarf': 'choicescarf',
    'Choice Specs': 'choicespecs',
    'Choice Band': 'choiceband',
    'Black Glasses': 'blackglasses',
    'Loaded Dice': 'loadeddice',
    'Wellspring Mask': 'wellspringmask',
    'Toxic Orb': 'toxicorb',
    'Flame Orb': 'flameorb',
    'Rusted Shield': 'rustedshield',
    'Rusted Sword': 'rustedsword',
  }

  // Fallback map for items that are missing from Showdown sprites
  const fallbackMap: Record<string, string> = {
    'Booster Energy': 'https://archives.bulbagarden.net/media/upload/6/6a/Dream_Booster_Energy_Sprite.png',
  }

  if (fallbackMap[item]) {
    return fallbackMap[item]
  }

  if (specialCases[item]) {
    // Try the special case format first
    return `${ITEM_ICON_BASE_URL}${specialCases[item]}.png`
  }
  
  // Default format: lowercase, replace spaces with hyphens
  return `${ITEM_ICON_BASE_URL}${item.toLowerCase().replace(/\s+/g, '-')}.png`
}

interface PokemonCardProps {
  pokemon: RichPokemon
}

export const PokemonCard = ({ pokemon }: PokemonCardProps) => {
  const handleImageError = (fallback: string) => (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = fallback
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/50">
        <span className="font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide text-xs truncate mr-2">
          {pokemon.name}
        </span>
        <div className="flex gap-0.5 flex-shrink-0">
          {pokemon.types.map((type) => (
            <img
              key={type}
              src={getTypeIcon(type)}
              alt={type}
              onError={handleImageError(FALLBACK_TYPE)}
              className="h-3.5 w-auto object-contain"
            />
          ))}
          {pokemon.teraType && (
             <div className="relative ml-0.5 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-slate-200 opacity-20 dark:bg-slate-700"></div>
                <img
                    src={getTypeIcon(pokemon.teraType)}
                    alt={`Tera ${pokemon.teraType}`}
                    onError={handleImageError(FALLBACK_TYPE)}
                    className="h-3.5 w-auto object-contain ring-1 ring-slate-300 dark:ring-slate-600 rounded-sm"
                    title={`Tera Type: ${pokemon.teraType}`}
                />
             </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-2">
        <div className="flex items-start gap-2">
          {/* Moves */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
             {pokemon.moves.map((move) => (
                <div key={move} className="flex items-center gap-1.5 rounded bg-slate-100 px-1.5 py-1 dark:bg-slate-900">
                    <div className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-600 flex-shrink-0" />
                    <span className="text-[10px] sm:text-xs font-medium text-slate-700 dark:text-slate-300 truncate leading-tight">
                        {move}
                    </span>
                </div>
             ))}
          </div>

          {/* Sprite */}
          <div className="flex flex-col items-center justify-center w-16 flex-shrink-0">
             <div className="relative h-16 w-16 flex items-center justify-center">
                 <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-transparent rounded-full opacity-50 dark:from-slate-800" />
                 <img
                    src={getSpriteUrl(pokemon.name)}
                    alt={pokemon.name}
                    onError={handleImageError(FALLBACK_SPRITE)}
                    className="relative h-16 w-16 object-contain image-pixelated"
                    style={{ imageRendering: 'pixelated' }}
                 />
             </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex-shrink-0">
                    Ability
                </span>
                <span className="text-[10px] sm:text-xs font-medium text-slate-900 dark:text-slate-100 truncate text-right">
                    {pokemon.ability}
                </span>
            </div>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold flex-shrink-0">
                    Item
                </span>
                <div className="flex items-center gap-1 min-w-0 justify-end">
                    <img 
                        src={getItemIcon(pokemon.item)} 
                        alt={pokemon.item} 
                        onError={handleImageError(FALLBACK_ITEM)}
                        className="h-3.5 w-3.5 object-contain flex-shrink-0" 
                    />
                    <span className="text-[10px] sm:text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {pokemon.item}
                    </span>
                </div>
            </div>
        </div>
      </div>
    </div>
  )
}

interface PokemonTeamDisplayProps {
  team: RichPokemon[]
}

export const PokemonTeamDisplay = ({ team }: PokemonTeamDisplayProps) => {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {team.map((pokemon, idx) => (
        <PokemonCard key={`${pokemon.name}-${idx}`} pokemon={pokemon} />
      ))}
    </div>
  )
}
