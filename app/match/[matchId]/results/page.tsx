"use client";

import Postgame from "@/components/postgame";
import type { Id } from "@/convex/_generated/dataModel";
import { getOrCreatePlayerId } from "@/lib/player-id";
import { Suspense, use, useState } from "react";

function PostgameWrapper({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    const resolvedParams = use(params);
    const [playerId] = useState(() => getOrCreatePlayerId());

    return (
        <Postgame
            matchId={resolvedParams.matchId as Id<"matches">}
            playerId={playerId}
        />
    );
}

export default function ResultsPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                    <div className="text-lg uppercase tracking-[0.3em]">
                        Loading results…
                    </div>
                </div>
            }
        >
            <PostgameWrapper params={params} />
        </Suspense>
    );
}
