import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PluginInput } from "@opencode-ai/plugin";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";

vi.mock("bun", () => ({
  $: vi.fn(),
}));

import plugin from "../src/index.js";

describe("opencode-git-trailers", () => {
  let testRepoPath: string;
  let isolatedGitEnvironment: NodeJS.ProcessEnv;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create a unique temporary git repository for each test
    testRepoPath = mkdtempSync(join(tmpdir(), "git-trailers-index-"));
    const emptyGitConfig = join(testRepoPath, "empty.gitconfig");
    writeFileSync(emptyGitConfig, "");
    isolatedGitEnvironment = {
      ...process.env,
      GIT_CONFIG_GLOBAL: emptyGitConfig,
      GIT_CONFIG_SYSTEM: emptyGitConfig,
      GIT_AUTHOR_NAME: "Test User",
      GIT_AUTHOR_EMAIL: "test@example.com",
      GIT_COMMITTER_NAME: "Test User",
      GIT_COMMITTER_EMAIL: "test@example.com",
    };
    execSync("git init", {
      cwd: testRepoPath,
      stdio: "pipe",
      env: isolatedGitEnvironment,
    });
  });

  afterEach(() => {
    // Clean up test repository
    if (existsSync(testRepoPath)) {
      rmSync(testRepoPath, { recursive: true, force: true });
    }
  });

  it("should export a plugin function", () => {
    expect(plugin).toBeDefined();
    expect(typeof plugin).toBe("function");
  });

  it("should return hooks object with tool.execute.before", async () => {
    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: "/test/dir",
      worktree: "/test/worktree",
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: vi.fn() as any,
    };

    const hooks = await plugin(mockInput);
    expect(hooks).toBeDefined();
    expect(typeof hooks).toBe("object");
    expect(hooks["tool.execute.before"]).toBeDefined();
    expect(typeof hooks["tool.execute.before"]).toBe("function");
  });

  it("should NOT modify git commit command when using hook manager", async () => {
    const mockShellChain = {
      text: vi.fn(),
      quiet: vi.fn(),
      nothrow: vi.fn(),
      cwd: vi.fn(),
    };

    mockShellChain.cwd.mockReturnValue(mockShellChain);
    mockShellChain.nothrow.mockReturnValue(mockShellChain);
    mockShellChain.quiet.mockReturnValue(mockShellChain);
    mockShellChain.text
      .mockResolvedValueOnce("opencode.trailer.session {{session}}")
      .mockResolvedValueOnce("John Doe")
      .mockResolvedValueOnce("john@example.com");

    const mockShell = vi.fn().mockReturnValue(mockShellChain);

    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: testRepoPath,
      worktree: testRepoPath,
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: mockShell as any,
    };

    const hooks = await plugin(mockInput);
    const beforeHook = hooks["tool.execute.before"];
    const afterHook = hooks["tool.execute.after"];

    const hookInput = {
      tool: "bash",
      sessionID: "test-session",
      callID: "call-123",
    };

    const output = {
      args: {
        command: 'git commit -m "test commit"',
      },
    };

    await beforeHook!(hookInput, output);

    // Command should NOT be modified when using hook manager
    expect(output.args.command).toBe('git commit -m "test commit"');

    // After hook should exist for cleanup
    expect(afterHook).toBeDefined();
  });

  it("should add trailers when Bun's shell API is unavailable", async () => {
    execSync("git config --local user.name 'Test User'", {
      cwd: testRepoPath,
      env: isolatedGitEnvironment,
    });
    execSync("git config --local user.email 'test@example.com'", {
      cwd: testRepoPath,
      env: isolatedGitEnvironment,
    });
    execSync("git config --local commit.gpgsign false", {
      cwd: testRepoPath,
      env: isolatedGitEnvironment,
    });
    execSync(
      "git config --local trailer.co-authored-by.key 'Co-authored-by'",
      { cwd: testRepoPath, env: isolatedGitEnvironment },
    );
    execSync(
      "git config --local opencode.trailer.co-authored-by 'Agent <agent@example.com>'",
      { cwd: testRepoPath, env: isolatedGitEnvironment },
    );

    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: testRepoPath,
      worktree: testRepoPath,
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: undefined as any,
    };
    const hooks = await plugin(mockInput);
    const hookInput = {
      tool: "bash",
      sessionID: "test-session",
      callID: "node-runtime-call",
    };
    const output = {
      args: {
        command: 'git commit -m "test commit"',
      },
    };

    writeFileSync(join(testRepoPath, "file.txt"), "content\n");
    execSync("git add file.txt", { cwd: testRepoPath, env: isolatedGitEnvironment });

    await hooks["tool.execute.before"]!(hookInput, output);
    expect(existsSync(join(testRepoPath, ".git", "hooks", "commit-msg"))).toBe(true);

    execSync(output.args.command, { cwd: testRepoPath, env: isolatedGitEnvironment });
    await hooks["tool.execute.after"]!(hookInput, {
      title: output.args.command,
      output: "",
      metadata: {},
    });

    expect(readFileSync(join(testRepoPath, ".git", "COMMIT_EDITMSG"), "utf8")).toContain(
      "Co-authored-by: Agent <agent@example.com>",
    );
    expect(existsSync(join(testRepoPath, ".git", "hooks", "commit-msg"))).toBe(false);
    expect(execSync("git log -1 --format='%an <%ae>|%cn <%ce>'", {
      cwd: testRepoPath,
      encoding: "utf8",
      env: isolatedGitEnvironment,
    }).trim()).toBe(
      "Test User <test@example.com>|Test User <test@example.com>",
    );
  });

  it("should not modify non-bash tools", async () => {
    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: "/test/dir",
      worktree: "/test/worktree",
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: vi.fn() as any,
    };

    const hooks = await plugin(mockInput);
    const hookFn = hooks["tool.execute.before"];

    const hookInput = {
      tool: "read",
      sessionID: "test-session",
      callID: "call-123",
    };

    const output = {
      args: {
        filePath: "/test/file.txt",
      },
    };

    await hookFn!(hookInput, output);

    // The args should not be modified
    expect(output.args).toEqual({ filePath: "/test/file.txt" });
  });

  it("should not modify non-git-commit commands", async () => {
    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: "/test/dir",
      worktree: "/test/worktree",
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: vi.fn() as any,
    };

    const hooks = await plugin(mockInput);
    const hookFn = hooks["tool.execute.before"];

    const hookInput = {
      tool: "bash",
      sessionID: "test-session",
      callID: "call-123",
    };

    const output = {
      args: {
        command: "git status",
      },
    };

    await hookFn!(hookInput, output);

    // The command should not be modified
    expect(output.args.command).toBe("git status");
  });

  it("should not modify command when no trailers are configured", async () => {
    const mockShellChain = {
      text: vi.fn(),
      quiet: vi.fn(),
      nothrow: vi.fn(),
      cwd: vi.fn(),
    };

    mockShellChain.cwd.mockReturnValue(mockShellChain);
    mockShellChain.nothrow.mockReturnValue(mockShellChain);
    mockShellChain.quiet.mockReturnValue(mockShellChain);
    // Return empty config
    mockShellChain.text
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("John Doe")
      .mockResolvedValueOnce("john@example.com");

    const mockShell = vi.fn().mockReturnValue(mockShellChain);

    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: testRepoPath,
      worktree: testRepoPath,
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: mockShell as any,
    };

    const hooks = await plugin(mockInput);
    const hookFn = hooks["tool.execute.before"];

    const hookInput = {
      tool: "bash",
      sessionID: "test-session",
      callID: "call-123",
    };

    const output = {
      args: {
        command: 'git commit -m "test commit"',
      },
    };

    await hookFn!(hookInput, output);

    // Command should remain unchanged when no trailers configured
    expect(output.args.command).toBe('git commit -m "test commit"');
  });

  it("should gracefully handle errors without breaking commits", async () => {
    // Mock console.error to suppress expected error output during test
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockShellChain = {
      text: vi.fn().mockRejectedValue(new Error("Git config failed")),
      quiet: vi.fn(),
      nothrow: vi.fn(),
      cwd: vi.fn(),
    };

    // Setup chain for all methods
    mockShellChain.cwd.mockReturnValue(mockShellChain);
    mockShellChain.nothrow.mockReturnValue(mockShellChain);
    mockShellChain.quiet.mockReturnValue(mockShellChain);

    // Mock the template tag function
    const mockShell = vi.fn().mockReturnValue(mockShellChain);

    const mockInput: PluginInput = {
      client: {} as any,
      project: {} as any,
      directory: "/test/dir",
      worktree: "/test/worktree",
      experimental_workspace: { register: vi.fn() },
      serverUrl: new URL("http://localhost"),
      $: mockShell as any,
    };

    const hooks = await plugin(mockInput);
    const hookFn = hooks["tool.execute.before"];

    const hookInput = {
      tool: "bash",
      sessionID: "test-session",
      callID: "call-123",
    };

    const output = {
      args: {
        command: 'git commit -m "test commit"',
      },
    };

    await hookFn!(hookInput, output);

    // Command should remain unchanged when error occurs
    expect(output.args.command).toBe('git commit -m "test commit"');

    // Verify that console.error was called with the expected message
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "opencode-git-trailers: Error processing trailers:",
      expect.any(Error)
    );

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
