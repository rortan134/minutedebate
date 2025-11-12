"use client";

import { usePreventWindowUnload } from "@/hooks/use-prevent-unload";
import { cn } from "@/lib/cn";
import { useMutation, useQuery } from "convex/react";
import { ArrowUpIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { TOPIC_PACKS } from "../convex/topic_packs";
import {
    calculateNetChars,
    filterFiller,
    shouldPauseClock,
} from "../lib/cadence";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";
import { PackFocusCard } from "./pack-focus-card";
import { PauseBudgetMeter } from "./pause-budget-meter";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupTextarea,
} from "./ui/input-group";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/tooltip";

const PAUSE_BUDGET_CAP_MS = 4000;

type MatchPhaseKey =
    | "opening1"
    | "opening2"
    | "burst1"
    | "burst2"
    | "burst3"
    | "burst4"
    | "summation1"
    | "summation2"
    | "judging"
    | "finished";

type PhaseGuidance = {
    readonly active: {
        readonly headline: string;
        readonly body: string;
    };
    readonly waiting: {
        readonly headline: string;
        readonly body: string;
    };
};

const DEFAULT_GUIDANCE: PhaseGuidance = {
    active: {
        headline: "Advance the argument",
        body: "Keep the thread tight: add warranted claims, no filler.",
    },
    waiting: {
        headline: "Scout their line",
        body: "Track the structure, prep the refutation.",
    },
};

const PHASE_GUIDANCE: Record<MatchPhaseKey, PhaseGuidance> = {
    opening1: {
        active: {
            headline: "Seize the frame",
            body: "Lead with a dominant definition or scope-set to claim the ground.",
        },
        waiting: {
            headline: "Audit their definition",
            body: "Listen for how they carve the topic—plan the steal or counter-scope.",
        },
    },
    opening2: {
        active: {
            headline: "Counter-frame fast",
            body: "Accept or redefine on your terms before the clash locks in.",
        },
        waiting: {
            headline: "Bank their framing",
            body: "Note every premise they lean on; you'll need them in bursts.",
        },
    },
    burst1: {
        active: {
            headline: "Hit a burden shift",
            body: "Press a missing warrant and make them carry the proof.",
        },
        waiting: {
            headline: "Fortify weak links",
            body: "Identify claims still lacking warrants so you can patch or pivot.",
        },
    },
    burst2: {
        active: {
            headline: "Refute cleanly",
            body: "Quote, clash, and collapse their last claim with receipts.",
        },
        waiting: {
            headline: "Track loose ends",
            body: "Log unanswered attacks so you can close them later.",
        },
    },
    burst3: {
        active: {
            headline: "Drive the wedge",
            body: "Extend winning lines and punish the contradiction you exposed.",
        },
        waiting: {
            headline: "Spot overreach",
            body: "Listen for leaps you can expose on your next beat.",
        },
    },
    burst4: {
        active: {
            headline: "Lock their burden",
            body: "Loop back to their thesis and show it still collapses.",
        },
        waiting: {
            headline: "Prep the closer",
            body: "Order your strongest responses; summations need clarity, not new ground.",
        },
    },
    summation1: {
        active: {
            headline: "Weigh the round",
            body: "No new claims—stack impacts, contrast worlds, and narrate why you win.",
        },
        waiting: {
            headline: "Listen for weighing",
            body: "Note what they prioritize so you can flip or pre-empt it.",
        },
    },
    summation2: {
        active: {
            headline: "Seal the throughline",
            body: "Tie your story together without dumping new content.",
        },
        waiting: {
            headline: "Catch the drop",
            body: "Every silence is a concession—record them for results.",
        },
    },
    judging: {
        active: {
            headline: "Judging in progress",
            body: "AI judge is grading logic, evidence, relevance, clarity, civility.",
        },
        waiting: {
            headline: "Judging in progress",
            body: "Hold tight while the judge names the decisive moves.",
        },
    },
    finished: {
        active: {
            headline: "Match complete",
            body: "Head to the results screen for breakdowns and next steps.",
        },
        waiting: {
            headline: "Match complete",
            body: "Head to the results screen for breakdowns and next steps.",
        },
    },
};

