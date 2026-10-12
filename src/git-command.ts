import { execFile } from "node:child_process";
import type { ShellAPI, ShellChain } from "./types.js";

/**
 * Runs git without invoking a shell and returns its standard output.
 * Git config uses exit code 1 when a requested key is not configured.
 */
export function readGitCommand(
  $shell: ShellAPI | undefined,
  cwd: string,
  args: readonly string[],
  bunCommand: (shell: ShellAPI) => ShellChain,
): Promise<string> {
  if ($shell) {
    return bunCommand($shell).cwd(cwd).nothrow().quiet().text();
  }

  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd, encoding: "utf8" },
      (error, stdout) => {
        if (!error) {
          resolve(stdout);
          return;
        }

        if (error.code === 1) {
          resolve("");
          return;
        }

        reject(error);
      },
    );
  });
}
