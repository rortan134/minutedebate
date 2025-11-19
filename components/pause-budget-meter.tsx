import { cn } from "@/lib/cn";

const WARNING_THRESHOLD_MS = 1500;
const CRITICAL_THRESHOLD_MS = 600;

export interface PauseBudgetMeterProps {
    readonly pauseBudgetMs: number;
    readonly maxBudgetMs: number;
    readonly cadenceSignal: number;
    readonly isMyTurn: boolean;
}

export function PauseBudgetMeter({
    pauseBudgetMs,
    maxBudgetMs,
    cadenceSignal,
    isMyTurn,
}: PauseBudgetMeterProps) {
    // Hide when not active turn to reduce noise
    if (!isMyTurn) {
        return null;
    }

    const clampedBudget = Math.max(0, Math.min(pauseBudgetMs, maxBudgetMs));
    const percentRemaining =
        maxBudgetMs === 0 ? 0 : (clampedBudget / maxBudgetMs) * 100;
    const secondsRemaining = clampedBudget / 1000;

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
