import { readFile, writeFile } from "node:fs/promises";
import type { StateStore, WatcherState } from "../domain/types";

interface StoredWatcherState {
    lastNotification?: string;
    isTriggered: boolean;
}

export class JsonFileStateStore implements StateStore {
    constructor(private filePath: string = ".state.json") { }

    private async loadState(): Promise<Record<string, StoredWatcherState>> {
        try {
            const content = await readFile(this.filePath, "utf-8");
            return JSON.parse(content);
        } catch {
            return {};
        }
    }

    private async saveState(state: Record<string, StoredWatcherState>): Promise<void> {
        await writeFile(this.filePath, JSON.stringify(state, null, 2));
    }

    async getWatcherState(id: string): Promise<WatcherState | null> {
        const state = await this.loadState();
        const stored = state[id];
        if (!stored) return null;

        return {
            isTriggered: stored.isTriggered,
            lastNotification: stored.lastNotification ? new Date(stored.lastNotification) : undefined,
        };
    }

    async setWatcherState(id: string, state: WatcherState): Promise<void> {
        const fullState = await this.loadState();
        fullState[id] = {
            isTriggered: state.isTriggered,
            lastNotification: state.lastNotification?.toISOString(),
        };
        await this.saveState(fullState);
    }
}
