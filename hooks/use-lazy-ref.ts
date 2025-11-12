import { useRef, type RefObject } from "react";

export function useLazyRef<T>(fn: () => T) {
    const ref = useRef<T | null>(null);
    if (ref.current === null) {
        ref.current = fn();
    }
    return ref as RefObject<T>;
}
