import { cn } from "@/lib/cn";
import { MOVE_GOAL_META, type MoveKey } from "@/lib/move-goals";

function pickFeaturedMove(currentPhase: string, goals: readonly MoveKey[]) {
    const phase = currentPhase.toLowerCase();

    const preferences: Array<{
        match: (phase: string) => boolean;
        keys: MoveKey[];
    }> = [
        {
            match: (p) => p.startsWith("opening"),
            keys: ["distinction"],
        },
        {
            match: (p) => p.startsWith("burst"),
            keys: ["burden_shift", "reductio"],
        },
        {
            match: (p) => p.startsWith("summation"),
            keys: ["distinction", "equivocation_fix"],
        },
    ];

    for (const preference of preferences) {
        if (preference.match(phase)) {
            const found = preference.keys.find((key) =>
                goals.some((goal) => goal === key)
            );
            if (found) {
                return found;
            }
        }
    }

    return goals[0] ?? "distinction";
}

export interface PackFocusCardProps {
    readonly packName: string;
    readonly moveGoals: readonly MoveKey[];
    readonly currentPhase: string;
}

export function PackFocusCard({
    packName,
    moveGoals,
    currentPhase,
}: PackFocusCardProps) {
    if (moveGoals.length === 0) {
        return null;
    }

    const featured = pickFeaturedMove(currentPhase, moveGoals);

    return (
        <div className="space-y-4 rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
            <header className="flex flex-col gap-1">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                    Pack Gameplan
                </p>
                <h3 className="font-semibold text-foreground text-lg uppercase tracking-[0.2em]">
                    {packName}
                </h3>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                    Featured move: {MOVE_GOAL_META[featured]?.label ?? featured}
                </p>
            </header>
            <ul className="space-y-3">
                {moveGoals.map((goal) => {
                    const copy = MOVE_GOAL_META[goal] ?? {
                        label: goal.replace(/_/g, " "),
                        description: "Lean on this move to tilt the exchange.",
                    };
                    const isFeatured = goal === featured;
                    return (
                        <li
                            className={cn(
                                "rounded-xl border border-border/40 bg-background/40 px-4 py-3 transition",
                                isFeatured
                                    ? "border-primary/70 bg-primary/10 text-foreground shadow-sm"
                                    : "text-muted-foreground"
                            )}
                            key={goal}
                        >
                            <p className="font-semibold text-sm uppercase tracking-[0.25em]">
                                {copy.label}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                                {copy.description}
                            </p>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
