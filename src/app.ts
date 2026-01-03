import { Hono } from "hono";
import { config } from "./config";
import { Orchestrator } from "./domain/orchestrator";
import { JsonFileStateStore } from "./infrastructure/state_store";
import { DiscordNotifier } from "./notifiers/discord";
import { CryptoWatcher } from "./watchers/crypto";

import { RedisStateStore } from "./infrastructure/redis_state_store";
import { type StateStore } from "./domain/types";

const app = new Hono();

const watchers = config.CRYPTO_WATCH_CONFIG.map(
    (rule) => new CryptoWatcher(rule)
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
    watchers,
    notifier,
    store,
    3600000 // Default cooldown if not specified in alert
);

app.post("/trigger", async (c) => {
    console.log("Trigger received");
    await orchestrator.runChecks();
    return c.json({ message: "Checks completed" });
});

app.get("/", (c) => c.text("Discord Notify Bot is running"));

export default {
    port: config.PORT,
    fetch: app.fetch,
};
