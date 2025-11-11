import { v } from "convex/values";
import { query } from "./_generated/server";

export const listForPlayer = query({
    args: {
        playerId: v.string(),
        limit: v.optional(v.number()),
        matchId: v.optional(v.id("matches")),
    },
    returns: v.object({
        totalUnlocked: v.number(),
        recent: v.array(
            v.object({
                achievementId: v.string(),
                unlockedAt: v.number(),
                matchId: v.optional(v.id("matches")),
            })
        ),
        latestMatchAchievements: v.array(
            v.object({
                achievementId: v.string(),
                unlockedAt: v.number(),
                matchId: v.id("matches"),
            })
        ),
    }),
    handler: async (ctx, args) => {
        const player = await ctx.db
            .query("players")
            .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
            .first();

        if (!player) {
            return {
                totalUnlocked: 0,
                recent: [],
                latestMatchAchievements: [],
            };
        }

        const rows = await ctx.db
            .query("achievements")
            .withIndex("by_player", (q) => q.eq("playerId", player._id))
            .collect();

        const sorted = [...rows].sort((a, b) => b.unlockedAt - a.unlockedAt);

        const limit = Math.max(1, Math.min(args.limit ?? 10, 50));
        const recent = sorted.slice(0, limit).map((entry) => ({
            achievementId: entry.achievementId,
            unlockedAt: entry.unlockedAt,
            matchId: entry.matchId ?? undefined,
        }));

        const latestMatchAchievements =
            args.matchId === undefined
                ? []
                : sorted
                      .filter(
                          (
                              entry
                          ): entry is typeof entry & {
                              matchId: NonNullable<typeof entry.matchId>;
                          } =>
                              entry.matchId !== undefined &&
                              entry.matchId === args.matchId
                      )
                      .map((entry) => ({
                          achievementId: entry.achievementId,
                          unlockedAt: entry.unlockedAt,
                          matchId: entry.matchId,
                      }));

        return {
            totalUnlocked: rows.length,
            recent,
            latestMatchAchievements,
        };
    },
});
