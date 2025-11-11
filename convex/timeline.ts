import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
    internalAction,
    internalMutation,
    internalQuery,
} from "./_generated/server";

const PHASE_DURATIONS = {
    opening1: 15_000,
    opening2: 15_000,
    burst1: 10_000,
    burst2: 10_000,
    burst3: 10_000,
    burst4: 10_000,
    summation1: 10_000,
    summation2: 10_000,
} as const;

type MatchPhase = keyof typeof PHASE_DURATIONS;

const PHASE_ORDER: MatchPhase[] = [
    "opening1",
    "opening2",
    "burst1",
    "burst2",
    "burst3",
    "burst4",
    "summation1",
    "summation2",
];

export const advancePhase = internalAction({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.runQuery(internal.timeline.getMatchForAdvance, {
            matchId: args.matchId,
        });

        if (!match || match.status !== "active") {
            return null;
        }

        const now = Date.now();

        if (now < match.phaseEndTime) {
            const remaining = match.phaseEndTime - now;
            await ctx.scheduler.runAfter(
                remaining,
                internal.timeline.advancePhase,
                {
                    matchId: args.matchId,
                }
            );
            return null;
        }

        const currentPhase = match.phase as MatchPhase;
        const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase);
        if (
            currentPhaseIndex === -1 ||
            currentPhaseIndex === PHASE_ORDER.length - 1
        ) {
            await ctx.runMutation(internal.timeline.endMatch, {
                matchId: args.matchId,
            });
            return null;
        }

        const nextPhaseIndex = currentPhaseIndex + 1;
        const nextPhase = PHASE_ORDER[nextPhaseIndex] as MatchPhase;
        const nextPhaseDuration = PHASE_DURATIONS[nextPhase];
        const nextPhaseStart = now;
        const nextPhaseEnd = now + nextPhaseDuration;

        await ctx.runMutation(internal.timeline.updatePhase, {
            matchId: args.matchId,
            phase: nextPhase,
            phaseStartTime: nextPhaseStart,
            phaseEndTime: nextPhaseEnd,
        });

        await ctx.scheduler.runAfter(
            nextPhaseDuration,
            internal.timeline.advancePhase,
            {
                matchId: args.matchId,
            }
        );

        return null;
    },
});

export const getMatchForAdvance = internalQuery({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.union(
        v.object({
            _id: v.id("matches"),
            status: v.string(),
            phase: v.string(),
            phaseEndTime: v.number(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return null;
        }
        return {
            _id: match._id,
            status: match.status,
            phase: match.phase,
            phaseEndTime: match.phaseEndTime,
        };
    },
});

export const updatePhase = internalMutation({
    args: {
        matchId: v.id("matches"),
        phase: v.union(
            v.literal("opening1"),
            v.literal("opening2"),
            v.literal("burst1"),
            v.literal("burst2"),
            v.literal("burst3"),
            v.literal("burst4"),
            v.literal("summation1"),
            v.literal("summation2")
        ),
        phaseStartTime: v.number(),
        phaseEndTime: v.number(),
    },
    returns: v.null(),
    handler: async (
        ctx,
        args: {
            matchId: Id<"matches">;
            phase: MatchPhase;
            phaseStartTime: number;
            phaseEndTime: number;
        }
    ) => {
        const phase = args.phase;
        await ctx.db.patch(args.matchId, {
            phase,
            phaseStartTime: args.phaseStartTime,
            phaseEndTime: args.phaseEndTime,
        });

        await ctx.db.insert("matchEvents", {
            matchId: args.matchId,
            eventType: "phase_start",
            timestamp: args.phaseStartTime,
        });

        return null;
    },
});

export const endMatch = internalMutation({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.matchId, {
            status: "completed",
            phase: "judging",
        });

        await ctx.scheduler.runAfter(0, internal.judging_action.judgeMatch, {
            matchId: args.matchId,
        });

        return null;
    },
});
