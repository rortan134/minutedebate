type AchievementId =
    | "win_via_reductio"
    | "clean_burden_transfer"
    | "spot_and_fix_equivocation"
    | (string & {});

interface AchievementMeta {
    readonly description: string;
    readonly icon: string;
    readonly title: string;
}

const ACHIEVEMENT_META: Record<AchievementId, AchievementMeta> = {
    win_via_reductio: {
        title: "Win via Reductio",
        description:
            "Collapse the opponent’s thesis by showing it leads to an absurd world.",
        icon: "⭣",
    },
    clean_burden_transfer: {
        title: "Clean Burden Transfer",
        description:
            "Shift the proof back to your opponent with a crisp warrant call-out.",
        icon: "⇄",
    },
    spot_and_fix_equivocation: {
        title: "Spot & Fix Equivocation",
        description:
            "Catch a slippery word switch and fix the debate to one meaning.",
        icon: "✶",
    },
};

const DEFAULT_META: AchievementMeta = {
    title: "Skill Milestone",
    description: "Stack more distinctive moves to unlock deeper mastery.",
    icon: "✦",
};

export function getAchievementMeta(id: string): AchievementMeta {
    const key = id as AchievementId;
    return ACHIEVEMENT_META[key] ?? DEFAULT_META;
}
