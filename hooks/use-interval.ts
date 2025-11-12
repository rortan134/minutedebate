import { useCallbackRef } from "@radix-ui/react-use-callback-ref";
import { useEffect } from "react";

export function useInterval(callbackFn: () => void, delayMs: number | null) {
    const onCallback = useCallbackRef(callbackFn);

    useEffect(() => {
        // Don't schedule if no delay is specified.
        // Note: 0 is a valid value for delay.
        if (delayMs === null) {
            return;
        }

        const intervalId = setInterval(() => {
            onCallback?.();
        }, delayMs);

        return () => {
            clearInterval(intervalId);
        };
    }, [delayMs, onCallback]);
}
