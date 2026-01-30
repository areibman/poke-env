import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Metric,
  ProgressBar,
  ProgressCircle,
  Select,
  SelectItem,
  Subtitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  TextInput,
  Title,
} from '@tremor/react'
import { useMemo, useState } from 'react'

import {
  agents,
  leaderboardData,
  replayPreview,
  realReplays,
  hasRealReplays,
} from '../data/pokebench'

import { BackgroundBeams } from '@/components/ui/background-beams'
import { SiteNavbar } from '@/components/SiteNavbar'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'

export const Route = createFileRoute('/')({
  component: PokebenchHome,
})

// Use PSD sprites (static PNG) - full coverage including Gen9 DLC
const PSD_SPRITE_BASE_URLS = {
  pokemon: 'https://play.pokemonshowdown.com/sprites/gen5/',
  items: 'https://play.pokemonshowdown.com/sprites/itemicons/',
  types: 'https://play.pokemonshowdown.com/sprites/types/',
} as const
const formatPercent = (value: number) => `${value.toFixed(0)}%`
const formatElo = (value: number) => `${value.toLocaleString()}`
const formatTermination = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`
const badgeTextClassName = 'text-slate-900 dark:text-slate-100'
const slateBadgeClassName =
  '!bg-slate-200 !bg-opacity-100 !text-slate-900 !ring-slate-300 dark:!bg-slate-800 dark:!bg-opacity-100 dark:!text-slate-100 dark:!ring-slate-700'

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
      // Keep hyphen for form variants (e.g., Landorus-Therian → landorus-therian)
      const base = lower.slice(0, hyphenIndex).replace(/[^a-z0-9]/g, '')
      return `${base}-${suffix}`
    }
  }

  // Remove all non-alphanumeric for regular Pokemon and names with hyphens
  // (e.g., Ting-Lu → tinglu, Great Tusk → greattusk)
  return lower.replace(/[^a-z0-9]/g, '')
}

const psdSpriteUrl = (
  category: keyof typeof PSD_SPRITE_BASE_URLS,
  id: string,
) => `${PSD_SPRITE_BASE_URLS[category]}${id}.png`
const toTypeId = (type: string) =>
  `${type.charAt(0).toUpperCase()}${type.slice(1).toLowerCase()}`
const toItemId = (item: string) => item.toLowerCase().replace(/[^a-z0-9]/g, '')
const pokemonSpriteUrl = (name: string) =>
  psdSpriteUrl('pokemon', toSpriteId(name))
const itemSpriteUrl = (item: string) => psdSpriteUrl('items', toItemId(item))
const typeIconUrl = (type: string) => psdSpriteUrl('types', toTypeId(type))

const outcomeColor = (outcome: string) => (outcome === 'Win' ? 'emerald' : 'rose')

const terminationColor = (termination: string) => {
  if (termination === 'normal') return 'teal'
  if (termination === 'timeout') return 'amber'
  if (termination === 'forfeit') return 'rose'
  return 'slate'
}

type PokemonProfile = {
  types: string[]
  item: string
  moves: string[]
}

const POKEMON_PROFILES: Record<string, PokemonProfile> = {
  Dragapult: {
    types: ['Dragon', 'Ghost'],
    item: 'Choice Specs',
    moves: ['Shadow Ball', 'Draco Meteor', 'Flamethrower', 'U-turn'],
  },
  'Great Tusk': {
    types: ['Ground', 'Fighting'],
    item: 'Heavy-Duty Boots',
    moves: ['Headlong Rush', 'Close Combat', 'Rapid Spin', 'Knock Off'],
  },
  Gholdengo: {
    types: ['Steel', 'Ghost'],
    item: 'Life Orb',
    moves: ['Make It Rain', 'Shadow Ball', 'Nasty Plot', 'Recover'],
  },
  Kingambit: {
    types: ['Dark', 'Steel'],
    item: 'Black Glasses',
    moves: ['Kowtow Cleave', 'Sucker Punch', 'Iron Head', 'Swords Dance'],
  },
  'Iron Valiant': {
    types: ['Fairy', 'Fighting'],
    item: 'Booster Energy',
    moves: ['Moonblast', 'Close Combat', 'Knock Off', 'Protect'],
  },
  'Walking Wake': {
    types: ['Water', 'Dragon'],
    item: 'Choice Specs',
    moves: ['Hydro Steam', 'Draco Meteor', 'Flamethrower', 'Flip Turn'],
  },
  'Ting-Lu': {
    types: ['Dark', 'Ground'],
    item: 'Leftovers',
    moves: ['Ruination', 'Earthquake', 'Spikes', 'Whirlwind'],
  },
  Garganacl: {
    types: ['Rock'],
    item: 'Leftovers',
    moves: ['Salt Cure', 'Recover', 'Protect', 'Body Press'],
  },
  Skeledirge: {
    types: ['Fire', 'Ghost'],
    item: 'Heavy-Duty Boots',
    moves: ['Torch Song', 'Shadow Ball', 'Slack Off', 'Will-O-Wisp'],
  },
  'Roaring Moon': {
    types: ['Dragon', 'Dark'],
    item: 'Booster Energy',
    moves: ['Dragon Dance', 'Crunch', 'Acrobatics', 'Roost'],
  },
  Baxcalibur: {
    types: ['Dragon', 'Ice'],
    item: 'Loaded Dice',
    moves: ['Glaive Rush', 'Icicle Spear', 'Ice Shard', 'Dragon Dance'],
  },
  'Ogerpon-Wellspring': {
    types: ['Water', 'Grass'],
    item: 'Wellspring Mask',
    moves: ['Ivy Cudgel', 'Horn Leech', 'Spiky Shield', 'Swords Dance'],
  },
  'Iron Bundle': {
    types: ['Ice', 'Water'],
    item: 'Booster Energy',
    moves: ['Freeze-Dry', 'Hydro Pump', 'Icy Wind', 'Encore'],
  },
  'Raging Bolt': {
    types: ['Electric', 'Dragon'],
    item: 'Leftovers',
    moves: ['Thunderclap', 'Draco Meteor', 'Calm Mind', 'Flamethrower'],
  },
  'Landorus-Therian': {
    types: ['Ground', 'Flying'],
    item: 'Rocky Helmet',
    moves: ['Earthquake', 'U-turn', 'Stealth Rock', 'Knock Off'],
  },
  Zamazenta: {
    types: ['Fighting'],
    item: 'Leftovers',
    moves: ['Body Press', 'Iron Defense', 'Crunch', 'Rest'],
  },
  Enamorus: {
    types: ['Fairy', 'Flying'],
    item: 'Choice Scarf',
    moves: ['Moonblast', 'Earth Power', 'Mystical Fire', 'Healing Wish'],
  },
  Ursaluna: {
    types: ['Normal', 'Ground'],
    item: 'Flame Orb',
    moves: ['Facade', 'Headlong Rush', 'Swords Dance', 'Protect'],
  },
  Primarina: {
    types: ['Water', 'Fairy'],
    item: 'Assault Vest',
    moves: ['Moonblast', 'Hydro Pump', 'Ice Beam', 'Flip Turn'],
  },
  Hatterene: {
    types: ['Psychic', 'Fairy'],
    item: 'Covert Cloak',
    moves: ['Psychic', 'Dazzling Gleam', 'Mystical Fire', 'Trick Room'],
  },
  'Samurott-Hisui': {
    types: ['Water', 'Dark'],
    item: 'Focus Sash',
    moves: ['Ceaseless Edge', 'Aqua Cutter', 'Knock Off', 'Sucker Punch'],
  },
  Gliscor: {
    types: ['Ground', 'Flying'],
    item: 'Toxic Orb',
    moves: ['Earthquake', 'Protect', 'Roost', 'Knock Off'],
  },
  Serperior: {
    types: ['Grass'],
    item: 'Leftovers',
    moves: ['Leaf Storm', 'Glare', 'Substitute', 'Leech Seed'],
  },
  Heatran: {
    types: ['Fire', 'Steel'],
    item: 'Air Balloon',
    moves: ['Magma Storm', 'Earth Power', 'Stealth Rock', 'Taunt'],
  },
}

const getPokemonProfile = (pokemon: string) =>
  POKEMON_PROFILES[pokemon] ?? { types: [], item: '', moves: [] }

const TEAM_TONE_STYLES = {
  cyan: {
    panel:
      'border-cyan-200/70 bg-cyan-50/60 dark:border-cyan-500/30 dark:bg-cyan-950/30',
    label: 'text-cyan-800 dark:text-cyan-200',
    sprite: 'bg-cyan-100/70 dark:bg-cyan-900/40',
    dot: 'bg-cyan-500',
  },
  rose: {
    panel:
      'border-rose-200/70 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-950/30',
    label: 'text-rose-800 dark:text-rose-200',
    sprite: 'bg-rose-100/70 dark:bg-rose-900/40',
    dot: 'bg-rose-500',
  },
  slate: {
    panel:
      'border-slate-200/70 bg-slate-50/70 dark:border-slate-700/60 dark:bg-slate-900/40',
    label: 'text-slate-700 dark:text-slate-200',
    sprite: 'bg-slate-100/80 dark:bg-slate-800/60',
    dot: 'bg-slate-400',
  },
}

const PokemonRow = ({
  pokemon,
  tone,
}: {
  pokemon: string
  tone: keyof typeof TEAM_TONE_STYLES
}) => {
  const profile = getPokemonProfile(pokemon)
  const moves = profile.moves.length > 0 ? profile.moves : ['Unknown move']
  const compactMoves = moves.join(' • ')
  const styles = TEAM_TONE_STYLES[tone]

  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200/70 bg-white/95 px-3 py-3 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/80">
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-xl md:h-20 md:w-20 ${styles.sprite}`}
      >
        <img
          src={pokemonSpriteUrl(pokemon)}
          alt={`${pokemon} sprite`}
          className="h-16 w-16 drop-shadow-sm md:h-20 md:w-20"
          loading="lazy"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100 md:text-lg">
            {pokemon}
          </p>
          <div className="flex items-center gap-1">
            {profile.types.length > 0 ? (
              profile.types.map((type) => (
                <img
                  key={`${pokemon}-${type}`}
                  src={typeIconUrl(type)}
                  alt={`${type} type`}
                  title={type}
                  className="h-5 w-5 md:h-6 md:w-6"
                  loading="lazy"
                />
              ))
            ) : (
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Unknown type
              </span>
            )}
          </div>
        </div>
        {profile.item ? (
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 md:text-sm">
            <img
              src={itemSpriteUrl(profile.item)}
              alt={`${profile.item} item`}
              className="h-5 w-5 md:h-6 md:w-6"
              loading="lazy"
            />
            <span className="truncate">{profile.item}</span>
          </div>
        ) : (
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Unknown item
          </div>
        )}
        <div className="mt-2 hidden grid-cols-2 gap-1 md:grid">
          {moves.map((move, index) => (
            <span
              key={`${pokemon}-${move}-${index}`}
              className="truncate rounded-md bg-slate-100/80 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
              title={move}
            >
              {move}
            </span>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 md:hidden">
          {compactMoves}
        </div>
      </div>
    </div>
  )
}

const TeamSection = ({
  label,
  team,
  tone,
}: {
  label: string
  team: string[]
  tone: keyof typeof TEAM_TONE_STYLES
}) => {
  const styles = TEAM_TONE_STYLES[tone]
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${styles.panel}`}>
      <Flex
        className="flex-wrap gap-3"
        justifyContent="between"
        alignItems="center"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold uppercase ${styles.label}`}>
            {label}
          </span>
          <span className={`h-2 w-2 rounded-full ${styles.dot}`} />
        </div>
        <Badge size="xs" color={tone} className={badgeTextClassName}>
          {team.length} Pokemon
        </Badge>
      </Flex>
      <div className="mt-3 flex flex-col gap-2">
        {team.map((pokemon, index) => (
          <PokemonRow
            key={`${label}-${pokemon}-${index}`}
            pokemon={pokemon}
            tone={tone}
          />
        ))}
      </div>
    </div>
  )
}

