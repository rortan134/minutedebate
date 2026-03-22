"use client";

import { useInterval } from "@/hooks/use-interval";
import { getAchievementMeta } from "@/lib/achievements-meta";
import { cn } from "@/lib/cn";
import {
    MOVE_GOAL_META,
    resolveMoveGoal,
    type MoveKey,
} from "@/lib/move-goals";
import { useMutation, useQuery } from "convex/react";
import copy from "copy-to-clipboard";
import { useRouter } from "next/navigation";
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
        <div className="flex min-w-0 flex-col gap-2 border-border/30 border-b py-2 last:border-0 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-full shrink-0 text-[10px] text-muted-foreground uppercase tracking-widest sm:w-24">
                {label}
            </span>
            <div className="flex h-1.5 min-w-0 flex-1 gap-0.5">
                <div className="min-w-0 flex-1 bg-muted/20">
                    <div
                        className={cn(
                            "h-full",
                            isBetter ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        style={{ width: `${clampedMyScore}%` }}
                    />
                </div>
                <div className="w-px shrink-0 bg-border/50" />
                <div className="min-w-0 flex-1 bg-muted/20">
                    <div
                        className={cn(
                            "h-full",
                            !isBetter && diff !== 0
                                ? "bg-destructive/70"
                                : "bg-muted-foreground/30"
                        )}
                        style={{ width: `${clampedOpponentScore}%` }}
                    />
                </div>
            </div>
            <div className="flex w-full shrink-0 justify-end font-mono text-[10px] text-muted-foreground sm:w-12">
                {diffLabel}
            </div>
        </div>
    );
}

const COUNTDOWN_SECONDS = 3;
const COPY_RESET_MS = 2400;

