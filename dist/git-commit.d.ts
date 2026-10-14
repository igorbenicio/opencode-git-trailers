/**
 * Checks if a command is a git commit command.
 * Handles both standalone and chained commands (using && or ;).
 * @param command - The command string to check
 * @returns True if the command contains "git commit"
 */
export declare function isGitCommitCommand(command: string): boolean;
/**
 * Extracts the commit message from a git commit command.
 * Supports double-quoted, single-quoted, and unquoted message formats.
 * @param command - The git commit command
 * @returns The extracted commit message, or null if not found
 */
export declare function extractCommitMessage(command: string): string | null;
