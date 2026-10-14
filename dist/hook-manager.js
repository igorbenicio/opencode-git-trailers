import { writeFileSync, unlinkSync, existsSync, copyFileSync, renameSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { randomBytes } from "crypto";
/**
 * Resolves the git hooks directory using git rev-parse.
 * @param repoPath - Path to the repository
 * @returns Absolute path to the hooks directory
 */
function resolveHooksDir(repoPath) {
    try {
        const hooksDir = execSync("git rev-parse --git-path hooks", {
            cwd: repoPath,
            encoding: "utf-8",
        }).trim();
        // If the path is relative, join it with repoPath
        if (!hooksDir.startsWith("/")) {
            return join(repoPath, hooksDir);
        }
        return hooksDir;
    }
    catch {
        // Fallback to standard location if git command fails
        return join(repoPath, ".git", "hooks");
    }
}
/**
 * Generates a unique backup filename to avoid collisions.
 * Format: commit-msg.backup-<timestamp>-<random>
 */
function generateUniqueBackupPath(hookPath) {
    const timestamp = Date.now();
    const random = randomBytes(4).toString('hex');
    return `${hookPath}.backup-${timestamp}-${random}`;
}
/**
 * Manages temporary git commit-msg hooks with automatic cleanup via Disposable pattern.
 */
export class CommitHookManager {
    repoPath;
    trailers;
    existingHookPath;
    hookPath;
    backupPath;
    installed;
    constructor(repoPath, trailers, existingHookPath) {
        this.repoPath = repoPath;
        this.trailers = trailers;
        this.existingHookPath = existingHookPath;
        const hooksDir = resolveHooksDir(repoPath);
        this.hookPath = join(hooksDir, "commit-msg");
        this.backupPath = generateUniqueBackupPath(this.hookPath);
        this.installed = false;
    }
    generateHookScript() {
        const trailerArgs = [];
        for (const [key, value] of Object.entries(this.trailers)) {
            trailerArgs.push(`--if-exists replace --trailer "${key}:${value}"`);
        }
        let script = "#!/bin/bash\n";
        script += "set -eo pipefail\n";
        if (this.existingHookPath) {
            script += `${this.backupPath} "$1"\n`;
        }
        script += `git interpret-trailers ${trailerArgs.join(" ")} --in-place "$1"\n`;
        return script;
    }
    installHook() {
        // Backup existing hook if present
        if (this.existingHookPath && existsSync(this.existingHookPath)) {
            copyFileSync(this.existingHookPath, this.backupPath);
        }
        const script = this.generateHookScript();
        writeFileSync(this.hookPath, script, { mode: 0o755 });
        this.installed = true;
    }
    [Symbol.dispose]() {
        if (this.installed) {
            // Restore original hook if backup exists
            if (existsSync(this.backupPath)) {
                renameSync(this.backupPath, this.hookPath);
            }
            else if (existsSync(this.hookPath)) {
                // No backup means no original hook existed
                unlinkSync(this.hookPath);
            }
            this.installed = false;
        }
    }
}
