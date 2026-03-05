import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, query } from "./_generated/server";

export type JudgeAxisScores = {
    logic: number;
    evidence: number;
    relevance: number;
    rhetoricalClarity: number;
    civility: number;
};

export type JudgeVerdict = {
    winner: "player1" | "player2" | "tie";
    player1Scores: JudgeAxisScores;
    player2Scores: JudgeAxisScores;
    explanation: string;
    namedMoves: Array<{
        id?: string;
        player: "player1" | "player2";
        move: string;
        description: string;
    }>;
};

export const getMatchForJudging = internalQuery({
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
        }),
        v.null()
    ),
    handler: async (
        ctx,
        args
    ): Promise<{
        _id: Id<"matches">;
        player1Id: Id<"players">;
        player2Id: Id<"players">;
        player1Stance: "for" | "against";
        player2Stance: "for" | "against";
        topic: string;
        topicPack: string;
        hint: string;
    } | null> => {
        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return null;
        }
        return {
            _id: match._id,
            player1Id: match.player1Id,
            player2Id: match.player2Id,
            player1Stance: match.player1Stance,
            player2Stance: match.player2Stance,
            topic: match.topic,
            topicPack: match.topicPack,
            hint: match.hint,
        };
    },
});

export const getMatchMessages = internalQuery({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.array(
        v.object({
            playerId: v.id("players"),
            phase: v.string(),
            content: v.string(),
        })
    ),
    handler: async (
        ctx,
        args
    ): Promise<
        Array<{ playerId: Id<"players">; phase: string; content: string }>
    > => {
        const messages = await ctx.db
            .query("matchMessages")
            .withIndex("by_match_and_timestamp", (q) =>
                q.eq("matchId", args.matchId)
            )
            .order("asc")
            .collect();

        return messages.map((msg) => ({
            playerId: msg.playerId,
            phase: msg.phase,
            content: msg.content,
        }));
    },
});

export const getPlayer = internalQuery({
    args: {
        playerId: v.id("players"),
    },
    returns: v.union(
        v.object({
            _id: v.id("players"),
            playerId: v.string(),
        }),
        v.null()
    ),
    handler: async (
        ctx,
        args
    ): Promise<{ _id: Id<"players">; playerId: string } | null> => {
        const doc = await ctx.db.get(args.playerId);
        if (!doc) {
            return null;
        }
        return {
            _id: doc._id,
            playerId: doc.playerId,
        };
    },
});

export const saveVerdict = internalMutation({
    args: {
        matchId: v.id("matches"),
        verdict: v.object({
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
                    id: v.optional(v.string()),
                    player: v.union(v.literal("player1"), v.literal("player2")),
                    move: v.string(),
                    description: v.string(),
                })
            ),
        }),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        await ctx.db.patch(args.matchId, {
            status: "completed",
            phase: "finished",
            verdict: args.verdict,
        });

        return null;
    },
});

export const updateLeaderboards = internalMutation({
    args: {
        matchId: v.id("matches"),
        verdict: v.any(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return null;
        }

        const player1AvgScore =
            (args.verdict.player1Scores.logic +
                args.verdict.player1Scores.evidence +
                args.verdict.player1Scores.relevance +
                args.verdict.player1Scores.rhetoricalClarity +
                args.verdict.player1Scores.civility) /
            5;

        const player2AvgScore =
            (args.verdict.player2Scores.logic +
                args.verdict.player2Scores.evidence +
                args.verdict.player2Scores.relevance +
                args.verdict.player2Scores.rhetoricalClarity +
                args.verdict.player2Scores.civility) /
            5;

        const player1Won = args.verdict.winner === "player1";
        const player2Won = args.verdict.winner === "player2";

        const existing1 = await ctx.db
            .query("leaderboards")
            .withIndex("by_player_and_pack", (q) =>
                q.eq("playerId", match.player1Id).eq("pack", match.topicPack)
            )
            .first();

        if (existing1) {
            await ctx.db.patch(existing1._id, {
                reasonScore:
                    (existing1.reasonScore * existing1.totalMatches +
                        player1AvgScore) /
                    (existing1.totalMatches + 1),
                totalMatches: existing1.totalMatches + 1,
                wins: existing1.wins + (player1Won ? 1 : 0),
                lastUpdated: Date.now(),
            });
        } else {
            await ctx.db.insert("leaderboards", {
                playerId: match.player1Id,
                pack: match.topicPack,
                reasonScore: player1AvgScore,
                totalMatches: 1,
                wins: player1Won ? 1 : 0,
                moveDistribution: {},
                lastUpdated: Date.now(),
            });
        }

        const existing2 = await ctx.db
            .query("leaderboards")
            .withIndex("by_player_and_pack", (q) =>
                q.eq("playerId", match.player2Id).eq("pack", match.topicPack)
            )
            .first();

        if (existing2) {
            await ctx.db.patch(existing2._id, {
                reasonScore:
                    (existing2.reasonScore * existing2.totalMatches +
                        player2AvgScore) /
                    (existing2.totalMatches + 1),
                totalMatches: existing2.totalMatches + 1,
                wins: existing2.wins + (player2Won ? 1 : 0),
                lastUpdated: Date.now(),
            });
        } else {
            await ctx.db.insert("leaderboards", {
                playerId: match.player2Id,
                pack: match.topicPack,
                reasonScore: player2AvgScore,
                totalMatches: 1,
                wins: player2Won ? 1 : 0,
                moveDistribution: {},
                lastUpdated: Date.now(),
            });
        }

        return null;
    },
});

