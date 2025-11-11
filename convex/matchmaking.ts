import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getDailyPack, getRandomTopic } from "./topic_packs";

export const joinQueue = mutation({
    args: {
        playerId: v.string(),
    },
    returns: v.union(v.id("matches"), v.null()),
    handler: async (ctx, args) => {
        const existingPlayer = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        let playerDocId: Id<"players">;
        if (existingPlayer) {
            playerDocId = existingPlayer._id;
        } else {
            playerDocId = await ctx.db.insert("players", {
                playerId: args.playerId,
                createdAt: Date.now(),
            });
        }

        // Clean up any stale waiting matches initiated by this player.
        const staleAsPlayer1 = await ctx.db
            .query("matches")
            .withIndex("by_player1", (q) => q.eq("player1Id", playerDocId))
            .filter((q) => q.eq(q.field("status"), "waiting"))
            .collect();
        for (const match of staleAsPlayer1) {
            await ctx.db.delete(match._id);
        }

        const staleAsPlayer2 = await ctx.db
            .query("matches")
            .withIndex("by_player2", (q) => q.eq("player2Id", playerDocId))
            .filter((q) => q.eq(q.field("status"), "waiting"))
            .collect();
        for (const match of staleAsPlayer2) {
            await ctx.db.delete(match._id);
        }

        const waitingMatches = await ctx.db
            .query("matches")
            .withIndex("by_status", (q) => q.eq("status", "waiting"))
            .collect();

        for (const match of waitingMatches) {
            if (
                match.player1Id.toString() !== playerDocId.toString() &&
                match.player2Id.toString() !== playerDocId.toString() &&
                match.status === "waiting"
            ) {
                const player1Stance: "for" | "against" =
                    Math.random() < 0.5 ? "for" : "against";
                const player2Stance: "for" | "against" =
                    player1Stance === "for" ? "against" : "for";

                const pack = getDailyPack();
                const { topic: activeTopic, hint: activeHint } =
                    getRandomTopic(pack);

                const now = Date.now();
                const matchStartTime = now + 2000;
                const opening1End = matchStartTime + 15_000;
                const opening2End = opening1End + 15_000;
                const burst1End = opening2End + 10_000;
                const burst2End = burst1End + 10_000;
                const burst3End = burst2End + 10_000;
                const burst4End = burst3End + 10_000;
                const summation1End = burst4End + 10_000;
                const summation2End = summation1End + 10_000;
                const matchEndTime = summation2End;

                await ctx.db.patch(match._id, {
                    player2Id: playerDocId,
                    player1Stance,
                    player2Stance,
                    topic: activeTopic,
                    topicPack: pack,
                    hint: activeHint,
                    status: "active",
                    phase: "opening1",
                    phaseStartTime: matchStartTime,
                    phaseEndTime: opening1End,
                    matchStartTime,
                    matchEndTime,
                    player1PauseBudget: 4000,
                    player2PauseBudget: 4000,
                    player1NetChars: 0,
                    player2NetChars: 0,
                });

                await ctx.scheduler.runAfter(
                    0,
                    internal.timeline.advancePhase,
                    {
                        matchId: match._id,
                    }
                );

                return match._id;
            }
        }

        const pack = getDailyPack();
        const { topic: queuedTopic, hint: queuedHint } = getRandomTopic(pack);

        await ctx.db.insert("matches", {
            player1Id: playerDocId,
            player2Id: playerDocId,
            player1Stance: "for",
            player2Stance: "against",
            topic: queuedTopic,
            topicPack: pack,
            hint: queuedHint,
            mode: "oxford",
            status: "waiting",
            phase: "opening1",
            phaseStartTime: 0,
            phaseEndTime: 0,
            matchStartTime: 0,
            matchEndTime: 0,
            player1PauseBudget: 4000,
            player2PauseBudget: 4000,
            player1NetChars: 0,
            player2NetChars: 0,
        });

        return null;
    },
});

