import ConvexClientProvider from "@/components/convex-provider";
import { clientEnv } from "@/env/client";
import { cn } from "@/lib/cn";
import {
    APP_NAME,
    SITE_DESCRIPTION,
    SITE_KEYWORDS,
    SITE_SLOGAN,
    SITE_TITLE,
    SITE_URL,
} from "@/lib/constants";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Saira_Condensed } from "next/font/google";
import type * as React from "react";
import type {
    Brand,
    FAQPage,
    GamePlayMode,
    Offer,
    Organization,
    VideoGame,
    WebApplication,
    WithContext,
} from "schema-dts";
import "./globals.css";

const sairaCondensed = Saira_Condensed({
    subsets: ["latin"],
    weight: ["400", "700"],
    variable: "--font-saira-condensed",
});

const siteUrl = SITE_URL;
const heroImage = new URL("/android-chrome-512x512.png", siteUrl).toString();
const ogImage = new URL("/opengraph-image.png", siteUrl).toString();

const appName = APP_NAME;
const title = SITE_TITLE;
const description = SITE_DESCRIPTION;
const keywords = SITE_KEYWORDS;

export const viewport: Viewport = {
    initialScale: 1,
    minimumScale: 1,
    themeColor: "#fffbf0",
    viewportFit: "cover",
    width: "device-width",
};

export const metadata: Metadata = {
    alternates: {
        canonical: "/",
    },
    appLinks: {
        web: { should_fallback: true, url: siteUrl },
    },
    appleWebApp: { capable: true, title: appName },
    applicationName: appName,
    authors: [{ name: appName }],
    category: "Game",
    description,
    icons: {
        apple: "/apple-touch-icon.png",
        icon: [
            { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
            { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        ],
        other: {
            rel: "mask-icon",
            url: "/safari-pinned-tab.svg",
        },
    },
    keywords,
    metadataBase: new URL(siteUrl),
    openGraph: {
        description,
        locale: "en_US",
        siteName: appName,
        title: {
            default: title,
            template: `%s | ${appName}`,
        },
        type: "website",
        url: siteUrl,
        images: [
            {
                url: ogImage,
                width: 1200,
                height: 630,
                alt: `${appName} - Real-time debate matches with AI judging`,
            },
        ],
    },
    formatDetection: { telephone: false },
    other: {
        "applicable-device": "pc,mobile",
        "darkreader-lock": "meta",
        "mobile-web-app-capable": "yes",
        "msapplication-TileColor": "#000000",
        "msapplication-tap-highlight": "no",
        pinterest: "nopin",
    },
    referrer: "origin",
    robots: {
        follow: true,
        googleBot: {
            follow: true,
            index: true,
            "max-image-preview": "large",
            "max-video-preview": -1,
        },
        index: true,
    },
    title: {
        default: title,
        template: `%s | ${appName}`,
    },
    twitter: {
        card: "summary_large_image",
        creator: "@minutedebate",
        description,
        images: [ogImage],
        title,
    },
};

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
                <Analytics />
            </body>
        </html>
    );
}

const organizationJsonLd: WithContext<Organization> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}#organization`,
    name: appName,
    url: siteUrl,
    logo: heroImage,
    // sameAs: [
    //     `https://twitter.com/${appName.toLowerCase()}`,
    //     `https://github.com/${appName.toLowerCase()}`,
    // ],
};

const brandJsonLd: WithContext<Brand> = {
    "@context": "https://schema.org",
    "@type": "Brand",
    "@id": `${siteUrl}#brand`,
    image: heroImage,
    logo: heroImage,
    name: appName,
    url: siteUrl,
    slogan: SITE_SLOGAN,
};

const webApplicationJsonLd: WithContext<WebApplication> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${siteUrl}#webapp`,
    name: appName,
    url: siteUrl,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    browserRequirements: "Requires JavaScript. Requires HTML5.",
    softwareVersion: "1.0",
    offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
    } satisfies Offer,
    publisher: {
        "@id": `${siteUrl}#organization`,
    },
    screenshot: heroImage,
    description,
    inLanguage: "en",
    isAccessibleForFree: true,
};

