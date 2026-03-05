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
import { calculateNetChars, filterFiller } from "../lib/chars";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";
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

    const lastTypingTimeRef = useRef<number | null>(null);
    const netCharsRef = useRef(0);
    const now = useNow();
    const matchStatusRef = useRef<string | undefined>(match?.status);

    // Auto-scroll to bottom of chat
    const transcriptRef = useRef<HTMLDivElement>(null);
    const lastMessageCount = useRef(0);

    useEffect(() => {
        if (messages && messages.length > lastMessageCount.current) {
            if (transcriptRef.current) {
                transcriptRef.current.scrollTop =
                    transcriptRef.current.scrollHeight;
            }
            lastMessageCount.current = messages.length;
        }
    }, [messages]);

    useEffect(() => {
        matchStatusRef.current = match?.status ?? undefined;
    }, [match?.status]);

    usePreventWindowUnload(match?.status === "active");

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
        if (!(match && derivedState?.isMyTurn) || input.trim().length === 0) {
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
                <div className="text-xs uppercase tracking-wider">
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
    const guidanceCopy = resolveGuidance(phaseKey, isMyTurn);
    const secondsRemaining = Math.max(0, Math.ceil(timeRemaining / 1000));
    const isSubmitDisabled = input.trim().length === 0 || timeRemaining === 0;

    const formatTime = (ms: number) => {
        const seconds = Math.ceil(ms / 1000);
        return `${seconds}s`;
    };

    const phaseLabel = PHASE_LABELS[phaseKey] ?? "Debate";
    const composeInputId = `compose-${String(matchId)}`;

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
            {/* Header */}
            <header className="flex-none border-b border-border/60 bg-card/20 backdrop-blur-sm px-6 py-4">
                <div className="flex items-start justify-between gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3 text-muted-foreground text-xs uppercase tracking-widest">
                            <span>{packInfo?.name ?? "MinuteDebate"}</span>
                            <span className="h-3 w-px bg-border/60" />
                            <span
                                className={cn(
                                    timeRemaining < 10_000 &&
                                        "text-destructive animate-pulse"
                                )}
                            >
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                        <h1 className="font-bold text-lg uppercase tracking-tight lg:text-xl">
                            {phaseLabel}
                        </h1>
                        <p className="line-clamp-1 max-w-md text-muted-foreground text-sm">
                            {match.topic}
                        </p>
                    </div>
                    <div className="hidden flex-col items-end gap-1 text-right lg:flex">
                        <div className="flex items-center gap-4 text-xs uppercase tracking-wider">
                            <div>
                                <span className="text-muted-foreground">
                                    You:{" "}
                                </span>
                                <span className="font-semibold text-foreground">
                                    {myStance}
                                </span>
                            </div>
                            <span className="text-border/60">vs</span>
                            <div>
                                <span className="text-muted-foreground">
                                    Opponent:{" "}
                                </span>
                                <span className="font-semibold text-foreground">
                                    {opponentStance}
                                </span>
                            </div>
                        </div>
                        <div className="text-muted-foreground text-xs uppercase tracking-wider opacity-60">
                            {match.hint}
                        </div>
                    </div>
                </div>
            </header>
            <main
                className="flex-1 overflow-y-auto scroll-smooth p-6"
                ref={transcriptRef}
            >
                <div className="mx-auto max-w-3xl space-y-6">
                    {messages && messages.length > 0 ? (
                        messages.map((msg) => {
                            const isMine = msg.playerId === playerDocId;
                            return (
                                <article
                                    className={cn(
                                        "flex flex-col gap-2",
                                        isMine ? "items-end" : "items-start"
                                    )}
                                    key={msg._id}
                                >
                                    <div className="flex items-center gap-2 text-muted-foreground text-[10px] uppercase tracking-wider">
                                        <span>
                                            {isMine ? "You" : "Opponent"}
                                        </span>
                                        <span className="text-border">•</span>
                                        <span>{msg.phase}</span>
                                    </div>
                                    <div
                                        className={cn(
                                            "max-w-[85%] border p-4 text-sm leading-relaxed shadow-sm lg:max-w-[75%]",
                                            isMine
                                                ? "border-primary/20 bg-primary/5 text-foreground"
                                                : "border-border/60 bg-card/40 text-muted-foreground"
                                        )}
                                    >
                                        <p className="whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                </article>
                            );
                        })
                    ) : (
                        <div className="flex h-full items-center justify-center py-20 opacity-40">
                            <p className="text-xs uppercase tracking-widest">
                                Waiting for opening statement
                            </p>
                        </div>
                    )}
                </div>
            </main>
            <footer
                className={cn(
                    "flex-none border-t border-border/60 bg-background p-6 transition-colors duration-500",
                    isMyTurn && "border-primary/30 bg-primary/5"
                )}
            >
                <div className="mx-auto max-w-3xl space-y-4">
                    <div className="flex items-end justify-between gap-4">
                        <div className="space-y-1">
                            <p
                                className={cn(
                                    "text-[10px] uppercase tracking-widest font-semibold",
                                    isMyTurn
                                        ? "text-primary"
                                        : "text-muted-foreground"
                                )}
                            >
                                {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                            </p>
                            <h3 className="text-sm uppercase tracking-widest text-foreground">
                                {guidanceCopy.headline}
                            </h3>
                            <p className="hidden text-xs text-muted-foreground lg:block">
                                {guidanceCopy.body}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <PauseBudgetMeter
                                isMyTurn={isMyTurn && match.status === "active"}
                                maxBudgetMs={PAUSE_BUDGET_CAP_MS}
                                pauseBudgetMs={pauseBudget}
                            />
                            <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                                <span>{input.length} chars</span>
                                <span>{secondsRemaining}s left</span>
                            </div>
                        </div>
                    </div>
                    {isMyTurn && match.status === "active" ? (
                        <form
                            className="relative group"
                            onSubmit={handleSubmit}
                        >
                            <TooltipProvider>
                                <InputGroup className="w-full">
                                    <InputGroupTextarea
                                        autoFocus
                                        className="min-h-[100px] max-h-[30vh] w-full resize-none border-border/60 bg-background p-4 font-mono text-sm rounded-none! focus:border-primary/50 focus:ring-0"
                                        disabled={
                                            !isMyTurn || timeRemaining === 0
                                        }
                                        id={composeInputId}
                                        onChange={handleInputChange}
                                        onKeyDown={(e) => {
                                            if (
                                                e.key === "Enter" &&
                                                !e.shiftKey
                                            ) {
                                                e.preventDefault();
                                                handleSubmit(e);
                                            }
                                        }}
                                        placeholder="Construct your argument..."
                                        value={input}
                                    />
                                    <InputGroupAddon
                                        align="block-end"
                                        className="absolute bottom-3 right-3 z-10"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger
                                                render={
                                                    <button
                                                        aria-label="Send move"
                                                        className={cn(
                                                            "flex h-8 w-8 items-center justify-center border border-foreground/10 bg-foreground text-background transition hover:bg-foreground/90 disabled:opacity-50 disabled:hover:bg-foreground",
                                                            isSubmitDisabled &&
                                                                "cursor-not-allowed opacity-50"
                                                        )}
                                                        disabled={
                                                            isSubmitDisabled
                                                        }
                                                        type="submit"
                                                    >
                                                        <ArrowUpIcon className="h-4 w-4" />
                                                    </button>
                                                }
                                            />
                                            <TooltipContent
                                                className="text-xs uppercase tracking-wider"
                                                side="left"
                                            >
                                                Submit Move
                                            </TooltipContent>
                                        </Tooltip>
                                    </InputGroupAddon>
                                </InputGroup>
                            </TooltipProvider>
                        </form>
                    ) : (
                        <div className="flex h-[100px] w-full items-center justify-center border border-dashed border-border/40 bg-card/10 text-xs uppercase tracking-wider text-muted-foreground">
                            <span>Opponent is typing...</span>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}
