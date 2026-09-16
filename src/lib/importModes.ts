/**
 * The little that both sides of the upload need to agree on.
 *
 * Kept apart from importing.ts on purpose. That file pulls in the AI SDK and a
 * provider, which belong on the server and have no business in a browser
 * bundle, and the upload pane is a client component. Only the names of the two
 * jobs and the question counts cross that line.
 */

/** "read" transcribes questions a document already holds. "write" composes new ones. */
export type ImportMode = "read" | "write";

export const MODES: ImportMode[] = ["read", "write"];

export const isMode = (value: unknown): value is ImportMode =>
  typeof value === "string" && (MODES as string[]).includes(value);

/** What the /ai page offers, so the two ways in agree on what a sheet looks like. */
export const COUNTS = [10, 15, 20, 30, 0];
