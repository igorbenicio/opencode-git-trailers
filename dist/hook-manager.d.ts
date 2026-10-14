/**
 * Manages temporary git commit-msg hooks with automatic cleanup via Disposable pattern.
 */
export declare class CommitHookManager implements Disposable {
    private readonly repoPath;
    private readonly trailers;
    private readonly existingHookPath?;
    private readonly hookPath;
    private readonly backupPath;
    private installed;
    constructor(repoPath: string, trailers: Record<string, string>, existingHookPath?: string);
    generateHookScript(): string;
    installHook(): void;
    [Symbol.dispose](): void;
}