function Postgame({ matchId, playerId }: PostgameProps) {
    const router = useRouter();
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
            router.push(`/match/${pendingMatchId}`);
        }
    }, [countdown, isRequeueing, pendingMatchId, router]);

    if (playerDoc === undefined || match === undefined) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="animate-pulse text-xs uppercase tracking-wider">
                    Loading results…
                </div>
            </div>
        );
    }

    if (match === null) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="space-y-6 text-center">
                    <div className="text-xs uppercase tracking-wider">
                        Match not found
                    </div>
                    <a
                        className="inline-flex items-center justify-center border border-border/60 px-6 py-3 font-semibold text-foreground text-xs uppercase tracking-[0.35em] transition hover:bg-foreground hover:text-background"
                        href="/"
                    >
                        Return to lobby
                    </a>
                </div>
            </div>
        );
    }

    if (!match.verdict) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="animate-pulse text-xs uppercase tracking-wider">
                    Awaiting verdict…
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
    const hasNewAchievements = latestAchievements.length > 0;
    const countdownActive = pendingMatchId !== null && countdown > 0;
    const playAgainLabel = countdownActive
        ? `Ready in ${countdown}`
        : isRequeueing
          ? "Queueing..."
          : "Next Match";
    const copyLabel =
        copyStatus === "copied"
            ? "Copied"
            : copyStatus === "error"
              ? "Error"
              : "Copy";

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
            router.push("/");
        } catch (error) {
            console.error("Failed to requeue:", error);
            setJoinError("Couldn't start. Try again.");
            setIsRequeueing(false);
        }
    };

    const handleCopyRecap = () => {
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
        const recap = lines.join("\n\n");
        const ok = copy(recap);
        setCopyStatus(ok ? "copied" : "error");
        setTimeout(() => setCopyStatus("idle"), COPY_RESET_MS);
    };

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-background font-sans text-foreground selection:bg-primary/20">
            {/* Header - Fixed Height */}
            <header className="flex-none border-border/60 border-b bg-background px-4 py-4 sm:px-6 lg:px-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground uppercase tracking-wide">
                            <span className="shrink-0">Result</span>
                            <span className="h-px w-4 shrink-0 bg-border" />
                            <span
                                className="min-w-0 truncate font-bold text-foreground sm:max-w-[50vw] lg:max-w-[40vw]"
                                title={match.topic}
                            >
                                {match.topic}
                            </span>
                            {averageDelta !== 0 && (
                                <span
                                    className={cn(
                                        "shrink-0",
                                        averageDelta > 0
                                            ? "text-primary"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    {averageDelta > 0 ? "+" : ""}
                                    {averageDelta.toFixed(1)}
                                </span>
                            )}
                        </div>
                        <h1 className="font-bold text-3xl uppercase tracking-tighter sm:text-4xl lg:text-5xl">
                            {isTie ? "Draw" : iWon ? "Victory" : "Defeat"}
                        </h1>
                    </div>

                    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                            <button
                                className="inline-flex h-10 w-full items-center justify-center border border-foreground bg-foreground px-6 font-bold text-background text-xs uppercase tracking-wider transition-all hover:bg-background hover:text-foreground disabled:opacity-50 sm:w-auto"
                                disabled={isRequeueing}
                                onClick={handlePlayAgain}
                                type="button"
                            >
                                {playAgainLabel}
                            </button>
                            <button
                                className={cn(
                                    "inline-flex h-10 w-full items-center justify-center border px-6 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-card/50 sm:w-auto",
                                    copyStatus === "copied"
                                        ? "border-success text-success"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                )}
                                onClick={handleCopyRecap}
                                type="button"
                            >
                                {copyLabel}
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:contents">
                            {joinError && (
                                <span className="animate-pulse text-destructive text-xs uppercase tracking-wider">
                                    {joinError}
                                </span>
                            )}
                            <a
                                className="inline-flex text-muted-foreground text-xs uppercase tracking-wider decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:underline sm:ml-2"
                                href="/"
                            >
                                Lobby
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - 3 Column Grid */}
            <main className="grid min-h-0 flex-1 grid-cols-1 divide-y divide-border/60 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
                {/* Col 1: Metrics */}
                <div className="flex min-h-0 flex-col">
                    <div className="flex-none border-border/30 border-b bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider sm:px-6">
                        Performance Axis
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="grid gap-0 border border-border/40">
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
                                label="Clarity"
                                myScore={myScores.rhetoricalClarity}
                                opponentScore={opponentScores.rhetoricalClarity}
                            />
                            <ScoreBar
                                label="Civility"
                                myScore={myScores.civility}
                                opponentScore={opponentScores.civility}
                            />
                        </div>

                        {/* Named Moves */}
                        {match.verdict.namedMoves.length > 0 && (
                            <div className="mt-8 space-y-4">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                                    Key Moves
                                </div>
                                <ul className="space-y-4">
                                    {namedMovesWithGoal.map((move) => {
                                        const meta = move.goal
                                            ? MOVE_GOAL_META[move.goal]
                                            : null;
                                        const title = meta
                                            ? meta.label
                                            : move.move.replace(/_/g, " ");
                                        return (
                                            <li
                                                className="border-primary/40 border-l-2 pl-3"
                                                key={
                                                    move.id ??
                                                    `${move.move}-${move.player}-${move.goal}`
                                                }
                                            >
                                                <div className="flex justify-between">
                                                    <span className="font-mono text-[10px] text-foreground uppercase tracking-wider">
                                                        {title}
                                                    </span>
                                                    <span className="text-[9px] text-muted-foreground/70 uppercase tracking-wide">
                                                        {move.player ===
                                                        perspective
                                                            ? "You"
                                                            : "Opp"}
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-muted-foreground text-xs">
                                                    {move.description}
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Col 2: Verdict */}
                <div className="flex min-h-0 flex-col">
                    <div className="flex-none border-border/30 border-b bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider sm:px-6">
                        Judge Verdict
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="prose prose-sm prose-invert max-w-none">
                            <p className="whitespace-pre-wrap text-muted-foreground text-sm leading-loose">
                                {match.verdict.explanation}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Col 3: Meta/Rankings */}
                <div className="flex min-h-0 flex-col">
                    <div className="flex-none border-border/30 border-b bg-muted/10 px-4 py-2 text-[10px] text-muted-foreground uppercase tracking-wider sm:px-6">
                        Pack Rankings
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Leaderboard */}
                        {leaderboard && leaderboard.length > 0 && (
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-background text-[9px] text-muted-foreground uppercase tracking-wider shadow-sm">
                                    <tr>
                                        <th className="px-4 py-2 font-medium sm:px-6">
                                            #
                                        </th>
                                        <th className="px-4 py-2 text-right font-medium sm:px-6">
                                            Score
                                        </th>
                                        <th className="px-4 py-2 text-right font-medium sm:px-6">
                                            W/L
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/30">
                                    {leaderboard
                                        .slice(0, 10)
                                        .map((entry, idx) => (
                                            <tr
                                                className="group hover:bg-muted/5"
                                                key={entry.playerId}
                                            >
                                                <td className="px-4 py-2 font-mono text-muted-foreground group-hover:text-foreground sm:px-6">
                                                    {(idx + 1)
                                                        .toString()
                                                        .padStart(2, "0")}
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono sm:px-6">
                                                    {entry.reasonScore.toFixed(
                                                        1
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 text-right text-[10px] text-muted-foreground sm:px-6">
                                                    {entry.wins}/
                                                    {entry.totalMatches}
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        )}

                        {/* Achievements */}
                        {hasNewAchievements && (
                            <div className="border-border/60 border-t p-4 sm:p-6">
                                <div className="mb-3 text-[10px] text-primary uppercase tracking-wider">
                                    Unlocked
                                </div>
                                <div className="grid gap-2">
                                    {latestAchievements.map((entry) => {
                                        const meta = getAchievementMeta(
                                            entry.achievementId
                                        );
                                        return (
                                            <div
                                                className="flex items-center gap-3 border border-primary/20 bg-primary/5 px-3 py-2"
                                                key={entry.achievementId}
                                            >
                                                <span className="text-lg">
                                                    {meta.icon}
                                                </span>
                                                <div className="min-w-0">
                                                    <h4 className="truncate font-bold text-[10px] text-primary uppercase tracking-wider">
                                                        {meta.title}
                                                    </h4>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

export { Postgame };
