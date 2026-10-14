import { readGitCommand } from "./git-command.js";
/**
 * Retrieves user variables from git config.
 * @param $shell - OpenCode's Bun shell API when available
 * @param cwd - Current working directory
 * @returns Variables object with user.name and user.email
 */
export async function getUserVariables($shell, cwd) {
    const name = await readGitCommand($shell, cwd, ["config", "--get", "user.name"], (shell) => shell `git config user.name`);
    const email = await readGitCommand($shell, cwd, ["config", "--get", "user.email"], (shell) => shell `git config user.email`);
    return {
        "user.name": name.trim(),
        "user.email": email.trim(),
    };
}
/**
 * Builds context variables from the current session and model information.
 * @param context - Context object with optional model, provider, and session
 * @returns Variables object with context information and current timestamp
 */
export function buildContextVariables(context) {
    const variables = {};
    if (context.model) {
        variables.model = context.model;
    }
    if (context.provider) {
        variables.provider = context.provider;
    }
    if (context.session) {
        variables.session = context.session;
    }
    variables.timestamp = new Date().toISOString();
    return variables;
}
