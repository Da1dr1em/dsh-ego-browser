/**
 * Guide loading — the plugin ships the ego-browser skill content (the exact
 * SKILL.md / install.md the user maintains) as assets and serves it through
 * the ego_browser_help tool, so agents can consult the API without the full
 * text living in every system prompt.
 */
/** Topics the help tool can return. */
export type GuideTopic = 'guide' | 'runtime' | 'rules' | 'taskspaces' | 'handoff' | 'caveats' | 'install';
export declare const GUIDE_TOPICS: readonly GuideTopic[];
/** Full skill guide (SKILL.md). */
export declare function guide(): string;
/** Installation/connection troubleshooting notes (references/install.md). */
export declare function installNotes(): string;
/** Resolve one topic to its text (defaults to the full guide). */
export declare function topicText(topic: GuideTopic | undefined): {
    topic: GuideTopic;
    text: string;
};
/** Resolve a raw topic string from tool args to a known topic (unknown -> guide). */
export declare function parseTopic(value: unknown): GuideTopic | undefined;
/** Directory the assets live in, for diagnostics. */
export declare function assetDir(): string;
