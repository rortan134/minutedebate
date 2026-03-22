"use client";

import { AnimateHeight } from "@/components/ui/animate-height";
import { AsciiOne } from "@/components/ui/ascii-one";
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
import { Spinner } from "@/components/ui/spinner";
import {
    Tooltip,
    TooltipContent,
    TooltipPopup,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInterval } from "@/hooks/use-interval";
import { getAchievementMeta } from "@/lib/achievements-meta";
import { cn } from "@/lib/cn";
import { useMutation, useQuery } from "convex/react";
import { ArrowUpRight, CirclePlus, Hourglass, Info } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useRef, useState, useTransition } from "react";
import { api } from "../convex/_generated/api";
import { getDailyPack, TOPIC_PACKS } from "../convex/topic_packs";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";
import StarBorder from "./ui/star-border";

const QUEUE_OWNER_KEY = "minutedebate_queue_owner";
const QUEUE_STARTED_AT_KEY = "minutedebate_queue_started_at";

function Lobby() {
    const [playerId] = useState(() => getOrCreatePlayerId());
    const joinQueue = useMutation(api.matchmaking.joinQueue);
    const leaveQueue = useMutation(api.matchmaking.leaveQueue);
    const playerMatch = useQuery(api.matchmaking.getPlayerMatch, {
        playerId,
    });
    const achievements = useQuery(api.achievements.listForPlayer, {
        playerId,
        limit: 6,
    });
    const [isJoining, startTransition] = useTransition();
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

    interface TickerAchievement {
        readonly achievementId: string;
        readonly unlockedAt: number;
    }

    const achievementsTicker: TickerAchievement[] = achievements?.recent
        ? achievements.recent
              .slice(0, 3)
              .map(({ achievementId, unlockedAt }) => ({
                  achievementId,
                  unlockedAt,
              }))
        : [];
    const totalAchievements = achievements?.totalUnlocked ?? 0;

    const isPlayerQueued = playerMatch?.status === "waiting";

    const resumeMatchHref =
        playerMatch?.status === "active"
            ? `/match/${playerMatch.matchId}`
            : playerMatch?.status === "completed" ||
                playerMatch?.status === "forfeited"
              ? `/match/${playerMatch.matchId}/results`
              : null;

    const resumeMatchLabel =
        playerMatch?.status === "active"
            ? "Enter Match"
            : "View Last Match Results";

    const queueElapsedSeconds =
        isPlayerQueued && queueStartedAt
            ? Math.max(0, Math.floor((now - queueStartedAt) / 1000))
            : 0;

    useEffect(() => {
        if (typeof window === "undefined" || !tabIdRef.current) {
            return;
        }

        if (!isPlayerQueued) {
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
    }, [isPlayerQueued, playerMatch?.queuedAt, queueStartedAt]);

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

    const handleJoinQueue = () => {
        if (isPlayerQueued || playerMatch?.status === "active") {
            return;
        }

        const startTimestamp = Date.now();
        setQueueStartedAt(startTimestamp);
        if (typeof window !== "undefined") {
            localStorage.setItem(QUEUE_STARTED_AT_KEY, String(startTimestamp));
        }

        startTransition(async () => {
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
            }
        });
    };

    const handleLeaveQueue = () => {
        if (!isPlayerQueued) {
            return;
        }
        startTransition(async () => {
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
            }
        });
    };

    return (
        <div className="flex h-full flex-col gap-8">
            {/* Corner Frame Accents */}
            <div className="absolute top-1 left-1 z-20 h-8 w-8 border-border/90 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute top-1 right-1 z-20 h-8 w-8 border-border/90 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="absolute bottom-1 left-1 z-20 h-8 w-8 border-border/90 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="absolute right-1 bottom-1 z-20 h-8 w-8 border-border/90 border-r-2 border-b-2 lg:h-12 lg:w-12" />
            <main className="relative isolate grid size-full min-h-0 grid-cols-1 grid-rows-1 lg:grid-cols-12">
                <div className="relative z-10 row-start-1 flex w-full min-w-0 max-w-lg flex-col gap-4 px-4 pt-8 sm:px-6 lg:col-span-4 lg:col-start-1 lg:max-w-lg lg:px-0 lg:pr-4 lg:pl-9">
                    {/* Top decorative line */}
                    <div className="mb-2 flex items-center gap-2 opacity-60">
                        <div className="h-px w-8 bg-white" />
                        <span className="font-mono text-[10px] text-white tracking-wider">
                            ∞
                        </span>
                        <div className="h-px flex-1 bg-white" />
                    </div>
                    <div className="relative -ml-0.5">
                        <div className="dither-pattern absolute top-0 -right-3 bottom-0 hidden w-1 opacity-40 lg:block" />
                        <h1 className="font-bold text-3xl text-foreground uppercase sm:text-4xl lg:text-5xl">
                            One minute. One topic. One winner.
                        </h1>
                        <h2 className="mt-2 font-semibold text-base text-muted-foreground uppercase lg:text-xl">
                            Put your debating skills to the test — Play now!
                        </h2>
                    </div>
                    <span className="-mt-1 font-mono text-[8px] text-foreground/60 lg:text-[10px]">
                        EST. 2026
                    </span>
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
                    <Suspense fallback={<CurrentCategorySkeleton />}>
                        <CurrentCategory />
                    </Suspense>
                    {achievementsTicker.length > 0 ? (
                        <TooltipProvider>
                            <div className="mt-3 flex min-w-0 flex-col gap-2 rounded-2xl border border-border/50 bg-card/30 px-4 py-3 text-muted-foreground text-xs uppercase sm:flex-row sm:flex-wrap sm:items-center sm:rounded-full sm:py-2">
                                <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
                                    <span className="shrink-0">
                                        Recent achievements
                                    </span>
                                    <div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-initial">
                                        {achievementsTicker.map((entry) => {
                                            const meta = getAchievementMeta(
                                                entry.achievementId
                                            );
                                            return (
                                                <Tooltip
                                                    key={`${entry.achievementId}-${entry.unlockedAt}`}
                                                >
                                                    <TooltipTrigger className="inline-flex cursor-help items-center gap-1 rounded-full bg-background/60 px-3 py-1 text-foreground transition-colors hover:bg-background/80 active:scale-[0.95] active:bg-background">
                                                        <span>{meta.icon}</span>
                                                        <span className="max-w-48 truncate sm:max-w-none">
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
                                </div>
                                <span className="shrink-0 text-[10px] text-muted-foreground uppercase tracking-[0.4em] sm:ml-auto">
                                    Total {totalAchievements}
                                </span>
                            </div>
                        </TooltipProvider>
                    ) : null}
                    <AnimateHeight>
                        <Frame>
                            <FramePanel className="rounded-b-none! border-0! p-0!">
                                <div className="flex flex-col gap-3">
                                    {pendingMatchId ? (
                                        <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-6 text-center shadow-lg">
                                            <p className="text-muted-foreground text-xs uppercase tracking-[0.35em]">
                                                Joining match...
                                            </p>
                                            <p className="font-bold text-3xl text-foreground">
                                                {countdown}
                                            </p>
                                            <p className="text-muted-foreground text-sm">
                                                Get ready — debate begins now.
                                            </p>
                                        </div>
                                    ) : (
                                        <StarBorder
                                            as="button"
                                            className={cn(
                                                "relative w-full transform-gpu cursor-pointer overflow-hidden px-6 py-4 text-left font-semibold text-foreground text-lg uppercase transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50 sm:text-xl",
                                                {
                                                    "hover:scale-[1.01]": !(
                                                        isJoining ||
                                                        isPlayerQueued
                                                    ),
                                                }
                                            )}
                                            disabled={isJoining}
                                            onClick={
                                                isPlayerQueued
                                                    ? handleLeaveQueue
                                                    : handleJoinQueue
                                            }
                                            type="button"
                                        >
                                            <span className="flex flex-col">
                                                <span className="text-base">
                                                    {isJoining || isPlayerQueued
                                                        ? "Quit Matchmaking"
                                                        : "Play"}
                                                </span>
                                                {isJoining ||
                                                isPlayerQueued ? null : (
                                                    <span>
                                                        Oxford Mode • Join Queue
                                                    </span>
                                                )}
                                            </span>
                                            {isJoining ||
                                            isPlayerQueued ? null : (
                                                <div className="animate-shine" />
                                            )}
                                        </StarBorder>
                                    )}
                                </div>
                            </FramePanel>
                            {isPlayerQueued || resumeMatchHref ? (
                                <FrameHeader>
                                    {isPlayerQueued ? (
                                        <p className="text-foreground text-sm">
                                            Finding opponent...{" "}
                                            <Hourglass className="mx-0.5 inline-block size-3" />
                                            {queueElapsedSeconds}s
                                        </p>
                                    ) : resumeMatchHref ? (
                                        <a
                                            className="group relative inline-flex w-full cursor-pointer items-center gap-1 font-semibold text-foreground text-sm uppercase transition-colors hover:text-primary active:scale-[0.99] active:text-primary/80 disabled:opacity-50"
                                            href={resumeMatchHref}
                                        >
                                            <span>{resumeMatchLabel}</span>
                                            <ArrowUpRight className="inline-block size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                        </a>
                                    ) : null}
                                </FrameHeader>
                            ) : null}
                        </Frame>
                    </AnimateHeight>
                    <Dialog>
                        <DialogTrigger
                            render={
                                <button
                                    className="inline-flex w-full cursor-pointer items-center justify-between rounded-full bg-muted px-5 py-3 text-left font-semibold text-muted-foreground text-sm uppercase tracking-widest backdrop-blur-xs transition-transform hover:text-foreground active:scale-[0.99] active:bg-muted/80"
                                    type="button"
                                >
                                    <span>How To Play</span>
                                    <CirclePlus className="inline-block size-4" />
                                </button>
                            }
                        />
                        <DialogPopup>
                            <DialogHeader>
                                <DialogTitle>
                                    Master the art of structured debate
                                </DialogTitle>
                                <DialogDescription>
                                    Join anonymous 1v1 debating matches against
                                    other players. An AI judge evaluates your
                                    arguments across five criteria, awarding
                                    skill-based achievements for distinctive
                                    moves. Every verdict provides detailed
                                    feedback to sharpen your debating skills.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="mb-2 font-semibold text-base text-foreground uppercase">
                                            Oxford Cadence Format
                                        </h3>
                                        <p className="text-base text-muted-foreground leading-relaxed">
                                            Each match follows a strict timing
                                            structure: 15-second opening
                                            statements for each player, followed
                                            by four alternating 10-second bursts
                                            where you respond and counter, and
                                            finally 10-second summations to
                                            crystallize your position. Total
                                            match time: exactly one minute.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 font-semibold text-base text-foreground uppercase">
                                            AI Judge Evaluation
                                        </h3>
                                        <p className="text-base text-muted-foreground leading-relaxed">
                                            An AI judge analyzes your entire
                                            debate across five axes: logic
                                            (soundness of reasoning), evidence
                                            (quality of support), relevance
                                            (addressing the topic and opponent),
                                            rhetorical clarity (precision and
                                            structure), and civility (respectful
                                            engagement). The judge identifies
                                            specific moves and provides detailed
                                            feedback on what worked and why.
                                        </p>
                                    </div>
                                    <div>
                                        <h3 className="mb-2 font-semibold text-base text-foreground uppercase">
                                            Winning Strategy
                                        </h3>
                                        <p className="text-base text-muted-foreground leading-relaxed">
                                            Victory comes from maintaining a
                                            clear throughline, making sharp
                                            distinctions early, and responding
                                            cleanly. In openings, establish your
                                            framing. In bursts, shift the proof
                                            obligation back to your opponent. In
                                            summations, synthesize your
                                            strongest points.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 border-border/40 border-t pt-4">
                                <Link
                                    className={cn(
                                        "group flex w-full items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/20 px-5 py-4 text-left outline-none ring-offset-popover transition-[border-color,background-color,box-shadow,transform]",
                                        "hover:border-border hover:bg-card/45 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.35)]",
                                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        "active:scale-[0.99]"
                                    )}
                                    href="/about"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold text-foreground text-sm uppercase tracking-wide">
                                            More about MinuteDebate
                                        </span>
                                        <span className="block text-muted-foreground text-xs leading-snug">
                                            Learn more
                                        </span>
                                    </span>
                                    <span
                                        aria-hidden
                                        className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/35 text-muted-foreground transition-[color,transform,border-color] group-hover:border-border group-hover:text-foreground"
                                    >
                                        <ArrowUpRight className="size-5" />
                                    </span>
                                </Link>
                            </div>
                            <DialogFooter>
                                <DialogClose
                                    render={
                                        <button
                                            className="rounded-full border border-border/50 px-4 py-2 text-muted-foreground text-xs uppercase transition-colors hover:border-border hover:bg-background/60 hover:text-foreground active:scale-[0.96] active:bg-background/80"
                                            type="button"
                                        >
                                            Close
                                        </button>
                                    }
                                />
                            </DialogFooter>
                        </DialogPopup>
                    </Dialog>
                    {/* Bottom technical notation - desktop only */}
                    <div className="mt-2 hidden items-center gap-2 opacity-40 lg:flex">
                        <span className="font-mono text-[9px] text-foreground">
                            ∞
                        </span>
                        <div className="h-px flex-1 bg-foreground" />
                        <span className="font-mono text-[9px] text-foreground uppercase">
                            <Link
                                className="transition-colors hover:text-primary hover:underline active:scale-[0.98] active:text-primary/80"
                                href="/about"
                            >
                                About
                            </Link>
                        </span>
                        <span className="font-mono text-[9px] text-foreground">
                            •
                        </span>
                        <span className="font-mono text-[9px] text-foreground uppercase">
                            <a
                                className="transition-colors hover:text-primary hover:underline active:scale-[0.98] active:text-primary/80"
                                href="https://minutedebate.com"
                            >
                                minutedebate.com
                            </a>
                        </span>
                    </div>
                </div>
                <div
                    className="fade-mask fade-left-1/4 pointer-events-none absolute inset-0 -z-10 select-none lg:relative lg:inset-auto lg:z-auto lg:col-span-9 lg:col-start-4 lg:row-start-1"
                    role="presentation"
                >
                    <AsciiOne />
                </div>
            </main>
            <div
                className={cn(
                    "pointer-events-none absolute right-5 bottom-5 z-30 rounded-full transition-opacity",
                    {
                        "opacity-0":
                            !isPlayerQueued || isJoining || pendingMatchId,
                    }
                )}
                role="presentation"
            >
                <Spinner className="scale-30" />
            </div>
        </div>
    );
}

function CurrentCategorySkeleton() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading today's category"
            className="mt-6 flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2"
            role="status"
        >
            <div
                aria-hidden
                className="h-4 w-40 shrink-0 animate-pulse rounded-md bg-muted sm:h-5 sm:w-44"
            />
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <div
                    aria-hidden
                    className="h-6 w-52 max-w-full animate-pulse rounded-md bg-muted sm:h-7 sm:w-64"
                />
                <div
                    aria-hidden
                    className="size-4 shrink-0 animate-pulse rounded-sm bg-muted"
                />
            </div>
        </div>
    );
}

function CurrentCategory() {
    const [dailyPack] = useState(() => getDailyPack());
    const currentPackMetadata = TOPIC_PACKS[dailyPack];

    return (
        <div className="mt-6 flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            <span className="shrink-0 font-semibold text-muted-foreground text-sm uppercase tracking-wide sm:text-base">
                Today&apos;s Category:
            </span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-foreground text-lg uppercase sm:text-xl">
                    {currentPackMetadata.name}
                </span>
                <Tooltip>
                    <TooltipTrigger>
                        <Info className="size-4 shrink-0 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipPopup>
                        <p className="text-base text-muted-foreground">
                            All debates today will feature topics from this
                            category. The category rotates daily, determining
                            which topics and achievements are available.
                        </p>
                    </TooltipPopup>
                </Tooltip>
            </div>
        </div>
    );
}

export { Lobby };
