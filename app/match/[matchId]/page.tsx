"use client";

import MatchRoom from "@/components/match-room";
import { getOrCreatePlayerId } from "@/lib/player-id";
import type { Id } from "@/convex/_generated/dataModel";
import { use } from "react";

export default function MatchPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const resolvedParams = use(params);
    const playerId = getOrCreatePlayerId();

    return (
        <MatchRoom
            matchId={resolvedParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}
