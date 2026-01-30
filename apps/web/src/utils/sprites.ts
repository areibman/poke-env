/**
 * Pokemon Showdown sprite URL helpers
 * Base URLs for various sprite types from play.pokemonshowdown.com
 */

// Base URLs for Pokemon Showdown sprites
const SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites'

// Pokemon sprite URLs - using home sprites for best modern coverage
export const POKEMON_SPRITE_HOME = `${SPRITE_BASE}/home/` // Pokemon HOME sprites (best for gen8-9)
export const POKEMON_SPRITE_DEX = `${SPRITE_BASE}/dex/` // Dex sprites
export const POKEMON_SPRITE_GEN5 = `${SPRITE_BASE}/gen5/` // Fallback for classic look
export const POKEMON_SPRITE_ANI = `${SPRITE_BASE}/ani/` // Animated sprites

// Type icons
export const TYPE_ICON_BASE = `${SPRITE_BASE}/types/`

// Item icons
export const ITEM_ICON_BASE = `${SPRITE_BASE}/itemicons/`

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

/**
 * Convert Pokemon name to sprite ID format
 * Handles form variants and special characters
 */
export const toSpriteId = (name: string): string => {
  const lower = name.toLowerCase()
  const hyphenIndex = lower.lastIndexOf('-')

  if (hyphenIndex > 0) {
    const suffix = lower.slice(hyphenIndex + 1).replace(/[^a-z]/g, '')
    if (FORM_SUFFIXES.has(suffix)) {
      // Keep hyphen for form variants (e.g., Landorus-Therian → landorus-therian)
      const base = lower.slice(0, hyphenIndex).replace(/[^a-z0-9]/g, '')
      return `${base}-${suffix}`
    }
  }

  // Remove all non-alphanumeric for regular Pokemon and names with hyphens
  // (e.g., Ting-Lu → tinglu, Great Tusk → greattusk)
  return lower.replace(/[^a-z0-9]/g, '')
}

/**
 * Get Pokemon sprite URL (HOME sprites have best coverage for all gens including gen8-9)
 */
export const getPokemonSprite = (name: string): string => {
  return `${POKEMON_SPRITE_HOME}${toSpriteId(name)}.png`
}

/**
 * Get Pokemon dex sprite URL
 */
export const getPokemonDexSprite = (name: string): string => {
  return `${POKEMON_SPRITE_DEX}${toSpriteId(name)}.png`
}

/**
 * Get Pokemon gen5-style sprite URL (classic pixel art look)
 */
export const getPokemonGen5Sprite = (name: string): string => {
  return `${POKEMON_SPRITE_GEN5}${toSpriteId(name)}.png`
}

/**
 * Get Pokemon animated sprite URL (GIF)
 */
export const getPokemonAnimatedSprite = (name: string): string => {
  return `${POKEMON_SPRITE_ANI}${toSpriteId(name)}.gif`
}

/**
 * Get all possible sprite URLs for fallback chain
 */
export const getPokemonSpriteUrls = (name: string): string[] => {
  const id = toSpriteId(name)
  return [
    `${POKEMON_SPRITE_HOME}${id}.png`,
    `${POKEMON_SPRITE_DEX}${id}.png`,
    `${POKEMON_SPRITE_GEN5}${id}.png`,
  ]
}

/**
 * Get type icon URL
 * @param type - Pokemon type name (e.g., "Fire", "Water", "Electric")
 */
export const getTypeIcon = (type: string): string => {
  // Type icons are capitalized in the URL
  const normalizedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  return `${TYPE_ICON_BASE}${normalizedType}.png`
}

/**
 * Convert item name to item icon ID format
 * Items use lowercase with hyphens replaced by nothing
 */
export const toItemId = (itemName: string): string => {
  return itemName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Get item icon URL
 * @param itemName - Item name (e.g., "Leftovers", "Choice Band", "Life Orb")
 */
export const getItemIcon = (itemName: string): string => {
  return `${ITEM_ICON_BASE}${toItemId(itemName)}.png`
}

/**
 * All Pokemon types
 */
export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy',
] as const

export type PokemonType = typeof POKEMON_TYPES[number]

/**
 * Type color mappings for styling
 */
export const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Normal: { bg: 'bg-stone-400', text: 'text-stone-900', border: 'border-stone-500' },
  Fire: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  Water: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  Electric: { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-500' },
  Grass: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  Ice: { bg: 'bg-cyan-300', text: 'text-cyan-900', border: 'border-cyan-400' },
  Fighting: { bg: 'bg-red-700', text: 'text-white', border: 'border-red-800' },
  Poison: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
  Ground: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700' },
  Flying: { bg: 'bg-indigo-400', text: 'text-white', border: 'border-indigo-500' },
  Psychic: { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600' },
  Bug: { bg: 'bg-lime-500', text: 'text-lime-900', border: 'border-lime-600' },
  Rock: { bg: 'bg-yellow-700', text: 'text-white', border: 'border-yellow-800' },
  Ghost: { bg: 'bg-purple-700', text: 'text-white', border: 'border-purple-800' },
  Dragon: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700' },
  Dark: { bg: 'bg-stone-700', text: 'text-white', border: 'border-stone-800' },
  Steel: { bg: 'bg-slate-400', text: 'text-slate-900', border: 'border-slate-500' },
  Fairy: { bg: 'bg-pink-300', text: 'text-pink-900', border: 'border-pink-400' },
}

/**
 * Get type colors for a given type
 */
export const getTypeColors = (type: string): { bg: string; text: string; border: string } => {
  return TYPE_COLORS[type] || TYPE_COLORS.Normal
}
