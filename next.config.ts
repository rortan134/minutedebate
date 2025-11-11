import type { NextConfig } from "next";

const config: NextConfig = {
    typedRoutes: true,
    reactCompiler: true,
    // cacheComponents: true,
    experimental: {
        turbopackFileSystemCacheForDev: true,
    },
};

export default config;
