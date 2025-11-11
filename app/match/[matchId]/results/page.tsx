"use client";

import Postgame from "@/components/postgame";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { use } from "react";

export default function ResultsPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const resolvedParams = use(params);
    const playerId = getOrCreatePlayerId();

    return (
        <Postgame
            matchId={resolvedParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}
