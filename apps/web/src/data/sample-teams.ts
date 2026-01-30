/**
 * Sample Pokemon team data with full details
 * Used for enhanced team display in the Sample Runs section
 */

import type { PokemonType } from '../utils/sprites'

export interface PokemonDetails {
  name: string
  types: PokemonType[]
  ability: string
  item: string
  moves: Array<{
    name: string
    type: PokemonType
  }>
}

export interface EnhancedTeam {
  pokemon: PokemonDetails[]
}

/**
 * Sample VGC-style teams with full details
 * Based on common competitive Pokemon from the reference image and meta
 */
export const sampleTeams: Record<string, EnhancedTeam> = {
  // Team 1: Sun-based team (similar to reference image)
  team1: {
    pokemon: [
      {
        name: 'Rillaboom',
        types: ['Grass'],
        ability: 'Grassy Surge',
        item: 'Choice Band',
        moves: [
          { name: 'Wood Hammer', type: 'Grass' },
          { name: 'Grassy Glide', type: 'Grass' },
          { name: 'High Horsepower', type: 'Ground' },
          { name: 'Fake Out', type: 'Normal' },
        ],
      },
      {
        name: 'Gholdengo',
        types: ['Steel', 'Ghost'],
        ability: 'Good as Gold',
        item: 'Life Orb',
        moves: [
          { name: 'Make It Rain', type: 'Steel' },
          { name: 'Shadow Ball', type: 'Ghost' },
          { name: 'Nasty Plot', type: 'Dark' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Ursaluna-Bloodmoon',
        types: ['Ground', 'Normal'],
        ability: "Mind's Eye",
        item: 'Leftovers',
        moves: [
          { name: 'Blood Moon', type: 'Normal' },
          { name: 'Earth Power', type: 'Ground' },
          { name: 'Yawn', type: 'Normal' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Ninetales-Alola',
        types: ['Ice', 'Fairy'],
        ability: 'Snow Warning',
        item: 'Focus Sash',
        moves: [
          { name: 'Blizzard', type: 'Ice' },
          { name: 'Aurora Veil', type: 'Ice' },
          { name: 'Icy Wind', type: 'Ice' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Sneasler',
        types: ['Fighting', 'Poison'],
        ability: 'Unburden',
        item: 'Lum Berry',
        moves: [
          { name: 'Close Combat', type: 'Fighting' },
          { name: 'Acrobatics', type: 'Flying' },
          { name: 'Swords Dance', type: 'Normal' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Incineroar',
        types: ['Fire', 'Dark'],
        ability: 'Intimidate',
        item: 'Sitrus Berry',
        moves: [
          { name: 'Flare Blitz', type: 'Fire' },
          { name: 'Knock Off', type: 'Dark' },
          { name: 'Parting Shot', type: 'Dark' },
          { name: 'Fake Out', type: 'Normal' },
        ],
      },
    ],
  },

  // Team 2: Rain-based team
  team2: {
    pokemon: [
      {
        name: 'Pelipper',
        types: ['Water', 'Flying'],
        ability: 'Drizzle',
        item: 'Focus Sash',
        moves: [
          { name: 'Hurricane', type: 'Flying' },
          { name: 'Hydro Pump', type: 'Water' },
          { name: 'Tailwind', type: 'Flying' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Iron Bundle',
        types: ['Ice', 'Water'],
        ability: 'Quark Drive',
        item: 'Booster Energy',
        moves: [
          { name: 'Hydro Pump', type: 'Water' },
          { name: 'Freeze-Dry', type: 'Ice' },
          { name: 'Icy Wind', type: 'Ice' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Palafin',
        types: ['Water'],
        ability: 'Zero to Hero',
        item: 'Mystic Water',
        moves: [
          { name: 'Jet Punch', type: 'Water' },
          { name: 'Wave Crash', type: 'Water' },
          { name: 'Close Combat', type: 'Fighting' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Amoonguss',
        types: ['Grass', 'Poison'],
        ability: 'Regenerator',
        item: 'Rocky Helmet',
        moves: [
          { name: 'Spore', type: 'Grass' },
          { name: 'Rage Powder', type: 'Bug' },
          { name: 'Pollen Puff', type: 'Bug' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Kingambit',
        types: ['Dark', 'Steel'],
        ability: 'Defiant',
        item: 'Assault Vest',
        moves: [
          { name: 'Kowtow Cleave', type: 'Dark' },
          { name: 'Iron Head', type: 'Steel' },
          { name: 'Sucker Punch', type: 'Dark' },
          { name: 'Low Kick', type: 'Fighting' },
        ],
      },
      {
        name: 'Landorus-Therian',
        types: ['Ground', 'Flying'],
        ability: 'Intimidate',
        item: 'Choice Scarf',
        moves: [
          { name: 'Earthquake', type: 'Ground' },
          { name: 'U-turn', type: 'Bug' },
          { name: 'Rock Slide', type: 'Rock' },
          { name: 'Superpower', type: 'Fighting' },
        ],
      },
    ],
  },

  // Team 3: Trick Room team
  team3: {
    pokemon: [
      {
        name: 'Porygon2',
        types: ['Normal'],
        ability: 'Download',
        item: 'Eviolite',
        moves: [
          { name: 'Trick Room', type: 'Psychic' },
          { name: 'Ice Beam', type: 'Ice' },
          { name: 'Thunderbolt', type: 'Electric' },
          { name: 'Recover', type: 'Normal' },
        ],
      },
      {
        name: 'Dusclops',
        types: ['Ghost'],
        ability: 'Frisk',
        item: 'Eviolite',
        moves: [
          { name: 'Trick Room', type: 'Psychic' },
          { name: 'Night Shade', type: 'Ghost' },
          { name: 'Will-O-Wisp', type: 'Fire' },
          { name: 'Pain Split', type: 'Normal' },
        ],
      },
      {
        name: 'Torkoal',
        types: ['Fire'],
        ability: 'Drought',
        item: 'Charcoal',
        moves: [
          { name: 'Eruption', type: 'Fire' },
          { name: 'Heat Wave', type: 'Fire' },
          { name: 'Earth Power', type: 'Ground' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Hatterene',
        types: ['Psychic', 'Fairy'],
        ability: 'Magic Bounce',
        item: 'Life Orb',
        moves: [
          { name: 'Trick Room', type: 'Psychic' },
          { name: 'Dazzling Gleam', type: 'Fairy' },
          { name: 'Psychic', type: 'Psychic' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Ursaluna',
        types: ['Ground', 'Normal'],
        ability: 'Guts',
        item: 'Flame Orb',
        moves: [
          { name: 'Facade', type: 'Normal' },
          { name: 'Headlong Rush', type: 'Ground' },
          { name: 'Play Rough', type: 'Fairy' },
          { name: 'Protect', type: 'Normal' },
        ],
      },
      {
        name: 'Iron Hands',
        types: ['Fighting', 'Electric'],
        ability: 'Quark Drive',
        item: 'Assault Vest',
        moves: [
          { name: 'Close Combat', type: 'Fighting' },
          { name: 'Wild Charge', type: 'Electric' },
          { name: 'Ice Punch', type: 'Ice' },
          { name: 'Fake Out', type: 'Normal' },
        ],
      },
    ],
  },
}

/**
 * Get enhanced team by ID
 */
export const getEnhancedTeam = (teamId: string): EnhancedTeam | undefined => {
  return sampleTeams[teamId]
}

/**
 * Get a random sample team for display
 */
export const getRandomSampleTeam = (): EnhancedTeam => {
  const teamIds = Object.keys(sampleTeams)
  const randomIndex = Math.floor(Math.random() * teamIds.length)
  return sampleTeams[teamIds[randomIndex]]
}

/**
 * Pokemon type data mapping (for Pokemon that appear in basic team lists)
 * This provides type info when we only have the Pokemon name
 */
export const pokemonTypeMap: Record<string, PokemonType[]> = {
  // Gen 9 meta
  'Dragapult': ['Dragon', 'Ghost'],
  'Great Tusk': ['Ground', 'Fighting'],
  'Gholdengo': ['Steel', 'Ghost'],
  'Kingambit': ['Dark', 'Steel'],
  'Iron Valiant': ['Fairy', 'Fighting'],
  'Walking Wake': ['Water', 'Dragon'],
  'Ting-Lu': ['Dark', 'Ground'],
  'Garganacl': ['Rock'],
  'Skeledirge': ['Fire', 'Ghost'],
  'Roaring Moon': ['Dragon', 'Dark'],
  'Baxcalibur': ['Dragon', 'Ice'],
  'Ogerpon-Wellspring': ['Grass', 'Water'],
  'Iron Bundle': ['Ice', 'Water'],
  'Raging Bolt': ['Electric', 'Dragon'],
  'Landorus-Therian': ['Ground', 'Flying'],
  'Zamazenta': ['Fighting'],
  'Enamorus': ['Fairy', 'Flying'],
  'Ursaluna': ['Ground', 'Normal'],
  'Ursaluna-Bloodmoon': ['Ground', 'Normal'],
  'Primarina': ['Water', 'Fairy'],
  'Hatterene': ['Psychic', 'Fairy'],
  'Samurott-Hisui': ['Water', 'Dark'],
  'Gliscor': ['Ground', 'Flying'],
  'Serperior': ['Grass'],
  'Heatran': ['Fire', 'Steel'],
  // Additional Pokemon
  'Rillaboom': ['Grass'],
  'Incineroar': ['Fire', 'Dark'],
  'Sneasler': ['Fighting', 'Poison'],
  'Ninetales-Alola': ['Ice', 'Fairy'],
  'Pelipper': ['Water', 'Flying'],
  'Palafin': ['Water'],
  'Amoonguss': ['Grass', 'Poison'],
  'Porygon2': ['Normal'],
  'Dusclops': ['Ghost'],
  'Torkoal': ['Fire'],
  'Iron Hands': ['Fighting', 'Electric'],
  'Flutter Mane': ['Ghost', 'Fairy'],
  'Chi-Yu': ['Dark', 'Fire'],
  'Chien-Pao': ['Dark', 'Ice'],
  'Wo-Chien': ['Dark', 'Grass'],
}

/**
 * Get Pokemon types by name (returns unknown types if not found)
 */
export const getPokemonTypes = (name: string): PokemonType[] => {
  return pokemonTypeMap[name] || ['Normal']
}
