"use client";

import { AnimateHeight } from "@/components/animate-height";
import { AsciiOne } from "@/components/ascii-one";
import { Spinner } from "@/components/spinner";
import {
    Dialog,
    DialogClose,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogPopup,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Frame, FrameHeader, FramePanel } from "@/components/ui/frame";
import { useInterval } from "@/hooks/use-interval";
import { usePreventWindowUnload } from "@/hooks/use-prevent-unload";
import { cn } from "@/lib/cn";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { getDailyPack, TOPIC_PACKS } from "../convex/topic_packs";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";

const QUEUE_OWNER_KEY = "minutedebate_queue_owner";
const QUEUE_STARTED_AT_KEY = "minutedebate_queue_started_at";

export default function Lobby() {
    const [playerId] = useState(() => getOrCreatePlayerId());
    const joinQueue = useMutation(api.matchmaking.joinQueue);
    const leaveQueue = useMutation(api.matchmaking.leaveQueue);
    const playerMatch = useQuery(api.matchmaking.getPlayerMatch, {
        playerId,
    });
    const [isJoining, setIsJoining] = useState(false);
    const [queueStartedAt, setQueueStartedAt] = useState<number | null>(() => {
        if (typeof window === "undefined") {
            return null;
        }
        const stored = window.localStorage.getItem(QUEUE_STARTED_AT_KEY);
        if (!stored) {
            return null;
        }
        const parsed = Number.parseInt(stored, 10);
        return Number.isFinite(parsed) ? parsed : null;
    });
    const tabIdRef = useRef<string | null>(null);
    const now = useNow();
    const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState<number>(0);

    if (typeof window !== "undefined" && tabIdRef.current === null) {
        tabIdRef.current =
            window.crypto?.randomUUID?.() ??
            `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    const dailyPack = getDailyPack();
    const packInfo = TOPIC_PACKS[dailyPack];

    const isQueued = playerMatch?.status === "waiting";

    const resumeHref =
        playerMatch?.status === "active"
            ? `/match/${playerMatch.matchId}`
            : playerMatch?.status === "completed" ||
                playerMatch?.status === "forfeited"
              ? `/match/${playerMatch.matchId}/results`
              : null;

    const resumeLabel =
        playerMatch?.status === "active"
            ? "Enter Match"
            : "View Last Match Results";

    const waitingSeconds =
        isQueued && queueStartedAt
            ? Math.max(0, Math.floor((now - queueStartedAt) / 1000))
            : 0;

    useEffect(() => {
        if (typeof window === "undefined" || !tabIdRef.current) {
            return;
        }

        if (!isQueued) {
            if (localStorage.getItem(QUEUE_OWNER_KEY) === tabIdRef.current) {
                localStorage.removeItem(QUEUE_OWNER_KEY);
            }
            if (localStorage.getItem(QUEUE_STARTED_AT_KEY)) {
                localStorage.removeItem(QUEUE_STARTED_AT_KEY);
            }
            setQueueStartedAt(null);
            return;
        }

        const storedStartRaw = localStorage.getItem(QUEUE_STARTED_AT_KEY);
        const storedStart =
            storedStartRaw !== null &&
            !Number.isNaN(Number.parseInt(storedStartRaw, 10))
                ? Number.parseInt(storedStartRaw, 10)
                : null;
        const matchQueuedAt =
            typeof playerMatch?.queuedAt === "number"
                ? playerMatch.queuedAt
                : null;
        const desiredStart =
            matchQueuedAt ?? queueStartedAt ?? storedStart ?? Date.now();

        setQueueStartedAt(desiredStart);
        localStorage.setItem(QUEUE_STARTED_AT_KEY, String(desiredStart));

        if (!localStorage.getItem(QUEUE_OWNER_KEY) && tabIdRef.current) {
            localStorage.setItem(QUEUE_OWNER_KEY, tabIdRef.current);
        }
    }, [isQueued, playerMatch?.queuedAt, queueStartedAt]);

    useInterval(
        () => {
            setCountdown((current) => (current > 0 ? current - 1 : 0));
        },
        countdown > 0 ? 1000 : null
    );

    useEffect(() => {
        if (pendingMatchId && countdown === 0) {
            window.location.href = `/match/${pendingMatchId}`;
        }
    }, [countdown, pendingMatchId]);

    usePreventWindowUnload(!!(isQueued || pendingMatchId || countdown > 0));

    const handleJoinQueue = async () => {
        if (isQueued || playerMatch?.status === "active") {
            return;
        }

        const startTimestamp = Date.now();
        setQueueStartedAt(startTimestamp);
        if (typeof window !== "undefined") {
            localStorage.setItem(QUEUE_STARTED_AT_KEY, String(startTimestamp));
        }

        setIsJoining(true);
        try {
            const matchId = await joinQueue({ playerId });
            if (matchId) {
                if (typeof window !== "undefined") {
                    localStorage.removeItem(QUEUE_OWNER_KEY);
                }
                setPendingMatchId(matchId);
                setCountdown(3);
                return;
            }

            if (
                typeof window !== "undefined" &&
                tabIdRef.current &&
                !localStorage.getItem(QUEUE_OWNER_KEY)
            ) {
                localStorage.setItem(QUEUE_OWNER_KEY, tabIdRef.current);
            }
        } catch (error) {
            console.error("Failed to join queue:", error);
            if (typeof window !== "undefined") {
                localStorage.removeItem(QUEUE_STARTED_AT_KEY);
            }
            setQueueStartedAt(null);
            setPendingMatchId(null);
            setCountdown(0);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeaveQueue = async () => {
        if (!isQueued) {
            return;
        }

        setIsJoining(true);
        try {
            await leaveQueue({ playerId });
        } catch (error) {
            console.error("Failed to leave queue:", error);
        } finally {
            if (
                typeof window !== "undefined" &&
                tabIdRef.current &&
                localStorage.getItem(QUEUE_OWNER_KEY) === tabIdRef.current
            ) {
                localStorage.removeItem(QUEUE_OWNER_KEY);
            }
            setIsJoining(false);
        }
    };

    return (
        <div className="flex h-full flex-col gap-8">
            {/* Corner Frame Accents */}
            <div className="absolute top-1 left-1 z-20 h-8 w-8 border-border/90 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute top-1 right-1 z-20 h-8 w-8 border-border/90 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="absolute bottom-1 left-1 z-20 h-8 w-8 border-border/90 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute right-1 bottom-1 z-20 h-8 w-8 border-border/90 border-r-2 border-b-2 lg:h-12 lg:w-12" />
            <main className="isolate grid size-full grid-cols-12 grid-rows-1">
                <div className="col-span-4 col-start-1 row-start-1 flex w-full max-w-lg flex-col gap-4 pt-8 pl-9">
                    {/* Top decorative line */}
                    <div className="mb-2 flex items-center gap-2 opacity-60">
                        <div className="h-px w-8 bg-white" />
                        <span className="font-mono text-[10px] text-white tracking-wider">
                            ∞
                        </span>
                        <div className="h-px flex-1 bg-white" />
                    </div>
                    <div className="-ml-0.5 relative">
                        <div className="-right-3 dither-pattern absolute top-0 bottom-0 hidden w-1 opacity-40 lg:block" />
                        <h1 className="font-bold text-5xl text-foreground uppercase">
                            One minute. One topic. One winner.
                        </h1>
                        <h2 className="mt-1 font-semibold text-muted-foreground text-xl uppercase">
                            Put your debating skills to the test - Play now!
                        </h2>
                    </div>
                    <span className="font-mono text-[8px] text-foreground/60 lg:text-[10px]">
                        EST. 2025
                    </span>
                    {/* Decorative dots pattern - desktop only */}
                    <div className="-mt-3 hidden gap-1 opacity-40 lg:flex">
                        {Array.from({ length: 40 }, (_, i) => `dot-${i}`).map(
                            (dotId) => (
                                <div
                                    className="h-0.5 w-0.5 rounded-full bg-white"
                                    key={dotId}
                                />
                            )
                        )}
                    </div>
                    <h2 className="my-3 font-semibold text-2xl text-foreground">
                        <span className="text-muted-foreground">
                            Today&apos;s Pack:{" "}
                        </span>
                        {packInfo.name}
                    </h2>
                    {/* <div className="mb-2 rounded-lg">
                        <h3 className="mb-2 font-semibold text-slate-700">
                            Oxford Mode
                        </h3>
                        <ul className="space-y-2 text-slate-600 text-sm">
                            <li>• 15s opening statements (each player)</li>
                            <li>• 4 alternating 10s bursts</li>
                            <li>• 10s final summation (each player)</li>
                            <li>
                                • Judge evaluates on logic, evidence, relevance,
                                clarity, and civility.
                            </li>
                        </ul>
                    </div> */}
                    <AnimateHeight>
                        <Frame>
                            <FramePanel className="rounded-b-none! border-0! p-0!">
                                <div className="flex flex-col gap-3">
                                    {pendingMatchId ? (
                                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-6 text-center shadow-lg backdrop-blur">
                                            <div className="mb-3 flex justify-center">
                                                <Spinner className="size-12 text-primary opacity-80" />
                                            </div>
                                            <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                                Joining match
                                            </p>
                                            <p className="font-bold text-3xl text-foreground">
                                                {countdown}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                Get ready—debate begins shortly.
                                            </p>
                                        </div>
                                    ) : isQueued ? (
                                        <>
                                            <button
                                                className="w-full rounded-xl bg-slate-800 px-6 py-4 font-semibold text-foreground text-lg"
                                                disabled
                                                type="button"
                                            >
                                                Finding opponent...
                                            </button>
                                            <button
                                                className="w-full rounded-lg text-center font-semibold text-foreground text-lg disabled:opacity-50"
                                                disabled={isJoining}
                                                onClick={handleLeaveQueue}
                                                type="button"
                                            >
                                                Stop Searching
                                            </button>
                                            <p className="text-center text-slate-500 text-sm">
                                                Waiting {waitingSeconds}s
                                            </p>
                                        </>
                                    ) : (
                                        <button
                                            className="relative w-full cursor-pointer overflow-hidden rounded-xl bg-slate-800 px-6 py-4 font-semibold text-foreground text-lg hover:bg-slate-900 disabled:opacity-50"
                                            disabled={isJoining}
                                            onClick={handleJoinQueue}
                                            type="button"
                                        >
                                            <span className="flex flex-col gap-0.5">
                                                {isJoining
                                                    ? "Finding opponent..."
                                                    : "Play • Join Queue"}
                                                <span className="text-muted-foreground text-sm">
                                                    Oxford Mode
                                                </span>
                                            </span>
                                            <div className="animate-shine" />
                                        </button>
                                    )}
                                </div>
                            </FramePanel>
                            {resumeHref ? (
                                <FrameHeader>
                                    <a
                                        className="relative w-full cursor-pointer font-semibold text-lg text-white disabled:opacity-50"
                                        href={resumeHref}
                                    >
                                        {resumeLabel}
                                    </a>
                                </FrameHeader>
                            ) : null}
                        </Frame>
                    </AnimateHeight>
                    <Dialog>
                        <DialogTrigger
                            render={
                                <button
                                    className="w-full rounded-full border border-slate-200 px-5 py-3 text-center font-semibold text-muted-foreground text-sm uppercase tracking-[0.35em] transition hover:border-slate-300 hover:text-foreground"
                                    type="button"
                                >
                                    How To Play
                                </button>
                            }
                        />
                        <DialogPopup className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>
                                    How MinuteDebate Works
                                </DialogTitle>
                                <DialogDescription>
                                    Oxford cadence, AI judging, and cadence
                                    gating basics.
                                </DialogDescription>
                            </DialogHeader>
                            <ol className="list-decimal space-y-3 pl-5 text-muted-foreground text-sm">
                                <li>
                                    <span className="font-semibold text-foreground">
                                        Oxford cadence
                                    </span>{" "}
                                    — 15s openings, four 10s bursts, 10s
                                    summations.
                                </li>
                                <li>
                                    Cadence gating pauses the clock when you add
                                    new signal; idling burns your pause budget.
                                </li>
                                <li>
                                    AI judge scores logic, evidence, relevance,
                                    clarity, civility, and names standout moves.
                                </li>
                                <li>
                                    Win by keeping your throughline sharp and
                                    responding cleanly to burden shifts.
                                </li>
                            </ol>
                            <DialogFooter>
                                <DialogClose
                                    render={
                                        <button
                                            className="rounded-full border border-border/50 px-4 py-2 text-muted-foreground text-xs uppercase tracking-[0.35em] transition hover:bg-background/60 hover:text-foreground"
                                            type="button"
                                        >
                                            Close
                                        </button>
                                    }
                                />
                            </DialogFooter>
                        </DialogPopup>
                    </Dialog>
                    <p className="text-muted-foreground text-sm">
                        Anonymous matchmaking • Real-time debates • Skill-based
                        feedback
                    </p>
                    {/* Bottom technical notation - desktop only */}
                    <div className="mt-2 hidden items-center gap-2 opacity-40 lg:flex">
                        <span className="font-mono text-[9px] text-foreground">
                            ∞
                        </span>
                        <div className="h-px flex-1 bg-foreground" />
                        <span className="font-mono text-[9px] text-foreground uppercase hover:underline">
                            <a href="https://minutedebate.com">
                                minutedebate.com
                            </a>
                        </span>
                    </div>
                </div>
                <div
                    className="-z-10 fade-mask fade-left-1/4 pointer-events-none relative col-span-full col-start-4 row-start-1 select-none"
                    role="presentation"
                >
                    <AsciiOne />
                </div>
            </main>
            <div
                className={cn(
                    "pointer-events-none absolute right-5 bottom-5 z-30 rounded-full transition-opacity",
                    { "opacity-0": !isQueued || isJoining || pendingMatchId }
                )}
                role="presentation"
            >
                <Spinner className="scale-30" />
            </div>
        </div>
    );
}