const replayTracePreview = {
  turn: 'Turn 12',
  matchup: 'Dragapult vs Great Tusk',
  context:
    'Pivot to Gholdengo to deny Rapid Spin and preserve hazard pressure.',
  trace: [
    'Turn 1: Lead Dragapult, expect hazard opener.',
    'Turn 2: Opponent reveals Great Tusk, pivot to Gholdengo.',
    'Turn 3: Preserve Tera for late-game sweep.',
  ],
}

function PokebenchHome() {
  const navigate = useNavigate()
  const leaderboardRows = useMemo(
    () => [...agents].sort((a, b) => b.rating - a.rating),
    [],
  )
  const leader = leaderboardRows[0]
  const sampleReplays = replayPreview.slice(0, 4)
  const topRatings = useMemo(() => leaderboardData.slice(0, 5), [])
  const totalMatches = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.matches, 0),
    [],
  )
  const averageWinRate = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.winRate, 0) / agents.length,
    [],
  )
  const averageTurns = useMemo(
    () => agents.reduce((sum, agent) => sum + agent.avgTurns, 0) / agents.length,
    [],
  )

  const providerOptions = useMemo(
    () => ['All', ...new Set(agents.map((agent) => agent.provider))],
    [],
  )
  const sortOptions = [
    { value: 'rating', label: 'Elo rating' },
    { value: 'winRate', label: 'Win rate' },
    { value: 'avgTurns', label: 'Avg. turns' },
  ]

  const [searchQuery, setSearchQuery] = useState('')
  const [providerFilter, setProviderFilter] = useState('All')
  const [sortBy, setSortBy] = useState('rating')

  const filteredRows = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    const matchesProvider = (agent: (typeof agents)[number]) =>
      providerFilter === 'All' || agent.provider === providerFilter
    const matchesQuery = (agent: (typeof agents)[number]) => {
      if (!normalizedQuery) return true
      return (
        agent.name.toLowerCase().includes(normalizedQuery) ||
        agent.model.toLowerCase().includes(normalizedQuery) ||
        agent.provider.toLowerCase().includes(normalizedQuery)
      )
    }

    const rows = leaderboardRows.filter(
      (agent) => matchesProvider(agent) && matchesQuery(agent),
    )

    return [...rows].sort((a, b) => {
      if (sortBy === 'winRate') return b.winRate - a.winRate
      if (sortBy === 'avgTurns') return a.avgTurns - b.avgTurns
      return b.rating - a.rating
    })
  }, [leaderboardRows, providerFilter, searchQuery, sortBy])

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-10 pb-20">
        <SiteNavbar />
        <Card className="relative overflow-hidden border border-slate-200/60 bg-white/85 dark:border-slate-800/70 dark:bg-slate-950/70">
          <BackgroundBeams className="opacity-40 dark:opacity-30" />
          <div className="relative z-10 flex flex-col gap-10">
            <Grid numItemsLg={2} className="gap-8">
              <div className="flex flex-col gap-6">
                <div>
                  <Title className="text-3xl font-display sm:text-4xl">
                    Leaderboard Overview
                  </Title>
                  <TextGenerateEffect
                    words="Competitive Pokémon Showdown benchmarking for LLM agents"
                    className="font-semibold"
                    textClassName="text-lg text-slate-700 dark:text-slate-200"
                  />
                  <p className="mt-3 text-base text-tremor-content dark:text-dark-tremor-content">
                    Pokebench is an experimental benchmark for LLM agents playing competitive{' '}
                    <a
                      href="https://pokemonshowdown.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors"
                    >
                      Pokémon Showdown
                    </a>{' '}
                    against human players.
                  </p>
                </div>
                <Flex className="flex-wrap gap-3" justifyContent="start">
                  <Button
                    color="cyan"
                    onClick={() => {
                      // TODO: Link to actual session replay
                      window.open('/replays/example-match', '_blank')
                    }}
                  >
                    Watch replay
                  </Button>
                  <Button
                    variant="secondary"
                    color="slate"
                    onClick={() => navigate({ to: '/about' })}
                  >
                    About the benchmark
                  </Button>
                </Flex>
              </div>

              <div className="flex flex-col gap-4">
                <Grid numItemsSm={2} className="gap-4">
                  <Card decoration="left" decorationColor="cyan" className="sm:col-span-2">
                    <Text className="text-sm">Current leader</Text>
                    <Flex className="mt-2 gap-8 flex-col sm:flex-row sm:items-end" justifyContent="between">
                      <div className="flex-1">
                        <Metric>{leader.name}</Metric>
                        <Text className="text-xs">{leader.model}</Text>
                      </div>
                      <Flex className="gap-8 flex-wrap" justifyContent="start" alignItems="end">
                        <div>
                          <Metric>{formatElo(leader.rating)}</Metric>
                          <Text className="text-xs">Elo rating</Text>
                        </div>
                        <div>
                          <Metric>{formatPercent(leader.winRate)}</Metric>
                          <Text className="text-xs">Win rate</Text>
                        </div>
                      </Flex>
                    </Flex>
                  </Card>
                  <Card decoration="top" decorationColor="emerald">
                    <Text className="text-sm">Average win rate</Text>
                    <Metric>{formatPercent(averageWinRate)}</Metric>
                    <Text className="text-xs">Across all agents</Text>
                  </Card>
                  <Card decoration="top" decorationColor="slate">
                    <Text className="text-sm">Average turns</Text>
                    <Metric>{averageTurns.toFixed(1)}</Metric>
                    <Text className="text-xs">Tempo benchmark</Text>
                  </Card>
                </Grid>
              </div>
            </Grid>
          </div>
        </Card>

        <Card id="leaderboard" className="scroll-mt-28">
          <div className="flex flex-col gap-4">
            <div>
              <Title className="text-3xl font-display">Leaderboard</Title>
              <Text className="mt-2 text-base">
                Elo rankings for Gen9 RandBats LLM agents.
              </Text>
            </div>
          </div>
          <Divider className="my-6" />
          <div className="flex flex-col gap-4">
            <Flex
              className="w-full flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center"
              alignItems="start"
              justifyContent="start"
            >
              <TextInput
                value={searchQuery}
                onValueChange={setSearchQuery}
                placeholder="Search agents"
                aria-label="Search agents"
                className="w-full sm:w-48"
              />
              <Select
                value={providerFilter}
                onValueChange={setProviderFilter}
                placeholder="Provider"
                aria-label="Filter by provider"
                role="group"
                className="w-full sm:w-40"
              >
                {providerOptions.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider === 'All' ? 'All providers' : provider}
                  </SelectItem>
                ))}
              </Select>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
                placeholder="Sort by"
                aria-label="Sort by"
                role="group"
                className="w-full sm:w-40"
              >
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              <Badge color="slate" className={slateBadgeClassName}>
                {filteredRows.length} agents
              </Badge>
            </Flex>
            {filteredRows.length === 0 ? (
              <Text>No agents match this filter yet.</Text>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:hidden">
                  {filteredRows.map((agent, index) => (
                    <Card key={agent.id}>
                      <Flex justifyContent="between" alignItems="center">
                        <Badge color="slate" className={slateBadgeClassName}>
                          #{index + 1}
                        </Badge>
                        <Badge color="cyan" className={badgeTextClassName}>
                          Elo {formatElo(agent.rating)}
                        </Badge>
                      </Flex>
                      <Flex className="mt-3 gap-3" alignItems="center">
                        <img
                          src={agent.logo.light}
                          alt={`${agent.provider} logo`}
                          className="h-6 w-6 object-contain dark:hidden"
                        />
                        <img
                          src={agent.logo.dark}
                          alt={`${agent.provider} logo`}
                          className="hidden h-6 w-6 object-contain dark:block"
                        />
                        <div>
                          <Text className="text-sm font-medium">
                            {agent.name}
                          </Text>
                          <Text className="text-xs">{agent.model}</Text>
                        </div>
                      </Flex>
                      <div className="mt-4 flex flex-col gap-2">
                        <Flex justifyContent="between" alignItems="center">
                          <Text className="text-xs">Provider</Text>
                          <Text className="text-xs">{agent.provider}</Text>
                        </Flex>
                        <Flex justifyContent="between" alignItems="center">
                          <Text className="text-xs">Win rate</Text>
                          <Text className="text-xs">
                            {formatPercent(agent.winRate)}
                          </Text>
                        </Flex>
                        <Flex justifyContent="between" alignItems="center">
                          <Text className="text-xs">Avg. turns</Text>
                          <Text className="text-xs">{agent.avgTurns}</Text>
                        </Flex>
                        <Flex justifyContent="between" alignItems="center">
                          <Text className="text-xs">Matches</Text>
                          <Text className="text-xs">{agent.matches}</Text>
                        </Flex>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        color="slate"
                        className="mt-4 w-full"
                        onClick={() =>
                          navigate({
                            to: '/agents/$agentId',
                            params: { agentId: agent.id },
                          })
                        }
                      >
                        View agent detail
                      </Button>
                    </Card>
                  ))}
                </div>
                <div className="hidden md:block">
                  <Card className="p-0">
                    <div className="overflow-x-auto">
                      <Table className="min-w-[1000px] w-full table-fixed">
                        <TableHead>
                          <TableRow>
                            <TableHeaderCell className="w-[60px]">
                              Rank
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[200px]">
                              Agent
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[100px]">
                              Provider
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[90px]">
                              Elo
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[80px]">
                              GXE
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[90px]">
                              Glicko-1
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[90px]">
                              Win rate
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[90px]">
                              Avg. turns
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[80px]">
                              Matches
                            </TableHeaderCell>
                            <TableHeaderCell className="w-[120px]">
                              Profile
                            </TableHeaderCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {filteredRows.map((agent, index) => (
                            <TableRow key={agent.id}>
                              <TableCell>
                                <Badge
                                  color="slate"
                                  size="sm"
                                  className={slateBadgeClassName}
                                >
                                  #{index + 1}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Flex
                                  className="gap-3"
                                  alignItems="center"
                                  justifyContent="start"
                                >
                                  <img
                                    src={agent.logo.light}
                                    alt={`${agent.provider} logo`}
                                    className="h-6 w-6 object-contain dark:hidden"
                                  />
                                  <img
                                    src={agent.logo.dark}
                                    alt={`${agent.provider} logo`}
                                    className="hidden h-6 w-6 object-contain dark:block"
                                  />
                                  <div>
                                    <Text className="font-medium">
                                      {agent.name}
                                    </Text>
                                    <Text className="text-xs">
                                      {agent.model}
                                    </Text>
                                  </div>
                                </Flex>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  color="cyan"
                                  size="sm"
                                  className={badgeTextClassName}
                                >
                                  {formatElo(agent.rating)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  color="emerald"
                                  size="sm"
                                  className={badgeTextClassName}
                                >
                                  {agent.gxe.toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  color="violet"
                                  size="sm"
                                  className={badgeTextClassName}
                                >
                                  {formatElo(agent.glicko1)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Text>{formatPercent(agent.winRate)}</Text>
                              </TableCell>
                              <TableCell>
                                <Text>{agent.avgTurns}</Text>
                              </TableCell>
                              <TableCell>
                                <Text>{agent.matches}</Text>
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  color="slate"
                                  onClick={() =>
                                    navigate({
                                      to: '/agents/$agentId',
                                      params: { agentId: agent.id },
                                    })
                                  }
                                >
                                  View agent
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card id="replays" className="scroll-mt-28">
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Replay preview</Title>
              <Text>Sample runs with linked replay + reasoning trace.</Text>
            </div>
            <Badge color="amber" className={badgeTextClassName}>
              Preview set
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <Grid numItemsLg={3} className="gap-6">
            <div className="lg:col-span-2">
              <div className="grid gap-6 2xl:grid-cols-2">
                {sampleReplays.map((match) => (
                  <Card
                    key={match.id}
                    className="border border-slate-200/70 bg-white/90 dark:border-slate-800/70 dark:bg-slate-950/70"
                  >
                    <div className="flex flex-col gap-5">
                      <Flex
                        className="flex-wrap gap-3"
                        justifyContent="between"
                        alignItems="center"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            size="sm"
                            color={outcomeColor(match.outcome)}
                            className={badgeTextClassName}
                          >
                            {match.outcome}
                          </Badge>
                          <Badge
                            size="sm"
                            color={terminationColor(match.termination)}
                            className={badgeTextClassName}
                          >
                            {formatTermination(match.termination)}
                          </Badge>
                        </div>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                          {match.turns} turns • {match.timestamp}
                        </Text>
                      </Flex>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <TeamSection
                          label="Agent team"
                          team={match.agentTeam}
                          tone="cyan"
                        />
                        <TeamSection
                          label="Opponent team"
                          team={match.opponentTeam}
                          tone="rose"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          color="slate"
                          onClick={() => {
                            // Use dedicated replay viewer for real replays
                            const battleId =
                              'battleId' in match
                                ? (match as { battleId?: string }).battleId
                                : undefined
                            if (battleId) {
                              navigate({
                                to: '/replays/$battleId',
                                params: { battleId },
                              })
                            } else {
                              window.location.href = match.replayUrl
                            }
                          }}
                        >
                          View replay
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            <Card className="hidden lg:flex lg:flex-col lg:gap-4">
              <Flex justifyContent="between" alignItems="start" className="gap-4">
                <div>
                  <Title className="text-lg">Trace snapshot</Title>
                  <Text className="text-sm">
                    Decision log excerpt from the replay preview.
                  </Text>
                </div>
                <Badge color="emerald" className={badgeTextClassName}>
                  Live artifact
                </Badge>
              </Flex>
              <Card decoration="top" decorationColor="cyan">
                <Text className="text-xs uppercase tracking-wide">
                  {replayTracePreview.turn}
                </Text>
                <Text className="mt-2 text-sm font-medium">
                  {replayTracePreview.matchup}
                </Text>
                <Text className="mt-2 text-xs">{replayTracePreview.context}</Text>
              </Card>
              <Card>
                <Flex justifyContent="between" alignItems="center">
                  <Text className="text-xs uppercase tracking-wide">
                    Decision trace
                  </Text>
                  <Badge color="slate" className={slateBadgeClassName} size="sm">
                    Sample run
                  </Badge>
                </Flex>
                <div className="mt-3 flex flex-col gap-2">
                  {replayTracePreview.trace.map((line, index) => (
                    <Flex
                      key={line}
                      alignItems="center"
                      justifyContent="start"
                      className="gap-3"
                    >
                      <Badge
                        color="slate"
                        size="xs"
                        className={slateBadgeClassName}
                      >
                        {index + 1}
                      </Badge>
                      <Text className="text-xs">{line}</Text>
                    </Flex>
                  ))}
                </div>
              </Card>
              <Button
                color="cyan"
                onClick={() => {
                  const firstReplay = hasRealReplays ? realReplays[0] : null
                  if (firstReplay) {
                    navigate({ to: '/replays/$battleId', params: { battleId: firstReplay.battleId } })
                  } else {
                    window.location.href = replayPreview[0].replayUrl
                  }
                }}
              >
                Open replay + trace
              </Button>
            </Card>
          </Grid>
        </Card>

        <Card id="agents" className="scroll-mt-28">
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Agents</Title>
              <Text>Detailed breakdowns for every evaluated model.</Text>
            </div>
            <Badge color="cyan" className={badgeTextClassName}>
              Click through for match logs
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <div className="flex flex-col">
            {agents.map((agent, index) => (
              <div key={agent.id} className="py-4">
                <Flex
                  justifyContent="between"
                  alignItems="start"
                  className="gap-4 flex-col lg:flex-row lg:items-center"
                >
                  <div className="flex flex-col gap-3">
                    <Flex
                      className="gap-3"
                      alignItems="center"
                      justifyContent="start"
                    >
                      <img
                        src={agent.logo.light}
                        alt={`${agent.provider} logo`}
                        className="h-6 w-6 object-contain dark:hidden"
                      />
                      <img
                        src={agent.logo.dark}
                        alt={`${agent.provider} logo`}
                        className="hidden h-6 w-6 object-contain dark:block"
                      />
                      <div>
                        <Title className="text-lg">{agent.name}</Title>
                        <Text>{agent.model}</Text>
                      </div>
                    </Flex>
                    <Text className="text-sm">{agent.highlight}</Text>
                  </div>
                  <Flex
                    className="flex-wrap gap-2"
                    alignItems="center"
                    justifyContent="start"
                  >
                    <Badge color="slate" className={slateBadgeClassName}>
                      #{index + 1}
                    </Badge>
                    <Badge color="cyan" className={badgeTextClassName}>
                      Elo {formatElo(agent.rating)}
                    </Badge>
                    <Badge color="emerald" className={badgeTextClassName}>
                      {formatPercent(agent.winRate)} win
                    </Badge>
                    <Text className="text-xs">{agent.matches} matches</Text>
                    <Text className="text-xs">{agent.avgTurns} avg turns</Text>
                  </Flex>
                  <Button
                    size="sm"
                    variant="secondary"
                    color="slate"
                    onClick={() =>
                      navigate({
                        to: '/agents/$agentId',
                        params: { agentId: agent.id },
                      })
                    }
                  >
                    View agent detail
                  </Button>
                </Flex>
                <ProgressBar
                  className="mt-4"
                  value={agent.winRate}
                  color="emerald"
                />
                {index < agents.length - 1 ? (
                  <Divider className="mt-6" />
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Private evaluations</Title>
              <Subtitle>Bring a model, get a full Pokebench report.</Subtitle>
            </div>
            <Badge color="emerald" className={badgeTextClassName}>
              Now scheduling
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <Grid numItemsLg={3} className="gap-6">
            <div className="lg:col-span-2">
              <Text className="max-w-xl">
                For research inquiries or to evaluate private models against the
                benchmark, email alex@bottlenecklabs.com. Private evals run on
                the same Gen9 RandBats harness with replay + trace delivery.
              </Text>
              <Flex className="mt-4 flex-wrap gap-3" justifyContent="start">
                <Button
                  color="cyan"
                  onClick={() =>
                    (window.location.href = 'mailto:alex@bottlenecklabs.com')
                  }
                >
                  Start an evaluation
                </Button>
                <Button
                  variant="secondary"
                  color="slate"
                  onClick={() =>
                    (window.location.href = 'mailto:alex@bottlenecklabs.com')
                  }
                >
                  Email the team
                </Button>
              </Flex>
            </div>
            <Card decoration="left" decorationColor="cyan">
              <Text>Evaluation capacity</Text>
              <Flex className="mt-4 gap-4" alignItems="center">
                <ProgressCircle value={80} size="lg" color="cyan" showAnimation>
                  <span className="text-xs font-medium">80%</span>
                </ProgressCircle>
                <div>
                  <Metric>8 slots</Metric>
                  <Text className="text-xs">Utilization updates live.</Text>
                </div>
              </Flex>
            </Card>
          </Grid>
        </Card>
      </div>
    </main>
  )
}
