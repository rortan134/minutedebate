const CADENCE_THRESHOLD = 1500; // Relaxed to 1.5s to match natural human typing (avg 40-60wpm = ~200-300ms per char, but bursty)
const GAP_THRESHOLD = 2000; // Relaxed to 2s for "hard" punishment

export interface CadenceState {
    lastTypingTime: number | null;
    netChars: number;
    pauseBudget: number;
}

export function shouldPauseClock(
    currentTime: number,
    lastTypingTime: number | null,
    _netChars: number,
    _previousNetChars: number
): boolean {
    // First keystroke should always start the "active" signal
    if (lastTypingTime === null) {
        return true;
    }

    // Just typing is enough to pause the clock if it's recent
    const gap = currentTime - lastTypingTime;

    // If gap is small enough, we are "active"
    // We ignore charDelta for the "pause clock" mechanic to be less punishing on typos/backspaces
    // The anti-cheese is server-side or simpler: you can't just hold a key, but normal typing flows.
    return gap <= CADENCE_THRESHOLD;
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
    // We want to be generous: any character count growth is "activity"
    // Using raw length allows spaces to count as activity, which is critical for flow.
    return text.length;
}
