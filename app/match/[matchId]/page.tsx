"use client";

import MatchRoom from "@/components/match-room";
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
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                    <div className="text-lg uppercase tracking-[0.3em]">
                        Loading match…
                    </div>
                </div>
            }
        >
            <MatchRoomWrapper params={params} />
        </Suspense>
    );
}
