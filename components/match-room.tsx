"use client";

import { usePreventWindowUnload } from "@/hooks/use-prevent-unload";
import { cn } from "@/lib/cn";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import {
    calculateNetChars,
    filterFiller,
    shouldPauseClock,
} from "../lib/cadence";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";

interface MatchRoomProps {
    matchId: Id<"matches">;
    playerId: string;
}

export default function MatchRoom({
    matchId,
    playerId: playerIdProp,
}: MatchRoomProps) {
    const [playerId] = useState(() => playerIdProp || getOrCreatePlayerId());
    const match = useQuery(api.matchmaking.getMatch, { matchId });
    const messages = useQuery(api.messaging.getMessages, { matchId });
    const sendMessage = useMutation(api.messaging.sendMessage);
    const recordTyping = useMutation(api.messaging.recordTyping);
    const forfeitMatch = useMutation(api.matchmaking.forfeitMatch);
    const playerDoc = useQuery(api.matchmaking.getPlayerDoc, { playerId });
    const playerDocId = playerDoc?._id ?? null;

    const [input, setInput] = useState("");
    const [cadenceSignal, setCadenceSignal] = useState(0);

    const lastTypingTimeRef = useRef<number | null>(null);
    const netCharsRef = useRef(0);
    const now = useNow();
    const matchStatusRef = useRef<string | undefined>(match?.status);

    useEffect(() => {
        matchStatusRef.current = match?.status ?? undefined;
    }, [match?.status]);

    usePreventWindowUnload(
        match?.status === "active",
        "Leaving will forfeit the match."
    );

    useEffect(() => {
        if (!playerDocId) {
            return;
        }
        const handleVisibility = () => {
            if (
                document.visibilityState === "hidden" &&
                matchStatusRef.current === "active"
            ) {
                forfeitMatch({ matchId, playerId }).catch((error) => {
                    console.error(
                        "Failed to forfeit match on visibility change:",
                        error
                    );
                });
            }
        };
        const handlePageHide = () => {
            if (matchStatusRef.current === "active") {
                forfeitMatch({ matchId, playerId }).catch((error) => {
                    console.error(
                        "Failed to forfeit match on page hide:",
                        error
                    );
                });
            }
        };
        window.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("pagehide", handlePageHide);
        return () => {
            window.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, [forfeitMatch, matchId, playerDocId, playerId]);

    const derivedState = useMemo(() => {
        if (!(match && playerDocId)) {
            return null;
        }
        const playerIsFirst = match.player1Id === playerDocId;
        const phasePlayerMap: Record<string, "player1" | "player2"> = {
            opening1: "player1",
            opening2: "player2",
            burst1: "player1",
            burst2: "player2",
            burst3: "player1",
            burst4: "player2",
            summation1: "player1",
            summation2: "player2",
        };
        const expectedPlayer = phasePlayerMap[match.phase];
        const turnBelongsToCurrentUser =
            (expectedPlayer === "player1" && playerIsFirst) ||
            (expectedPlayer === "player2" && !playerIsFirst);
        const availablePauseBudget = playerIsFirst
            ? match.player1PauseBudget
            : match.player2PauseBudget;
        return {
            isPlayer1: playerIsFirst,
            isMyTurn: turnBelongsToCurrentUser,
            pauseBudget: availablePauseBudget,
        };
    }, [match, playerDocId]);

    const handleInputChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const newText = e.target.value;
            setInput(newText);

            const timestamp = Date.now();
            const newNetChars = calculateNetChars(newText);

            if (newNetChars > netCharsRef.current) {
                const shouldPause = shouldPauseClock(
                    timestamp,
                    lastTypingTimeRef.current,
                    newNetChars,
                    netCharsRef.current
                );

                if (shouldPause && lastTypingTimeRef.current) {
                    const gap = timestamp - lastTypingTimeRef.current;
                    setCadenceSignal(Math.min(100, (gap / 400) * 100));
                } else {
                    setCadenceSignal(0);
                }

                lastTypingTimeRef.current = timestamp;
                netCharsRef.current = newNetChars;

                if (match && match.status === "active") {
                    recordTyping({
                        matchId,
                        playerId,
                        timestamp,
                    });
                }
            }
        },
        [match, matchId, playerId, recordTyping]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!(match && isMyTurn) || input.trim().length === 0) {
            return;
        }

        const filtered = filterFiller(input);
        if (filtered.length === 0) {
            return;
        }

        const timestamp = Date.now();
        const netChars = calculateNetChars(input);

        try {
            await sendMessage({
                matchId,
                playerId,
                content: filtered,
                netChars,
                timestamp,
            });
            setInput("");
            netCharsRef.current = 0;
            lastTypingTimeRef.current = null;
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    if (match?.status === "completed" && typeof window !== "undefined") {
        window.location.href = `/match/${matchId}/results`;
        return null;
    }

    if (!(match && playerDocId && derivedState)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="text-lg uppercase tracking-[0.3em]">
                    Loading match…
                </div>
            </div>
        );
    }

    const { isPlayer1, isMyTurn, pauseBudget } = derivedState;
    const myStance = isPlayer1 ? match.player1Stance : match.player2Stance;
    const opponentStance = isPlayer1
        ? match.player2Stance
        : match.player1Stance;
    const timeRemaining = Math.max(0, match.phaseEndTime - now);

    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const phaseLabels: Record<string, string> = {
        opening1: "Opening Statement (Player 1)",
        opening2: "Opening Statement (Player 2)",
        burst1: "Burst 1 (Player 1)",
        burst2: "Burst 2 (Player 2)",
        burst3: "Burst 3 (Player 1)",
        burst4: "Burst 4 (Player 2)",
        summation1: "Summation (Player 1)",
        summation2: "Summation (Player 2)",
    };
    const composeInputId = `compose-${String(matchId)}`;

    return (
        <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="absolute top-1 left-1 z-10 h-8 w-8 border-border/80 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute top-1 right-1 z-10 h-8 w-8 border-border/80 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="absolute bottom-1 left-1 z-10 h-8 w-8 border-border/80 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute right-1 bottom-1 z-10 h-8 w-8 border-border/80 border-r-2 border-b-2 lg:h-12 lg:w-12" />

            <main className="grid min-h-screen grid-cols-12 gap-6 px-6 py-10 lg:px-12">
                <section className="col-span-full flex flex-col gap-6 lg:col-span-8">
                    <header className="relative space-y-5 overflow-hidden rounded-2xl border border-border/50 bg-card/40 p-6 shadow-lg backdrop-blur">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-[0.45em]">
                                    <span>Phase</span>
                                    <div className="h-px flex-1 bg-border" />
                                    <span>{formatTime(timeRemaining)}</span>
                                </div>
                                <h1 className="font-bold text-3xl uppercase lg:text-4xl">
                                    {phaseLabels[match.phase]}
                                </h1>
                                <p className="max-w-readable text-muted-foreground">
                                    {match.topic}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Oxford Mode
                                </span>
                                <div className="flex items-center gap-3 text-muted-foreground text-sm">
                                    <span className="font-medium text-foreground">
                                        You
                                    </span>
                                    <span className="uppercase tracking-[0.35em]">
                                        vs
                                    </span>
                                    <span className="text-muted-foreground">
                                        Opponent
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-4 rounded-xl border border-border/40 bg-background/40 p-4 lg:grid-cols-3">
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Your stance
                                </p>
                                <p className="font-semibold text-foreground">
                                    {myStance}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Opponent stance
                                </p>
                                <p className="font-semibold text-foreground">
                                    {opponentStance}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Hint
                                </p>
                                <p className="font-mono text-muted-foreground text-sm">
                                    {match.hint}
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="space-y-6 rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <header className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                    Transcript
                                </p>
                                <h2 className="font-semibold text-foreground text-xl">
                                    Debate Log
                                </h2>
                            </div>
                            <div className="flex items-center gap-3 rounded-full border border-border/40 bg-background/40 px-4 py-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                <span>Cadence</span>
                                <div className="flex h-2 w-32 items-center rounded-full bg-border/60">
                                    <div
                                        className="h-full rounded-full bg-success transition-all"
                                        style={{ width: `${cadenceSignal}%` }}
                                    />
                                </div>
                                <span>{Math.round(pauseBudget / 1000)}s</span>
                            </div>
                        </header>

                        <div className="relative max-h-[32rem] space-y-3 overflow-y-auto rounded-xl border border-border/30 bg-background/30 p-4 shadow-inner">
                            {messages && messages.length > 0 ? (
                                messages.map(
                                    (msg: {
                                        _id: Id<"matchMessages">;
                                        playerId: Id<"players">;
                                        phase: string;
                                        content: string;
                                        timestamp: number;
                                        netChars: number;
                                        pauseUsed: number;
                                        _creationTime: number;
                                    }) => {
                                        const isMine =
                                            msg.playerId === playerDocId;
                                        return (
                                            <article
                                                className={cn(
                                                    "max-w-full rounded-xl border border-border/40 px-4 py-3 text-sm shadow-sm",
                                                    isMine
                                                        ? "bg-primary/5 text-foreground"
                                                        : "bg-card/40 text-muted-foreground"
                                                )}
                                                key={msg._id}
                                            >
                                                <div className="mb-1 flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                                    <span>
                                                        {isMine
                                                            ? "You"
                                                            : "Opponent"}
                                                    </span>
                                                    <span>{msg.phase}</span>
                                                </div>
                                                <p className="whitespace-pre-wrap text-foreground text-sm leading-relaxed">
                                                    {msg.content}
                                                </p>
                                            </article>
                                        );
                                    }
                                )
                            ) : (
                                <div className="py-10 text-center text-muted-foreground text-sm">
                                    No messages yet — opening move is yours.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-3 rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        {isMyTurn && match.status === "active" ? (
                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <label
                                    className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.3em]"
                                    htmlFor={composeInputId}
                                >
                                    <span>Compose move</span>
                                    <span>{input.length} chars</span>
                                </label>
                                <textarea
                                    className="min-h-[120px] w-full rounded-xl border border-border/60 bg-background/60 p-4 font-mono text-foreground text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40"
                                    disabled={!isMyTurn || timeRemaining === 0}
                                    id={composeInputId}
                                    onChange={handleInputChange}
                                    placeholder="Type your argument..."
                                    value={input}
                                />
                                <button
                                    className="w-full rounded-xl bg-foreground px-4 py-3 text-center font-semibold text-background uppercase tracking-[0.35em] transition hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={
                                        input.trim().length === 0 ||
                                        timeRemaining === 0
                                    }
                                    type="submit"
                                >
                                    Submit Move
                                </button>
                            </form>
                        ) : (
                            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-10 text-center text-muted-foreground text-sm uppercase tracking-[0.35em]">
                                Waiting for opponent…
                            </div>
                        )}
                    </section>
                </section>

                <aside className="col-span-full flex flex-col gap-4 lg:col-span-4">
                    <div className="rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                            Match Timeline
                        </p>
                        <div className="mt-4 space-y-3 text-muted-foreground text-sm">
                            {Object.entries(phaseLabels).map(([key, label]) => {
                                const isCurrent = match.phase === key;
                                return (
                                    <div
                                        className={cn(
                                            "flex items-center justify-between rounded-lg border px-3 py-2 text-xs uppercase tracking-[0.3em]",
                                            isCurrent
                                                ? "border-primary/60 bg-primary/10 text-foreground"
                                                : "border-border/40 bg-background/30 text-muted-foreground"
                                        )}
                                        key={key}
                                    >
                                        <span>{label}</span>
                                        {isCurrent ? (
                                            <span className="font-semibold text-foreground">
                                                Active
                                            </span>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                            Opponent Profile
                        </p>
                        <div className="mt-4 space-y-2 text-muted-foreground text-sm">
                            <p>
                                Position:{" "}
                                <span className="font-semibold text-foreground">
                                    {opponentStance}
                                </span>
                            </p>
                            <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                Net characters:{" "}
                                <span className="text-foreground">
                                    {isPlayer1
                                        ? match.player2NetChars
                                        : match.player1NetChars}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/40 bg-card/20 p-6 text-muted-foreground text-xs uppercase tracking-[0.35em] shadow-lg backdrop-blur">
                        Remember: cadence gating pauses the clock when you
                        advance the argument. Keep the signal high.
                    </div>
                </aside>
            </main>
        </div>
    );
}
