"use client";

import { MatchRoom } from "@/components/match-room";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { use, useState } from "react";

function MatchRoomContainer({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const routeParams = use(params);
    const [playerId] = useState(() => getOrCreatePlayerId());

    return (
        <MatchRoom
            matchId={routeParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}

export { MatchRoomContainer };
