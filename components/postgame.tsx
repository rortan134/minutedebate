"use client";

import { useInterval } from "@/hooks/use-interval";
import copy from "copy-to-clipboard";
import { getAchievementMeta } from "@/lib/achievements-meta";
import { cn } from "@/lib/cn";
import {
    MOVE_GOAL_META,
    resolveMoveGoal,
    type MoveKey,
} from "@/lib/move-goals";
import { useMutation, useQuery } from "convex/react";
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
        <div className="flex items-center gap-3 border-b border-border/30 py-2 last:border-0">
            <span className="w-24 text-[10px] uppercase tracking-widest text-muted-foreground">
                {label}
            </span>
            <div className="flex h-1.5 flex-1 gap-0.5">
                <div className="flex-1 bg-muted/20">
                    <div
                        className={cn(
                            "h-full",
                            isBetter ? "bg-primary" : "bg-muted-foreground/30"
                        )}
                        style={{ width: `${clampedMyScore}%` }}
                    />
                </div>
                <div className="w-px bg-border/50" />
                <div className="flex-1 bg-muted/20">
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
            <div className="flex w-12 justify-end font-mono text-[10px] text-muted-foreground">
                {diffLabel}
            </div>
        </div>
    );
}

const COUNTDOWN_SECONDS = 3;
const COPY_RESET_MS = 2400;

export default function Postgame({ matchId, playerId }: PostgameProps) {
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
                <div className="text-xs uppercase tracking-wider animate-pulse">
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
                        className="inline-flex items-center justify-center border border-border/60 px-6 py-3 font-semibold text-xs uppercase tracking-[0.35em] text-foreground transition hover:bg-foreground hover:text-background"
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
                <div className="text-xs uppercase tracking-wider animate-pulse">
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
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground font-sans selection:bg-primary/20">
            {/* Header - Fixed Height */}
            <header className="flex-none border-b border-border/60 bg-background px-6 py-4 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-muted-foreground text-[10px] uppercase tracking-wide">
                            <span>Result</span>
                            <span className="h-px w-4 bg-border" />
                            <span
                                className="truncate max-w-[40vw] font-bold text-foreground"
                                title={match.topic}
                            >
                                {match.topic}
                            </span>
                            {averageDelta !== 0 && (
                                <span
                                    className={cn(
                                        "ml-2",
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
                        <h1 className="font-bold text-4xl uppercase tracking-tighter lg:text-5xl">
                            {isTie ? "Draw" : iWon ? "Victory" : "Defeat"}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="group inline-flex h-10 items-center justify-center border border-foreground bg-foreground px-6 font-bold text-background text-xs uppercase tracking-wider transition-all hover:bg-background hover:text-foreground disabled:opacity-50"
                            disabled={isRequeueing}
                            onClick={handlePlayAgain}
                            type="button"
                        >
                            {playAgainLabel}
                        </button>
                        <button
                            className={cn(
                                "inline-flex h-10 items-center justify-center border px-6 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-card/50",
                                copyStatus === "copied"
                                    ? "border-success text-success"
                                    : "border-border text-muted-foreground hover:text-foreground"
                            )}
                            onClick={handleCopyRecap}
                            type="button"
                        >
                            {copyLabel}
                        </button>
                        {joinError && (
                            <span className="text-destructive text-xs uppercase tracking-wider animate-pulse">
                                {joinError}
                            </span>
                        )}
                        <a
                            className="ml-2 hidden text-xs text-muted-foreground uppercase tracking-wider hover:text-foreground hover:underline decoration-1 underline-offset-4 lg:block"
                            href="/"
                        >
                            Lobby
                        </a>
                    </div>
                </div>
            </header>

            {/* Main Content - 3 Column Grid */}
            <main className="flex-1 min-h-0 grid grid-cols-1 divide-y divide-border/60 lg:grid-cols-3 lg:divide-y-0 lg:divide-x">
                {/* Col 1: Metrics */}
                <div className="flex flex-col min-h-0">
                    <div className="flex-none border-b border-border/30 bg-muted/10 px-6 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Performance Axis
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
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
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
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
                                                className="border-l-2 border-primary/40 pl-3"
                                                key={move.id ?? `${move.move}-${move.player}-${move.goal}`}
                                            >
                                                <div className="flex justify-between">
                                                    <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">
                                                        {title}
                                                    </span>
                                                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground/70">
                                                        {move.player ===
                                                        perspective
                                                            ? "You"
                                                            : "Opp"}
                                                    </span>
                                                </div>
                                                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
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
                <div className="flex flex-col min-h-0">
                    <div className="flex-none border-b border-border/30 bg-muted/10 px-6 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Judge Verdict
                    </div>
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="prose prose-sm prose-invert max-w-none">
                            <p className="whitespace-pre-wrap text-sm leading-loose text-muted-foreground">
                                {match.verdict.explanation}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Col 3: Meta/Rankings */}
                <div className="flex flex-col min-h-0">
                    <div className="flex-none border-b border-border/30 bg-muted/10 px-6 py-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        Pack Rankings
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {/* Leaderboard */}
                        {leaderboard && leaderboard.length > 0 && (
                            <table className="w-full text-left text-xs">
                                <thead className="sticky top-0 bg-background text-[9px] uppercase tracking-wider text-muted-foreground shadow-sm">
                                    <tr>
                                        <th className="px-6 py-2 font-medium">
                                            #
                                        </th>
                                        <th className="px-6 py-2 font-medium text-right">
                                            Score
                                        </th>
                                        <th className="px-6 py-2 font-medium text-right">
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
                                                <td className="px-6 py-2 font-mono text-muted-foreground group-hover:text-foreground">
                                                    {(idx + 1)
                                                        .toString()
                                                        .padStart(2, "0")}
                                                </td>
                                                <td className="px-6 py-2 text-right font-mono">
                                                    {entry.reasonScore.toFixed(
                                                        1
                                                    )}
                                                </td>
                                                <td className="px-6 py-2 text-right text-[10px] text-muted-foreground">
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
                            <div className="border-t border-border/60 p-6">
                                <div className="mb-3 text-[10px] uppercase tracking-wider text-primary">
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
                                                    <h4 className="truncate font-bold text-[10px] uppercase tracking-wider text-primary">
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
