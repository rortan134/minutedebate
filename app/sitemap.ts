import { WEBSITE_URL } from "@/lib/constants";
import type { MetadataRoute } from "next";

const DEFAULT_CONFIG = {
    WEBSITE_URL,
    DEFAULT_CHANGE_FREQUENCY: "always" as const,
    DEFAULT_PRIORITY: 1,
} as const;

type SitemapEntry = MetadataRoute.Sitemap[number];

interface SitemapRoute {
    changeFrequency?: SitemapEntry["changeFrequency"];
    path: string;
    priority?: number;
}

const STATIC_ROUTES: readonly SitemapRoute[] = [
    { path: "", priority: 1 },
] as const;

function createRouteEntries(entries: readonly SitemapRoute[]): SitemapEntry[] {
    return entries.map((route) => ({
        url: `${DEFAULT_CONFIG.WEBSITE_URL}${route.path}`,
        lastModified: new Date().toISOString(),
        changeFrequency:
            route.changeFrequency ?? DEFAULT_CONFIG.DEFAULT_CHANGE_FREQUENCY,
        priority: route.priority ?? DEFAULT_CONFIG.DEFAULT_PRIORITY,
    }));
}

export default function sitemap(): MetadataRoute.Sitemap {
    try {
        return createRouteEntries(STATIC_ROUTES);
    } catch (error) {
        throw new Error(`Failed to create sitemap entries: ${error}`);
    }
}