const PHASE_LABELS: Record<MatchPhaseKey, string> = {
    opening1: "Opening Statement (Player 1)",
    opening2: "Opening Statement (Player 2)",
    burst1: "Burst 1 (Player 1)",
    burst2: "Burst 2 (Player 2)",
    burst3: "Burst 3 (Player 1)",
    burst4: "Burst 4 (Player 2)",
    summation1: "Summation (Player 1)",
    summation2: "Summation (Player 2)",
    judging: "Judging",
    finished: "Match Finished",
};

function resolveGuidance(
    phase: MatchPhaseKey,
    isMyTurn: boolean
): PhaseGuidance["active"] | PhaseGuidance["waiting"] {
    const copy = PHASE_GUIDANCE[phase] ?? DEFAULT_GUIDANCE;
    return isMyTurn ? copy.active : copy.waiting;
}

interface MatchRoomProps {
    matchId: Id<"matches">;
    playerId: string;
}

export default function MatchRoom({
    matchId,
    playerId: playerIdProp,
}: MatchRoomProps) {
    const router = useRouter();
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
        const phasePlayerMap: Record<
            MatchPhaseKey,
            "player1" | "player2" | null
        > = {
            opening1: "player1",
            opening2: "player2",
            burst1: "player1",
            burst2: "player2",
            burst3: "player1",
            burst4: "player2",
            summation1: "player1",
            summation2: "player2",
            judging: null,
            finished: null,
        };
        const resolvedPhase = (match.phase ?? "opening1") as MatchPhaseKey;
        const expectedPlayer = phasePlayerMap[resolvedPhase];
        const turnBelongsToCurrentUser =
            expectedPlayer === "player1"
                ? playerIsFirst
                : expectedPlayer === "player2"
                  ? !playerIsFirst
                  : false;
        const availablePauseBudget = playerIsFirst
            ? match.player1PauseBudget
            : match.player2PauseBudget;
        return {
            isPlayer1: playerIsFirst,
            isMyTurn: turnBelongsToCurrentUser,
            pauseBudget: availablePauseBudget,
            phaseKey: resolvedPhase,
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

    useEffect(() => {
        if (match?.status === "completed" || match?.status === "forfeited") {
            router.push(`/match/${matchId}/results`);
        }
    }, [match?.status, matchId, router]);

    if (!(match && playerDocId && derivedState)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="text-lg uppercase tracking-[0.3em]">
                    Loading match…
                </div>
            </div>
        );
    }

    const { isPlayer1, isMyTurn, pauseBudget, phaseKey } = derivedState;
    const myStance = isPlayer1 ? match.player1Stance : match.player2Stance;
    const opponentStance = isPlayer1
        ? match.player2Stance
        : match.player1Stance;
    const timeRemaining = Math.max(0, match.phaseEndTime - now);
    const packInfo =
        TOPIC_PACKS[match.topicPack as keyof typeof TOPIC_PACKS] ?? null;
    const moveGoals = packInfo?.moveGoals ?? [];
    const guidanceCopy = resolveGuidance(phaseKey, isMyTurn);
    const guidanceKey = `${phaseKey}-${isMyTurn ? "active" : "waiting"}`;
    const secondsRemaining = Math.max(0, Math.ceil(timeRemaining / 1000));
    const isSubmitDisabled = input.trim().length === 0 || timeRemaining === 0;

    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const phaseLabel = PHASE_LABELS[phaseKey] ?? "Debate";
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
                                    {phaseLabel}
                                </h1>
                                <p className="max-w-readable text-muted-foreground">
                                    {match.topic}
                                </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 text-right">
                                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-4 py-2 text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    Oxford Mode
                                    {packInfo ? (
                                        <>
                                            <span className="h-3 w-px bg-border/60" />
                                            <span>{packInfo.name}</span>
                                        </>
                                    ) : null}
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
                        </header>

                        <div className="relative max-h-128 space-y-3 overflow-y-auto rounded-xl border border-border/30 bg-background/30 p-4 shadow-inner">
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

                    <section className="space-y-4 rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <div
                            className={cn(
                                "rounded-xl border px-4 py-4 transition-all duration-300",
                                isMyTurn
                                    ? "border-primary/50 bg-primary/10 text-foreground shadow-sm"
                                    : "border-border/50 bg-background/50 text-muted-foreground"
                            )}
                            key={guidanceKey}
                        >
                            <p className="text-xs uppercase tracking-[0.35em]">
                                {isMyTurn ? "Your move" : "Hold position"}
                            </p>
                            <h3 className="mt-2 font-semibold text-lg uppercase tracking-[0.25em]">
                                {guidanceCopy.headline}
                            </h3>
                            <p className="mt-1 text-muted-foreground text-sm leading-relaxed">
                                {guidanceCopy.body}
                            </p>
                        </div>

                        <PauseBudgetMeter
                            cadenceSignal={cadenceSignal}
                            isMyTurn={isMyTurn && match.status === "active"}
                            maxBudgetMs={PAUSE_BUDGET_CAP_MS}
                            pauseBudgetMs={pauseBudget}
                        />

                        {isMyTurn && match.status === "active" ? (
                            <form className="space-y-3" onSubmit={handleSubmit}>
                                <div className="flex items-center justify-between text-muted-foreground text-xs uppercase tracking-[0.3em]">
                                    <span>Compose Move</span>
                                    <span>
                                        {input.length} chars ·{" "}
                                        {secondsRemaining}s
                                    </span>
                                </div>
                                <TooltipProvider>
                                    <InputGroup className="w-full flex-col">
                                        <InputGroupTextarea
                                            className="font-mono text-sm"
                                            disabled={
                                                !isMyTurn || timeRemaining === 0
                                            }
                                            id={composeInputId}
                                            onChange={handleInputChange}
                                            placeholder="Type your argument..."
                                            rows={5}
                                            size="lg"
                                            value={input}
                                        />
                                        <InputGroupAddon
                                            align="block-end"
                                            className="justify-end"
                                        >
                                            <Tooltip>
                                                <TooltipTrigger
                                                    render={
                                                        <button
                                                            aria-label="Send move"
                                                            className={cn(
                                                                "inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition hover:bg-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                                                                isSubmitDisabled &&
                                                                    "cursor-not-allowed bg-foreground/40 hover:bg-foreground/40"
                                                            )}
                                                            disabled={
                                                                isSubmitDisabled
                                                            }
                                                            type="submit"
                                                        >
                                                            <ArrowUpIcon className="size-4" />
                                                        </button>
                                                    }
                                                />
                                                <TooltipContent side="top">
                                                    Submit
                                                </TooltipContent>
                                            </Tooltip>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </TooltipProvider>
                            </form>
                        ) : (
                            <div className="rounded-xl border border-border/40 bg-background/40 px-4 py-10 text-center text-muted-foreground text-sm uppercase tracking-[0.35em]">
                                Waiting for opponent…
                            </div>
                        )}
                    </section>
                </section>

                <aside className="col-span-full flex flex-col gap-4 lg:col-span-4">
                    {packInfo ? (
                        <PackFocusCard
                            currentPhase={phaseKey}
                            moveGoals={moveGoals}
                            packName={packInfo.name}
                        />
                    ) : null}

                    <div className="rounded-2xl border border-border/40 bg-card/30 p-6 shadow-lg backdrop-blur">
                        <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                            Live Stats
                        </p>
                        <div className="mt-4 space-y-3 text-muted-foreground text-sm">
                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                                <span className="text-muted-foreground uppercase tracking-[0.3em]">
                                    Your net chars
                                </span>
                                <span className="font-semibold text-foreground">
                                    {isPlayer1
                                        ? match.player1NetChars
                                        : match.player2NetChars}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                                <span className="text-muted-foreground uppercase tracking-[0.3em]">
                                    Opponent net chars
                                </span>
                                <span className="font-semibold text-foreground">
                                    {isPlayer1
                                        ? match.player2NetChars
                                        : match.player1NetChars}
                                </span>
                            </div>
                            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 px-3 py-2">
                                <span className="text-muted-foreground uppercase tracking-[0.3em]">
                                    Pause left
                                </span>
                                <span className="font-semibold text-foreground">
                                    {(pauseBudget / 1000).toFixed(1)}s
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border/40 bg-card/20 p-6 text-muted-foreground text-xs uppercase tracking-[0.35em] shadow-lg backdrop-blur">
                        Typing pauses your clock only while you advance the
                        line. Cadence gaps over 4 seconds burn time—keep the
                        signal flowing.
                    </div>
                </aside>
            </main>
        </div>
    );
}
