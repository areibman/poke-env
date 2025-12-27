#!/usr/bin/env bun
/**
 * Sync replays and battle logs from poke-env to the web app.
 * 
 * This script:
 * 1. Copies replay HTML files from ../../../replays/ to ../public/replays/
 * 2. Parses battle logs from ../../../battle_logs/ to generate match metadata
 * 3. Generates a replays-manifest.json for the web app to consume
 * 
 * Run: bun scripts/sync-replays.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, copyFileSync, writeFileSync, statSync } from 'fs'
import { join, basename, dirname } from 'path'

// Paths relative to this script's location
const SCRIPT_DIR = dirname(new URL(import.meta.url).pathname)
const POKE_ENV_ROOT = join(SCRIPT_DIR, '..', '..', '..')
const REPLAYS_SOURCE = join(POKE_ENV_ROOT, 'replays')
const BATTLE_LOGS_SOURCE = join(POKE_ENV_ROOT, 'battle_logs')
const REPLAYS_DEST = join(SCRIPT_DIR, '..', 'public', 'replays')
const MANIFEST_PATH = join(SCRIPT_DIR, '..', 'src', 'data', 'replays-manifest.json')

interface BattleLogTurn {
  turn: number
  timestamp: string
  prompt: string
  completion: string
  chosen_move: string
  battle_state: {
    turn: number
    weather: string | null
    terrain: string | null
    player_side_conditions: string[]
    opponent_side_conditions: string[]
    active_pokemon: {
      species: string
      types: string[]
      hp_percent: number
      status: string | null
      ability: string
      item: string
    }
    opponent_active: {
      species: string
      types: string[]
      hp_percent: number
      status: string | null
    }
    team: Array<{
      species: string
      types: string[]
      hp_percent: number
      status: string | null
      fainted: boolean
    }>
    opponent_team: Array<{
      species: string
      types: string[]
      hp_percent: number
      fainted: boolean
    }>
  }
}

interface BattleLog {
  battle_id: string
  timestamp: string
  players: {
    [playerName: string]: {
      model: string
      turns: BattleLogTurn[]
    }
  }
  outcome: {
    winner: string | null
    end_timestamp: string
    details: Record<string, unknown>
  } | null
}

interface ReplayMatch {
  id: string
  battleId: string
  timestamp: string
  outcome: 'Win' | 'Loss' | 'Unknown'
  termination: 'normal' | 'timeout' | 'forfeit'
  turns: number
  agentName: string
  agentModel: string
  opponentName: string
  agentTeam: string[]
  opponentTeam: string[]
  replayUrl: string
  hasReplayHtml: boolean
  hasReasoning: boolean
}

interface ReplayManifest {
  generated: string
  replays: ReplayMatch[]
  byAgent: Record<string, ReplayMatch[]>
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
    console.log(`Created directory: ${dir}`)
  }
}

function syncReplayHtmlFiles(): Map<string, string> {
  const replayMap = new Map<string, string>() // battle_tag -> filename

  if (!existsSync(REPLAYS_SOURCE)) {
    console.log(`Replays source not found: ${REPLAYS_SOURCE}`)
    return replayMap
  }

  ensureDir(REPLAYS_DEST)

  const files = readdirSync(REPLAYS_SOURCE).filter(f => f.endsWith('.html'))
  console.log(`Found ${files.length} replay HTML files`)

  for (const file of files) {
    const srcPath = join(REPLAYS_SOURCE, file)
    const destPath = join(REPLAYS_DEST, file)

    // Extract battle tag from filename (format: "Username - battle-tag.html")
    const match = file.match(/^.+ - (.+)\.html$/)
    if (match) {
      const battleTag = match[1]
      replayMap.set(battleTag, file)
    }

    // Copy file if newer or doesn't exist
    const shouldCopy = !existsSync(destPath) ||
      statSync(srcPath).mtime > statSync(destPath).mtime

    if (shouldCopy) {
      copyFileSync(srcPath, destPath)
      console.log(`Copied: ${file}`)
    }
  }

  return replayMap
}

function parseBattleLogs(replayMap: Map<string, string>): ReplayMatch[] {
  const matches: ReplayMatch[] = []

  if (!existsSync(BATTLE_LOGS_SOURCE)) {
    console.log(`Battle logs source not found: ${BATTLE_LOGS_SOURCE}`)
    return matches
  }

  const battleDirs = readdirSync(BATTLE_LOGS_SOURCE)
    .filter(d => d.startsWith('battle_'))
    .filter(d => statSync(join(BATTLE_LOGS_SOURCE, d)).isDirectory())

  console.log(`Found ${battleDirs.length} battle log directories`)

  for (const dir of battleDirs) {
    const battleLogPath = join(BATTLE_LOGS_SOURCE, dir, 'battle_log.json')
    
    if (!existsSync(battleLogPath)) {
      console.log(`Skipping ${dir}: no battle_log.json`)
      continue
    }

    try {
      const logContent = readFileSync(battleLogPath, 'utf-8')
      const battleLog: BattleLog = JSON.parse(logContent)
      
      // Find the agent player (has model info) and opponent
      const playerNames = Object.keys(battleLog.players)
      
      for (const playerName of playerNames) {
        const playerData = battleLog.players[playerName]
        
        // Skip if no model (likely not an agent) or no turns
        if (!playerData.model || playerData.turns.length === 0) continue
        
        const opponentName = playerNames.find(n => n !== playerName) || 'Unknown'
        const opponentData = battleLog.players[opponentName]
        
        // Determine outcome
        let outcome: 'Win' | 'Loss' | 'Unknown' = 'Unknown'
        if (battleLog.outcome?.winner === playerName) {
          outcome = 'Win'
        } else if (battleLog.outcome?.winner) {
          outcome = 'Loss'
        }

        // Get team info from the first turn's battle state
        const firstTurn = playerData.turns[0]
        const agentTeam = firstTurn?.battle_state?.team?.map(p => capitalize(p.species)) || []
        
        // Try to get opponent team from revealed Pokemon
        const opponentTeam: string[] = []
        for (const turn of playerData.turns) {
          const oppActive = turn.battle_state?.opponent_active
          if (oppActive?.species) {
            const species = capitalize(oppActive.species)
            if (!opponentTeam.includes(species)) {
              opponentTeam.push(species)
            }
          }
          for (const opp of turn.battle_state?.opponent_team || []) {
            const species = capitalize(opp.species)
            if (!opponentTeam.includes(species)) {
              opponentTeam.push(species)
            }
          }
        }

        // Check if we have a replay HTML
        const replayFilename = replayMap.get(battleLog.battle_id)
        const hasReplayHtml = !!replayFilename

        // Determine termination type (would need more info from the battle log)
        // For now, assume normal unless we can detect otherwise
        let termination: 'normal' | 'timeout' | 'forfeit' = 'normal'
        
        const match: ReplayMatch = {
          id: `${battleLog.battle_id}-${playerName}`,
          battleId: battleLog.battle_id,
          timestamp: battleLog.timestamp,
          outcome,
          termination,
          turns: playerData.turns.length,
          agentName: playerName,
          agentModel: playerData.model,
          opponentName,
          agentTeam,
          opponentTeam,
          replayUrl: hasReplayHtml
            ? `/replays/${encodeURIComponent(replayFilename!)}`
            : `/replays/sample-replay.html#${battleLog.battle_id}`,
          hasReplayHtml,
          hasReasoning: playerData.turns.length > 0,
        }

        matches.push(match)
      }
    } catch (error) {
      console.error(`Error parsing ${battleLogPath}:`, error)
    }
  }

  return matches
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function groupByAgent(matches: ReplayMatch[]): Record<string, ReplayMatch[]> {
  const grouped: Record<string, ReplayMatch[]> = {}
  
  for (const match of matches) {
    // Group by model for cleaner organization
    const key = match.agentModel
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(match)
  }

  // Sort each group by timestamp descending (newest first)
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }

  return grouped
}

function main() {
  console.log('=== Pokebench Replay Sync ===\n')
  
  // Step 1: Sync replay HTML files
  console.log('Step 1: Syncing replay HTML files...')
  const replayMap = syncReplayHtmlFiles()
  console.log(`Synced ${replayMap.size} replay files\n`)

  // Step 2: Parse battle logs
  console.log('Step 2: Parsing battle logs...')
  const matches = parseBattleLogs(replayMap)
  console.log(`Parsed ${matches.length} matches\n`)

  // Step 3: Generate manifest
  console.log('Step 3: Generating manifest...')
  const manifest: ReplayManifest = {
    generated: new Date().toISOString(),
    replays: matches.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ),
    byAgent: groupByAgent(matches),
  }

  ensureDir(dirname(MANIFEST_PATH))
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
  console.log(`Wrote manifest to: ${MANIFEST_PATH}`)
  
  // Summary
  console.log('\n=== Summary ===')
  console.log(`Total replays synced: ${replayMap.size}`)
  console.log(`Total matches parsed: ${matches.length}`)
  console.log(`Matches with HTML replay: ${matches.filter(m => m.hasReplayHtml).length}`)
  console.log(`Matches with reasoning: ${matches.filter(m => m.hasReasoning).length}`)
  
  const models = Object.keys(manifest.byAgent)
  if (models.length > 0) {
    console.log('\nMatches by model:')
    for (const model of models) {
      console.log(`  ${model}: ${manifest.byAgent[model].length} matches`)
    }
  }
}

main()

