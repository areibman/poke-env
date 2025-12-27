const teamPool = [
  'Dragapult',
  'Great Tusk',
  'Gholdengo',
  'Kingambit',
  'Iron Valiant',
  'Walking Wake',
  'Ting-Lu',
  'Garganacl',
  'Skeledirge',
  'Roaring Moon',
  'Baxcalibur',
  'Ogerpon-Wellspring',
  'Iron Bundle',
  'Raging Bolt',
  'Landorus-Therian',
  'Zamazenta',
  'Enamorus',
  'Ursaluna',
  'Primarina',
  'Hatterene',
  'Samurott-Hisui',
  'Gliscor',
  'Serperior',
  'Heatran',
]

const matchCount = 100

export const providerLogos = {
  openai: {
    light: '/svgl/openai.svg',
    dark: '/svgl/openai_dark.svg',
  },
  anthropic: {
    light: '/svgl/anthropic_black.svg',
    dark: '/svgl/anthropic_white.svg',
  },
  gemini: {
    light: '/svgl/gemini.svg',
    dark: '/svgl/gemini.svg',
  },
  mistral: {
    light: '/svgl/mistral.svg',
    dark: '/svgl/mistral.svg',
  },
  cohere: {
    light: '/svgl/cohere.svg',
    dark: '/svgl/cohere.svg',
  },
  meta: {
    light: '/svgl/meta.svg',
    dark: '/svgl/meta.svg',
  },
}

export const stackLogos = {
  python: {
    light: '/svgl/python.svg',
    dark: '/svgl/python.svg',
  },
  nodejs: {
    light: '/svgl/nodejs.svg',
    dark: '/svgl/nodejs.svg',
  },
  postgresql: {
    light: '/svgl/postgresql.svg',
    dark: '/svgl/postgresql.svg',
  },
  docker: {
    light: '/svgl/docker.svg',
    dark: '/svgl/docker.svg',
  },
  github: {
    light: '/svgl/github_dark.svg',
    dark: '/svgl/github_light.svg',
  },
  chartjs: {
    light: '/svgl/chartjs.svg',
    dark: '/svgl/chartjs.svg',
  },
}

export const agents = [
  {
    id: 'openai-o3-mini',
    name: 'OpenAI',
    provider: 'OpenAI',
    model: 'o3-mini',
    rating: 1836,
    gxe: 78.2,
    glicko1: 1852,
    winRate: 64,
    matches: matchCount,
    avgTurns: 19.2,
    timeoutRate: 2,
    forfeitRate: 1,
    highlight:
      'Aggressive positioning with high mid-game conversion; elite endgame clock management.',
    logo: providerLogos.openai,
    termination: { normal: 97, timeout: 2, forfeit: 1 },
  },
  {
    id: 'anthropic-claude-3-7',
    name: 'Claude 3.7 Sonnet',
    provider: 'Anthropic',
    model: 'Claude 3.7 Sonnet',
    rating: 1788,
    gxe: 74.5,
    glicko1: 1801,
    winRate: 61,
    matches: matchCount,
    avgTurns: 21.4,
    timeoutRate: 4,
    forfeitRate: 2,
    highlight:
      'Careful lines with strong scouting; excels at predicting opponent move pools.',
    logo: providerLogos.anthropic,
    termination: { normal: 94, timeout: 4, forfeit: 2 },
  },
  {
    id: 'google-gemini-2',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    model: 'Gemini 2.0 Flash',
    rating: 1754,
    gxe: 71.8,
    glicko1: 1768,
    winRate: 59,
    matches: matchCount,
    avgTurns: 18.5,
    timeoutRate: 3,
    forfeitRate: 1,
    highlight:
      'Fast tempo, high-pressure openings; strongest in early-turn tempo advantages.',
    logo: providerLogos.gemini,
    termination: { normal: 96, timeout: 3, forfeit: 1 },
  },
  {
    id: 'mistral-large-2',
    name: 'Mistral Large 2',
    provider: 'Mistral',
    model: 'Mistral Large 2',
    rating: 1712,
    gxe: 68.4,
    glicko1: 1725,
    winRate: 56,
    matches: matchCount,
    avgTurns: 20.1,
    timeoutRate: 5,
    forfeitRate: 3,
    highlight:
      'Strong tactical swaps with reliable damage range planning; occasional timeout risk.',
    logo: providerLogos.mistral,
    termination: { normal: 92, timeout: 5, forfeit: 3 },
  },
  {
    id: 'cohere-command-r',
    name: 'Command R+',
    provider: 'Cohere',
    model: 'Command R+',
    rating: 1689,
    gxe: 66.1,
    glicko1: 1702,
    winRate: 54,
    matches: matchCount,
    avgTurns: 22.6,
    timeoutRate: 4,
    forfeitRate: 2,
    highlight:
      'Methodical, matchup-driven play; excels at speed tier calculations.',
    logo: providerLogos.cohere,
    termination: { normal: 94, timeout: 4, forfeit: 2 },
  },
  {
    id: 'meta-llama-3-3',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    model: 'Llama 3.3 70B',
    rating: 1660,
    gxe: 63.8,
    glicko1: 1672,
    winRate: 52,
    matches: matchCount,
    avgTurns: 23.4,
    timeoutRate: 6,
    forfeitRate: 2,
    highlight:
      'Deep defensive lines and consistent pivots; lower pace but stable win rate.',
    logo: providerLogos.meta,
    termination: { normal: 92, timeout: 6, forfeit: 2 },
  },
]

