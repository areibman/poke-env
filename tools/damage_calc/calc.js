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
  };
}

const requests = payload.requests || [];
const results = [];

for (const request of requests) {
  try {
    results.push({ ok: true, result: calcOne(request) });
  } catch (error) {
    results.push({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

process.stdout.write(JSON.stringify({ results }));
