import ConvexClientProvider from "@/components/convex-provider";
import { clientEnv } from "@/env/client";
import { domAnimation, LazyMotion } from "motion/react";
import type * as React from "react";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                className="overscroll-y-none whitespace-pre-line font-sans"
                style={{ colorScheme: "light" }}
                suppressHydrationWarning
            >
                <noscript data-nosnippet="true">
                    You need to enable JavaScript to use{" "}
                    {clientEnv.NEXT_PUBLIC_APP_NAME}.
                </noscript>
                <h1 className="sr-only">{clientEnv.NEXT_PUBLIC_APP_NAME}</h1>
                <LazyMotion features={domAnimation} strict>
                    <ConvexClientProvider>{children}</ConvexClientProvider>
                </LazyMotion>
            </body>
        </html>
    );
}
