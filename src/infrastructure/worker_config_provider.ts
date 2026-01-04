import { Redis } from "@upstash/redis";
import { type CryptoRule, settingsSchema } from "../schemas";

export class WorkerConfigProvider {
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
        if (!this.redis) {
            console.warn("Redis not configured in WorkerConfigProvider");
            return [];
        }

        try {
            const data = await this.redis.get(this.REDIS_KEY);
            if (data) {
                const parsed = settingsSchema.safeParse(data);
                if (parsed.success) {
                    return parsed.data.rules;
                }
                console.warn("Redis config invalid:", parsed.error);
            }
        } catch (error) {
            console.warn("Failed to fetch config from Redis:", error);
        }

        return [];
    }
}
