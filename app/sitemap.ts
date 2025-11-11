import type { MetadataRoute } from "next";

const CONFIG = {
    WEBSITE_URL: "https://minutedebate.com",
    DEFAULT_CHANGE_FREQUENCY: "always" as const,
    DEFAULT_PRIORITY: 1,
} as const;

type SitemapEntry = MetadataRoute.Sitemap[number];

interface SitemapRoute {
    path: string;
    changeFrequency?: SitemapEntry["changeFrequency"];
    priority?: number;
}

// Static routes with metadata
export const routes: readonly SitemapRoute[] = [
    { path: "", priority: 1 },
] as const;

function createRouteEntries(entries: readonly SitemapRoute[]): SitemapEntry[] {
    return entries.map((route) => ({
        url: `${CONFIG.WEBSITE_URL}${route.path}`,
        lastModified: new Date().toISOString(),
        changeFrequency:
            route.changeFrequency ?? CONFIG.DEFAULT_CHANGE_FREQUENCY,
        priority: route.priority ?? CONFIG.DEFAULT_PRIORITY,
    }));
}

export default function sitemap(): MetadataRoute.Sitemap {
    try {
        return createRouteEntries(routes);
    } catch (error) {
        console.error("Error generating sitemap:", error);
        // Return at least the static routes in case of error
        return createRouteEntries(routes);
    }
}

// Enforces that this route is used as static rendering
// @see https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
export const dynamic = "error";
