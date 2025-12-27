import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Callout,
  Card,
  Divider,
  DonutChart,
  Flex,
  Grid,
  Metric,
  ProgressBar,
  Subtitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
  Title,
} from '@tremor/react'
import { useMemo } from 'react'

import { agentMatches, agents } from '../../data/pokebench'

import { SiteNavbar } from '@/components/SiteNavbar'

export const Route = createFileRoute('/agents/$agentId')({
  component: AgentDetail,
})

const formatPercent = (value: number) => `${value.toFixed(0)}%`
const formatTermination = (value: string) =>
  `${value.charAt(0).toUpperCase()}${value.slice(1)}`

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

// Use gen5 sprites (static PNG) - they have ALL Pokemon including Gen9 DLC
const SPRITE_BASE_URL = 'https://play.pokemonshowdown.com/sprites/gen5/'
const spriteUrl = (name: string) => `${SPRITE_BASE_URL}${toSpriteId(name)}.png`

const outcomeColor = (outcome: string) => (outcome === 'Win' ? 'emerald' : 'rose')

const terminationColor = (termination: string) => {
  if (termination === 'normal') return 'teal'
  if (termination === 'timeout') return 'amber'
  if (termination === 'forfeit') return 'rose'
  return 'slate'
}

const badgeTextClassName = 'text-slate-900 dark:text-slate-100'
const slateBadgeClassName =
  '!bg-slate-200 !bg-opacity-100 !text-slate-900 !ring-slate-300 dark:!bg-slate-800 dark:!bg-opacity-100 dark:!text-slate-100 dark:!ring-slate-700'

