import { WEBSITE_URL } from "@/lib/constants";

export default function robots() {
    return {
        host: WEBSITE_URL,
        rules: [{ userAgent: "*" }],
        sitemap: `${WEBSITE_URL}/sitemap.xml`,
    };
}
