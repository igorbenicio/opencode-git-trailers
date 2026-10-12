import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { readGitCommand } from "../src/git-command.js";

describe("readGitCommand", () => {
  it("uses the Bun shell API when it is available", async () => {
    const shell = (() => ({
      cwd: () => ({
        nothrow: () => ({
          quiet: () => ({
            text: async () => "from-bun",
          }),
        }),
      }),
    })) as any;

    await expect(
      readGitCommand(shell, "/tmp/repo", ["config"], (value) => value`git config`),
    ).resolves.toBe("from-bun");
  });

  it("uses execFile when the Bun shell API is unavailable", async () => {
    const repo = mkdtempSync(join(tmpdir(), "git-command-node-"));
    try {
      execFileSync("git", ["init"], { cwd: repo, stdio: "pipe" });
      execFileSync("git", ["config", "example.value", "value with spaces"], {
        cwd: repo,
        stdio: "pipe",
      });

      await expect(
        readGitCommand(undefined, repo, ["config", "--get", "example.value"], () => {
          throw new Error("Bun shell path should not run");
        }),
      ).resolves.toBe("value with spaces\n");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("returns an empty string for an unset Git config value", async () => {
    const repo = mkdtempSync(join(tmpdir(), "git-command-empty-"));
    try {
      execFileSync("git", ["init"], { cwd: repo, stdio: "pipe" });

      await expect(
        readGitCommand(undefined, repo, ["config", "--get", "missing.value"], () => {
          throw new Error("Bun shell path should not run");
        }),
      ).resolves.toBe("");
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });

  it("propagates execution failures", async () => {
    const missingDirectory = join(tmpdir(), "git-command-missing", "repo");

    await expect(
      readGitCommand(undefined, missingDirectory, ["config"], () => {
        throw new Error("Bun shell path should not run");
      }),
    ).rejects.toBeDefined();
  });
});
