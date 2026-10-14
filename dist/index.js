import { readGitTrailers } from "./config.js";
import { isGitCommitCommand } from "./git-commit.js";
import { buildTrailers } from "./trailers.js";
import { getUserVariables, buildContextVariables } from "./variables.js";
import { CommitHookManager } from "./hook-manager.js";
import { existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
/**
 * Find existing commit-msg hook if present
 */
function findExistingCommitHook(cwd) {
    try {
        const hooksDir = execSync("git rev-parse --git-path hooks", {
            cwd,
            encoding: "utf-8",
        }).trim();
        const hookPath = hooksDir.startsWith("/")
            ? join(hooksDir, "commit-msg")
            : join(cwd, hooksDir, "commit-msg");
        return existsSync(hookPath) ? hookPath : undefined;
    }
    catch {
        return undefined;
    }
}
const plugin = async (input) => {
    // Store model/provider in closure to access across hooks
    let currentModel;
    let currentProvider;
    // Store hook manager per call ID for cleanup
    const hookManagers = new Map();
    return {
        "chat.params": async (hookInput) => {
            // Capture model and provider from chat parameters
            try {
                if (hookInput.model?.id) {
                    currentModel = hookInput.model.id;
                }
                if (hookInput.provider?.info?.name) {
                    currentProvider = hookInput.provider.info.name;
                }
            }
            catch {
                // Silently ignore errors in capturing model/provider
            }
        },
        "tool.execute.before": async (hookInput, output) => {
            try {
                // Only process bash tool
                if (hookInput.tool !== "bash") {
                    return;
                }
                const command = output.args?.command;
                if (!command || !isGitCommitCommand(command)) {
                    return;
                }
                // Read git trailer configuration
                const workdir = output.args?.workdir;
                const cwd = (typeof workdir === "string" ? workdir : undefined) || input.directory;
                const trailerConfig = await readGitTrailers(input.$, cwd);
                if (Object.keys(trailerConfig).length === 0) {
                    return;
                }
                // Collect all variables
                const userVars = await getUserVariables(input.$, cwd);
                const contextVars = buildContextVariables({
                    session: hookInput.sessionID,
                    model: currentModel,
                    provider: currentProvider,
                });
                const allVariables = { ...userVars, ...contextVars };
                // Build trailers
                const trailers = buildTrailers(trailerConfig, allVariables);
                // Find existing commit-msg hook to chain to
                const existingHookPath = findExistingCommitHook(cwd);
                // Create and install hook manager
                const manager = new CommitHookManager(cwd, trailers, existingHookPath);
                manager.installHook();
                // Store for cleanup in after hook
                hookManagers.set(hookInput.callID, manager);
            }
            catch (error) {
                // Gracefully handle errors - don't break the commit
                // Log error for debugging but allow commit to proceed unchanged
                console.error("opencode-git-trailers: Error processing trailers:", error);
            }
        },
        "tool.execute.after": async (hookInput) => {
            // Clean up hook if it was installed
            const manager = hookManagers.get(hookInput.callID);
            if (manager) {
                manager[Symbol.dispose]();
                hookManagers.delete(hookInput.callID);
            }
        },
    };
};
export default plugin;
