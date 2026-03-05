// biome-ignore lint/style/useFilenamingConvention: Convex module names cannot use hyphens.
"use node";

import { v } from "convex/values";
import { nanoid } from "nanoid";
import OpenAI from "openai";
import { serverEnv } from "../env/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import type { JudgeVerdict } from "./judging";

const openai = new OpenAI({
    apiKey: serverEnv.OPENAI_API_KEY,
});

export const judgeMatch = internalAction({
    args: {
        matchId: v.id("matches"),
    },
    returns: v.null(),
    handler: async (ctx, args) => {
        const match = await ctx.runQuery(internal.judging.getMatchForJudging, {
            matchId: args.matchId,
        });

        if (!match) {
            return null;
        }

        const messages = await ctx.runQuery(internal.judging.getMatchMessages, {
            matchId: args.matchId,
        });

        const player1 = await ctx.runQuery(internal.judging.getPlayer, {
            playerId: match.player1Id,
        });
        const player2 = await ctx.runQuery(internal.judging.getPlayer, {
            playerId: match.player2Id,
        });

        if (!(player1 && player2)) {
            return null;
        }

        const transcript = messages
            .map(
                (msg: {
                    playerId: Id<"players">;
                    phase: string;
                    content: string;
                }) => {
                    const isPlayer1 = msg.playerId === match.player1Id;
                    const stance = isPlayer1
                        ? match.player1Stance
                        : match.player2Stance;
                    const role = isPlayer1 ? "Player 1" : "Player 2";
                    return `[${msg.phase}] ${role} (${stance}): ${msg.content}`;
                }
            )
            .join("\n");

        const prompt = `You are an expert debate judge evaluating a 1-minute Oxford-style debate. Your role is to assess the quality of arguments based on logical structure, reasoning, and rhetorical skill—NOT factual accuracy or truth claims. The topic may be ambiguous or unverifiable, so focus on how well-formed, responsive, and justified the arguments are under their local premises.

Topic: ${match.topic}
Hint provided: ${match.hint}

Player 1 Position: ${match.player1Stance}
Player 2 Position: ${match.player2Stance}

Debate Transcript:
${transcript}

Evaluate each player on 5 axes (0-100 scale):
1. Logic: Soundness of reasoning, validity of inferences, avoidance of fallacies
2. Evidence: Quality of support (even if hypothetical), coherence of examples
3. Relevance: How well arguments address the topic and respond to opponent
4. Rhetorical Clarity: Precision of language, structure, and communication
5. Civility: Respectful engagement, constructive tone

Identify specific rhetorical moves:
- Clean distinctions (defining terms clearly)
- Burden shifts (transferring proof obligations)
- Reductio ad absurdum (showing opponent's position leads to absurdity)
- Equivocation fixes (clarifying ambiguous terms)
- Refutations (directly addressing opponent's points)

Return a JSON object with this structure:
{
  "player1Scores": {
    "logic": <number 0-100>,
    "evidence": <number 0-100>,
    "relevance": <number 0-100>,
    "rhetoricalClarity": <number 0-100>,
    "civility": <number 0-100>
  },
  "player2Scores": {
    "logic": <number 0-100>,
    "evidence": <number 0-100>,
    "relevance": <number 0-100>,
    "rhetoricalClarity": <number 0-100>,
    "civility": <number 0-100>
  },
  "winner": "player1" | "player2" | "tie",
  "explanation": "<detailed explanation of why the winner won, referencing specific moves and moments from the debate>",
  "namedMoves": [
    {
      "player": "player1" | "player2",
      "move": "<move name>",
      "description": "<what they did and why it was effective>"
    }
  ]
}

Focus on teaching: explain exactly what moves led to victory or loss.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert debate judge. Return only valid JSON, no markdown formatting.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
            throw new Error("No response from OpenAI");
        }

        let verdict: JudgeVerdict;
        try {
            verdict = JSON.parse(content) as JudgeVerdict;
        } catch (error) {
            throw new Error(`Failed to parse OpenAI response: ${error}`);
        }

        const namedMovesWithIds = verdict.namedMoves.map((m) => ({
            ...m,
            id: nanoid(),
        }));

        await ctx.runMutation(internal.judging.saveVerdict, {
            matchId: args.matchId,
            verdict: {
                winner: verdict.winner,
                player1Scores: verdict.player1Scores,
                player2Scores: verdict.player2Scores,
                explanation: verdict.explanation,
                namedMoves: namedMovesWithIds,
            },
        });

        await ctx.runMutation(internal.judging.updateLeaderboards, {
            matchId: args.matchId,
            verdict,
        });

        await ctx.runMutation(internal.judging.checkAchievements, {
            matchId: args.matchId,
            verdict,
        });

        return null;
    },
});
