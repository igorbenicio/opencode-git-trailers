import type { ShellAPI } from "./types.js";
/**
 * Reads git trailer configuration from git config.
 * Looks for config keys starting with "opencode.trailer."
 * @param $shell - OpenCode's Bun shell API when available
 * @param cwd - Current working directory
 * @returns Record of trailer configuration key-value pairs
 */
export declare function readGitTrailers($shell: ShellAPI | undefined, cwd: string): Promise<Record<string, string>>;
