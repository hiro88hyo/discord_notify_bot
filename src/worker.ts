import { Hono } from "hono";
import { Orchestrator } from "./domain/orchestrator";
import { CryptoWatcher } from "./watchers/crypto";
import { DiscordNotifier } from "./notifiers/discord";
import { RedisStateStore } from "./infrastructure/redis_state_store";
import { WorkerConfigProvider } from "./infrastructure/worker_config_provider";

export interface Env {
    DISCORD_WEBHOOK_URL: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    COINGECKO_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => c.text("Discord Notify Bot (Worker) is running"));

app.post("/trigger", async (c) => {
    console.log("Trigger received via HTTP");
    await runOrchestrator(c.env);
    return c.json({ message: "Checks completed" });
});

async function runOrchestrator(env: Env) {
    if (!env.DISCORD_WEBHOOK_URL || !env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
        console.error("Missing configuration");
        return;
    }

    const configProvider = new WorkerConfigProvider(
        env.UPSTASH_REDIS_REST_URL,
        env.UPSTASH_REDIS_REST_TOKEN
    );

    const rules = await configProvider.getRules();
    const watchers = rules.map((rule) => new CryptoWatcher(rule, env.COINGECKO_API_KEY));

    const notifier = new DiscordNotifier(env.DISCORD_WEBHOOK_URL);
    const store = new RedisStateStore(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);

    const orchestrator = new Orchestrator(
        watchers,
        notifier,
        store
    );

    await orchestrator.runChecks();
}

export default {
    fetch: app.fetch,
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        console.log("Scheduled event triggered");
        ctx.waitUntil(runOrchestrator(env));
    },
};
