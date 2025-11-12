"use client";

import MatchRoom from "@/components/match-room";
import { LoadingContainer } from "@/components/ui/loading-container";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { Suspense, use, useState } from "react";

function MatchRoomWrapper({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const resolvedParams = use(params);
    const [playerId] = useState(() => getOrCreatePlayerId());

    return (
        <MatchRoom
            matchId={resolvedParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}

export default function MatchPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    return (
        <Suspense fallback={<LoadingContainer />}>
            <MatchRoomWrapper params={params} />
        </Suspense>
    );
}
