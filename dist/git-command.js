import { execFile } from "node:child_process";
/**
 * Runs git without invoking a shell and returns its standard output.
 * Git config uses exit code 1 when a requested key is not configured.
 */
export function readGitCommand($shell, cwd, args, bunCommand) {
    if ($shell) {
        return bunCommand($shell).cwd(cwd).nothrow().quiet().text();
    }
    return new Promise((resolve, reject) => {
        execFile("git", args, { cwd, encoding: "utf8" }, (error, stdout) => {
            if (!error) {
                resolve(stdout);
                return;
            }
            if (error.code === 1) {
                resolve("");
                return;
            }
            reject(error);
        });
    });
}
