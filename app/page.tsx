import Lobby from "@/components/lobby";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Play Now",
    description:
        "Join the queue for real-time 1v1 debate matches. Master structured argumentation in one-minute bursts with AI-powered judging and skill-based achievements.",
    openGraph: {
        title: "MinuteDebate | Play Now",
        description:
            "Join the queue for real-time 1v1 debate matches. Master structured argumentation in one-minute bursts.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "MinuteDebate | Play Now",
        description:
            "Join the queue for real-time 1v1 debate matches. Master structured argumentation.",
    },
};

export default function Home() {
    return <Lobby />;
}
