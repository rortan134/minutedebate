"use client";

import { clientEnv } from "@/env/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type * as React from "react";

const convex = new ConvexReactClient(clientEnv.NEXT_PUBLIC_CONVEX_URL);

function ConvexClientProvider(props: React.PropsWithChildren) {
    return <ConvexProvider client={convex} {...props} />;
}

export { ConvexClientProvider };
