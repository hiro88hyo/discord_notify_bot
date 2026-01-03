import { describe, expect, test, mock, beforeEach } from "bun:test";
import { RedisStateStore } from "./redis_state_store";

// Mock @upstash/redis
const mockGet = mock();
const mockSet = mock();

mock.module("@upstash/redis", () => ({
    Redis: class {
        get = mockGet;
        set = mockSet;
        constructor() { }
    },
}));

describe("RedisStateStore", () => {
    let store: RedisStateStore;
    const WATCHER_ID = "test-watcher";

    beforeEach(() => {
        mockGet.mockClear();
        mockSet.mockClear();
        store = new RedisStateStore("url", "token");
    });

    test("should return null if state does not exist", async () => {
        mockGet.mockResolvedValue(null);

        const result = await store.getWatcherState(WATCHER_ID);
        expect(result).toBeNull();
        expect(mockGet).toHaveBeenCalledWith(`discord_notify_bot:watcher:${WATCHER_ID}`);
    });

    test("should return state if it exists", async () => {
        const mockState = {
            isTriggered: true,
            lastNotification: "2023-01-01T00:00:00.000Z",
        };
        mockGet.mockResolvedValue(mockState);

        const result = await store.getWatcherState(WATCHER_ID);
        expect(result).toEqual({
            isTriggered: true,
            lastNotification: new Date("2023-01-01T00:00:00.000Z"),
        });
    });

    test("should save state correctly", async () => {
        const newState = {
            isTriggered: true,
            lastNotification: new Date("2023-01-01T00:00:00.000Z"),
        };

        await store.setWatcherState(WATCHER_ID, newState);

        expect(mockSet).toHaveBeenCalledWith(
            `discord_notify_bot:watcher:${WATCHER_ID}`,
            {
                isTriggered: true,
                lastNotification: newState.lastNotification,
            }
        );
    });
});
