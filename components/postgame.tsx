"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInterval } from "@/hooks/use-interval";
import { getAchievementMeta } from "@/lib/achievements-meta";
import { cn } from "@/lib/cn";
import {
    MOVE_GOAL_META,
    resolveMoveGoal,
    type MoveKey,
} from "@/lib/move-goals";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { TOPIC_PACKS } from "../convex/topic_packs";

interface PostgameProps {
    matchId: Id<"matches">;
    playerId: string;
}

interface ScoreBarProps {
    label: string;
    myScore: number;
    opponentScore: number;
}

function ScoreBar({ label, myScore, opponentScore }: ScoreBarProps) {
    const clampedMyScore = Math.max(0, Math.min(100, myScore));
    const clampedOpponentScore = Math.max(0, Math.min(100, opponentScore));
    const diff = myScore - opponentScore;
    const diffLabel =
        diff === 0
            ? "Draw"
            : diff > 0
              ? `+${diff.toFixed(0)}`
              : diff.toFixed(0);

    const isBetter = myScore > opponentScore;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.3em]">
                <span>{label}</span>
                <span>
                    {myScore.toFixed(0)} / {opponentScore.toFixed(0)} (
                    {diffLabel})
                </span>
            </div>
            <div className="flex gap-2">
                <div className="flex-1 rounded-full bg-border/40">
                    <div
                        className={cn(
                            "h-2 rounded-full transition-all",
                            isBetter ? "bg-success" : "bg-muted-foreground/40"
                        )}
                        style={{ width: `${clampedMyScore}%` }}
                    />
                </div>
                <div className="flex-1 rounded-full bg-border/40">
                    <div
                        className={cn(
                            "h-2 rounded-full transition-all",
                            isBetter
                                ? "bg-muted-foreground/40"
                                : "bg-destructive/70"
                        )}
                        style={{ width: `${clampedOpponentScore}%` }}
                    />
                </div>
            </div>
            <p
                className={cn(
                    "text-xs uppercase tracking-[0.3em]",
                    diff === 0
                        ? "text-muted-foreground"
                        : diff > 0
                          ? "text-success"
                          : "text-destructive/80"
                )}
            >
                {diff === 0
                    ? "Parity"
                    : diff > 0
                      ? "Advantage secured"
                      : "Behind this axis"}
            </p>
        </div>
    );
}

const COUNTDOWN_SECONDS = 3;
const COPY_RESET_MS = 2400;

