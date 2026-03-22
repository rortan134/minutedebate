import { Lobby } from "@/components/lobby";
import { WEBSITE_KEYWORDS, WEBSITE_NAME, WEBSITE_URL } from "@/lib/constants";
import type { Metadata } from "next";

const homeTitle = "Free online 1v1 debate game";
const homeDescription =
    "Join the queue for real-time 1v1 debate matches. Practice argumentation in one-minute 1v1 rounds — no signup.";

export const metadata: Metadata = {
    description: homeDescription,
    keywords: WEBSITE_KEYWORDS,
    openGraph: {
        description: homeDescription,
        title: `${homeTitle} | ${WEBSITE_NAME}`,
        type: "website",
        url: WEBSITE_URL,
    },
    title: homeTitle,
    twitter: {
        card: "summary_large_image",
        description: homeDescription,
        title: `${homeTitle} | ${WEBSITE_NAME}`,
    },
};

export default function Home() {
    return <Lobby />;
}
