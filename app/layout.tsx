import ConvexClientProvider from "@/components/convex-provider";
import { clientEnv } from "@/env/client";
import { cn } from "@/lib/cn";
import { Saira_Condensed } from "next/font/google";
import type * as React from "react";
import type {
    Brand,
    GamePlayMode,
    Offer,
    VideoGame,
    WithContext,
} from "schema-dts";
import "./globals.css";

const sairaCondensed = Saira_Condensed({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-saira-condensed",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://minutedebate.com";
const heroImage = new URL("/android-chrome-512x512.png", siteUrl).toString();

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html
            className={cn(sairaCondensed.variable)}
            dir="ltr"
            lang="en"
            prefix="og: https://ogp.me/ns#"
        >
            <body
                className="whitespace-pre-line font-sans selection:bg-primary/10"
                style={{ colorScheme: "light" }}
            >
                <noscript data-nosnippet="true">
                    You need to enable JavaScript to use{" "}
                    {clientEnv.NEXT_PUBLIC_APP_NAME}.
                </noscript>
                <h1 className="sr-only">{clientEnv.NEXT_PUBLIC_APP_NAME}</h1>
                <ConvexClientProvider>{children}</ConvexClientProvider>
                <JsonLd />
            </body>
        </html>
    );
}

const brandJsonLd: WithContext<Brand> = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "@id": `${siteUrl}#brand`,
    image: heroImage,
    logo: heroImage,
    name: clientEnv.NEXT_PUBLIC_APP_NAME,
    url: siteUrl,
    slogan: "One minute. One topic. One winner.",
};

const gameJsonLd: WithContext<VideoGame> = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: clientEnv.NEXT_PUBLIC_APP_NAME,
    headline: "Real-time 1v1 debate matches with AI judging",
    url: siteUrl,
    inLanguage: "en",
    isFamilyFriendly: true,
    operatingSystem: "Web",
    applicationCategory: "GameApplication",
    gamePlatform: [
        "https://schema.org/DesktopWebPlatform",
        "https://schema.org/MobileWebPlatform",
    ],
    playMode: "MultiPlayer" as GamePlayMode,
    numberOfPlayers: {
        "@type": "QuantitativeValue",
        minValue: 2,
        maxValue: 2,
    },
    description:
        "MinuteDebate pairs anonymous opponents for one-minute debates, complete with cadence-gated typing, AI hints, and judging across five reasoning axes.",
    genre: ["Debate", "Strategy", "Educational"],
    image: heroImage,
    publisher: {
        "@type": "Organization",
        name: clientEnv.NEXT_PUBLIC_APP_NAME,
        url: siteUrl,
        brand: {
            "@id": `${siteUrl}#brand`,
        },
    },
    offers: [
        {
            "@type": "Offer",
            price: "0",
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            url: siteUrl,
            category: "FreeToPlay",
        } satisfies Offer,
    ],
    about: [
        {
            "@type": "Thing",
            name: "AI-powered debate judge",
            description:
                "Evaluate logic, evidence, and relevance after every match.",
        },
        {
            "@type": "Thing",
            name: "Oxford mode",
            description:
                "Structured 15-second openings, 10-second bursts, and closing summations encourage sharp reasoning and critical thinking.",
        },
        {
            "@type": "Thing",
            name: "Skill-based achievements",
            description:
                "Unlock goals such as clean burden transfers, reductio wins, and spotting equivocation.",
        },
    ],
};

const JsonLd = () => (
    <>
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
            type="application/ld+json"
        />
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }}
            type="application/ld+json"
        />
    </>
);
