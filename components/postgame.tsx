"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { TOPIC_PACKS } from "../convex/topic_packs";
import { cn } from "@/lib/cn";

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
    const myWidth = myScore;
    const opponentWidth = opponentScore;
    const isBetter = myScore > opponentScore;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.3em]">
                <span>{label}</span>
                <span>
                    {myScore.toFixed(0)} / {opponentScore.toFixed(0)}
                </span>
            </div>
            <div className="flex gap-2">
                <div className="flex-1 rounded-full bg-border/40">
                    <div
                        className={cn(
                            "h-2 rounded-full transition-all",
                            isBetter ? "bg-success" : "bg-muted-foreground/40"
                        )}
                        style={{ width: `${myWidth}%` }}
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
                        style={{ width: `${opponentWidth}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function Postgame({ matchId, playerId }: PostgameProps) {
    const match = useQuery(api.matchmaking.getMatch, { matchId });
    const playerDoc = useQuery(api.matchmaking.getPlayerDoc, { playerId });
    const leaderboard = useQuery(api.judging.getLeaderboard, {
        pack: match?.topicPack ?? "",
        limit: 10,
    });

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

    return (
        <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="absolute top-1 left-1 z-10 h-8 w-8 border-border/80 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute top-1 right-1 z-10 h-8 w-8 border-border/80 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="absolute bottom-1 left-1 z-10 h-8 w-8 border-border/80 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute right-1 bottom-1 z-10 h-8 w-8 border-border/80 border-r-2 border-b-2 lg:h-12 lg:w-12" />

            <main className="grid min-h-screen grid-cols-12 gap-6 px-6 py-10 lg:px-12">
                <section className="col-span-full flex flex-col gap-6 lg:col-span-8">
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
                                    {match.verdict.namedMoves.map((move) => (
                                        <li
                                            className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-card/30 px-4 py-3"
                                            key={`${move.player}-${move.move}-${move.description}`}
                                        >
                                            <span className="font-semibold text-foreground uppercase tracking-[0.25em]">
                                                {move.player === perspective
                                                    ? "You"
                                                    : "Opponent"}
                                            </span>
                                            <span className="flex-1 text-right text-muted-foreground">
                                                {move.move} — {move.description}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </section>
                </section>

                <aside className="col-span-full flex flex-col gap-4 lg:col-span-4">
                    {leaderboard && leaderboard.length > 0 ? (
                        <div className="space-y-4 rounded-2xl border border-border/50 bg-card/30 p-6 shadow-lg backdrop-blur">
                            <div className="flex items-center justify-between">
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
                                                {entry.reasonScore.toFixed(1)}{" "}
                                                pts • {entry.wins}W/
                                                {entry.totalMatches}
                                            </span>
                                        </li>
                                    )
                                )}
                            </ul>
                        </div>
                    ) : null}

                    <div className="rounded-2xl border border-border/50 bg-card/20 p-6 text-muted-foreground text-xs uppercase tracking-[0.35em] shadow-lg backdrop-blur">
                        Keep refining your moves—AI judges remember clean
                        distinctions, on-time refutations, and civility.
                    </div>

                    <a
                        className="inline-flex items-center justify-center rounded-full border border-border/50 bg-background/60 px-6 py-3 text-foreground text-xs uppercase tracking-[0.4em] transition hover:bg-background"
                        href="/"
                    >
                        Return To Lobby
                    </a>
                </aside>
            </main>
        </div>
    );
}