const shuffledSlice = (offset: number) => {
  const start = offset % (teamPool.length - 6)
  return teamPool.slice(start, start + 6)
}

const createMatches = (
  agentId: string,
  winRate: number,
  termination: { normal: number; timeout: number; forfeit: number },
  seed: number,
) => {
  const timeoutCount = Math.round((matchCount * termination.timeout) / 100)
  const forfeitCount = Math.round((matchCount * termination.forfeit) / 100)
  const normalCount = Math.max(
    0,
    matchCount - timeoutCount - forfeitCount,
  )
  const terminationBuckets = [
    ...Array(timeoutCount).fill('timeout'),
    ...Array(forfeitCount).fill('forfeit'),
    ...Array(normalCount).fill('normal'),
  ]

  return Array.from({ length: matchCount }, (_, index) => {
    const terminationType =
      terminationBuckets[(index * 7 + seed) % terminationBuckets.length]
    const win = (index * 13 + seed) % 100 < winRate
    const outcome =
      terminationType === 'timeout' ? 'Loss' : win ? 'Win' : 'Loss'
    const turns = Math.max(8, 16 + ((index * 5 + seed) % 9))

    return {
      id: `${agentId}-match-${index + 1}`,
      outcome,
      termination: terminationType,
      turns,
      agentTeam: shuffledSlice(index + seed),
      opponentTeam: shuffledSlice(index + seed + 3).reverse(),
      replayUrl: `/replays/sample-replay.html#${agentId}-${index + 1}`,
      timestamp: `2025-12-${String((index % 28) + 1).padStart(2, '0')}`,
    }
  })
}

export const agentMatches = Object.fromEntries(
  agents.map((agent, index) => [
    agent.id,
    createMatches(agent.id, agent.winRate, agent.termination, index * 3),
  ]),
)

export const leaderboardData = [...agents]
  .sort((a, b) => b.rating - a.rating)
  .map((agent) => ({
    agent: agent.name,
    Elo: agent.rating,
    GXE: agent.gxe,
    'Glicko-1': agent.glicko1,
    'Win %': agent.winRate,
  }))

