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
import { SimplePokemonBadge, TypeBadge } from '@/components/PokemonTeamCard'
import { getPokemonTypes, sampleTeams } from '../data/sample-teams'
import { getPokemonSprite, getTypeIcon, getItemIcon } from '../utils/sprites'
import type { PokemonDetails } from '../data/sample-teams'

export const Route = createFileRoute('/')({
  component: PokebenchHome,
})

// Use gen5 sprites (static PNG) - they have ALL Pokemon including Gen9 DLC
const SPRITE_BASE_URL = 'https://play.pokemonshowdown.com/sprites/gen5/'
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

const spriteUrl = (name: string) => `${SPRITE_BASE_URL}${toSpriteId(name)}.png`

const outcomeColor = (outcome: string) => (outcome === 'Win' ? 'emerald' : 'rose')

const terminationColor = (termination: string) => {
  if (termination === 'normal') return 'teal'
  if (termination === 'timeout') return 'amber'
  if (termination === 'forfeit') return 'rose'
  return 'slate'
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

// VGC-style Pokemon card component (like the reference image)
function PokemonVGCCard({ pokemon }: { pokemon: PokemonDetails }) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-600 via-rose-700 to-rose-800 p-2.5 shadow-lg hover:shadow-xl transition-shadow">
      {/* Header with name and types */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="flex-1 min-w-0">
          {/* Pokemon name */}
          <h3 className="text-[11px] font-bold text-white uppercase tracking-wide truncate leading-tight">
            {pokemon.name.replace(/-/g, ' ')}
          </h3>
          {/* Type icons */}
          <div className="flex items-center gap-0.5 mt-0.5">
            {pokemon.types.map((type) => (
              <img
                key={type}
                src={getTypeIcon(type)}
                alt={type}
                className="h-4"
                loading="lazy"
              />
            ))}
          </div>
        </div>
        {/* Pokemon sprite */}
        <img
          src={getPokemonSprite(pokemon.name)}
          alt={pokemon.name}
          className="h-14 w-14 object-contain drop-shadow-lg -mr-1 -mt-1"
          loading="lazy"
        />
      </div>

      {/* Ability and Item row */}
      <div className="flex flex-col gap-1 mb-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 max-w-[60%]">
            <span className="text-[9px] font-semibold text-slate-700 truncate">{pokemon.ability}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 max-w-[38%]">
            <img
              src={getItemIcon(pokemon.item)}
              alt=""
              className="h-3.5 w-3.5 object-contain flex-shrink-0"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <span className="text-[9px] font-semibold text-slate-700 truncate">{pokemon.item}</span>
          </div>
        </div>
      </div>

      {/* Moves list */}
      <div className="space-y-0.5">
        {pokemon.moves.map((move) => (
          <div
            key={move.name}
            className="flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5"
          >
            <img
              src={getTypeIcon(move.type)}
              alt=""
              className="h-3 w-3 object-contain flex-shrink-0"
              loading="lazy"
            />
            <span className="text-[9px] font-medium text-slate-700 truncate">{move.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
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
              <Title className="font-display">Sample Runs</Title>
              <Text>Featured battles with detailed team breakdowns and reasoning traces.</Text>
            </div>
            <Badge color="amber" className={badgeTextClassName}>
              Preview set
            </Badge>
          </Flex>
          <Divider className="my-6" />

          {/* Featured Team Showcase */}
          <div className="mb-8">
            <Flex justifyContent="between" alignItems="center" className="mb-4">
              <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Featured Team
              </Text>
              <Badge color="cyan" className={badgeTextClassName} size="sm">
                VGC Style
              </Badge>
            </Flex>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {sampleTeams.team1.pokemon.map((pokemon) => (
                <PokemonVGCCard key={pokemon.name} pokemon={pokemon} />
              ))}
            </div>
          </div>

          <Divider className="my-6" />

          {/* Sample Matches */}
          <Grid numItemsLg={3} className="gap-6">
            <div className="lg:col-span-2">
              {/* Mobile view - enhanced cards */}
              <div className="flex flex-col gap-4 lg:hidden">
                {sampleReplays.slice(0, 3).map((match) => (
                  <Card key={match.id} className="p-4">
                    {/* Match header */}
                    <Flex justifyContent="between" alignItems="center" className="mb-4">
                      <div className="flex items-center gap-2">
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
                      <Text className="text-xs text-slate-500">Turn {match.turns}</Text>
                    </Flex>

                    {/* Agent team with large sprites */}
                    <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Agent Team
                    </Text>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {match.agentTeam.map((pokemon) => (
                        <div key={`${match.id}-agent-${pokemon}`} className="flex flex-col items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <img
                            src={spriteUrl(pokemon)}
                            alt={pokemon}
                            className="h-10 w-10 object-contain"
                            loading="lazy"
                          />
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center mt-1 leading-tight">
                            {pokemon.replace(/-/g, ' ')}
                          </span>
                          <div className="flex gap-0.5 mt-0.5">
                            {getPokemonTypes(pokemon).map((type) => (
                              <img
                                key={type}
                                src={getTypeIcon(type)}
                                alt={type}
                                className="h-3"
                                loading="lazy"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Opponent team */}
                    <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                      Opponent Team
                    </Text>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {match.opponentTeam.map((pokemon) => (
                        <div key={`${match.id}-opp-${pokemon}`} className="flex flex-col items-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                          <img
                            src={spriteUrl(pokemon)}
                            alt={pokemon}
                            className="h-10 w-10 object-contain"
                            loading="lazy"
                          />
                          <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center mt-1 leading-tight">
                            {pokemon.replace(/-/g, ' ')}
                          </span>
                          <div className="flex gap-0.5 mt-0.5">
                            {getPokemonTypes(pokemon).map((type) => (
                              <img
                                key={type}
                                src={getTypeIcon(type)}
                                alt={type}
                                className="h-3"
                                loading="lazy"
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      color="slate"
                      className="w-full"
                      onClick={() => {
                        const battleId = 'battleId' in match ? (match as { battleId?: string }).battleId : undefined
                        if (battleId) {
                          navigate({ to: '/replays/$battleId', params: { battleId } })
                        } else {
                          window.location.href = match.replayUrl
                        }
                      }}
                    >
                      View Replay
                    </Button>
                  </Card>
                ))}
              </div>

              {/* Desktop view - enhanced table with larger sprites */}
              <Card className="hidden lg:block p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {sampleReplays.slice(0, 4).map((match) => (
                    <div key={match.id} className="p-4">
                      {/* Match header */}
                      <Flex justifyContent="between" alignItems="center" className="mb-4">
                        <div className="flex items-center gap-3">
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
                          <Text className="text-xs text-slate-500">Turn {match.turns}</Text>
                          <Text className="text-xs text-slate-400">{match.timestamp}</Text>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          color="slate"
                          onClick={() => {
                            const battleId = 'battleId' in match ? (match as { battleId?: string }).battleId : undefined
                            if (battleId) {
                              navigate({ to: '/replays/$battleId', params: { battleId } })
                            } else {
                              window.location.href = match.replayUrl
                            }
                          }}
                        >
                          View Replay
                        </Button>
                      </Flex>

                      {/* Teams side by side */}
                      <div className="grid grid-cols-2 gap-6">
                        {/* Agent team */}
                        <div>
                          <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Agent Team
                          </Text>
                          <div className="flex flex-wrap gap-3">
                            {match.agentTeam.map((pokemon) => (
                              <div key={`${match.id}-agent-${pokemon}`} className="flex flex-col items-center">
                                <img
                                  src={spriteUrl(pokemon)}
                                  alt={pokemon}
                                  className="h-12 w-12 object-contain"
                                  loading="lazy"
                                />
                                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center max-w-[60px] leading-tight">
                                  {pokemon.replace(/-/g, ' ')}
                                </span>
                                <div className="flex gap-0.5 mt-0.5">
                                  {getPokemonTypes(pokemon).map((type) => (
                                    <img
                                      key={type}
                                      src={getTypeIcon(type)}
                                      alt={type}
                                      className="h-3"
                                      loading="lazy"
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Opponent team */}
                        <div>
                          <Text className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                            Opponent Team
                          </Text>
                          <div className="flex flex-wrap gap-3">
                            {match.opponentTeam.map((pokemon) => (
                              <div key={`${match.id}-opp-${pokemon}`} className="flex flex-col items-center">
                                <img
                                  src={spriteUrl(pokemon)}
                                  alt={pokemon}
                                  className="h-12 w-12 object-contain"
                                  loading="lazy"
                                />
                                <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300 text-center max-w-[60px] leading-tight">
                                  {pokemon.replace(/-/g, ' ')}
                                </span>
                                <div className="flex gap-0.5 mt-0.5">
                                  {getPokemonTypes(pokemon).map((type) => (
                                    <img
                                      key={type}
                                      src={getTypeIcon(type)}
                                      alt={type}
                                      className="h-3"
                                      loading="lazy"
                                    />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Trace snapshot sidebar */}
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
