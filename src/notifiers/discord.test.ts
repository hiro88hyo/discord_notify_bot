import { describe, expect, mock, test } from "bun:test";
import { DiscordNotifier } from "./discord";

describe("DiscordNotifier", () => {
    test("should send correct payload to webhook", async () => {
        const fetchMock = mock((url: any, options: any) => Promise.resolve(new Response("ok")));
        global.fetch = fetchMock as unknown as typeof fetch;

        const notifier = new DiscordNotifier("https://discord.com/api/webhooks/xxx");
        await notifier.notify({
            title: "Test Alert",
            message: "Test Message",
            timestamp: new Date("2023-01-01T00:00:00.000Z"),
            url: "https://example.com",
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, options] = fetchMock.mock.calls[0];
        expect(url).toBe("https://discord.com/api/webhooks/xxx");

        const body = JSON.parse(options.body as string);
        expect(body.embeds[0]).toMatchObject({
            title: "Test Alert",
            description: "Test Message",
            url: "https://example.com",
            timestamp: "2023-01-01T00:00:00.000Z",
        });
    });
});
