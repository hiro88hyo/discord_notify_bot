import { Redis } from "@upstash/redis";
import type { StateStore, WatcherState } from "../domain/types";

export class RedisStateStore implements StateStore {
    private redis: Redis;
    private readonly KEY_PREFIX = "discord_notify_bot:watcher:";

    constructor(url: string, token: string) {
        this.redis = new Redis({
            url,
            token,
        });
    }

    private getKey(id: string): string {
        return `${this.KEY_PREFIX}${id}`;
    }

    async getWatcherState(id: string): Promise<WatcherState | null> {
        const state = await this.redis.get<WatcherState>(this.getKey(id));
        if (!state) return null;

        return {
            isTriggered: state.isTriggered,
            lastNotification: state.lastNotification ? new Date(state.lastNotification) : undefined,
        };
    }

    async setWatcherState(id: string, state: WatcherState): Promise<void> {
        await this.redis.set(this.getKey(id), {
            isTriggered: state.isTriggered,
            lastNotification: state.lastNotification,
        });
    }
}
