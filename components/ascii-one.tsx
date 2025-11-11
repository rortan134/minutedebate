"use client";

import { useLayoutEffect } from "react";

const scriptContent = `!function(){if(!window.UnicornStudio){window.UnicornStudio={isInitialized:!1};var i=document.createElement("script");i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js",i.onload=function(){window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)},(document.head || document.body).appendChild(i)}}();`;

export function AsciiOne() {
    useLayoutEffect(() => {
        const embedScript = document.createElement("script");
        embedScript.type = "text/javascript";
        embedScript.textContent = scriptContent;
        document.head.appendChild(embedScript);

        const style = document.createElement("style");
        style.textContent = `
      [data-us-project] canvas {
        clip-path: inset(0 0 9% 0) !important;
      }
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
        document.head.appendChild(style);

        // Function to aggressively hide branding
        const hideBranding = () => {
            // Target all possible UnicornStudio containers
            const selectors = [
                "[data-us-project]",
                '[data-us-project="og2tZllnlZ4VuxUlHYwy"]',
                ".unicorn-studio-container",
                'canvas[aria-label*="Unicorn"]',
            ];

            for (const selector of selectors) {
                const containers = document.querySelectorAll(selector);
                for (const container of containers) {
                    // Find and remove any elements containing branding text
                    const allElements = container.querySelectorAll("*");
                    for (const el of allElements) {
                        const htmlEl = el as HTMLElement;
                        const text = (htmlEl.textContent || "").toLowerCase();
                        const title = (
                            htmlEl.getAttribute("title") || ""
                        ).toLowerCase();
                        const href = (
                            htmlEl.getAttribute("href") || ""
                        ).toLowerCase();

                        if (
                            text.includes("made with") ||
                            text.includes("unicorn") ||
                            title.includes("made with") ||
                            title.includes("unicorn") ||
                            href.includes("unicorn.studio")
                        ) {
                            htmlEl.style.display = "none";
                            htmlEl.style.visibility = "hidden";
                            htmlEl.style.opacity = "0";
                            htmlEl.style.pointerEvents = "none";
                            htmlEl.style.position = "absolute";
                            htmlEl.style.left = "-9999px";
                            htmlEl.style.top = "-9999px";
                            // Also try to remove it
                            try {
                                htmlEl.remove();
                            } catch {
                                // Ignore removal errors
                            }
                        }
                    }
                }
            }
        };

        hideBranding();
        const interval = setInterval(hideBranding, 50); // More frequent checks
        setTimeout(hideBranding, 500);
        setTimeout(hideBranding, 1000);
        setTimeout(hideBranding, 2000);
        setTimeout(hideBranding, 5000);
        setTimeout(hideBranding, 10_000);

        return () => {
            clearInterval(interval);
            if (embedScript.parentNode) {
                embedScript.parentNode.removeChild(embedScript);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        };
    }, []);

    return (
        <div
            className="-bottom-[10%] absolute inset-0 select-none"
            data-us-project="og2tZllnlZ4VuxUlHYwy"
        />
    );
}
