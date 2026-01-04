import { readFileSync, existsSync } from "node:fs";
import { z } from "zod";

export const cryptoRuleSchema = z.object({
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
    EXECUTION_MODE: z.enum(["webhook", "periodic"]).default("webhook"),
    PERIODIC_INTERVAL_MS: z.coerce.number().default(60000), // Default 1 minute
});

export const settingsSchema = z.object({
    rules: z.array(cryptoRuleSchema),
});

// Load Env
export const config = envSchema.parse(process.env);
