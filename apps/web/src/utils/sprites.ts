/**
 * Pokemon Showdown Sprite Utilities
 * 
 * Helper functions for retrieving sprites from Pokemon Showdown's sprite server.
 * Supports Pokemon sprites, type icons, and item icons.
 */

// Base URLs for Pokemon Showdown sprites
const PSD_BASE = 'https://play.pokemonshowdown.com/sprites'

// Sprite directories
const SPRITE_PATHS = {
  // Pokemon sprites
  gen5: `${PSD_BASE}/gen5`,           // Static PNG sprites (recommended - has all Pokemon)
  gen5ani: `${PSD_BASE}/gen5ani`,     // Animated GIF sprites
  ani: `${PSD_BASE}/ani`,             // Modern animated sprites
  dex: `${PSD_BASE}/dex`,             // High-res dex sprites
  // UI elements
  types: `${PSD_BASE}/types`,         // Type icons
  itemicons: `${PSD_BASE}/itemicons`, // Item icons
  pokemonicons: `${PSD_BASE}/pokemonicons-sheet.png`, // Pokemon icon sheet
} as const

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
  'wash', 'heat', 'frost', 'fan', 'mow', // Rotom forms
  'sky', 'land', // Shaymin
])

/**
 * Convert a Pokemon name to sprite ID format
 * E.g., "Landorus-Therian" → "landorus-therian"
 *       "Great Tusk" → "greattusk"
 *       "Ting-Lu" → "tinglu"
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
 * Convert an item name to sprite ID format
 * E.g., "Life Orb" → "life-orb"
 *       "Choice Scarf" → "choice-scarf"
 *       "Leftovers" → "leftovers"
 */
export const toItemSpriteId = (name: string): string => {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/**
 * Get Pokemon sprite URL
 * @param name Pokemon name (e.g., "Dragapult", "Landorus-Therian")
 * @param options Sprite options
 */
export const getPokemonSprite = (
  name: string,
  options: {
    gen?: 'gen5' | 'gen5ani' | 'ani' | 'dex'
    shiny?: boolean
    back?: boolean
    female?: boolean
  } = {}
): string => {
  const { gen = 'gen5', shiny = false, back = false } = options
  const id = toSpriteId(name)
  
  let basePath = SPRITE_PATHS[gen]
  if (shiny) basePath += '-shiny'
  if (back) basePath += '-back'
  
  const ext = gen === 'gen5ani' || gen === 'ani' ? 'gif' : 'png'
  return `${basePath}/${id}.${ext}`
}

/**
 * Get type icon URL
 * @param type Pokemon type (e.g., "Fire", "Water", "Grass")
 */
export const getTypeIcon = (type: string): string => {
  // Type names should be capitalized (e.g., "Fire", "Water")
  const typeName = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
  return `${SPRITE_PATHS.types}/${typeName}.png`
}

/**
 * Get item icon URL
 * @param item Item name (e.g., "Life Orb", "Leftovers")
 */
export const getItemIcon = (item: string): string => {
  const id = toItemSpriteId(item)
  return `${SPRITE_PATHS.itemicons}/${id}.png`
}

/**
 * All Pokemon types
 */
export const POKEMON_TYPES = [
  'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
  'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
  'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy'
] as const

export type PokemonType = typeof POKEMON_TYPES[number]

/**
 * Type color mapping for UI styling
 */
export const TYPE_COLORS: Record<PokemonType, { bg: string; text: string; border: string }> = {
  Normal: { bg: 'bg-stone-400', text: 'text-white', border: 'border-stone-500' },
  Fire: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  Water: { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' },
  Electric: { bg: 'bg-yellow-400', text: 'text-gray-900', border: 'border-yellow-500' },
  Grass: { bg: 'bg-green-500', text: 'text-white', border: 'border-green-600' },
  Ice: { bg: 'bg-cyan-400', text: 'text-gray-900', border: 'border-cyan-500' },
  Fighting: { bg: 'bg-red-600', text: 'text-white', border: 'border-red-700' },
  Poison: { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-600' },
  Ground: { bg: 'bg-amber-600', text: 'text-white', border: 'border-amber-700' },
  Flying: { bg: 'bg-indigo-400', text: 'text-white', border: 'border-indigo-500' },
  Psychic: { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-600' },
  Bug: { bg: 'bg-lime-500', text: 'text-white', border: 'border-lime-600' },
  Rock: { bg: 'bg-yellow-700', text: 'text-white', border: 'border-yellow-800' },
  Ghost: { bg: 'bg-purple-700', text: 'text-white', border: 'border-purple-800' },
  Dragon: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700' },
  Dark: { bg: 'bg-gray-700', text: 'text-white', border: 'border-gray-800' },
  Steel: { bg: 'bg-slate-400', text: 'text-gray-900', border: 'border-slate-500' },
  Fairy: { bg: 'bg-pink-400', text: 'text-gray-900', border: 'border-pink-500' },
}

/**
 * Format Pokemon name for display
 * Handles special cases like regional forms
 */
export const formatPokemonName = (name: string): string => {
  // Handle forms like "Landorus-Therian" → "Landorus (Therian)"
  const parts = name.split('-')
  if (parts.length > 1 && FORM_SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    const baseName = parts.slice(0, -1).join('-')
    const form = parts[parts.length - 1]
    return `${baseName} (${form})`
  }
  return name
}

/**
 * Default export with all utilities
 */
export default {
  getPokemonSprite,
  getTypeIcon,
  getItemIcon,
  toSpriteId,
  toItemSpriteId,
  formatPokemonName,
  POKEMON_TYPES,
  TYPE_COLORS,
}
