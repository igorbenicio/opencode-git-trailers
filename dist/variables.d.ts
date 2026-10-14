import type { ShellAPI, Variables } from "./types.js";
/**
 * Retrieves user variables from git config.
 * @param $shell - OpenCode's Bun shell API when available
 * @param cwd - Current working directory
 * @returns Variables object with user.name and user.email
 */
export declare function getUserVariables($shell: ShellAPI | undefined, cwd: string): Promise<Variables>;
/**
 * Builds context variables from the current session and model information.
 * @param context - Context object with optional model, provider, and session
 * @returns Variables object with context information and current timestamp
 */
export declare function buildContextVariables(context: {
    model?: string;
    provider?: string;
    session?: string;
}): Variables;
