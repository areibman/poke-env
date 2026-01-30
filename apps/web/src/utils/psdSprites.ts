// Pokemon Showdown sprite helpers.
//
// Notes:
// - Pokémon sprites: gen5 static PNGs cover all modern forms reliably.
// - Type icons: provided by Showdown as small PNGs.
// - Item icons: provided by Showdown as small PNGs (requires item id).

const GEN5_SPRITE_BASE_URL = 'https://play.pokemonshowdown.com/sprites/gen5/'
const TYPE_ICON_BASE_URL = 'https://play.pokemonshowdown.com/sprites/types/'
const ITEM_ICON_BASE_URL = 'https://play.pokemonshowdown.com/sprites/itemicons/'

// Pokemon form suffixes that should preserve the hyphen in sprite URLs.
// Example: "Landorus-Therian" => "landorus-therian.png"
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

export const toPsdId = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

export const toPsdSpriteId = (name: string) => {
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

export const pokemonSpriteUrl = (species: string) =>
  `${GEN5_SPRITE_BASE_URL}${toPsdSpriteId(species)}.png`

export const typeIconUrl = (typeName: string) => {
  // PSD types are Title Case, e.g. "Fire", "Water"
  const normalized =
    typeName.length === 0
      ? typeName
      : `${typeName.charAt(0).toUpperCase()}${typeName.slice(1).toLowerCase()}`
  return `${TYPE_ICON_BASE_URL}${normalized}.png`
}

export const itemIconUrl = (itemNameOrId: string) =>
  `${ITEM_ICON_BASE_URL}${toPsdId(itemNameOrId)}.png`

