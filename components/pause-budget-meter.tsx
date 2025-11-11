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
    const clampedBudget = Math.max(0, Math.min(pauseBudgetMs, maxBudgetMs));
    const percentRemaining =
        maxBudgetMs === 0 ? 0 : (clampedBudget / maxBudgetMs) * 100;
    const secondsRemaining = clampedBudget / 1000;

    const barTone =
        clampedBudget <= CRITICAL_THRESHOLD_MS
            ? "bg-destructive"
            : clampedBudget <= WARNING_THRESHOLD_MS
              ? "bg-warning"
              : "bg-success";

    const cadenceLevel = Math.min(100, Math.max(0, cadenceSignal));

    return (
        <div
            className={cn(
                "flex w-full flex-col gap-2 rounded-xl border border-border/50 bg-background/60 p-4 shadow-sm transition-transform duration-200",
                isMyTurn ? "ring-1 ring-primary/40" : "opacity-70"
            )}
        >
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.35em]">
                <span>Pause Reserve</span>
                <span>{secondsRemaining.toFixed(1)}s</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-border/50">
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out",
                        barTone
                    )}
                    style={{ width: `${percentRemaining}%` }}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 text-[10px] text-muted-foreground uppercase tracking-[0.3em]">
                    cap 4s
                </div>
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.35em]">
                <span>Signal</span>
                <div className="flex h-2 w-28 items-center rounded-full bg-border/40">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-150",
                            cadenceLevel > 0 ? "bg-primary" : "bg-border"
                        )}
                        style={{ width: `${cadenceLevel}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
