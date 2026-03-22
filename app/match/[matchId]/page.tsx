import { LoadingContainer } from "@/components/ui/loading-container";
import { Suspense } from "react";
import { MatchRoomContainer } from "./client";

export default function MatchPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    return (
        <Suspense fallback={<LoadingContainer />}>
            <MatchRoomContainer params={params} />
        </Suspense>
    );
}
