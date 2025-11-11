import type { MetadataRoute } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";

const CONFIG = {
    WEBSITE_URL: "https://infactura.com",
    POST_PATH: "app/[locale]/(marketing)/aprende",
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
    { path: "/para-agencias", priority: 0.9 },
    { path: "/para-autonomos", priority: 0.9 },
    { path: "/para-empresas", priority: 0.9 },
    { path: "/para-pymes", priority: 0.9 },
    { path: "/facturacion", priority: 0.8 },
    { path: "/precios", priority: 0.8 },
    { path: "/terminos-condiciones", priority: 0.5 },
    { path: "/privacidad", priority: 0.5 },
    { path: "/aviso-legal", priority: 0.5 },
    { path: "/ley-antifraude", priority: 0.7 },
    { path: "/politicas", priority: 0.5 },
    { path: "/changelog", priority: 0.6 },
    { path: "/faq", priority: 0.8 },
    { path: "/mision", priority: 0.7 },
    { path: "/modelos", priority: 0.8 },
    { path: "/modelos/factura", priority: 0.9 },
    { path: "/modelos/presupuesto", priority: 0.8 },
    { path: "/modelos/proforma", priority: 0.8 },
    { path: "/modelos/como-hacer-facturas", priority: 0.9 },
    { path: "/herramientas", priority: 0.8 },
    { path: "/herramientas/calculadora-cpm", priority: 0.7 },
    { path: "/herramientas/calculadora-ctr", priority: 0.7 },
    { path: "/herramientas/calculadora-iva", priority: 0.8 },
    { path: "/herramientas/calculadora-margen", priority: 0.7 },
    { path: "/herramientas/calculadora-porcentaje", priority: 0.7 },
    { path: "/herramientas/calculadora-tasa-conversion", priority: 0.7 },
    { path: "/herramientas/calculadora-tasa-crecimiento", priority: 0.7 },
] as const;

async function getLastModifiedDate(filePath: string): Promise<Date> {
    try {
        const stats = await fs.stat(filePath);
        return stats.mtime;
    } catch (error) {
        console.warn(
            `Could not get last modified date for ${filePath}:`,
            error
        );
        return new Date();
    }
}

async function getPostSlugs(): Promise<string[]> {
    try {
        const directory = path.join(
            process.cwd(),
            ...CONFIG.POST_PATH.split("/")
        );
        const pageEntryCandidates = await fs.readdir(directory, {
            recursive: true,
            withFileTypes: true,
        });

        return pageEntryCandidates
            .filter((entry) => entry.isFile() && entry.name === "page.mdx")
            .map((entry) => {
                const relativePath = path.relative(
                    directory,
                    path.join(entry.parentPath, entry.name)
                );
                return path.dirname(relativePath).replace(/\\/g, "/");
            });
    } catch (error) {
        console.error("Error reading post slugs:", error);
        return [];
    }
}

function createPostEntries(posts: string[]): Promise<SitemapEntry[]> {
    return Promise.all(
        posts.map(async (post) => {
            const postPath = path.join(
                process.cwd(),
                CONFIG.POST_PATH,
                post,
                "page.mdx"
            );
            const lastModified = await getLastModifiedDate(postPath);

            return {
                url: `${CONFIG.WEBSITE_URL}/aprende/${post}`,
                lastModified: lastModified.toISOString(),
                changeFrequency: "monthly" as const,
                priority: 0.6,
            };
        })
    );
}

function createRouteEntries(entries: readonly SitemapRoute[]): SitemapEntry[] {
    return entries.map((route) => ({
        url: `${CONFIG.WEBSITE_URL}${route.path}`,
        lastModified: new Date().toISOString(),
        changeFrequency:
            route.changeFrequency ?? CONFIG.DEFAULT_CHANGE_FREQUENCY,
        priority: route.priority ?? CONFIG.DEFAULT_PRIORITY,
    }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    try {
        const [postSlugs, baseRoutes] = await Promise.all([
            getPostSlugs(),
            createRouteEntries(routes),
        ]);

        const postEntries = await createPostEntries(postSlugs);
        return [...baseRoutes, ...postEntries];
    } catch (error) {
        console.error("Error generating sitemap:", error);
        // Return at least the static routes in case of error
        return createRouteEntries(routes);
    }
}

// Enforces that this route is used as static rendering
// @see https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic
export const dynamic = "error";
