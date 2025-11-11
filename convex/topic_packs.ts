// biome-ignore lint/style/useFilenamingConvention: Convex module names cannot use hyphens.
export const TOPIC_PACKS = {
    tech: {
        name: "Tech",
        topics: [
            {
                topic: "AI should replace human decision-making in critical systems",
                hint: "Consider autonomy, accountability, and edge cases",
            },
            {
                topic: "Social media platforms should be regulated as public utilities",
                hint: "Think about free speech, monopolies, and infrastructure",
            },
            {
                topic: "Cryptocurrency will replace traditional banking",
                hint: "Examine stability, adoption barriers, and regulatory frameworks",
            },
            {
                topic: "Open source software is inherently more secure than proprietary",
                hint: "Consider transparency, resources, and attack surfaces",
            },
            {
                topic: "Privacy is dead in the digital age",
                hint: "Explore surveillance, consent, and technological determinism",
            },
        ],
        moveGoals: ["reductio", "burden_shift", "distinction"],
    },
    ethics: {
        name: "Ethics",
        topics: [
            {
                topic: "Utilitarianism justifies sacrificing individuals for the greater good",
                hint: "Examine moral absolutes, slippery slopes, and measurement problems",
            },
            {
                topic: "Animals have the same moral status as humans",
                hint: "Consider consciousness, capacity, and moral frameworks",
            },
            {
                topic: "Lying is always wrong, even to save lives",
                hint: "Explore categorical imperatives, consequences, and virtue ethics",
            },
            {
                topic: "Wealth redistribution violates individual rights",
                hint: "Think about property rights, social contracts, and fairness",
            },
            {
                topic: "Moral relativism makes ethical judgment impossible",
                hint: "Consider universal principles, cultural context, and moral progress",
            },
        ],
        moveGoals: ["distinction", "burden_shift", "equivocation_fix"],
    },
    absurdism: {
        name: "Absurdism",
        topics: [
            {
                topic: "Pineapple belongs on pizza",
                hint: "Consider culinary traditions, taste subjectivity, and cultural norms",
            },
            {
                topic: "Time travel would make life meaningless",
                hint: "Examine causality, free will, and the nature of experience",
            },
            {
                topic: "We should all speak in emojis instead of words",
                hint: "Think about communication efficiency, nuance, and expression",
            },
            {
                topic: "The best way to solve problems is to ignore them",
                hint: "Consider problem-solving strategies, consequences, and paradoxes",
            },
            {
                topic: "Reality is just a simulation we should try to break",
                hint: "Explore epistemology, agency, and the nature of existence",
            },
        ],
        moveGoals: ["reductio", "distinction", "burden_shift"],
    },
    "sports-trash-talk": {
        name: "Sports Trash Talk",
        topics: [
            {
                topic: "LeBron James is the greatest basketball player of all time",
                hint: "Consider eras, statistics, championships, and impact",
            },
            {
                topic: "Soccer is more exciting than American football",
                hint: "Examine pacing, strategy, and cultural preferences",
            },
            {
                topic: "ESPN overvalues individual achievements over team success",
                hint: "Think about media narratives, statistics, and legacy",
            },
            {
                topic: "The designated hitter rule ruins baseball",
                hint: "Consider tradition, strategy, and the evolution of sports",
            },
            {
                topic: "Fantasy sports are more engaging than watching real games",
                hint: "Explore engagement, investment, and the nature of fandom",
            },
        ],
        moveGoals: ["burden_shift", "distinction", "reductio"],
    },
} as const;

export type TopicPack = keyof typeof TOPIC_PACKS;

export function getDailyPack(): TopicPack {
    const packs: readonly TopicPack[] = Object.keys(TOPIC_PACKS) as TopicPack[];
    const daysSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const pack = packs[daysSinceEpoch % packs.length];
    if (!pack) {
        return packs[0] as TopicPack;
    }
    return pack as TopicPack;
}

export function getRandomTopic(pack: TopicPack): {
    topic: string;
    hint: string;
} {
    const packData = TOPIC_PACKS[pack];
    const topics = packData.topics;
    const topic = topics[Math.floor(Math.random() * topics.length)];
    if (!topic) {
        return { topic: "", hint: "" };
    }
    return topic;
}