export default function Postgame({ matchId, playerId }: PostgameProps) {
    const match = useQuery(api.matchmaking.getMatch, { matchId });
    const playerDoc = useQuery(api.matchmaking.getPlayerDoc, { playerId });
    const leaderboard = useQuery(api.judging.getLeaderboard, {
        pack: match?.topicPack ?? "",
        limit: 10,
    });
    const achievements = useQuery(api.achievements.listForPlayer, {
        playerId,
        matchId,
        limit: 12,
    });
    const joinQueue = useMutation(api.matchmaking.joinQueue);

    const [isRequeueing, setIsRequeueing] = useState(false);
    const [pendingMatchId, setPendingMatchId] = useState<Id<"matches"> | null>(
        null
    );
    const [countdown, setCountdown] = useState(0);
    const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
        "idle"
    );
    const [joinError, setJoinError] = useState<string | null>(null);

    useInterval(
        () => {
            setCountdown((current) => (current > 0 ? current - 1 : 0));
        },
        countdown > 0 ? 1000 : null
    );

    useEffect(() => {
        if (pendingMatchId && countdown === 0 && isRequeueing) {
            window.location.href = `/match/${pendingMatchId}`;
        }
    }, [countdown, isRequeueing, pendingMatchId]);

    if (!match?.verdict || playerDoc === undefined) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="text-lg uppercase tracking-[0.3em]">
                    Loading results…
                </div>
            </div>
        );
    }

    const playerDocId = playerDoc?._id ?? null;
    const isPlayer1 = playerDocId !== null && match.player1Id === playerDocId;
    const isPlayer2 = playerDocId !== null && match.player2Id === playerDocId;

    const perspective = isPlayer1
        ? "player1"
        : isPlayer2
          ? "player2"
          : "player2";

    const myScores =
        perspective === "player1"
            ? match.verdict.player1Scores
            : match.verdict.player2Scores;
    const opponentScores =
        perspective === "player1"
            ? match.verdict.player2Scores
            : match.verdict.player1Scores;
    const iWon = match.verdict.winner === perspective;
    const isTie = match.verdict.winner === "tie";

    const packInfo = TOPIC_PACKS[match.topicPack as keyof typeof TOPIC_PACKS];
    const moveGoals = (packInfo?.moveGoals ?? []) as readonly MoveKey[];

    const axisKeys = [
        "logic",
        "evidence",
        "relevance",
        "rhetoricalClarity",
        "civility",
    ] as const;

    const myAverage =
        axisKeys.reduce((total, key) => total + myScores[key], 0) /
        axisKeys.length;
    const opponentAverage =
        axisKeys.reduce((total, key) => total + opponentScores[key], 0) /
        axisKeys.length;
    const averageDelta = myAverage - opponentAverage;

    const namedMovesWithGoal = match.verdict.namedMoves.map((move) => {
        const goal = resolveMoveGoal(move.move);
        const aligns = goal !== null && moveGoals.includes(goal);
        return { ...move, goal, aligns };
    });

    const latestAchievements = achievements?.latestMatchAchievements ?? [];
    const totalAchievements = achievements?.totalUnlocked ?? 0;
    const recentAchievements = achievements?.recent ?? [];
    const hasNewAchievements = latestAchievements.length > 0;
    const countdownActive = pendingMatchId !== null && countdown > 0;
    const playAgainLabel = countdownActive
        ? `Match ready in ${countdown}`
        : isRequeueing
          ? "Preparing queue…"
          : "Find another match";
    const copyLabel =
        copyStatus === "copied"
            ? "Copied!"
            : copyStatus === "error"
              ? "Copy failed"
              : "Copy recap";

    const handlePlayAgain = async () => {
        if (isRequeueing) {
            return;
        }
        setJoinError(null);
        setIsRequeueing(true);
        try {
            const nextMatchId = await joinQueue({ playerId });
            if (nextMatchId) {
                setPendingMatchId(nextMatchId);
                setCountdown(COUNTDOWN_SECONDS);
                return;
            }
            setIsRequeueing(false);
            window.location.href = "/";
        } catch (error) {
            console.error("Failed to requeue:", error);
            setJoinError("Couldn't start a new match. Try again in a moment.");
            setIsRequeueing(false);
        }
    };

    const handleCopyRecap = async () => {
        if (!match.verdict) {
            return;
        }
        const lines: string[] = [];
        lines.push(
            `MinuteDebate — ${packInfo?.name ?? "Daily Pack"} • ${match.topic}`
        );
        const outcomeLabel = isTie ? "Tie" : iWon ? "You won" : "You lost";
        lines.push(
            `Outcome: ${outcomeLabel} (judge recorded ${match.verdict.winner})`
        );
        lines.push(
            `Reason score avg: ${myAverage.toFixed(1)} vs ${opponentAverage.toFixed(
                1
            )} (${averageDelta >= 0 ? "+" : ""}${averageDelta.toFixed(1)})`
        );
        lines.push(
            `Axes:\n${axisKeys
                .map(
                    (key) =>
                        `• ${key}: ${myScores[key].toFixed(0)} / ${opponentScores[
                            key
                        ].toFixed(0)}`
                )
                .join("\n")}`
        );
        lines.push(`Judge: ${match.verdict.explanation}`);
        if (match.verdict.namedMoves.length > 0) {
            lines.push(
                `Named moves:\n${match.verdict.namedMoves
                    .map(
                        (move) =>
                            `• ${move.player === perspective ? "You" : "Opponent"} — ${
                                move.move
                            }: ${move.description}`
                    )
                    .join("\n")}`
            );
        }
        if (hasNewAchievements) {
            lines.push(
                `Achievements unlocked: ${latestAchievements
                    .map(
                        (entry) => getAchievementMeta(entry.achievementId).title
                    )
                    .join(", ")}`
            );
        }

        const recap = lines.join("\n\n");

        if (
            typeof navigator === "undefined" ||
            !navigator.clipboard?.writeText
        ) {
            setCopyStatus("error");
            setTimeout(() => setCopyStatus("idle"), COPY_RESET_MS);
            return;
        }

        try {
            await navigator.clipboard.writeText(recap);
            setCopyStatus("copied");
            setTimeout(() => setCopyStatus("idle"), COPY_RESET_MS);
        } catch (error) {
            console.error("Failed to copy recap:", error);
            setCopyStatus("error");
            setTimeout(() => setCopyStatus("idle"), COPY_RESET_MS);
        }
    };
    return (
        <div className="relative h-screen overflow-hidden bg-background text-foreground">
            <div className="absolute top-1 left-1 z-10 h-8 w-8 border-border/80 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute top-1 right-1 z-10 h-8 w-8 border-border/80 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="absolute bottom-1 left-1 z-10 h-8 w-8 border-border/80 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute right-1 bottom-1 z-10 h-8 w-8 border-border/80 border-r-2 border-b-2 lg:h-12 lg:w-12" />

            <main className="flex h-full flex-col gap-6 overflow-y-auto px-6 py-10 lg:px-12">
                <section className="flex flex-col gap-6">
                    <header className="space-y-5 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.4em]">
                                    <span>Match Complete</span>
                                    <div className="h-px w-12 bg-border" />
                                    <span>{packInfo?.name}</span>
                                </div>
                                <h1 className="font-bold text-4xl uppercase">
                                    {isTie
                                        ? "Draw"
                                        : iWon
                                          ? "Victory"
                                          : "Defeat"}
                                </h1>
                            </div>
                            <span
                                className={cn(
                                    "rounded-full px-4 py-2 text-xs uppercase tracking-[0.35em]",
                                    isTie
                                        ? "border border-warning/40 bg-warning/10 text-warning-foreground"
                                        : iWon
                                          ? "border border-success/50 bg-success/15 text-success-foreground"
                                          : "border border-destructive/50 bg-destructive/10 text-destructive-foreground"
                                )}
                            >
                                {(isTie && "Tie") ||
                                    (iWon ? "You Won" : "You Lost")}
                            </span>
                        </div>
                        <p className="max-w-readable text-muted-foreground">
                            {match.topic}
                        </p>
                    </header>

                    <div className="space-y-2 rounded-2xl border border-border/40 bg-card/20 p-4 shadow-sm backdrop-blur">
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-2 font-semibold text-background text-xs uppercase tracking-[0.35em] transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={isRequeueing}
                                onClick={handlePlayAgain}
                                type="button"
                            >
                                {playAgainLabel}
                            </button>
                            <button
                                className={cn(
                                    "inline-flex items-center justify-center rounded-full border px-5 py-2 font-semibold text-xs uppercase tracking-[0.35em] transition",
                                    copyStatus === "copied"
                                        ? "border-success/60 text-success hover:border-success/80"
                                        : copyStatus === "error"
                                          ? "border-destructive/60 text-destructive hover:border-destructive"
                                          : "border-border/60 text-foreground hover:border-foreground/70"
                                )}
                                onClick={handleCopyRecap}
                                type="button"
                            >
                                {copyLabel}
                            </button>
                            <a
                                className="inline-flex items-center justify-center rounded-full border border-border/60 px-5 py-2 font-semibold text-xs uppercase tracking-[0.35em] text-foreground transition hover:border-foreground hover:text-foreground/90"
                                href="/"
                            >
                                Return to lobby
                            </a>
                            <span className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                Total achievements: {totalAchievements}
                            </span>
                        </div>
                        {joinError ? (
                            <p className="text-destructive text-xs uppercase tracking-[0.3em]">
                                {joinError}
                            </p>
                        ) : null}
                        {countdownActive ? (
                            <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                Auto-entering next debate…
                            </p>
                        ) : null}
                    </div>

                    <section className="space-y-6 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <header className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                    Axis Breakdown
                                </p>
                                <h2 className="font-semibold text-xl">
                                    Final Scores
                                </h2>
                            </div>
                            <div className="flex gap-4 text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                <span>You</span>
                                <span className="opacity-50">vs</span>
                                <span>Opponent</span>
                            </div>
                            <span className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                Δ Reason score: {averageDelta >= 0 ? "+" : ""}
                                {averageDelta.toFixed(1)}
                            </span>
                        </header>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <ScoreBar
                                label="Logic"
                                myScore={myScores.logic}
                                opponentScore={opponentScores.logic}
                            />
                            <ScoreBar
                                label="Evidence"
                                myScore={myScores.evidence}
                                opponentScore={opponentScores.evidence}
                            />
                            <ScoreBar
                                label="Relevance"
                                myScore={myScores.relevance}
                                opponentScore={opponentScores.relevance}
                            />
                            <ScoreBar
                                label="Rhetorical Clarity"
                                myScore={myScores.rhetoricalClarity}
                                opponentScore={opponentScores.rhetoricalClarity}
                            />
                            <ScoreBar
                                label="Civility"
                                myScore={myScores.civility}
                                opponentScore={opponentScores.civility}
                            />
                        </div>
                    </section>

                    <section className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <h2 className="font-semibold text-xl">
                            Judge&apos;s Commentary
                        </h2>
                        <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
                            {match.verdict.explanation}
                        </p>

                        {match.verdict.namedMoves.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                    Named Moves
                                </p>
                                <ul className="space-y-2 rounded-xl border border-border/40 bg-background/40 p-4 text-muted-foreground text-sm">
                                    {namedMovesWithGoal.map((move) => {
                                        const goalMeta =
                                            move.goal !== null
                                                ? MOVE_GOAL_META[move.goal]
                                                : null;
                                        return (
                                            <li
                                                className="space-y-1 rounded-lg border border-border/40 bg-card/30 px-4 py-3"
                                                key={`${move.player}-${move.move}-${move.description}`}
                                            >
                                                <div className="flex items-center justify-between gap-4">
                                                    <span className="font-semibold text-foreground uppercase tracking-[0.25em]">
                                                        {move.player ===
                                                        perspective
                                                            ? "You"
                                                            : "Opponent"}
                                                    </span>
                                                    <span className="flex-1 text-right text-muted-foreground">
                                                        {move.move} —{" "}
                                                        {move.description}
                                                    </span>
                                                </div>
                                                {goalMeta ? (
                                                    <p
                                                        className={cn(
                                                            "text-xs uppercase tracking-[0.3em]",
                                                            move.aligns
                                                                ? "text-success"
                                                                : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {move.aligns
                                                            ? `Pack goal hit: ${goalMeta.label}`
                                                            : `Bonus move: ${goalMeta.label}`}
                                                    </p>
                                                ) : null}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </section>

                    {achievements ? (
                        <section className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                            <header className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                        Achievements
                                    </p>
                                    <h2 className="font-semibold text-xl">
                                        Latest Unlocks
                                    </h2>
                                </div>
                                <span className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                    Lifetime total: {totalAchievements}
                                </span>
                            </header>

                            {hasNewAchievements ? (
                                <TooltipProvider>
                                    <div className="flex flex-wrap items-center gap-3">
                                        {latestAchievements.map((entry) => {
                                            const meta = getAchievementMeta(
                                                entry.achievementId
                                            );
                                            return (
                                                <Tooltip
                                                    key={`${entry.achievementId}-${entry.unlockedAt}`}
                                                >
                                                    <TooltipTrigger className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 font-semibold text-success text-xs uppercase tracking-[0.35em]">
                                                        <span>{meta.icon}</span>
                                                        <span>
                                                            {meta.title}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="bottom">
                                                        {meta.description}
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        })}
                                    </div>
                                </TooltipProvider>
                            ) : (
                                <p className="text-muted-foreground text-sm">
                                    No fresh achievements this round—keep
                                    hunting for distinctive moves to unlock
                                    more.
                                </p>
                            )}

                            {recentAchievements.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                        Recent Highlights
                                    </p>
                                    <ul className="space-y-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                        {recentAchievements
                                            .slice(0, 5)
                                            .map((entry) => {
                                                const meta = getAchievementMeta(
                                                    entry.achievementId
                                                );
                                                const timestamp = new Date(
                                                    entry.unlockedAt
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                });
                                                return (
                                                    <li
                                                        className="flex items-center justify-between rounded-lg border border-border/30 bg-background/40 px-3 py-2"
                                                        key={`${entry.achievementId}-${entry.unlockedAt}-recent`}
                                                    >
                                                        <span>
                                                            {meta.title}
                                                        </span>
                                                        <span className="text-muted-foreground">
                                                            {timestamp}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                    </ul>
                                </div>
                            ) : null}
                        </section>
                    ) : null}
                </section>
                {leaderboard && leaderboard.length > 0 ? (
                    <section className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                    Leaderboard
                                </p>
                                <h3 className="font-semibold text-muted-foreground text-sm uppercase tracking-[0.3em]">
                                    {packInfo?.name}
                                </h3>
                            </div>
                            <span className="font-mono text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                Top 10
                            </span>
                        </div>
                        <ul className="space-y-2 text-muted-foreground text-sm">
                            {leaderboard.slice(0, 10).map(
                                (
                                    entry: {
                                        playerId: Id<"players">;
                                        reasonScore: number;
                                        totalMatches: number;
                                        wins: number;
                                    },
                                    idx: number
                                ) => (
                                    <li
                                        className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2"
                                        key={entry.playerId}
                                    >
                                        <span className="font-semibold text-foreground">
                                            #{idx + 1}
                                        </span>
                                        <span className="text-xs uppercase tracking-[0.25em]">
                                            {entry.reasonScore.toFixed(1)} pts •{" "}
                                            {entry.wins}W/{entry.totalMatches}
                                        </span>
                                    </li>
                                )
                            )}
                        </ul>
                    </section>
                ) : null}
            </main>
        </div>
    );
}