export const checkAchievements = internalMutation({
    args: {
        matchId: v.id("matches"),
        verdict: v.any(),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.db.get(args.matchId);
        if (!match) {
            return null;
        }

        const checkAchievement = async (
            playerId: Id<"players">,
            achievementId: string,
            condition: boolean
        ) => {
            if (!condition) {
                return;
            }

            const existing = await ctx.db
                .query("achievements")
                .withIndex("by_player", (q) => q.eq("playerId", playerId))
                .filter((q) => q.eq(q.field("achievementId"), achievementId))
                .first();

            if (!existing) {
                await ctx.db.insert("achievements", {
                    playerId,
                    achievementId,
                    unlockedAt: Date.now(),
                    matchId: args.matchId,
                });
            }
        };

        const player1Doc = await ctx.db.get(match.player1Id);
        const player2Doc = await ctx.db.get(match.player2Id);

        if (player1Doc) {
            const hasReductio = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player1" &&
                    m.move.toLowerCase().includes("reductio")
            );
            await checkAchievement(
                match.player1Id,
                "win_via_reductio",
                args.verdict.winner === "player1" && hasReductio
            );

            const hasBurdenShift = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player1" &&
                    m.move.toLowerCase().includes("burden")
            );
            await checkAchievement(
                match.player1Id,
                "clean_burden_transfer",
                hasBurdenShift
            );

            const hasEquivocationFix = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player1" &&
                    m.move.toLowerCase().includes("equivocation")
            );
            await checkAchievement(
                match.player1Id,
                "spot_and_fix_equivocation",
                hasEquivocationFix
            );
        }

        if (player2Doc) {
            const hasReductio = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player2" &&
                    m.move.toLowerCase().includes("reductio")
            );
            await checkAchievement(
                match.player2Id,
                "win_via_reductio",
                args.verdict.winner === "player2" && hasReductio
            );

            const hasBurdenShift = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player2" &&
                    m.move.toLowerCase().includes("burden")
            );
            await checkAchievement(
                match.player2Id,
                "clean_burden_transfer",
                hasBurdenShift
            );

            const hasEquivocationFix = args.verdict.namedMoves?.some(
                (m: { player: string; move: string }) =>
                    m.player === "player2" &&
                    m.move.toLowerCase().includes("equivocation")
            );
            await checkAchievement(
                match.player2Id,
                "spot_and_fix_equivocation",
                hasEquivocationFix
            );
        }

        return null;
    },
});

export const getLeaderboard = query({
    args: {
        pack: v.string(),
        limit: v.optional(v.number()),
    },
    returns: v.array(
        v.object({
            playerId: v.id("players"),
            reasonScore: v.number(),
            totalMatches: v.number(),
            wins: v.number(),
        })
    ),
    handler: async (ctx, args) => {
        const limit = args.limit ?? 50;
        const rows = await ctx.db
            .query("leaderboards")
            .withIndex("by_pack", (q) => q.eq("pack", args.pack))
            .order("desc")
            .take(limit);
        return rows.map((row) => ({
            playerId: row.playerId,
            reasonScore: row.reasonScore,
            totalMatches: row.totalMatches,
            wins: row.wins,
        }));
    },
});
