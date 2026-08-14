/**
 * Guide loading — the plugin ships the ego-browser skill content (the exact
 * SKILL.md / install.md the user maintains) as assets and serves it through
 * the ego_browser_help tool, so agents can consult the API without the full
 * text living in every system prompt.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const GUIDE_TOPICS = [
    'guide',
    'runtime',
    'rules',
    'taskspaces',
    'handoff',
    'caveats',
    'install',
];
const GUIDE_FILE = fileURLToPath(new URL('../assets/ego-browser-guide.md', import.meta.url));
const INSTALL_FILE = fileURLToPath(new URL('../assets/ego-browser-install.md', import.meta.url));
/** Heading marker of each non-guide topic, in document order. */
const SECTION_HEADING = {
    runtime: '## Runtime map',
    rules: '## Execution rules',
    taskspaces: '## Task spaces',
    handoff: '## Control handoff',
    caveats: '## Caveats',
};
let cachedGuide;
let cachedInstall;
function readAsset(file, cache, set) {
    const hit = cache();
    if (hit !== undefined)
        return hit;
    try {
        const text = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
        set(text);
        return text;
    }
    catch {
        return `(guide asset not found at ${file})`;
    }
}
/** Full skill guide (SKILL.md). */
export function guide() {
    return readAsset(GUIDE_FILE, () => cachedGuide, (value) => { cachedGuide = value; });
}
/** Installation/connection troubleshooting notes (references/install.md). */
export function installNotes() {
    return readAsset(INSTALL_FILE, () => cachedInstall, (value) => { cachedInstall = value; });
}
/** Extract one markdown section between its heading and the next `## `. */
function section(text, heading) {
    const lines = text.split('\n');
    const start = lines.findIndex((line) => line.trim() === heading);
    if (start < 0)
        return `(section '${heading}' not found in guide)`;
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
        if (lines[index].startsWith('## ')) {
            end = index;
            break;
        }
    }
    return lines.slice(start, end).join('\n').trim();
}
/** Resolve one topic to its text (defaults to the full guide). */
export function topicText(topic) {
    switch (topic) {
        case 'install':
            return { topic, text: installNotes() };
        case 'runtime':
        case 'rules':
        case 'taskspaces':
        case 'handoff':
        case 'caveats':
            return { topic, text: section(guide(), SECTION_HEADING[topic]) };
        case 'guide':
        default:
            return { topic: 'guide', text: guide() };
    }
}
/** Resolve a raw topic string from tool args to a known topic (unknown -> guide). */
export function parseTopic(value) {
    return typeof value === 'string' && GUIDE_TOPICS.includes(value)
        ? value
        : undefined;
}
/** Directory the assets live in, for diagnostics. */
export function assetDir() {
    return path.dirname(GUIDE_FILE);
}
