import { useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let currentTime = Date.now();

const TICK_MS = 100;

setInterval(() => {
    currentTime = Date.now();
    for (const listener of listeners) {
        listener();
    }
}, TICK_MS);

export function useNow(): number {
    return useSyncExternalStore(
        (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        () => currentTime,
        () => currentTime
    );
}
