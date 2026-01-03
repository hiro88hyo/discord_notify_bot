import type { Alert, Notifier } from "../domain/types";

export class DiscordNotifier implements Notifier {
    constructor(private webhookUrl: string) { }

    async notify(alert: Alert): Promise<void> {
        try {
            console.log("Sending Discord webhook...");
            const response = await fetch(this.webhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    embeds: [
                        {
                            title: alert.title,
                            description: alert.message,
                            url: alert.url,
                            timestamp: alert.timestamp.toISOString(),
                            color: 15158332,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                console.error(
                    `Failed to send Discord notification: ${response.statusText}`
                );
            } else {
                console.log("Discord notification sent successfully.");
            }
        } catch (error) {
            console.error("Error sending Discord notification:", error);
        }
    }
}
