import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Badge,
  Button,
  Card,
  Divider,
  Flex,
  Grid,
  Metric,
  ProgressBar,
  Text,
  Title,
} from '@tremor/react'
import { useState, useEffect } from 'react'
import { BackgroundBeams } from '@/components/ui/background-beams'
import { SiteNavbar } from '@/components/SiteNavbar'
import {
  realReplays,
  replayToMatch,
} from '../../data/pokebench'
import type { ReplayMatch, TurnTrace } from '../../types/replays'

export const Route = createFileRoute('/replays/$battleId')({
  component: ReplayViewer,
})

// Pokemon form suffixes that should preserve the hyphen in sprite URLs
const FORM_SUFFIXES = new Set([
  'wellspring', 'hearthflame', 'cornerstone', 'teal',
  'therian', 'incarnate',
  'hisui', 'alola', 'galar', 'paldea',
  'origin', 'altered',
  'primal',
  'mega', 'megax', 'megay',
  'gmax',
  'crowned',
  'rapidstrike', 'singlestrike',
  'dusk', 'midnight',
  'lowkey', 'amped',
  'bloodmoon',
])

const toSpriteId = (name: string) => {
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

const SPRITE_SOURCES = [
  { base: 'https://play.pokemonshowdown.com/sprites/gen5ani/', ext: '.gif' },
  { base: 'https://play.pokemonshowdown.com/sprites/ani/', ext: '.gif' },
  { base: 'https://play.pokemonshowdown.com/sprites/dex/', ext: '.png' },
]

const spriteUrl = (name: string, sourceIndex = 0) => {
  const source = SPRITE_SOURCES[sourceIndex] || SPRITE_SOURCES[0]
  return `${source.base}${toSpriteId(name)}${source.ext}`
}

const PokemonSprite = ({ name, className = 'h-8 w-8' }: { name: string; className?: string }) => {
  const [loaded, setLoaded] = useState(false)
  const [sourceIndex, setSourceIndex] = useState(0)

  return (
    <div className={`${className} relative inline-block`}>
      {!loaded && (
        <div className="absolute inset-0 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
      )}
      <img
        src={spriteUrl(name, sourceIndex)}
        alt={name}
        className={`${className} object-contain transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (sourceIndex < SPRITE_SOURCES.length - 1) {
            setSourceIndex(sourceIndex + 1)
            setLoaded(false)
          }
        }}
      />
    </div>
  )
}

interface BattleLogData {
  battle_id: string
  timestamp: string
  players: {
    [key: string]: {
      model: string
      turns: TurnTrace[]
    }
  }
  outcome: {
    winner: string | null
    end_timestamp: string
    details: Record<string, unknown>
  } | null
}

function ReplayViewer() {
  const { battleId } = Route.useParams()
  const [battleLog, setBattleLog] = useState<BattleLogData | null>(null)
  const [selectedTurn, setSelectedTurn] = useState<number>(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Find the replay match from our manifest
  const replayMatch = realReplays.find(r => r.battleId === battleId)
  const match = replayMatch ? replayToMatch(replayMatch) : null

  useEffect(() => {
    // Try to load battle log data
    // For now, we'll display the match info from the manifest
    // In a full implementation, this would fetch the actual battle_log.json
    setIsLoading(false)
    if (!replayMatch) {
      setError('Battle not found')
    }
  }, [battleId, replayMatch])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <SiteNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card className="animate-pulse">
            <div className="h-8 w-64 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="mt-4 h-4 w-48 rounded bg-slate-200 dark:bg-slate-700" />
          </Card>
        </main>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <SiteNavbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <Title className="font-display text-red-600 dark:text-red-400">
              Battle Not Found
            </Title>
            <Text className="mt-2">
              The battle "{battleId}" could not be found in the replay archive.
            </Text>
            <Button className="mt-4" asChild>
              <Link to="/">Back to Home</Link>
            </Button>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950">
      <BackgroundBeams className="opacity-30" />
      <SiteNavbar />

      <main className="container relative mx-auto space-y-8 px-4 py-8">
        {/* Header */}
        <Card>
          <Flex justifyContent="between" alignItems="start">
            <div>
              <Flex alignItems="center" className="gap-3">
                <Title className="font-display text-2xl">Battle Replay</Title>
                <Badge
                  color={match.outcome === 'Win' ? 'emerald' : match.outcome === 'Loss' ? 'rose' : 'slate'}
                >
                  {match.outcome}
                </Badge>
              </Flex>
              <Text className="mt-1 font-mono text-xs opacity-70">{battleId}</Text>
            </div>
            <div className="text-right">
              <Text className="text-xs uppercase tracking-wider opacity-60">Model</Text>
              <Text className="font-semibold">{match.agentModel}</Text>
            </div>
          </Flex>

          <Divider />

          <Grid numItemsMd={3} className="gap-6">
            <div>
              <Text className="text-xs uppercase tracking-wider opacity-60">Agent</Text>
              <Text className="font-semibold">{match.agentName}</Text>
            </div>
            <div>
              <Text className="text-xs uppercase tracking-wider opacity-60">Opponent</Text>
              <Text className="font-semibold">{match.opponentName}</Text>
            </div>
            <div>
              <Text className="text-xs uppercase tracking-wider opacity-60">Date</Text>
              <Text className="font-semibold">{match.timestamp}</Text>
            </div>
          </Grid>

          <Divider />

          <Grid numItemsMd={2} className="gap-6">
            {/* Agent Team */}
            <div>
              <Text className="mb-2 text-xs uppercase tracking-wider opacity-60">
                Agent Team ({match.agentTeam.length})
              </Text>
              <Flex className="flex-wrap gap-2">
                {match.agentTeam.map((pokemon, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800"
                  >
                    <PokemonSprite name={pokemon} className="h-6 w-6" />
                    <span className="text-sm">{pokemon}</span>
                  </div>
                ))}
              </Flex>
            </div>

            {/* Opponent Team */}
            <div>
              <Text className="mb-2 text-xs uppercase tracking-wider opacity-60">
                Opponent Team ({match.opponentTeam.length})
              </Text>
              <Flex className="flex-wrap gap-2">
                {match.opponentTeam.map((pokemon, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800"
                  >
                    <PokemonSprite name={pokemon} className="h-6 w-6" />
                    <span className="text-sm">{pokemon}</span>
                  </div>
                ))}
              </Flex>
            </div>
          </Grid>
        </Card>

        {/* Stats Summary */}
        <Grid numItemsMd={4} className="gap-4">
          <Card decoration="top" decorationColor="blue">
            <Text>Turns</Text>
            <Metric>{match.turns}</Metric>
          </Card>
          <Card decoration="top" decorationColor={match.outcome === 'Win' ? 'emerald' : 'rose'}>
            <Text>Outcome</Text>
            <Metric>{match.outcome}</Metric>
          </Card>
          <Card decoration="top" decorationColor="amber">
            <Text>Termination</Text>
            <Metric className="capitalize">{match.termination}</Metric>
          </Card>
          <Card decoration="top" decorationColor={match.hasReasoning ? 'emerald' : 'slate'}>
            <Text>Reasoning Trace</Text>
            <Metric>{match.hasReasoning ? 'Available' : 'N/A'}</Metric>
          </Card>
        </Grid>

        {/* Reasoning Trace Preview */}
        {match.hasReasoning && (
          <Card>
            <Title className="font-display">Decision Trace</Title>
            <Text className="mt-1">
              AI reasoning trace for each turn decision. Full trace available in the exported logs.
            </Text>

            <Divider />

            <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
              <Text className="mb-3 text-xs uppercase tracking-wider opacity-60">
                Trace Preview
              </Text>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex items-start gap-3">
                  <Badge color="blue" size="xs">T1</Badge>
                  <span className="opacity-80">Lead selection and initial assessment</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="blue" size="xs">T2</Badge>
                  <span className="opacity-80">Damage calculations and speed tier analysis</span>
                </div>
                <div className="flex items-start gap-3">
                  <Badge color="blue" size="xs">T3</Badge>
                  <span className="opacity-80">Move selection based on opponent prediction</span>
                </div>
                <Text className="mt-3 text-xs opacity-60">
                  ... {match.turns - 3} more turns in full trace
                </Text>
              </div>
            </div>

            <Divider />

            <Text className="text-sm">
              The full reasoning trace includes damage range calculations, opponent move pool
              inference, speed tier comparisons, and win condition planning for each decision point.
            </Text>
          </Card>
        )}

        {/* Showdown Replay Embed (if HTML exists) */}
        {match.hasReplayHtml && (
          <Card>
            <Title className="font-display">Showdown Replay</Title>
            <Text className="mt-1">
              Official Pokémon Showdown replay with full battle animation.
            </Text>
            <Divider />
            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <iframe
                src={match.replayUrl}
                className="h-[600px] w-full"
                title="Battle Replay"
              />
            </div>
          </Card>
        )}

        {/* CTA */}
        <Card className="border-l-4 border-l-blue-500">
          <Title className="font-display">Research Access</Title>
          <Text className="mt-2">
            For access to full battle logs, reasoning traces, and evaluation API,
            contact our research team.
          </Text>
          <Button className="mt-4" asChild>
            <a href="mailto:alex@bottlenecklabs.com">
              Request Research Access
            </a>
          </Button>
        </Card>

        {/* Navigation */}
        <Flex justifyContent="between" className="pt-4">
          <Button variant="secondary" asChild>
            <Link to="/">← Back to Leaderboard</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/about">About Pokebench →</Link>
          </Button>
        </Flex>
      </main>
    </div>
  )
}

export default ReplayViewer

