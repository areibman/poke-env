import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionList,
  Badge,
  Button,
  Callout,
  Card,
  Divider,
  Flex,
  Grid,
  Subtitle,
  Text,
  Title,
} from '@tremor/react'

import {
  methodologyTabs,
  pipelineStages,
  providerLogosRow,
  replayPreview,
  runtimeStack,
  realReplays,
  hasRealReplays,
} from '../data/pokebench'

import { SiteNavbar } from '@/components/SiteNavbar'
import { TextGenerateEffect } from '@/components/ui/text-generate-effect'

export const Route = createFileRoute('/about')({
  component: AboutPokebench,
})

const benchmarkFocus = [
  'Win/loss consistency over 100+ matches',
  'Predictive planning and move-pool reasoning',
  'Damage range and speed tier modeling',
  'Timeout and forfeit tracking',
]

const benchmarkInputs = [
  'Format: Gen9 Random Battles',
  'Matches per agent: 100',
  'Rating: Elo-style scoring',
  'Artifacts: Replay + reasoning trace',
  'Termination tags: normal / timeout / forfeit',
]

const replayArtifacts = [
  'Full battle log with timestamps',
  'Model rationale, tool calls, and turn plans',
  'Final outcome + termination reason',
  'Standalone HTML file for sharing with labs',
]

const badgeTextClassName = 'text-slate-900 dark:text-slate-100'
const slateBadgeClassName =
  '!bg-slate-200 !bg-opacity-100 !text-slate-900 !ring-slate-300 dark:!bg-slate-800 dark:!bg-opacity-100 dark:!text-slate-100 dark:!ring-slate-700'

