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
