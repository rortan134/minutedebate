import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const CADENCE_THRESHOLD = 400;
const GAP_THRESHOLD = 700;
const FILLER_PATTERNS = [
    /\b(um|uh|er|ah|like|you know|i mean)\b/gi,
    /\.{3,}/g,
    /\b(so|well|actually|basically|literally)\b/gi,
];

function filterFiller(text: string): string {
    let filtered = text;
    for (const pattern of FILLER_PATTERNS) {
        filtered = filtered.replace(pattern, "");
    }
    return filtered.trim();
}

export const sendMessage = mutation({
    args: {
        matchId: v.id("matches"),
        playerId: v.string(),
        content: v.string(),
        netChars: v.number(),
        timestamp: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match || match.status !== "active") {
            throw new Error("Match not active");
        }

        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (!player) {
            throw new Error("Player not found");
        }

        const isPlayer1 = match.player1Id === player._id;
        const isPlayer2 = match.player2Id === player._id;

        if (!(isPlayer1 || isPlayer2)) {
            throw new Error("Player not in match");
        }

        const currentPhase = match.phase;
        const now = Date.now();

        if (now < match.phaseStartTime || now > match.phaseEndTime) {
            throw new Error("Not your turn");
        }

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

        const expectedPlayer = phasePlayerMap[currentPhase];
        if (
            (expectedPlayer === "player1" && !isPlayer1) ||
            (expectedPlayer === "player2" && !isPlayer2)
        ) {
            throw new Error("Not your turn");
        }

        const filteredContent = filterFiller(args.content);
        if (filteredContent.length === 0) {
            return null;
        }

        const pauseUsed = await ctx.runMutation(
            internal.messaging.updateCadence,
            {
                matchId: args.matchId,
                isPlayer1,
                netChars: args.netChars,
                timestamp: args.timestamp,
            }
        );

        await ctx.db.insert("matchMessages", {
            matchId: args.matchId,
            playerId: player._id,
            phase: currentPhase,
            content: filteredContent,
            timestamp: args.timestamp,
            netChars: args.netChars,
            pauseUsed,
        });

        return null;
    },
});

export const updateCadence = internalMutation({
    args: {
        matchId: v.id("matches"),
        isPlayer1: v.boolean(),
        netChars: v.number(),
        timestamp: v.number(),
    },
    returns: v.number(),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return 0;
        }

        const lastTypingTime = args.isPlayer1
            ? match.player1LastTypingTime
            : match.player2LastTypingTime;
        const pauseBudget = args.isPlayer1
            ? match.player1PauseBudget
            : match.player2PauseBudget;
        const currentNetChars = args.isPlayer1
            ? match.player1NetChars
            : match.player2NetChars;

        let pauseUsed = 0;

        if (lastTypingTime !== undefined) {
            const gap = args.timestamp - lastTypingTime;
            if (gap <= CADENCE_THRESHOLD && args.netChars > currentNetChars) {
                const pauseTime = Math.min(gap, pauseBudget);
                pauseUsed = pauseTime;
            } else if (gap > GAP_THRESHOLD) {
                pauseUsed = 0;
            }
        }

        const newPauseBudget = Math.max(0, pauseBudget - pauseUsed);

        if (args.isPlayer1) {
            await ctx.db.patch(args.matchId, {
                player1LastTypingTime: args.timestamp,
                player1PauseBudget: newPauseBudget,
                player1NetChars: args.netChars,
            });
        } else {
            await ctx.db.patch(args.matchId, {
                player2LastTypingTime: args.timestamp,
                player2PauseBudget: newPauseBudget,
                player2NetChars: args.netChars,
            });
        }

        return pauseUsed;
    },
});

export const getMessages = query({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.array(
        v.object({
            _id: v.id("matchMessages"),
            matchId: v.id("matches"),
            playerId: v.id("players"),
            phase: v.string(),
            content: v.string(),
            timestamp: v.number(),
            netChars: v.number(),
            pauseUsed: v.number(),
            _creationTime: v.number(),
        })
    ),
    handler: async (ctx, args) =>
        await ctx.db
            .query("matchMessages")
            .withIndex("by_match_and_timestamp", (q) =>
                q.eq("matchId", args.matchId)
            )
            .order("asc")
            .collect(),
});

export const recordTyping = mutation({
    args: {
        matchId: v.id("matches"),
        playerId: v.string(),
        timestamp: v.number(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match || match.status !== "active") {
            return null;
        }

        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (!player) {
            return null;
        }

        const isPlayer1 = match.player1Id === player._id;

        if (isPlayer1) {
            await ctx.db.patch(args.matchId, {
                player1LastTypingTime: args.timestamp,
            });
        } else {
            await ctx.db.patch(args.matchId, {
                player2LastTypingTime: args.timestamp,
            });
        }

        return null;
    },
});
