import { useRef, useCallback, useEffect } from "react";

export function useTimeout() {
    const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);

    const _clearTimeout = useCallback(() => {
        if (timeoutId.current !== null) {
            clearTimeout(timeoutId.current);
            timeoutId.current = null;
        }
    }, []);

    useEffect(() => _clearTimeout, [_clearTimeout]);

    const _setTimeout = useCallback(
        <Args extends unknown[]>(
            callback: (...args: Args) => void,
            ms: number,
            ..._args: Args
        ) => {
            _clearTimeout();
            const id = setTimeout(callback, ms, ..._args);
            timeoutId.current = id;
            return id;
        },
        [_clearTimeout]
    );

    return [_setTimeout, _clearTimeout] as const;
}