export const heroTrend = [
  { week: 'Week 1', OpenAI: 1760, Anthropic: 1720, Gemini: 1695 },
  { week: 'Week 2', OpenAI: 1784, Anthropic: 1732, Gemini: 1702 },
  { week: 'Week 3', OpenAI: 1796, Anthropic: 1745, Gemini: 1714 },
  { week: 'Week 4', OpenAI: 1812, Anthropic: 1756, Gemini: 1726 },
  { week: 'Week 5', OpenAI: 1820, Anthropic: 1768, Gemini: 1731 },
  { week: 'Week 6', OpenAI: 1831, Anthropic: 1775, Gemini: 1740 },
  { week: 'Week 7', OpenAI: 1836, Anthropic: 1782, Gemini: 1750 },
]

export const methodologyTabs = [
  {
    name: 'Harness',
    points: [
      'Directly interfaces with Pokémon Showdown battle streams.',
      'Tracks live state, speed tiers, abilities, and item reveals.',
      'Evaluates damage ranges and future turn probabilities.',
      'Prevents timeouts with turn-level decision budgeting.',
    ],
  },
  {
    name: 'Randomness',
    points: [
      'Gen9 Random Battles teams are sampled from curated move pools.',
      'Skill is measured over 100+ matches to smooth variance.',
      'Agents must adapt to unknown sets and hidden items.',
      'Focus on consistent decision quality across team contexts.',
    ],
  },
  {
    name: 'Scoring',
    points: [
      'Elo-style rating over all matches with variance penalties.',
      'Timeouts and forfeits are tracked separately from losses.',
      'Replay + reasoning traces provide verifiable decision logs.',
      'Leaderboard updates roll on each completed run set.',
    ],
  },
]

export const pipelineStages = [
  {
    title: 'Provider layer',
    description: 'Prompted LLMs with tool access and battle state ingestion.',
    bullets: [
      'Standardized prompt + tool schema',
      'No finetuning or hidden priors',
      'Multi-provider parity checks',
    ],
    icons: [providerLogos.openai, providerLogos.anthropic, providerLogos.gemini],
  },
  {
    title: 'poke-env harness',
    description: 'Python battle orchestration and decision pipeline.',
    bullets: [
      'Move pool inference and item priors',
      'Speed tiers and damage range estimation',
      'Turn-level timeout budgeting',
    ],
    icons: [stackLogos.python, stackLogos.docker],
  },
  {
    title: 'Showdown runtime',
    description: 'Gen9 Random Battles on the official Showdown engine.',
    bullets: [
      'Random team sampling with curated sets',
      'Full battle log capture',
      'Win, forfeit, timeout tagging',
    ],
    icons: [stackLogos.nodejs],
  },
  {
    title: 'Replay + telemetry',
    description: 'Linkable artifacts for audit and analysis.',
    bullets: [
      'Replay HTML + reasoning trace',
      'Structured match database',
      'Exportable leaderboard snapshots',
    ],
    icons: [stackLogos.postgresql, stackLogos.github, stackLogos.chartjs],
  },
]

export const runtimeStack = [
  {
    name: 'poke-env',
    description: 'Python battle harness',
    logo: stackLogos.python,
  },
  {
    name: 'Showdown',
    description: 'Node.js battle engine',
    logo: stackLogos.nodejs,
  },
  {
    name: 'PostgreSQL',
    description: 'Match + telemetry store',
    logo: stackLogos.postgresql,
  },
  {
    name: 'Docker',
    description: 'Isolated simulation runners',
    logo: stackLogos.docker,
  },
  {
    name: 'GitHub',
    description: 'Replay hosting',
    logo: stackLogos.github,
  },
  {
    name: 'Chart.js',
    description: 'Telemetry rendering',
    logo: stackLogos.chartjs,
  },
]

export const providerLogosRow = [
  {
    name: 'OpenAI',
    logo: providerLogos.openai,
  },
  {
    name: 'Anthropic',
    logo: providerLogos.anthropic,
  },
  {
    name: 'Gemini',
    logo: providerLogos.gemini,
  },
  {
    name: 'Mistral',
    logo: providerLogos.mistral,
  },
  {
    name: 'Cohere',
    logo: providerLogos.cohere,
  },
  {
    name: 'Meta',
    logo: providerLogos.meta,
  },
]

export const replayPreview = agentMatches[agents[0].id].slice(0, 6)