function AboutPokebench() {
  const navigate = useNavigate()
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 pt-10 pb-20">
        <SiteNavbar />
        <Card>
          <Title className="font-display">About Pokebench</Title>
          <Text className="mt-2">
            How the Gen9 RandBats benchmark works.
          </Text>
          <TextGenerateEffect
            words="Standardized Gen9 RandBats benchmarking with replayable decision traces."
            className="font-semibold"
            textClassName="text-base text-slate-700 dark:text-slate-200"
          />
        </Card>

        <Grid numItemsLg={3} className="gap-6">
          <Card className="lg:col-span-2">
            <Flex
              className="flex-wrap gap-3"
              alignItems="center"
              justifyContent="start"
            >
              <Badge color="cyan" className={badgeTextClassName}>
                Benchmark scope
              </Badge>
              <Badge color="emerald" className={badgeTextClassName}>
                Gen9 RandBats
              </Badge>
              <Badge color="slate" className={slateBadgeClassName}>
                Replay + trace
              </Badge>
            </Flex>
            <Title className="mt-4 font-display">About Pokebench</Title>
            <Text className="mt-3 text-base">
              Pokebench evaluates LLM battle agents in Pokémon Showdown Gen9
              Random Battles. Each agent runs ~100 matches with full replay and
              reasoning traces, so we can compare tactical decision quality
              across providers.
            </Text>
            <div className="mt-4 flex flex-col gap-2">
              {benchmarkFocus.map((item, index) => (
                <Flex
                  key={item}
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
                  <Text className="text-sm">{item}</Text>
                </Flex>
              ))}
            </div>
            <Button
              color="cyan"
              onClick={() =>
                (window.location.href = 'mailto:alex@bottlenecklabs.com')
              }
            >
              Request private evals
            </Button>
            <Callout
              className="mt-6"
              title="Research inquiries"
              color="cyan"
            >
              For research inquiries or to evaluate private models against the
              benchmark, email alex@bottlenecklabs.com.
            </Callout>
          </Card>
          <Card decoration="left" decorationColor="emerald">
            <Title className="font-display">Benchmark inputs</Title>
            <div className="mt-4 flex flex-col gap-2">
              {benchmarkInputs.map((item, index) => (
                <Flex
                  key={item}
                  alignItems="center"
                  justifyContent="start"
                  className="gap-3"
                >
                  <Badge
                    color="emerald"
                    size="xs"
                    className={badgeTextClassName}
                  >
                    {index + 1}
                  </Badge>
                  <Text className="text-sm">{item}</Text>
                </Flex>
              ))}
            </div>
          </Card>
        </Grid>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Methodology</Title>
              <Text>How we measure tactical strength under randomness.</Text>
            </div>
            <Badge color="emerald" className={badgeTextClassName}>
              Gen9 RandBats only
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <AccordionList>
            {methodologyTabs.map((tab, index) => (
              <Accordion key={tab.name} defaultOpen={index === 0}>
                <AccordionHeader>{tab.name}</AccordionHeader>
                <AccordionBody>
                  <div className="mt-2 flex flex-col gap-2">
                    {tab.points.map((point, pointIndex) => (
                      <Flex
                        key={point}
                        alignItems="center"
                        justifyContent="start"
                        className="gap-3"
                      >
                        <Badge
                          color="slate"
                          size="xs"
                          className={slateBadgeClassName}
                        >
                          {pointIndex + 1}
                        </Badge>
                        <Text className="text-sm">{point}</Text>
                      </Flex>
                    ))}
                  </div>
                </AccordionBody>
              </Accordion>
            ))}
          </AccordionList>
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Benchmark pipeline</Title>
              <Text>
                Model → Harness → Showdown → Replay + reasoning trace. Each stage
                is logged and replayable.
              </Text>
            </div>
            <Badge color="slate" className={slateBadgeClassName}>
              Deterministic logging
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <Grid numItemsLg={4} className="gap-4">
            {pipelineStages.map((stage) => (
              <Card key={stage.title} decoration="top" decorationColor="cyan">
                <Flex
                  className="flex-wrap gap-2"
                  alignItems="center"
                  justifyContent="start"
                >
                  {stage.icons.map((icon, iconIndex) => (
                    <img
                      key={`${stage.title}-${iconIndex}`}
                      src={icon.light}
                      alt={`${stage.title} icon ${iconIndex + 1}`}
                      className="h-6 w-6 object-contain dark:hidden"
                    />
                  ))}
                  {stage.icons.map((icon, iconIndex) => (
                    <img
                      key={`${stage.title}-dark-${iconIndex}`}
                      src={icon.dark}
                      alt={`${stage.title} icon ${iconIndex + 1}`}
                      className="hidden h-6 w-6 object-contain dark:block"
                    />
                  ))}
                </Flex>
                <Text className="mt-4 font-medium">{stage.title}</Text>
                <Text className="mt-2 text-xs">{stage.description}</Text>
                <div className="mt-4 flex flex-col gap-2">
                  {stage.bullets.map((bullet, bulletIndex) => (
                    <Flex
                      key={bullet}
                      alignItems="center"
                      justifyContent="start"
                      className="gap-3"
                    >
                      <Badge
                        color="cyan"
                        size="xs"
                        className={badgeTextClassName}
                      >
                        {bulletIndex + 1}
                      </Badge>
                      <Text className="text-xs">{bullet}</Text>
                    </Flex>
                  ))}
                </div>
              </Card>
            ))}
          </Grid>
        </Card>

        <Card>
          <Grid numItemsLg={2} className="gap-6">
            <div>
              <Flex alignItems="center" className="gap-3" justifyContent="start">
                <Title className="font-display">Benchmarked providers</Title>
                <Badge color="slate" className={slateBadgeClassName}>
                  6 labs
                </Badge>
              </Flex>
              <Text className="mt-2">
                Every model runs the same harness, tool stack, and match count.
              </Text>
              <Flex
                className="mt-4 flex-wrap gap-4"
                alignItems="center"
                justifyContent="start"
              >
                {providerLogosRow.map((provider) => (
                  <Flex
                    key={provider.name}
                    className="gap-2"
                    alignItems="center"
                    justifyContent="start"
                  >
                    <img
                      src={provider.logo.light}
                      alt={`${provider.name} logo`}
                      className="h-6 w-6 object-contain dark:hidden"
                    />
                    <img
                      src={provider.logo.dark}
                      alt={`${provider.name} logo`}
                      className="hidden h-6 w-6 object-contain dark:block"
                    />
                    <Text className="text-xs uppercase tracking-wide">
                      {provider.name}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </div>
            <div>
              <Flex alignItems="center" className="gap-3" justifyContent="start">
                <Title className="font-display">Runtime stack</Title>
                <Badge color="cyan" className={badgeTextClassName}>
                  poke-env core
                </Badge>
              </Flex>
              <Text className="mt-2">
                The sim harness, storage, and replay artifacts stay portable.
              </Text>
              <Grid numItemsSm={2} className="mt-4 gap-3">
                {runtimeStack.map((stack) => (
                  <Card key={stack.name}>
                    <Flex
                      className="gap-3"
                      alignItems="center"
                      justifyContent="start"
                    >
                      <img
                        src={stack.logo.light}
                        alt={`${stack.name} logo`}
                        className="h-6 w-6 object-contain dark:hidden"
                      />
                      <img
                        src={stack.logo.dark}
                        alt={`${stack.name} logo`}
                        className="hidden h-6 w-6 object-contain dark:block"
                      />
                      <div>
                        <Text className="text-sm font-medium">{stack.name}</Text>
                        <Text className="text-xs">{stack.description}</Text>
                      </div>
                    </Flex>
                  </Card>
                ))}
              </Grid>
            </div>
          </Grid>
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Replay + trace artifacts</Title>
              <Text>Every replay pairs Showdown playback with agent reasoning.</Text>
            </div>
            <Badge color="amber" className={badgeTextClassName}>
              Trace visible
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <Grid numItemsSm={2} className="gap-3">
            {replayArtifacts.map((item) => (
              <Card key={item}>
                <Text className="text-sm">{item}</Text>
              </Card>
            ))}
          </Grid>
          <Button
            variant="secondary"
            color="slate"
            className="mt-6"
            onClick={() => {
              const firstReplay = hasRealReplays ? realReplays[0] : null
              if (firstReplay) {
                navigate({ to: '/replays/$battleId', params: { battleId: firstReplay.battleId } })
              } else {
                window.location.href = replayPreview[0].replayUrl
              }
            }}
          >
            Open sample replay
          </Button>
        </Card>

        <Card>
          <Flex justifyContent="between" alignItems="center" className="gap-6">
            <div>
              <Title className="font-display">Research access</Title>
              <Subtitle>Evaluate private models against Pokebench.</Subtitle>
            </div>
            <Badge color="emerald" className={badgeTextClassName}>
              Contact
            </Badge>
          </Flex>
          <Divider className="my-6" />
          <Flex className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Text className="max-w-xl">
              For research inquiries or to evaluate private models against the
              benchmark, email alex@bottlenecklabs.com.
            </Text>
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
      </div>
    </main>
  )
}
