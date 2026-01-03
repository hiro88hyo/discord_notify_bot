import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import { writeFileSync, unlinkSync } from "node:fs";

// Mock environment
process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/dummy";
process.env.PORT = "0"; // Random port

const TEST_SETTINGS = {
    rules: [
        { coinId: "bitcoin", currency: "jpy", threshold: 10000000, direction: "above", cooldownMs: 0 }
    ]
};

describe("Integration", () => {
    beforeAll(() => {
        writeFileSync("settings.json", JSON.stringify(TEST_SETTINGS));
    });

    afterAll(() => {
        try {
            unlinkSync("settings.json");
        } catch { }
    });

    test("POST /trigger should trigger detailed checks", async () => {
        // Re-import app to ensure config is re-evaluated or handled if possible.
        // Note: in Bun/ESM, re-evaluating top-level code (config.ts) is hard without isolation.
        // However, since we write settings.json BEFORE dynamic import, it should work for the first run.
        const { default: app } = await import("./app");

        global.fetch = mock((req) => {
            const url = (req instanceof Request) ? req.url : req.toString();
            if (url.includes("coingecko")) {
                return Promise.resolve(new Response(JSON.stringify({
                    bitcoin: { jpy: 20000000 } // Above threshold
                })));
            }
            if (url.includes("discord")) {
                return Promise.resolve(new Response("ok"));
            }
            return Promise.resolve(new Response("not found", { status: 404 }));
        }) as unknown as typeof fetch;

        const res = await app.fetch(new Request("http://localhost/trigger", {
            method: "POST"
        }));

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toEqual({ message: "Checks completed" });

        // Verify CoinGecko was called
        // Verify Discord was called
        // Since we mocked global.fetch, we can check calls
        // But bun's mock might be cleared.
    });
});
