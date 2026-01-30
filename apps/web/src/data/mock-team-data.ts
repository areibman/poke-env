
export interface RichPokemon {
  name: string
  types: string[]
  ability: string
  item: string
  moves: string[]
  teraType?: string
}

export const MOCK_POKEMON_DATA: Record<string, RichPokemon> = {
  'Dragapult': {
    name: 'Dragapult',
    types: ['Dragon', 'Ghost'],
    ability: 'Infiltrator',
    item: 'Choice Specs',
    moves: ['Draco Meteor', 'Shadow Ball', 'Flamethrower', 'U-turn'],
    teraType: 'Ghost'
  },
  'Great Tusk': {
    name: 'Great Tusk',
    types: ['Ground', 'Fighting'],
    ability: 'Protosynthesis',
    item: 'Booster Energy',
    moves: ['Headlong Rush', 'Close Combat', 'Ice Spinner', 'Rapid Spin'],
    teraType: 'Ground'
  },
  'Gholdengo': {
    name: 'Gholdengo',
    types: ['Steel', 'Ghost'],
    ability: 'Good as Gold',
    item: 'Leftovers',
    moves: ['Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Recover'],
    teraType: 'Flying'
  },
  'Kingambit': {
    name: 'Kingambit',
    types: ['Dark', 'Steel'],
    ability: 'Supreme Overlord',
    item: 'Black Glasses',
    moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Swords Dance'],
    teraType: 'Dark'
  },
  'Iron Valiant': {
    name: 'Iron Valiant',
    types: ['Fairy', 'Fighting'],
    ability: 'Quark Drive',
    item: 'Booster Energy',
    moves: ['Moonblast', 'Close Combat', 'Thunderbolt', 'Encore'],
    teraType: 'Fairy'
  },
  'Walking Wake': {
    name: 'Walking Wake',
    types: ['Water', 'Dragon'],
    ability: 'Protosynthesis',
    item: 'Choice Specs',
    moves: ['Hydro Steam', 'Draco Meteor', 'Flamethrower', 'Flip Turn'],
    teraType: 'Water'
  },
  'Ting-Lu': {
    name: 'Ting-Lu',
    types: ['Dark', 'Ground'],
    ability: 'Vessel of Ruin',
    item: 'Leftovers',
    moves: ['Earthquake', 'Ruination', 'Spikes', 'Whirlwind'],
    teraType: 'Poison'
  },
  'Garganacl': {
    name: 'Garganacl',
    types: ['Rock'],
    ability: 'Purifying Salt',
    item: 'Leftovers',
    moves: ['Salt Cure', 'Recover', 'Iron Defense', 'Body Press'],
    teraType: 'Water'
  },
  'Skeledirge': {
    name: 'Skeledirge',
    types: ['Fire', 'Ghost'],
    ability: 'Unaware',
    item: 'Heavy-Duty Boots',
    moves: ['Torch Song', 'Shadow Ball', 'Slack Off', 'Will-O-Wisp'],
    teraType: 'Fairy'
  },
  'Roaring Moon': {
    name: 'Roaring Moon',
    types: ['Dragon', 'Dark'],
    ability: 'Protosynthesis',
    item: 'Booster Energy',
    moves: ['Acrobatics', 'Knock Off', 'Dragon Dance', 'Taunt'],
    teraType: 'Flying'
  },
  'Baxcalibur': {
    name: 'Baxcalibur',
    types: ['Dragon', 'Ice'],
    ability: 'Thermal Exchange',
    item: 'Loaded Dice',
    moves: ['Icicle Spear', 'Glaive Rush', 'Earthquake', 'Dragon Dance'],
    teraType: 'Dragon'
  },
  'Ogerpon-Wellspring': {
    name: 'Ogerpon-Wellspring',
    types: ['Grass', 'Water'],
    ability: 'Water Absorb',
    item: 'Wellspring Mask',
    moves: ['Ivy Cudgel', 'Horn Leech', 'Spikes', 'Encore'],
    teraType: 'Water'
  },
  'Iron Bundle': {
    name: 'Iron Bundle',
    types: ['Ice', 'Water'],
    ability: 'Quark Drive',
    item: 'Booster Energy',
    moves: ['Freeze-Dry', 'Hydro Pump', 'Ice Beam', 'Flip Turn'],
    teraType: 'Ice'
  },
  'Raging Bolt': {
    name: 'Raging Bolt',
    types: ['Electric', 'Dragon'],
    ability: 'Protosynthesis',
    item: 'Booster Energy',
    moves: ['Thunderclap', 'Dragon Pulse', 'Thunderbolt', 'Calm Mind'],
    teraType: 'Electric'
  },
  'Landorus-Therian': {
    name: 'Landorus-Therian',
    types: ['Ground', 'Flying'],
    ability: 'Intimidate',
    item: 'Rocky Helmet',
    moves: ['Earthquake', 'U-turn', 'Stealth Rock', 'Taunt'],
    teraType: 'Water'
  },
  'Zamazenta': {
    name: 'Zamazenta',
    types: ['Fighting'],
    ability: 'Dauntless Shield',
    item: 'Rusted Shield',
    moves: ['Body Press', 'Heavy Slam', 'Crunch', 'Iron Defense'],
    teraType: 'Fighting'
  },
  'Enamorus': {
    name: 'Enamorus',
    types: ['Fairy', 'Flying'],
    ability: 'Contrary',
    item: 'Choice Scarf',
    moves: ['Moonblast', 'Superpower', 'Earth Power', 'Healing Wish'],
    teraType: 'Stellar'
  },
  'Ursaluna': {
    name: 'Ursaluna',
    types: ['Ground', 'Normal'],
    ability: 'Guts',
    item: 'Flame Orb',
    moves: ['Facade', 'Headlong Rush', 'Thunder Punch', 'Swords Dance'],
    teraType: 'Normal'
  },
  'Primarina': {
    name: 'Primarina',
    types: ['Water', 'Fairy'],
    ability: 'Torrent',
    item: 'Leftovers',
    moves: ['Moonblast', 'Surf', 'Psychic Noise', 'Calm Mind'],
    teraType: 'Steel'
  },
  'Hatterene': {
    name: 'Hatterene',
    types: ['Psychic', 'Fairy'],
    ability: 'Magic Bounce',
    item: 'Leftovers',
    moves: ['Psyshock', 'Draining Kiss', 'Calm Mind', 'Trick Room'],
    teraType: 'Water'
  },
  'Samurott-Hisui': {
    name: 'Samurott-Hisui',
    types: ['Water', 'Dark'],
    ability: 'Sharpness',
    item: 'Focus Sash',
    moves: ['Ceaseless Edge', 'Razor Shell', 'Aqua Jet', 'Knock Off'],
    teraType: 'Ghost'
  },
  'Gliscor': {
    name: 'Gliscor',
    types: ['Ground', 'Flying'],
    ability: 'Poison Heal',
    item: 'Toxic Orb',
    moves: ['Earthquake', 'Toxic', 'Protect', 'Spikes'],
    teraType: 'Water'
  },
  'Serperior': {
    name: 'Serperior',
    types: ['Grass'],
    ability: 'Contrary',
    item: 'Leftovers',
    moves: ['Leaf Storm', 'Glare', 'Substitute', 'Synthesis'],
    teraType: 'Stellar'
  },
  'Heatran': {
    name: 'Heatran',
    types: ['Fire', 'Steel'],
    ability: 'Flash Fire',
    item: 'Leftovers',
    moves: ['Magma Storm', 'Earth Power', 'Taunt', 'Stealth Rock'],
    teraType: 'Grass'
  }
}

export const getPokemonDetails = (name: string): RichPokemon => {
  return MOCK_POKEMON_DATA[name] || {
    name,
    types: ['Normal'],
    ability: 'Unknown',
    item: 'Unknown',
    moves: ['Move 1', 'Move 2', 'Move 3', 'Move 4']
  }
}
