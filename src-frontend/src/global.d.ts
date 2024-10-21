import type { Commit } from "./lib";

declare global {
    interface Window {
        scaffold_: any,
        currentCommit_: Commit
    }
}