import { APP_NAME, WEBSITE_DESCRIPTION, WEBSITE_URL } from "@/lib/constants";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        background_color: "#000000",
        categories: ["games", "education"],
        description: WEBSITE_DESCRIPTION,
        dir: "ltr",
        display: "standalone",
        display_override: ["fullscreen"],
        icons: [
            {
                purpose: "any",
                sizes: "192x192",
                src: "/android-chrome-192x192.png",
                type: "image/png",
            },
            {
                purpose: "any",
                sizes: "512x512",
                src: "/android-chrome-512x512.png",
                type: "image/png",
            },
        ],
        lang: "en-US",
        name: APP_NAME,
        orientation: "portrait-primary",
        prefer_related_applications: false,
        short_name: APP_NAME,
        start_url: "/?utm_source=pwa_homescreen&__pwa=1",
        theme_color: "#fffbf0",
        scope: WEBSITE_URL,
    };
}
