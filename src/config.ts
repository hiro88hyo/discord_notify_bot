import { readFileSync, existsSync } from "node:fs";
import { z } from "zod";

const cryptoRuleSchema = z.object({
    coinId: z.string(),
    currency: z.string(),
    threshold: z.number(),
    direction: z.enum(["above", "below"]).default("above"),
    cooldownMs: z.number().default(3600000), // Default 1 hour
});

export type CryptoRule = z.infer<typeof cryptoRuleSchema>;

const envSchema = z.object({
    DISCORD_WEBHOOK_URL: z.string().url(),
    PORT: z.coerce.number().default(8080),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    STATE_STORE_TYPE: z.enum(["file", "redis"]).default("file"),
});

const settingsSchema = z.object({
    rules: z.array(cryptoRuleSchema),
});

// Load Env
const envConfig = envSchema.parse(process.env);

// Load Settings File
let settingsConfig = { rules: [] as CryptoRule[] };
try {
    if (existsSync("settings.json")) {
        const fileContent = readFileSync("settings.json", "utf-8");
        settingsConfig = settingsSchema.parse(JSON.parse(fileContent));
    } else {
        console.warn("settings.json not found, using empty rules");
    }
} catch (e) {
    console.error("Failed to load settings.json", e);
}

export const config = {
    ...envConfig,
    CRYPTO_WATCH_CONFIG: settingsConfig.rules,
};
