import type { Alert, CheckResult, Watcher } from "../domain/types";

export interface CryptoWatcherConfig {
    coinId: string;
    currency: string;
    threshold: number;
    direction: "above" | "below";
    cooldownMs: number;
}

export class CryptoWatcher implements Watcher {
    public readonly id: string;

    constructor(
        private config: CryptoWatcherConfig,
        private apiKey?: string
    ) {
        this.id = `crypto-${config.coinId}-${config.currency}-${config.direction}-${config.threshold}`;
    }

    async check(): Promise<CheckResult> {
        const { coinId, currency, threshold, direction } = this.config;
        console.log(`Starting crypto price check for ${coinId}...`);
        try {
            const headers: Record<string, string> = {
                "Accept": "application/json",
            };
            if (this.apiKey) {
                headers["x-cg-demo-api-key"] = this.apiKey;
            }

            const response = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${currency}`,
                { headers }
            );
            console.log(`API response received. Status: ${response.status}`);

            if (!response.ok) {
                console.error(`Failed to fetch price: ${response.statusText}`);
                return { isTriggered: false, alerts: [] };
            }

            const data = await response.json() as Record<string, Record<string, number>>;
            const price = data[coinId]?.[currency];
            console.log(`Price for ${coinId}: ${price}`);

            if (price === undefined) {
                console.error("Price data not found in response");
                return { isTriggered: false, alerts: [] };
            }

            const isTriggered =
                direction === "above" ? price >= threshold : price <= threshold;

            console.log(`Threshold check: ${price} ${direction} ${threshold} -> ${isTriggered}`);

            const alerts: Alert[] = [];
            if (isTriggered) {
                alerts.push({
                    title: `${coinId.charAt(0).toUpperCase() + coinId.slice(1)} Price Alert`,
                    message: `${coinId} price is ${price} ${currency.toUpperCase()} (${direction} threshold: ${threshold})`,
                    timestamp: new Date(),
                    url: `https://www.coingecko.com/en/coins/${coinId}`,
                    cooldownMs: this.config.cooldownMs,
                });
            }

            return {
                isTriggered,
                alerts,
                message: `${coinId} is ${price} ${currency} (${direction} ${threshold})`
            };

        } catch (error) {
            console.error("Error checking crypto price:", error);
            return { isTriggered: false, alerts: [] };
        }
    }
}
