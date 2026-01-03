export interface Alert {
    title: string;
    message: string;
    url?: string;
    timestamp: Date;
    cooldownMs?: number;
}

export interface CheckResult {
    isTriggered: boolean;
    alerts: Alert[];
    message?: string;
}

export interface Watcher {
    id: string;
    check(): Promise<CheckResult>;
}

export interface Notifier {
    notify(alert: Alert): Promise<void>;
}

export interface WatcherState {
    lastNotification?: Date;
    isTriggered: boolean;
}

export interface StateStore {
    getWatcherState(id: string): Promise<WatcherState | null>;
    setWatcherState(id: string, state: WatcherState): Promise<void>;
}
