"use client";

import { clientEnv } from "@/env/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(clientEnv.NEXT_PUBLIC_CONVEX_URL);

export default function ConvexClientProvider({
    children,
}: {
    children: ReactNode;
}) {
    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
