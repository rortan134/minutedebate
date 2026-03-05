import { cn } from "@/lib/cn";

const CRITICAL_THRESHOLD_MS = 600;

interface PauseBudgetMeterProps {
    readonly isMyTurn: boolean;
    readonly maxBudgetMs: number;
    readonly pauseBudgetMs: number;
}

export function PauseBudgetMeter({
    pauseBudgetMs,
    maxBudgetMs,
    isMyTurn,
}: PauseBudgetMeterProps) {
    // Hide when not active turn to reduce noise
    if (!isMyTurn) {
        return null;
    }

    const clampedBudget = Math.max(0, Math.min(pauseBudgetMs, maxBudgetMs));
    const percentRemaining =
        maxBudgetMs === 0 ? 0 : (clampedBudget / maxBudgetMs) * 100;

    // Minimal color coding: only show "danger" when low
    const isCritical = clampedBudget <= CRITICAL_THRESHOLD_MS;
    const barColor = isCritical ? "bg-destructive" : "bg-foreground/20";

    return (
        <div className="flex items-center gap-2">
            <div className="flex h-0.5 w-16 overflow-hidden bg-muted/20">
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out",
                        barColor
                    )}
                    style={{ width: `${percentRemaining}%` }}
                />
            </div>
        </div>
    );
}
