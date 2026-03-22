import { LoadingContainer } from "@/components/ui/loading-container";
import { Suspense } from "react";
import { PostgameContainer } from "./client";

export default function ResultsPage({
    params,
}: {
    params: Promise<{ matchId: string }>;
}) {
    return (
        <Suspense fallback={<LoadingContainer />}>
            <PostgameContainer params={params} />
        </Suspense>
    );
}
