import { readFileSync, existsSync } from "node:fs";
import { Redis } from "@upstash/redis";
import { type CryptoRule, settingsSchema } from "../config";

export class ConfigProvider {
    private redis: Redis | null = null;
    private readonly REDIS_KEY = "discord_notify_bot:config:rules";

    constructor(
        redisUrl?: string,
        redisToken?: string
    ) {
        if (redisUrl && redisToken) {
            try {
                this.redis = new Redis({
                    url: redisUrl,
                    token: redisToken,
                });
            } catch (error) {
                console.warn("Failed to initialize Redis client for config:", error);
            }
        }
    }

    async getRules(): Promise<CryptoRule[]> {
        // 1. Try Redis if available
        if (this.redis) {
            try {
                const data = await this.redis.get(this.REDIS_KEY);
                if (data) {
                    // Upstash Redis SDK auto-parses JSON if it's stored as JSON
                    // But if it's stored as a stringified JSON in a string value, we might need to parse.
                    // If the user sets the key via Console, it depends on how they set it.
                    // Usually safe to assume the SDK handles it if it's a valid JSON object.
                    // We'll try to parse it with our schema.

                    // Note: If data is already an object, JSON.parse might fail or be unnecessary.
                    const parsed = settingsSchema.safeParse(data);
                    if (parsed.success) {
                        return parsed.data.rules;
                    }
                    console.warn("Redis config invalid, falling back to file:", parsed.error);
                }
            } catch (error) {
                console.warn("Failed to fetch config from Redis, falling back to file:", error);
            }
        }

        // 2. Fallback to File
        try {
            if (existsSync("settings.json")) {
                const fileContent = readFileSync("settings.json", "utf-8");
                const parsed = settingsSchema.parse(JSON.parse(fileContent));
                return parsed.rules;
            }
        } catch (error) {
            console.error("Failed to load settings.json:", error);
        }

        return [];
    }
}
