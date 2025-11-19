import { useEffect, useEffectEvent, useRef } from "react";

export function useAutoResizeTextArea(maxHeight?: number) {
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const autoResize = useEffectEvent((textArea: HTMLTextAreaElement) => {
        textArea.style.height = "auto";
        let newHeight = textArea.scrollHeight;

        if (typeof maxHeight === "number") {
            newHeight = Math.min(newHeight, maxHeight);
        } else {
            const computedMaxHeight = Number.parseFloat(
                getComputedStyle(textArea).maxHeight
            );
            if (
                computedMaxHeight &&
                computedMaxHeight !== Number.POSITIVE_INFINITY
            ) {
                newHeight = Math.min(newHeight, computedMaxHeight);
            }
        }

        textArea.style.height = `${newHeight}px`;
    });

    useEffect(() => {
        const textArea = textAreaRef.current;
        if (!textArea) {
            return;
        }

        const supportsFieldSizing =
            CSS.supports("field-sizing", "content") ||
            "fieldSizing" in document.documentElement.style;

        if (!supportsFieldSizing) {
            // Fallback path
            const handleInput = () => autoResize(textArea);

            // Initial resize
            autoResize(textArea);
            textArea.addEventListener("input", handleInput);
            return () => {
                textArea.removeEventListener("input", handleInput);
            };
        }
    }, []);

    return textAreaRef;
}
