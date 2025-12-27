import fs from 'fs';
import { Generations, Pokemon, Move, Field, calculate } from '@smogon/calc';

const rawInput = fs.readFileSync(0, 'utf8').trim();
const payload = rawInput ? JSON.parse(rawInput) : {};
const gen = Generations.get(payload.gen || 9);

function buildPokemon(data) {
  if (!data || !data.name) {
    throw new Error('Pokemon data missing name');
  }

  return new Pokemon(gen, data.name, {
    level: data.level,
    ability: data.ability,
    item: data.item,
    nature: data.nature,
    evs: data.evs,
    ivs: data.ivs,
    boosts: data.boosts,
    status: data.status,
    teraType: data.teraType,
    moves: data.moves,
    curHP: data.curHP,
    originalCurHP: data.originalCurHP,
  });
}

/**
 * Build a Pokemon assuming maximum speed investment.
 * For randbats, opponents should be assumed to have max speed when uncertain.
 */
function buildMaxSpeedPokemon(data) {
  if (!data || !data.name) {
    throw new Error('Pokemon data missing name');
  }

  return new Pokemon(gen, data.name, {
    level: data.level || 100,
    ability: data.ability,
    item: data.item,
    nature: 'Jolly', // +Speed nature (or Timid for special attackers, but Jolly is safe default)
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 252 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    boosts: data.boosts,
    status: data.status,
  });
}

/**
 * Get Pokemon stats (including speed) using the official calculator.
 */
function getStats(request) {
  const pokemon = request.maxSpeed 
    ? buildMaxSpeedPokemon(request.pokemon)
    : buildPokemon(request.pokemon);
  
  return {
    hp: pokemon.rawStats.hp,
    atk: pokemon.rawStats.atk,
    def: pokemon.rawStats.def,
    spa: pokemon.rawStats.spa,
    spd: pokemon.rawStats.spd,
    spe: pokemon.rawStats.spe,
    // Also include boosted stats if boosts are applied
    boostedSpe: pokemon.stats.spe,
    species: pokemon.species.name,
    level: pokemon.level,
  };
}

function buildMove(data) {
  if (!data || !data.name) {
    throw new Error('Move data missing name');
  }

  return new Move(gen, data.name, {
    useZ: data.useZ,
    useMax: data.useMax,
    isCrit: data.isCrit,
    isStellarFirstUse: data.isStellarFirstUse,
    hits: data.hits,
    timesUsed: data.timesUsed,
    timesUsedWithMetronome: data.timesUsedWithMetronome,
  });
}

function buildField(data) {
  const base = {
    gameType: 'Singles',
    attackerSide: {},
    defenderSide: {},
  };

  if (!data) {
    return new Field(base);
  }

  return new Field({
    ...base,
    ...data,
    attackerSide: {
      ...base.attackerSide,
      ...(data.attackerSide || {}),
    },
    defenderSide: {
      ...base.defenderSide,
      ...(data.defenderSide || {}),
    },
  });
}

function calcOne(request) {
  const attacker = buildPokemon(request.attacker);
  const defender = buildPokemon(request.defender);
  const move = buildMove(request.move);
  const field = buildField(request.field);
  const result = calculate(gen, attacker, defender, move, field);
  const [minDamage, maxDamage] = result.range();
  const ko = result.kochance();

  return {
    damage: result.damage,
    range: [minDamage, maxDamage],
    desc: result.desc(),
    full_desc: result.fullDesc(),
    ko: ko,
    // Include speed stats for speed comparison
    attacker_stats: {
      spe: attacker.rawStats.spe,
      boostedSpe: attacker.stats.spe,
    },
    defender_stats: {
      spe: defender.rawStats.spe,
      boostedSpe: defender.stats.spe,
    },
  };
}

/**
 * Compare speeds between two Pokemon.
 * Assumes max speed investment for both unless actual stats provided.
 */
function compareSpeed(request) {
  const pokemon1 = request.pokemon1.actualStats 
    ? buildPokemon({ ...request.pokemon1, evs: request.pokemon1.evs || { spe: 252 }, ivs: request.pokemon1.ivs || { spe: 31 } })
    : buildMaxSpeedPokemon(request.pokemon1);
  
  const pokemon2 = request.pokemon2.actualStats
    ? buildPokemon({ ...request.pokemon2, evs: request.pokemon2.evs || { spe: 252 }, ivs: request.pokemon2.ivs || { spe: 31 } })
    : buildMaxSpeedPokemon(request.pokemon2);
  
  const spe1 = pokemon1.stats.spe; // includes boosts
  const spe2 = pokemon2.stats.spe;
  
  let verdict;
  if (spe1 > spe2) {
    verdict = 'POKEMON1_FASTER';
  } else if (spe2 > spe1) {
    verdict = 'POKEMON2_FASTER';
  } else {
    verdict = 'SPEED_TIE';
  }
  
  return {
    pokemon1: {
      name: pokemon1.species.name,
      baseSpe: pokemon1.species.baseStats.spe,
      rawSpe: pokemon1.rawStats.spe,
      effectiveSpe: spe1,
      boosts: request.pokemon1.boosts?.spe || 0,
    },
    pokemon2: {
      name: pokemon2.species.name,
      baseSpe: pokemon2.species.baseStats.spe,
      rawSpe: pokemon2.rawStats.spe,
      effectiveSpe: spe2,
      boosts: request.pokemon2.boosts?.spe || 0,
    },
    verdict: verdict,
  };
}

const requests = payload.requests || [];
const results = [];

for (const request of requests) {
  try {
    // Handle different request types
    if (request.type === 'stats') {
      results.push({ ok: true, result: getStats(request) });
    } else if (request.type === 'speed') {
      results.push({ ok: true, result: compareSpeed(request) });
    } else {
      // Default: damage calculation
      results.push({ ok: true, result: calcOne(request) });
    }
  } catch (error) {
    results.push({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

process.stdout.write(JSON.stringify({ results }));
