import { afterEach, describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { JsonFileStateStore } from "./state_store.ts";

const TEST_FILE = "test_state.json";

describe("JsonFileStateStore", () => {
    afterEach(async () => {
        try {
            await unlink(TEST_FILE);
        } catch { }
    });

    test("should return null when file does not exist", async () => {
        const store = new JsonFileStateStore(TEST_FILE);
        const state = await store.getWatcherState("test-id");
        expect(state).toBeNull();
    });

    test("should save and retrieve last notification date", async () => {
        const store = new JsonFileStateStore(TEST_FILE);
        const date = new Date("2023-01-01T12:00:00Z");
        const state = { isTriggered: true, lastNotification: date };

        await store.setWatcherState("test-id", state);

        // Create new instance to simulate restart
        const store2 = new JsonFileStateStore(TEST_FILE);
        const retrieved = await store2.getWatcherState("test-id");

        expect(retrieved).toEqual(state);
    });
});
