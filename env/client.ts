import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const clientEnv = createEnv({
    extends: [vercel()],
    client: {
        NEXT_PUBLIC_APP_NAME: z.string(),
        NEXT_PUBLIC_CONVEX_URL: z.string(),
    },
    runtimeEnv: {
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    },
});
