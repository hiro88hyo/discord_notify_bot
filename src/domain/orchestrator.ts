import { differenceInMilliseconds } from "date-fns";
import type { Alert, Notifier, StateStore, Watcher } from "./types";

export class Orchestrator {
    constructor(
        private watchers: Watcher[],
        private notifier: Notifier,
        private stateStore: StateStore,
        private cooldownMs: number = 60 * 60 * 1000 // 1 hour default
    ) { }

    async runChecks(): Promise<void> {
        console.log("Starting orchestration checks...");
        for (const watcher of this.watchers) {
            try {
                const result = await watcher.check();
                const state = await this.stateStore.getWatcherState(watcher.id) || { isTriggered: false };
                console.log(`Check result for ${watcher.id}: triggered=${result.isTriggered}, previous=${state.isTriggered}`);

                if (result.isTriggered) {
                    if (state.isTriggered) {
                        console.log(`Skipping notification for ${watcher.id} (already triggered)`);
                        continue;
                    }

                    // Check cooldown
                    const cooldown = result.alerts[0]?.cooldownMs ?? this.cooldownMs;
                    if (state.lastNotification) {
                        const diff = differenceInMilliseconds(new Date(), state.lastNotification);
                        if (diff < cooldown) {
                            console.log(`Skipping alert ${watcher.id} due to cooldown (${cooldown}ms)`);
                            continue;
                        }
                    }

                    console.log(`Sending triggers for ${watcher.id}`);
                    for (const alert of result.alerts) {
                        await this.notifier.notify(alert);
                    }

                    await this.stateStore.setWatcherState(watcher.id, {
                        isTriggered: true,
                        lastNotification: new Date()
                    });

                } else {
                    if (state.isTriggered) {
                        console.log(`Sending recovery notification for ${watcher.id}`);
                        await this.notifier.notify({
                            title: `RECOVERY: ${watcher.id}`,
                            message: result.message || "Value returned to normal range.",
                            timestamp: new Date()
                        });

                        await this.stateStore.setWatcherState(watcher.id, {
                            isTriggered: false,
                            lastNotification: new Date()
                        });
                    }
                }

            } catch (error) {
                console.error("Error running watcher check:", error);
            }
        }
    }
}
