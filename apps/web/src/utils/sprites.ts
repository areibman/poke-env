// Pokemon form suffixes that should preserve the hyphen in sprite URLs
const FORM_SUFFIXES = new Set([
  'wellspring',
  'hearthflame',
  'cornerstone',
  'teal', // Ogerpon
  'therian',
  'incarnate', // Forces of Nature
  'hisui',
  'alola',
  'galar',
  'paldea', // Regional forms
  'origin',
  'altered', // Giratina, Dialga, Palkia
  'primal', // Kyogre, Groudon
  'mega',
  'megax',
  'megay', // Mega evolutions
  'gmax', // Gigantamax
  'crowned', // Zacian, Zamazenta
  'rapidstrike',
  'singlestrike', // Urshifu
  'dusk',
  'midnight', // Lycanroc
  'lowkey',
  'amped', // Toxtricity
  'bloodmoon', // Ursaluna
])

export const toSpriteId = (name: string) => {
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

export const getPokemonSpriteUrl = (name: string) =>
  `https://play.pokemonshowdown.com/sprites/gen5/${toSpriteId(name)}.png`

export const getTypeSpriteUrl = (type: string) =>
  `https://play.pokemonshowdown.com/sprites/types/${type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()}.png`

export const getItemSpriteUrl = (item: string) =>
  `https://play.pokemonshowdown.com/sprites/itemicons/${item.toLowerCase().replace(/[^a-z0-9]/g, '')}.png`

export const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A77A',
  Fire: '#EE8130',
  Water: '#6390F0',
  Electric: '#F7D02C',
  Grass: '#7AC74C',
  Ice: '#96D9D6',
  Fighting: '#C22E28',
  Poison: '#A33EA1',
  Ground: '#E2BF65',
  Flying: '#A98FF3',
  Psychic: '#F95587',
  Bug: '#A6B91A',
  Rock: '#B6A136',
  Ghost: '#735797',
  Dragon: '#6F35FC',
  Steel: '#B7B7CE',
  Dark: '#705746',
  Fairy: '#D685AD',
}

export const getTypeColor = (type: string) => TYPE_COLORS[type] || '#777'
