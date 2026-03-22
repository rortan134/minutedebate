"use client";

import { Postgame } from "@/components/postgame";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { use, useState } from "react";

function PostgameContainer({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const routeParams = use(params);
    const [playerId] = useState(() => getOrCreatePlayerId());

    return (
        <Postgame
            matchId={routeParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}

export { PostgameContainer };
