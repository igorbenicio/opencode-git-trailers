import { readGitCommand } from "./git-command.js";
import type { ShellAPI } from "./types.js";

const TRAILER_PREFIX = "opencode.trailer.";

/**
 * Reads git trailer configuration from git config.
 * Looks for config keys starting with "opencode.trailer."
 * @param $shell - OpenCode's Bun shell API when available
 * @param cwd - Current working directory
 * @returns Record of trailer configuration key-value pairs
 */
export async function readGitTrailers(
  $shell: ShellAPI | undefined,
  cwd: string,
): Promise<Record<string, string>> {
  const configOutput = await readGitCommand(
    $shell,
    cwd,
    ["config", "--get-regexp", "^opencode\\.trailer\\."],
    (shell) => shell`git config --get-regexp '^opencode\.trailer\.'`,
  );

  if (!configOutput.trim()) {
    return {};
  }

  const trailers: Record<string, string> = {};
  const lines = configOutput.trim().split("\n");

  for (const line of lines) {
    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) continue;

    const fullKey = line.substring(0, spaceIndex);
    const value = line.substring(spaceIndex + 1);
    const trailerName = fullKey.substring(TRAILER_PREFIX.length);

    trailers[trailerName] = value;
  }

  return trailers;
}
