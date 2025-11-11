import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    players: defineTable({
        playerId: v.string(),
        createdAt: v.number(),
    }).index("by_playerId", ["playerId"]),

    matches: defineTable({
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
    })
        .index("by_status", ["status"])
        .index("by_player1", ["player1Id"])
        .index("by_player2", ["player2Id"]),

    matchMessages: defineTable({
        matchId: v.id("matches"),
        playerId: v.id("players"),
        phase: v.string(),
        content: v.string(),
        timestamp: v.number(),
        netChars: v.number(),
        pauseUsed: v.number(),
    })
        .index("by_match", ["matchId"])
        .index("by_match_and_timestamp", ["matchId", "timestamp"]),

    matchEvents: defineTable({
        matchId: v.id("matches"),
        eventType: v.union(
            v.literal("phase_start"),
            v.literal("phase_end"),
            v.literal("typing_start"),
            v.literal("typing_stop"),
            v.literal("pause_budget_exceeded"),
            v.literal("forfeit")
        ),
        playerId: v.optional(v.id("players")),
        timestamp: v.number(),
        metadata: v.optional(v.any()),
    })
        .index("by_match", ["matchId"])
        .index("by_match_and_timestamp", ["matchId", "timestamp"]),

    leaderboards: defineTable({
        playerId: v.id("players"),
        pack: v.string(),
        reasonScore: v.number(),
        totalMatches: v.number(),
        wins: v.number(),
        moveDistribution: v.record(v.string(), v.number()),
        lastUpdated: v.number(),
    })
        .index("by_pack", ["pack"])
        .index("by_player_and_pack", ["playerId", "pack"]),

    achievements: defineTable({
        playerId: v.id("players"),
        achievementId: v.string(),
        unlockedAt: v.number(),
        matchId: v.optional(v.id("matches")),
    })
        .index("by_player", ["playerId"])
        .index("by_achievement", ["achievementId"]),
});
