import "./style.css";

import { Frame, FramePanel } from "@/components/ui/frame";
import { SOURCE_CODE_URL, WEBSITE_NAME, WEBSITE_URL } from "@/lib/constants";
import { ArrowLeft, Brain, Clock, Gavel, Github, Swords } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "About",
    description:
        "What a minute debate is, how the cadence rules and timing work, and how to treat one-minute rounds as practice for clearer argument.",
    openGraph: {
        title: `About | ${WEBSITE_NAME}`,
        description:
            "What a minute debate is, how the cadence rules and timing work, and how to treat one-minute rounds as practice for clearer argument.",
        url: `${WEBSITE_URL}/about`,
    },
};

export default function AboutPage() {
    return (
        <div className="flex min-h-full flex-col gap-8 pb-16">
            {/* Corner Frame Accents */}
            <div className="pointer-events-none fixed top-1 left-1 z-20 h-8 w-8 border-border/90 border-t-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="pointer-events-none fixed top-1 right-1 z-20 h-8 w-8 border-border/90 border-t-2 border-r-2 lg:h-12 lg:w-12" />
            <div className="pointer-events-none fixed bottom-1 left-1 z-20 h-8 w-8 border-border/90 border-b-2 border-l-2 lg:h-12 lg:w-12" />
            <div className="pointer-events-none fixed right-1 bottom-1 z-20 h-8 w-8 border-border/90 border-r-2 border-b-2 lg:h-12 lg:w-12" />

            <main className="relative isolate mx-auto w-full max-w-5xl px-6 pt-16 lg:max-w-6xl lg:pt-24">
                <div className="mb-8 flex items-center gap-2 opacity-60">
                    <div className="h-px w-8 bg-white" />
                    <span className="font-mono text-[10px] text-white tracking-wider">
                        SYSTEM.ABOUT
                    </span>
                    <div className="h-px flex-1 bg-white" />
                </div>

                <Link
                    className="group mb-8 inline-flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-widest transition-colors hover:text-foreground active:scale-[0.98]"
                    href="/"
                >
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
                    Return to Lobby
                </Link>

                <div className="relative mb-16 -ml-0.5">
                    <div className="dither-pattern absolute top-0 bottom-0 -left-6 hidden w-2 opacity-40 lg:block" />
                    <h1 className="font-bold text-4xl text-foreground uppercase sm:text-5xl lg:text-6xl">
                        Intellectual Combat.
                        <br />
                        <span className="text-muted-foreground">
                            Distilled.
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl font-semibold text-lg text-muted-foreground uppercase leading-relaxed lg:text-xl">
                        Skip the week-long comment thread. You get a topic, a
                        side, a stranger, and one minute on the clock.
                    </p>
                </div>

                <div
                    className="about-bento grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4 lg:gap-4"
                    data-slot="about-bento"
                >
                    <Frame className="h-full min-h-0 sm:col-span-2 lg:col-span-2 lg:row-span-2">
                        <FramePanel className="flex h-full min-h-[220px] flex-col justify-between gap-6 p-8 sm:min-h-[280px] sm:p-10 lg:min-h-0 lg:p-12">
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-5 text-foreground">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/40">
                                        <Swords
                                            aria-hidden
                                            className="size-6"
                                        />
                                    </span>
                                    <h2 className="font-bold text-2xl uppercase tracking-wide">
                                        The Arena
                                    </h2>
                                </div>
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    We drop you into a live 1v1: same prompt,
                                    opposite stances. You open, trade short
                                    replies, then close, all inside a single
                                    minute. Messy at first, then you start
                                    seeing where your reasoning holds and where
                                    it folds under someone who can answer back.
                                </p>
                            </div>
                            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                                Live matchmaking · Anonymous opponents
                            </p>
                        </FramePanel>
                    </Frame>

                    <Frame className="h-full min-h-0 lg:col-span-2 lg:col-start-3 lg:row-start-1">
                        <FramePanel className="flex h-full flex-col gap-4 p-8 sm:p-10">
                            <div className="flex items-center gap-5 text-foreground">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/40">
                                    <Clock aria-hidden className="size-5" />
                                </span>
                                <h2 className="font-bold text-xl uppercase tracking-wide">
                                    The Constraints
                                </h2>
                            </div>
                            <p className="text-base text-muted-foreground leading-relaxed">
                                Most &quot;debates&quot; online are two people
                                taking turns monologuing. Nobody has to finish a
                                thought on deadline. Here the clock keeps
                                shrinking the room for hand-waving. You feel the
                                gap between a zinger and an actual response
                                because your opponent gets their beat too.
                            </p>
                        </FramePanel>
                    </Frame>

                    <Frame className="h-full min-h-0 lg:col-span-2 lg:col-start-3 lg:row-start-2">
                        <FramePanel className="flex h-full flex-col gap-4 p-8 sm:p-10">
                            <div className="flex items-center gap-5 text-foreground">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background/40">
                                    <Brain aria-hidden className="size-5" />
                                </span>
                                <h2 className="font-bold text-xl uppercase tracking-wide">
                                    The Cadence
                                </h2>
                            </div>
                            <p className="text-base text-muted-foreground leading-relaxed">
                                Structure is Oxford-style cadence: 15 seconds
                                each to open, four 10-second bursts to answer
                                and counter, 10 seconds each to wrap up. Add it
                                up and you get 60 seconds, not a second more.
                            </p>
                        </FramePanel>
                    </Frame>

                    <Frame className="h-full min-h-0 sm:col-span-2 lg:col-span-4 lg:row-start-3">
                        <FramePanel className="flex flex-col gap-5 p-8 sm:flex-row sm:items-start sm:gap-10 sm:p-10 lg:p-12">
                            <div className="flex shrink-0 items-center gap-5 text-foreground">
                                <span className="flex size-11 items-center justify-center rounded-xl border border-border/60 bg-background/40">
                                    <Gavel aria-hidden className="size-6" />
                                </span>
                                <h2 className="font-bold text-2xl uppercase tracking-wide">
                                    The Judge
                                </h2>
                            </div>
                            <p className="min-w-0 flex-1 text-lg text-muted-foreground leading-relaxed">
                                When time&apos;s up, a trained AI judge reads
                                the transcript. It scores five things a human
                                would squint at anyway: whether the logic holds,
                                whether you brought support, whether you stayed
                                on the topic, whether a stranger could follow
                                you, and whether you kept it civil. You get a
                                verdict with specifics, not a thumbs icon. Land
                                something legit and the judge may reward you
                                with an achievement.
                            </p>
                        </FramePanel>
                    </Frame>
                </div>

                <div className="mt-20">
                    <a
                        className="group inline-flex items-center gap-2 font-mono text-muted-foreground text-xs uppercase tracking-widest transition-colors hover:text-foreground active:scale-[0.98]"
                        href={SOURCE_CODE_URL}
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <Github aria-hidden className="size-4" />
                        View source on GitHub
                        <span className="sr-only">(opens in a new tab)</span>
                    </a>
                </div>

                <div className="mt-24 mb-8 flex items-center gap-2 opacity-40">
                    <span className="font-mono text-[9px] text-foreground">
                        ∞
                    </span>
                    <div className="h-px flex-1 bg-foreground" />
                    <span className="font-mono text-[9px] text-foreground uppercase">
                        END OF FILE
                    </span>
                </div>
            </main>
        </div>
    );
}
