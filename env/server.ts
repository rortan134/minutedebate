import { vercel } from "@t3-oss/env-core/presets-zod";
import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const serverEnv = createEnv({
    extends: [vercel()],
    server: {
        CONVEX_URL: z.string(),
        OPENAI_API_KEY: z.string(),
    },
    experimental__runtimeEnv: process.env,
});
