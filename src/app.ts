import { Hono } from "hono";
import { config } from "./config";
import { Orchestrator } from "./domain/orchestrator";
import { JsonFileStateStore } from "./infrastructure/state_store";
import { DiscordNotifier } from "./notifiers/discord";
import { CryptoWatcher } from "./watchers/crypto";

import { RedisStateStore } from "./infrastructure/redis_state_store";
import { type StateStore } from "./domain/types";

import { ConfigProvider } from "./infrastructure/config_provider";

const app = new Hono();

// Initialize Config Provider
const configProvider = new ConfigProvider(
    config.UPSTASH_REDIS_REST_URL,
    config.UPSTASH_REDIS_REST_TOKEN
);

const notifier = new DiscordNotifier(config.DISCORD_WEBHOOK_URL);

let store: StateStore;
if (config.STATE_STORE_TYPE === "redis") {
    if (!config.UPSTASH_REDIS_REST_URL || !config.UPSTASH_REDIS_REST_TOKEN) {
        console.error("Redis configuration missing");
        process.exit(1);
    }
    store = new RedisStateStore(config.UPSTASH_REDIS_REST_URL, config.UPSTASH_REDIS_REST_TOKEN);
} else {
    store = new JsonFileStateStore();
}

const orchestrator = new Orchestrator(
    [], // Initial empty watchers
    notifier,
    store,
    3600000 // Default cooldown if not specified in alert
);

// Helper to reload config
async function reloadConfig() {
    try {
        const rules = await configProvider.getRules();
        const watchers = rules.map((rule) => new CryptoWatcher(rule));
        orchestrator.updateWatchers(watchers);
    } catch (e) {
        console.error("Failed to reload config:", e);
    }
}

// Initial load
await reloadConfig();

app.post("/trigger", async (c) => {
    console.log("Trigger received");
    await reloadConfig();
    await orchestrator.runChecks();
    return c.json({ message: "Checks completed" });
});

if (config.EXECUTION_MODE === "periodic") {
    console.log(`Starting periodic checks every ${config.PERIODIC_INTERVAL_MS}ms`);
    setInterval(async () => {
        console.log("Running periodic checks");
        await reloadConfig();
        orchestrator.runChecks().catch((err) => {
            console.error("Periodic check failed", err);
        });
    }, config.PERIODIC_INTERVAL_MS);
}

app.get("/", (c) => c.text("Discord Notify Bot is running"));

export default {
    port: config.PORT,
    fetch: app.fetch,
};
