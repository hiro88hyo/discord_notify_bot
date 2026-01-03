import { describe, expect, test, mock } from "bun:test";
import { CryptoWatcher } from "./crypto";

describe("CryptoWatcher", () => {
    test("should return alert when price exceeds threshold", async () => {
        // Mock fetch
        global.fetch = mock(() =>
            Promise.resolve(new Response(JSON.stringify({
                bitcoin: { jpy: 11000000 }
            })))
        ) as unknown as typeof fetch;

        const watcher = new CryptoWatcher({
            coinId: "bitcoin",
            currency: "jpy",
            threshold: 10000000,
            direction: "above",
            cooldownMs: 3600000,
        });

        const result = await watcher.check();
        expect(result.isTriggered).toBe(true);
        expect(result.alerts).toHaveLength(1);
        expect(result.alerts[0].title).toContain("Bitcoin Price Alert");
        expect(result.alerts[0].message).toContain("11000000");
    });

    test("should not return alert when price is below threshold (above mode)", async () => {
        // Mock fetch
        global.fetch = mock(() =>
            Promise.resolve(new Response(JSON.stringify({
                bitcoin: { jpy: 9000000 }
            })))
        ) as unknown as typeof fetch;

        const watcher = new CryptoWatcher({
            coinId: "bitcoin",
            currency: "jpy",
            threshold: 10000000,
            direction: "above",
            cooldownMs: 3600000,
        });

        const result = await watcher.check();
        expect(result.isTriggered).toBe(false);
        expect(result.alerts).toHaveLength(0);
    });
});
