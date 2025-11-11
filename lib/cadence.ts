const CADENCE_THRESHOLD = 400;
const GAP_THRESHOLD = 700;

export interface CadenceState {
    lastTypingTime: number | null;
    netChars: number;
    pauseBudget: number;
}

export function shouldPauseClock(
    currentTime: number,
    lastTypingTime: number | null,
    netChars: number,
    previousNetChars: number
): boolean {
    if (lastTypingTime === null) {
        return false;
    }

    const gap = currentTime - lastTypingTime;
    const charDelta = netChars - previousNetChars;

    return gap <= CADENCE_THRESHOLD && charDelta > 0;
}

export function hasGapExceededThreshold(
    currentTime: number,
    lastTypingTime: number | null
): boolean {
    if (lastTypingTime === null) {
        return false;
    }

    return currentTime - lastTypingTime > GAP_THRESHOLD;
}

export function filterFiller(text: string): string {
    const fillerPatterns = [
        /\b(um|uh|er|ah|like|you know|i mean)\b/gi,
        /\.{3,}/g,
        /\b(so|well|actually|basically|literally)\b/gi,
    ];

    let filtered = text;
    for (const pattern of fillerPatterns) {
        filtered = filtered.replace(pattern, "");
    }
    return filtered.trim();
}

export function calculateNetChars(text: string): number {
    return filterFiller(text).length;
}