export const getMatch = query({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.union(
        v.object({
            _id: v.id("matches"),
            player1Id: v.id("players"),
            player2Id: v.id("players"),
            player1Stance: v.union(v.literal("for"), v.literal("against")),
            player2Stance: v.union(v.literal("for"), v.literal("against")),
            topic: v.string(),
            topicPack: v.string(),
            hint: v.string(),
            mode: v.literal("oxford"),
            status: v.union(
                v.literal("waiting"),
                v.literal("active"),
                v.literal("completed"),
                v.literal("forfeited")
            ),
            phase: v.union(
                v.literal("opening1"),
                v.literal("opening2"),
                v.literal("burst1"),
                v.literal("burst2"),
                v.literal("burst3"),
                v.literal("burst4"),
                v.literal("summation1"),
                v.literal("summation2"),
                v.literal("judging"),
                v.literal("finished")
            ),
            phaseStartTime: v.number(),
            phaseEndTime: v.number(),
            matchStartTime: v.number(),
            matchEndTime: v.number(),
            player1PauseBudget: v.number(),
            player2PauseBudget: v.number(),
            player1LastTypingTime: v.optional(v.number()),
            player2LastTypingTime: v.optional(v.number()),
            player1NetChars: v.number(),
            player2NetChars: v.number(),
            verdict: v.optional(
                v.object({
                    winner: v.union(
                        v.literal("player1"),
                        v.literal("player2"),
                        v.literal("tie")
                    ),
                    player1Scores: v.object({
                        logic: v.number(),
                        evidence: v.number(),
                        relevance: v.number(),
                        rhetoricalClarity: v.number(),
                        civility: v.number(),
                    }),
                    player2Scores: v.object({
                        logic: v.number(),
                        evidence: v.number(),
                        relevance: v.number(),
                        rhetoricalClarity: v.number(),
                        civility: v.number(),
                    }),
                    explanation: v.string(),
                    namedMoves: v.array(
                        v.object({
                            player: v.union(
                                v.literal("player1"),
                                v.literal("player2")
                            ),
                            move: v.string(),
                            description: v.string(),
                        })
                    ),
                })
            ),
            _creationTime: v.number(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => await ctx.db.get(args.matchId),
});

export const getPlayerMatch = query({
    args: {
        playerId: v.string(),
    },
    returns: v.union(
        v.object({
            matchId: v.id("matches"),
            status: v.union(
                v.literal("waiting"),
                v.literal("active"),
                v.literal("completed"),
                v.literal("forfeited")
            ),
            phase: v.union(
                v.literal("opening1"),
                v.literal("opening2"),
                v.literal("burst1"),
                v.literal("burst2"),
                v.literal("burst3"),
                v.literal("burst4"),
                v.literal("summation1"),
                v.literal("summation2"),
                v.literal("judging"),
                v.literal("finished")
            ),
            mode: v.literal("oxford"),
            isPlayer1: v.boolean(),
            queuedAt: v.optional(v.number()),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (!player) {
            return null;
        }

        const includeStatus = (status: string) =>
            status === "waiting" ||
            status === "active" ||
            status === "completed" ||
            status === "forfeited";

        const makeResult = (match: Doc<"matches">, isPlayer1: boolean) => ({
            matchId: match._id,
            status: match.status,
            phase: match.phase,
            mode: match.mode,
            isPlayer1,
            queuedAt:
                match.status === "waiting" ? match._creationTime : undefined,
        });

        const matchesAsPlayer1 = await ctx.db
            .query("matches")
            .withIndex("by_player1", (q) => q.eq("player1Id", player._id))
            .order("desc")
            .collect();

        for (const match of matchesAsPlayer1) {
            if (includeStatus(match.status)) {
                return makeResult(match, true);
            }
        }

        const matchesAsPlayer2 = await ctx.db
            .query("matches")
            .withIndex("by_player2", (q) => q.eq("player2Id", player._id))
            .order("desc")
            .collect();

        for (const match of matchesAsPlayer2) {
            if (includeStatus(match.status)) {
                return makeResult(match, false);
            }
        }

        return null;
    },
});

export const leaveQueue = mutation({
    args: {
        playerId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (!player) {
            return null;
        }

        const waitingAsPlayer1 = await ctx.db
            .query("matches")
            .withIndex("by_player1", (q) => q.eq("player1Id", player._id))
            .filter((q) => q.eq(q.field("status"), "waiting"))
            .collect();

        for (const match of waitingAsPlayer1) {
            await ctx.db.delete(match._id);
        }

        const waitingAsPlayer2 = await ctx.db
            .query("matches")
            .withIndex("by_player2", (q) => q.eq("player2Id", player._id))
            .filter((q) => q.eq(q.field("status"), "waiting"))
            .collect();

        for (const match of waitingAsPlayer2) {
            await ctx.db.delete(match._id);
        }

        return null;
    },
});

export const forfeitMatch = mutation({
    args: {
        matchId: v.id("matches"),
        playerId: v.string(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();
        if (!player) {
            return null;
        }

        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return null;
        }

        if (match.status !== "active") {
            return null;
        }

        const isPlayer1 = match.player1Id === player._id;
        const isPlayer2 = match.player2Id === player._id;

        if (!(isPlayer1 || isPlayer2)) {
            return null;
        }

        const baseScores = {
            logic: 0,
            evidence: 0,
            relevance: 0,
            rhetoricalClarity: 0,
            civility: 0,
        };

        const winner = isPlayer1 ? "player2" : "player1";
        const explanation = isPlayer1
            ? "Player 1 forfeited by leaving the debate."
            : "Player 2 forfeited by leaving the debate.";

        await ctx.db.patch(args.matchId, {
            status: "forfeited",
            phase: "finished",
            matchEndTime: Date.now(),
            verdict: {
                winner,
                player1Scores: baseScores,
                player2Scores: baseScores,
                explanation,
                namedMoves: [
                    {
                        player: winner,
                        move: "forfeit win",
                        description:
                            "Opponent left the match before it concluded.",
                    },
                ],
            },
        });

        await ctx.db.insert("matchEvents", {
            matchId: args.matchId,
            eventType: "forfeit",
            playerId: player._id,
            timestamp: Date.now(),
            metadata: { reason: "player_disconnected" },
        });

        return null;
    },
});

export const getPlayerDoc = query({
    args: {
        playerId: v.string(),
    },
    returns: v.union(
        v.object({
            _id: v.id("players"),
            playerId: v.string(),
        }),
        v.null()
    ),
    handler: async (ctx, args) => {
        const doc = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();
        if (!doc) {
            return null;
        }
        return {
            _id: doc._id,
            playerId: doc.playerId,
        };
    },
});

export const clearAllData = mutation({
    args: {},
    returns: v.object({
        playersDeleted: v.number(),
        matchesDeleted: v.number(),
        messagesDeleted: v.number(),
        eventsDeleted: v.number(),
        leaderboardsDeleted: v.number(),
        achievementsDeleted: v.number(),
    }),
    handler: async (ctx) => {
        // Delete all achievements
        const achievements = await ctx.db.query("achievements").collect();
        for (const achievement of achievements) {
            await ctx.db.delete(achievement._id);
        }

        // Delete all leaderboards
        const leaderboards = await ctx.db.query("leaderboards").collect();
        for (const leaderboard of leaderboards) {
            await ctx.db.delete(leaderboard._id);
        }

        // Delete all match events
        const events = await ctx.db.query("matchEvents").collect();
        for (const event of events) {
            await ctx.db.delete(event._id);
        }

        // Delete all match messages
        const messages = await ctx.db.query("matchMessages").collect();
        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        // Delete all matches
        const matches = await ctx.db.query("matches").collect();
        for (const match of matches) {
            await ctx.db.delete(match._id);
        }

        // Delete all players
        const players = await ctx.db.query("players").collect();
        for (const player of players) {
            await ctx.db.delete(player._id);
        }

        return {
            playersDeleted: players.length,
            matchesDeleted: matches.length,
            messagesDeleted: messages.length,
            eventsDeleted: events.length,
            leaderboardsDeleted: leaderboards.length,
            achievementsDeleted: achievements.length,
        };
    },
});
