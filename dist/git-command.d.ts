import type { ShellAPI, ShellChain } from "./types.js";
/**
 * Runs git without invoking a shell and returns its standard output.
 * Git config uses exit code 1 when a requested key is not configured.
 */
export declare function readGitCommand($shell: ShellAPI | undefined, cwd: string, args: readonly string[], bunCommand: (shell: ShellAPI) => ShellChain): Promise<string>;
