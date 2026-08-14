/**
 * Guide loading — the plugin ships the ego-browser skill content (the exact
 * SKILL.md / install.md the user maintains) as assets and serves it through
 * the ego_browser_help tool, so agents can consult the API without the full
 * text living in every system prompt.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/** Topics the help tool can return. */
export type GuideTopic = 'guide' | 'runtime' | 'rules' | 'taskspaces' | 'handoff' | 'caveats' | 'install'

export const GUIDE_TOPICS: readonly GuideTopic[] = [
  'guide',
  'runtime',
  'rules',
  'taskspaces',
  'handoff',
  'caveats',
  'install',
]

const GUIDE_FILE = fileURLToPath(new URL('../assets/ego-browser-guide.md', import.meta.url))
const INSTALL_FILE = fileURLToPath(new URL('../assets/ego-browser-install.md', import.meta.url))

/** Heading marker of each non-guide topic, in document order. */
const SECTION_HEADING: Record<Exclude<GuideTopic, 'guide' | 'install'>, string> = {
  runtime: '## Runtime map',
  rules: '## Execution rules',
  taskspaces: '## Task spaces',
  handoff: '## Control handoff',
  caveats: '## Caveats',
}

let cachedGuide: string | undefined
let cachedInstall: string | undefined

function readAsset(file: string, cache: () => string | undefined, set: (value: string) => void): string {
  const hit = cache()
  if (hit !== undefined) return hit
  try {
    const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
    set(text)
    return text
  } catch {
    return `(guide asset not found at ${file})`
  }
}

/** Full skill guide (SKILL.md). */
export function guide(): string {
  return readAsset(GUIDE_FILE, () => cachedGuide, (value) => { cachedGuide = value })
}

/** Installation/connection troubleshooting notes (references/install.md). */
export function installNotes(): string {
  return readAsset(INSTALL_FILE, () => cachedInstall, (value) => { cachedInstall = value })
}

/** Extract one markdown section between its heading and the next `## `. */
function section(text: string, heading: string): string {
  const lines = text.split('\n')
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start < 0) return `(section '${heading}' not found in guide)`
  let end = lines.length
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith('## ')) {
      end = index
      break
    }
  }
  return lines.slice(start, end).join('\n').trim()
}

/** Resolve one topic to its text (defaults to the full guide). */
export function topicText(topic: GuideTopic | undefined): { topic: GuideTopic; text: string } {
  switch (topic) {
    case 'install':
      return { topic, text: installNotes() }
    case 'runtime':
    case 'rules':
    case 'taskspaces':
    case 'handoff':
    case 'caveats':
      return { topic, text: section(guide(), SECTION_HEADING[topic]) }
    case 'guide':
    default:
      return { topic: 'guide', text: guide() }
  }
}

/** Resolve a raw topic string from tool args to a known topic (unknown -> guide). */
export function parseTopic(value: unknown): GuideTopic | undefined {
  return typeof value === 'string' && (GUIDE_TOPICS as readonly string[]).includes(value)
    ? (value as GuideTopic)
    : undefined
}

/** Directory the assets live in, for diagnostics. */
export function assetDir(): string {
  return path.dirname(GUIDE_FILE)
}
