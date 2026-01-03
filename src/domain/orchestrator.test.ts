import { describe, expect, mock, test } from "bun:test";
import { Orchestrator } from "./orchestrator";
import type { Alert, Notifier, StateStore, Watcher } from "./types";

describe("Orchestrator", () => {
    test("should notify and update state when alert is generated and no cooldown", async () => {
        const alert: Alert = {
            title: "Test Alert",
            message: "Test",
            timestamp: new Date(),
            cooldownMs: 60000
        };

        const watcher: Watcher = {
            id: "test-watcher",
            check: mock(() => Promise.resolve({
                isTriggered: true,
                alerts: [alert]
            })),
        };

        const notifier: Notifier = {
            notify: mock(() => Promise.resolve()),
        };

        const store: StateStore = {
            getWatcherState: mock(() => Promise.resolve(null)),
            setWatcherState: mock(() => Promise.resolve()),
        };

        const orchestrator = new Orchestrator([watcher], notifier, store);
        await orchestrator.runChecks();

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        expect(store.setWatcherState).toHaveBeenCalledTimes(1);
        expect(store.setWatcherState).toHaveBeenCalledWith("test-watcher", expect.objectContaining({ isTriggered: true }));
    });

    test("should skip notification if cooldown is active", async () => {
        const alert: Alert = {
            title: "Test Alert",
            message: "Test",
            timestamp: new Date(),
            cooldownMs: 60 * 60 * 1000
        };

        const watcher: Watcher = {
            id: "test-watcher",
            check: mock(() => Promise.resolve({
                isTriggered: true,
                alerts: [alert]
            })),
        };

        const notifier: Notifier = {
            notify: mock(() => Promise.resolve()),
        };

        // Last notification was 10 mins ago
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        const store: StateStore = {
            getWatcherState: mock(() => Promise.resolve({
                isTriggered: false, // Prev state false (so we check cooldown). Wait, if triggered=false, why was there a last notification? Maybe previous recovery or manual reset? Or manually ignored?
                lastNotification: tenMinutesAgo
            })),
            setWatcherState: mock(() => Promise.resolve()),
        };

        const orchestrator = new Orchestrator([watcher], notifier, store, 60 * 60 * 1000);
        await orchestrator.runChecks();

        expect(notifier.notify).toHaveBeenCalledTimes(0);
        expect(store.setWatcherState).toHaveBeenCalledTimes(0);
    });

    test("should suppress notification if already triggered (True -> True)", async () => {
        const alert: Alert = {
            title: "Test Alert",
            message: "Test",
            timestamp: new Date(),
        };

        const watcher: Watcher = {
            id: "test-watcher",
            check: mock(() => Promise.resolve({
                isTriggered: true,
                alerts: [alert]
            })),
        };

        const notifier: Notifier = {
            notify: mock(() => Promise.resolve()),
        };

        const store: StateStore = {
            getWatcherState: mock(() => Promise.resolve({
                isTriggered: true,
                lastNotification: new Date(Date.now() - 24 * 60 * 60 * 1000) // Long time ago
            })),
            setWatcherState: mock(() => Promise.resolve()),
        };

        const orchestrator = new Orchestrator([watcher], notifier, store);
        await orchestrator.runChecks();

        expect(notifier.notify).toHaveBeenCalledTimes(0);
        expect(store.setWatcherState).toHaveBeenCalledTimes(0);
    });

    test("should notify recovery when returning to normal (True -> False)", async () => {
        const watcher: Watcher = {
            id: "test-watcher",
            check: mock(() => Promise.resolve({
                isTriggered: false,
                alerts: [],
                message: "Back to normal"
            })),
        };

        const notifier: Notifier = {
            notify: mock(() => Promise.resolve()),
        };

        const store: StateStore = {
            getWatcherState: mock(() => Promise.resolve({
                isTriggered: true,
                lastNotification: new Date()
            })),
            setWatcherState: mock(() => Promise.resolve()),
        };

        const orchestrator = new Orchestrator([watcher], notifier, store);
        await orchestrator.runChecks();

        expect(notifier.notify).toHaveBeenCalledTimes(1);
        const callArg = (notifier.notify as any).mock.calls[0][0];
        expect(callArg.title).toContain("RECOVERY");

        expect(store.setWatcherState).toHaveBeenCalledTimes(1);
        expect(store.setWatcherState).toHaveBeenCalledWith("test-watcher", expect.objectContaining({ isTriggered: false }));
    });
});