const gameJsonLd: WithContext<VideoGame> = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "@id": `${siteUrl}#game`,
    name: appName,
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
    description,
    genre: ["Debate", "Strategy", "Educational", "Real-time"],
    image: heroImage,
    publisher: {
        "@id": `${siteUrl}#organization`,
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
                "An AI judge analyzes debates across five axes: logic, evidence, relevance, rhetorical clarity, and civility. Provides detailed feedback on specific moves like burden shifts, reductio ad absurdum, and equivocation fixes.",
        },
        {
            "@type": "Thing",
            name: "Oxford cadence format",
            description:
                "Structured debate format with 15-second opening statements, four alternating 10-second bursts, and 10-second closing summations. Total match duration: exactly one minute.",
        },
        {
            "@type": "Thing",
            name: "Cadence-gated typing",
            description:
                "Clock pauses only while actively typing at steady cadence (≥1 char every ~350ms). Hard 4-second pause reserve prevents infinite thinking time.",
        },
        {
            "@type": "Thing",
            name: "Skill-based achievements",
            description:
                "Unlock achievements by executing distinctive moves: win via reductio, perform clean burden transfers, or spot and fix equivocation. Track mastery across topic packs.",
        },
        {
            "@type": "Thing",
            name: "Topic packs",
            description:
                "Daily rotating packs (Tech, Ethics, Absurdism, Sports Trash Talk) with curated topics and move goals. Each pack rewards specific argumentation techniques.",
        },
    ],
    aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.5",
        ratingCount: "100",
        bestRating: "5",
        worstRating: "1",
    },
};

const faqJsonLd: WithContext<FAQPage> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
        {
            "@type": "Question",
            name: "How does MinuteDebate work?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "MinuteDebate pairs you with an anonymous opponent for a one-minute structured debate. You're given a random topic and assigned a stance (for or against). The match follows Oxford cadence format: 15-second openings, four alternating 10-second bursts, and 10-second summations. An AI judge evaluates your performance across five axes and provides detailed feedback.",
            },
        },
        {
            "@type": "Question",
            name: "What is cadence-gated typing?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Cadence-gated typing pauses your clock only while you're actively typing at a steady cadence (≥1 character every ~350ms). If you stop typing for more than 600-800ms, your time resumes. You get a hard 4-second pause reserve—once exhausted, thinking burns time no matter what. This mechanic rewards continuous argumentation over slow, deliberate typing.",
            },
        },
        {
            "@type": "Question",
            name: "How does the AI judge evaluate debates?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "The AI judge evaluates each debate across five axes: logic (soundness of reasoning), evidence (quality of support), relevance (addressing topic and opponent), rhetorical clarity (precision and structure), and civility (respectful engagement). The judge identifies specific moves like burden shifts, reductio ad absurdum, and equivocation fixes, providing detailed explanations of what worked and why.",
            },
        },
        {
            "@type": "Question",
            name: "What are topic packs?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Topic packs are daily rotating collections of debate topics organized by theme: Tech, Ethics, Absurdism, and Sports Trash Talk. Each pack has curated topics and rewards specific move goals. For example, the Tech pack emphasizes reductio and burden shifts, while Ethics focuses on distinctions and equivocation fixes.",
            },
        },
        {
            "@type": "Question",
            name: "How do achievements work?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Achievements unlock when you execute distinctive argumentation moves during matches. Examples include 'Win via Reductio' (winning by showing opponent's position leads to absurdity), 'Clean Burden Transfer' (shifting proof obligation to opponent), and 'Spot & Fix Equivocation' (identifying and correcting ambiguous terms). Achievements track your mastery across different packs.",
            },
        },
        {
            "@type": "Question",
            name: "Is MinuteDebate free to play?",
            acceptedAnswer: {
                "@type": "Answer",
                text: "Yes, MinuteDebate is completely free to play. No registration required—just join the queue and start debating. All features including AI judging, achievements, and leaderboards are available at no cost.",
            },
        },
    ],
};

const JsonLd = () => (
    <>
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(organizationJsonLd),
            }}
            type="application/ld+json"
        />
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{ __html: JSON.stringify(brandJsonLd) }}
            type="application/ld+json"
        />
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(webApplicationJsonLd),
            }}
            type="application/ld+json"
        />
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{ __html: JSON.stringify(gameJsonLd) }}
            type="application/ld+json"
        />
        <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: jsold
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            type="application/ld+json"
        />
    </>
);
