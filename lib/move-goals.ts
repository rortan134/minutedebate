export type MoveKey =
    | "reductio"
    | "burden_shift"
    | "distinction"
    | "equivocation_fix";

export const MOVE_GOAL_META: Record<
    MoveKey,
    { readonly label: string; readonly description: string }
> = {
    reductio: {
        label: "Reductio",
        description:
            "Drive their premise to an absurd consequence and make them fix it.",
    },
    burden_shift: {
        label: "Burden Shift",
        description:
            "Hand the proof back—flag the missing warrant and force a reply.",
    },
    distinction: {
        label: "Sharp Distinction",
        description:
            "Define scope and terms so the clash stays on your framing.",
    },
    equivocation_fix: {
        label: "Fix Equivocation",
        description:
            "Catch a slippery term and lock the debate to one meaning.",
    },
};

export function resolveMoveGoal(move: string): MoveKey | null {
    const normalized = move.toLowerCase();
    if (normalized.includes("burden")) {
        return "burden_shift";
    }
    if (normalized.includes("reductio")) {
        return "reductio";
    }
    if (normalized.includes("equivocation")) {
        return "equivocation_fix";
    }
    if (
        normalized.includes("distinction") ||
        normalized.includes("definition")
    ) {
        return "distinction";
    }
    return null;
}
