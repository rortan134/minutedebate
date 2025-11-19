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
import { useEffect, useRef, useState, useTransition } from "react";
import { api } from "../convex/_generated/api";
import {
    getDailyPack,
    TOPIC_PACKS,
    type TopicPack,
} from "../convex/topic_packs";
import { getOrCreatePlayerId } from "../lib/player-id";
import { useNow } from "../lib/use-now";
import StarBorder from "./ui/star-border";

const QUEUE_OWNER_KEY = "minutedebate_queue_owner";
const QUEUE_STARTED_AT_KEY = "minutedebate_queue_started_at";

export default function Lobby() {
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

    const [dailyPack, setDailyPack] = useState<TopicPack | null>(null);

    useEffect(() => {
        setDailyPack(getDailyPack());
    }, []);

    const packInfo = dailyPack ? TOPIC_PACKS[dailyPack] : null;
    type TickerAchievement = {
        readonly achievementId: string;
        readonly unlockedAt: number;
    };

    const achievementsTicker: TickerAchievement[] = achievements?.recent
        ? achievements.recent
              .slice(0, 4)
              .map(({ achievementId, unlockedAt }) => ({
                  achievementId,
                  unlockedAt,
              }))
        : [];
    const totalAchievements = achievements?.totalUnlocked ?? 0;

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

    const handleJoinQueue = () => {
        if (isQueued || playerMatch?.status === "active") {
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
        if (!isQueued) {
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
                        <h2 className="mt-2 font-semibold text-muted-foreground text-xl uppercase">
                            Put your debating skills to the test — Play now!
                        </h2>
                    </div>
                    <span className="-mt-1 font-mono text-[8px] text-foreground/60 lg:text-[10px]">
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
                    {packInfo ? (
                        <h2 className="mt-6 inline-flex items-center font-semibold uppercase text-xl text-foreground">
                            <span className="text-muted-foreground">
                                Today&apos;s Category:
                            </span>
                            &nbsp;{packInfo.name}
                            <Tooltip>
                                <TooltipTrigger>
                                    <Info className="size-4 ml-1" />
                                </TooltipTrigger>
                                <TooltipPopup>
                                    <p className="text-muted-foreground text-base">
                                        All debates today will feature topics
                                        from this category. The category rotates
                                        daily, determining which topics and
                                        achievements are available.
                                    </p>
                                </TooltipPopup>
                            </Tooltip>
                        </h2>
                    ) : null}
                    {achievementsTicker.length > 0 ? (
                        <TooltipProvider>
                            <div className="bg-card/30 border border-border/50 flex flex-wrap gap-2 items-center mt-3 rounded-full px-4 py-2 text-muted-foreground text-xs uppercase">
                                <span>Recent achievements</span>
                                {achievementsTicker.map((entry) => {
                                    const meta = getAchievementMeta(
                                        entry.achievementId
                                    );
                                    return (
                                        <Tooltip
                                            key={`${entry.achievementId}-${entry.unlockedAt}`}
                                        >
                                            <TooltipTrigger className="bg-background/60 cursor-help inline-flex items-center gap-1 rounded-full px-3 py-1 text-foreground transition-colors hover:bg-background/80 active:bg-background active:scale-[0.95]">
                                                <span>{meta.icon}</span>
                                                <span>{meta.title}</span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom">
                                                {meta.description}
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                                <span className="ml-auto text-[10px] text-muted-foreground uppercase tracking-[0.4em]">
                                    Total {totalAchievements}
                                </span>
                            </div>
                        </TooltipProvider>
                    ) : null}
                    <AnimateHeight>
                        <Frame>
                            <FramePanel className="border-0! p-0! rounded-b-none!">
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
                                                "relative transform-gpu w-full text-left cursor-pointer overflow-hidden duration-100 px-6 py-4 font-semibold uppercase text-foreground text-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                                {
                                                    "hover:scale-[1.01]": !(
                                                        isJoining || isQueued
                                                    ),
                                                }
                                            )}
                                            disabled={isJoining}
                                            onClick={
                                                isQueued
                                                    ? handleLeaveQueue
                                                    : handleJoinQueue
                                            }
                                            type="button"
                                        >
                                            <span className="flex flex-col">
                                                <span className="text-base">
                                                    {isJoining || isQueued
                                                        ? "Quit Matchmaking"
                                                        : "Play"}
                                                </span>
                                                {isJoining ||
                                                isQueued ? null : (
                                                    <span>
                                                        Oxford Mode • Join Queue
                                                    </span>
                                                )}
                                            </span>
                                            {isJoining || isQueued ? null : (
                                                <div className="animate-shine" />
                                            )}
                                        </StarBorder>
                                    )}
                                </div>
                            </FramePanel>
                            {isQueued || resumeHref ? (
                                <FrameHeader>
                                    {isQueued ? (
                                        <p className="text-foreground text-sm">
                                            Finding opponent...{" "}
                                            <Hourglass className="size-3 inline-block mx-0.5" />
                                            {waitingSeconds}s
                                        </p>
                                    ) : resumeHref ? (
                                        <a
                                            className="group inline-flex relative w-full items-center gap-1 cursor-pointer font-semibold text-sm uppercase text-foreground transition-colors hover:text-primary active:text-primary/80 active:scale-[0.99] disabled:opacity-50"
                                            href={resumeHref}
                                        >
                                            <span>{resumeLabel}</span>
                                            <ArrowUpRight className="size-4 inline-block transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                                    className="w-full inline-flex items-center justify-between rounded-full bg-muted text-left backdrop-blur-xs px-5 py-3 cursor-pointer font-semibold text-muted-foreground text-sm uppercase tracking-widest transition-transform hover:text-foreground active:bg-muted/80 active:scale-[0.99]"
                                    type="button"
                                >
                                    <span>How To Play</span>
                                    <CirclePlus className="size-3.5 inline-block" />
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
                                        <h3 className="mb-2 font-semibold text-foreground text-sm uppercase">
                                            Oxford Cadence Format
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
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
                                        <h3 className="mb-2 font-semibold text-foreground text-sm uppercase">
                                            AI Judge Evaluation
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
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
                                        <h3 className="mb-2 font-semibold text-foreground text-sm uppercase">
                                            Winning Strategy
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
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
                                    <div>
                                        <h3 className="mb-2 font-semibold text-foreground text-sm uppercase">
                                            Achievements & Mastery
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">
                                            Unlock achievements by executing
                                            distinctive moves: win via reductio,
                                            perform clean burden transfers, or
                                            spot and fix equivocation. Each pack
                                            rewards specific move types—master
                                            them to climb the leaderboards and
                                            build your reason score.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose
                                    render={
                                        <button
                                            className="rounded-full border border-border/50 px-4 py-2 text-muted-foreground text-xs uppercase transition-colors hover:bg-background/60 hover:text-foreground hover:border-border active:bg-background/80 active:scale-[0.96]"
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
                            <a
                                className="transition-colors hover:underline hover:text-primary active:text-primary/80 active:scale-[0.98]"
                                href="https://minutedebate.com"
                            >
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