function AgentDetail() {
  const { agentId } = Route.useParams()
  const navigate = useNavigate()

  const agent = agents.find((entry) => entry.id === agentId)
  const matches = agent ? agentMatches[agent.id] : []
  const mobileMatches = matches.slice(0, 12)

  const terminationData = useMemo(() => {
    if (!agent) return []
    return [
      { name: 'Normal', value: agent.termination.normal },
      { name: 'Timeout', value: agent.termination.timeout },
      { name: 'Forfeit', value: agent.termination.forfeit },
    ]
  }, [agent])

  if (!agent) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 pt-10 pb-20">
          <SiteNavbar />
          <Card>
            <Title>Agent not found</Title>
            <Text className="mt-2">
              The agent you requested is not in the current benchmark snapshot.
            </Text>
            <Button
              variant="secondary"
              color="slate"
              className="mt-4"
              onClick={() => navigate({ to: '/' })}
            >
              Back to leaderboard
            </Button>
          </Card>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 pt-10 pb-20">
        <SiteNavbar />
        <Card>
          <Flex
            justifyContent="between"
            alignItems="center"
            className="gap-4 flex-col sm:flex-row sm:items-center"
          >
            <Flex
              alignItems="center"
              justifyContent="start"
              className="gap-4"
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
                <h1 className="font-display text-3xl text-tremor-content-strong dark:text-dark-tremor-content-strong">
                  {agent.name}
                </h1>
                <Subtitle>{agent.model}</Subtitle>
              </div>
            </Flex>
          </Flex>
        </Card>

        <Grid numItemsLg={3} className="gap-6">
          <Card decoration="left" decorationColor="cyan">
            <Text>Current Elo</Text>
            <Metric>{agent.rating}</Metric>
            <Text className="mt-2">Rolling 100-match rating</Text>
          </Card>
          <Card decoration="left" decorationColor="emerald">
            <Text>Win rate</Text>
            <Metric>{formatPercent(agent.winRate)}</Metric>
            <ProgressBar value={agent.winRate} color="emerald" />
          </Card>
          <Card decoration="left" decorationColor="amber">
            <Text>Avg. turns</Text>
            <Metric>{agent.avgTurns}</Metric>
            <Text className="mt-2">Tempo benchmark</Text>
          </Card>
        </Grid>

        <Grid numItemsLg={2} className="gap-6">
          <Card>
            <Title className="font-display">Win condition mix</Title>
            <Text>Termination reasons across 100 matches.</Text>
            <DonutChart
              className="mt-6 h-60"
              data={terminationData}
              category="value"
              index="name"
              colors={['emerald', 'amber', 'rose']}
              valueFormatter={formatPercent}
              showAnimation
            />
            <Flex className="mt-4 flex-wrap gap-2" justifyContent="start">
              {terminationData.map((entry) => (
                <Badge
                  key={entry.name}
                  color={terminationColor(entry.name.toLowerCase())}
                  className={badgeTextClassName}
                >
                  {entry.name} {formatPercent(entry.value)}
                </Badge>
              ))}
            </Flex>
          </Card>
          <Card>
            <Title className="font-display">Agent profile</Title>
            <Text className="mt-2">{agent.highlight}</Text>
            <Divider className="my-6" />
            <Grid numItems={2} className="gap-4">
              <div>
                <Text>Timeout rate</Text>
                <Metric>{formatPercent(agent.timeoutRate)}</Metric>
                <ProgressBar value={agent.timeoutRate} color="rose" />
              </div>
              <div>
                <Text>Forfeit rate</Text>
                <Metric>{formatPercent(agent.forfeitRate)}</Metric>
                <ProgressBar value={agent.forfeitRate} color="amber" />
              </div>
            </Grid>
            <Callout className="mt-6" title="Research inquiries" color="cyan">
              For research inquiries or to evaluate private models against the
              benchmark, email alex@bottlenecklabs.com.
            </Callout>
            <Flex className="mt-4" justifyContent="start" alignItems="center">
              <Button
                color="cyan"
                onClick={() =>
                  (window.location.href = 'mailto:alex@bottlenecklabs.com')
                }
              >
                Email the team
              </Button>
            </Flex>
          </Card>
        </Grid>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Match log</Title>
              <Text>
                Full 100-match summary with starting parties and replay links.
              </Text>
            </div>
            <Badge color="slate" className={slateBadgeClassName}>
              {agent.matches} matches
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:hidden">
              {mobileMatches.map((match) => (
                <Card key={match.id}>
                  <Flex justifyContent="between" alignItems="center">
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
                  </Flex>
                  <Flex
                    className="mt-2"
                    justifyContent="between"
                    alignItems="center"
                  >
                    <Text className="text-xs">Turn {match.turns}</Text>
                    <Text className="text-xs">{match.timestamp}</Text>
                  </Flex>
                  <Text className="mt-3 text-xs uppercase tracking-wide">
                    Agent team
                  </Text>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.agentTeam.map((pokemon) => (
                      <Badge
                        key={`${match.id}-${pokemon}`}
                        size="xs"
                        color="slate"
                        className={slateBadgeClassName}
                      >
                        <Flex
                          alignItems="center"
                          justifyContent="start"
                          className="gap-1"
                        >
                          <img src={spriteUrl(pokemon)} alt={`${pokemon} sprite`} className="h-4 w-4" loading="lazy" />
                          <span>{pokemon}</span>
                        </Flex>
                      </Badge>
                    ))}
                  </div>
                  <Text className="mt-3 text-xs uppercase tracking-wide">
                    Opponent team
                  </Text>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {match.opponentTeam.map((pokemon) => (
                      <Badge
                        key={`${match.id}-${pokemon}`}
                        size="xs"
                        color="slate"
                        className={slateBadgeClassName}
                      >
                        <Flex
                          alignItems="center"
                          justifyContent="start"
                          className="gap-1"
                        >
                          <img src={spriteUrl(pokemon)} alt={`${pokemon} sprite`} className="h-4 w-4" loading="lazy" />
                          <span>{pokemon}</span>
                        </Flex>
                      </Badge>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    color="slate"
                    className="mt-4 w-full"
                    onClick={() => (window.location.href = match.replayUrl)}
                  >
                    View replay
                  </Button>
                </Card>
              ))}
              <Text className="text-xs">
                Showing the latest 12 matches on mobile. View on desktop for the
                full 100-match table.
              </Text>
            </div>
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <Table className="min-w-[640px] w-full table-fixed">
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell className="w-[80px]">
                        Outcome
                      </TableHeaderCell>
                      <TableHeaderCell className="w-[160px]">
                        Agent team
                      </TableHeaderCell>
                      <TableHeaderCell className="w-[160px]">
                        Opponent team
                      </TableHeaderCell>
                      <TableHeaderCell className="w-[150px]">
                        Termination
                      </TableHeaderCell>
                      <TableHeaderCell className="w-[120px]">
                        Replay
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>
                          <Badge
                            size="sm"
                            color={outcomeColor(match.outcome)}
                            className={badgeTextClassName}
                          >
                            {match.outcome}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {match.agentTeam.map((pokemon) => (
                              <Badge
                                key={`${match.id}-${pokemon}`}
                                size="xs"
                                color="slate"
                                className={slateBadgeClassName}
                              >
                                <Flex
                                  alignItems="center"
                                  justifyContent="start"
                                  className="gap-1"
                                >
                                  <img src={spriteUrl(pokemon)} alt={`${pokemon} sprite`} className="h-4 w-4" loading="lazy" />
                                  <span>{pokemon}</span>
                                </Flex>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {match.opponentTeam.map((pokemon) => (
                              <Badge
                                key={`${match.id}-${pokemon}`}
                                size="xs"
                                color="slate"
                                className={slateBadgeClassName}
                              >
                                <Flex
                                  alignItems="center"
                                  justifyContent="start"
                                  className="gap-1"
                                >
                                  <img src={spriteUrl(pokemon)} alt={`${pokemon} sprite`} className="h-4 w-4" loading="lazy" />
                                  <span>{pokemon}</span>
                                </Flex>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="w-[150px]">
                          <Badge
                            size="sm"
                            color={terminationColor(match.termination)}
                            className={badgeTextClassName}
                          >
                            {formatTermination(match.termination)}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <Button
                            size="sm"
                            variant="secondary"
                            color="slate"
                            onClick={() =>
                              (window.location.href = match.replayUrl)
                            }
                          >
                            View replay
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  )
}
