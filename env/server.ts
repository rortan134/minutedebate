import { createEnv } from "@t3-oss/env-nextjs";
import * as z from "zod";

export const serverEnv = createEnv({
    server: {
        CONVEX_URL: z.string(),
    },
    experimental__runtimeEnv: process.env,
});
