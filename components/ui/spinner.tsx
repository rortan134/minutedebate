import { cn } from "@/lib/cn";
import type React from "react";
import { useMemo } from "react";

interface SpinnerProps {
    className?: string;
    m?: number; // number of .lyr per .tri
    n?: number; // number of .tri elements
}

const Spinner = ({ n = 6, m = 3, className = "" }: SpinnerProps) => {
    // k values identical to compiled HTML: 0, 0.167, 0.333, 0.5, 0.667, 0.833
    const ks = Array.from({ length: n }, (_, i) => +(i / n).toFixed(3));

    // Create the nth-child variable mapping for --c and set --m
    const nthChildVars = useMemo(() => {
        let rules = `:root, .trislices-root { --m: ${m}; }\n`;
        for (let j = 0; j < m; j++) {
            rules += `.lyr:nth-child(${j + 1}) { --c: ${j}; }\n`;
        }
        return rules;
    }, [m]);

    return (
        <div
            aria-hidden="true"
            className={cn("trislices-root grid place-items-center", className)}
        >
            <div className="relative grid">
                {ks.map((k) => {
                    const layers = Array.from({ length: m }, (_, j) => j);
                    return (
                        <div
                            className="tri grid place-self-center"
                            key={k}
                            style={
                                {
                                    ["--k" as keyof React.CSSProperties]: k,
                                } as React.CSSProperties
                            }
                        >
                            {layers.map((layerIndex) => (
                                <div
                                    className="lyr"
                                    key={`${k}-layer-${layerIndex}`}
                                />
                            ))}
                        </div>
                    );
                })}
            </div>
            <style>{`
        ${nthChildVars}

        .trislices-root { position: relative; }
        .trislices-root div { grid-area: 1/1; }

        .trislices-root .tri {
          --s: 1;
          display: grid;
          place-self: center;
          transform: rotate(calc(var(--k)*1turn)) translatey(calc(3em + 8px));
        }
        .trislices-root .tri:nth-child(2n) {
          --s: -1;
        }

        @keyframes trislices-scale { to { scale: 0; } }
        @keyframes trislices-rotate { to { rotate: calc(var(--oa) + var(--s)*1turn/3); } }

        .trislices-root .lyr {
          --o: calc(var(--c) - .5*(var(--m) - 1));
          --oa: calc(var(--o)*5deg);
          padding: 3em;
          rotate: var(--oa);
          background: currentcolor;
          color: hsl(calc(var(--c)/var(--m)*360), 100%, 50%);
          clip-path: polygon(50% 0%, 93.30127% 75%, 6.69873% 75%);
          mix-blend-mode: screen;
          animation: trislices-scale 1s ease-in infinite alternate, trislices-rotate 2s cubic-bezier(calc(.75 + var(--o)*.1), 0, calc(.25 - var(--o)*.1), 1) infinite;
          animation-delay: calc(var(--k)*-2*1s);
        }

        @supports (background: conic-gradient(red, tan)) {
          .trislices-root .lyr {
            background: conic-gradient(from 150deg at 50% 0, currentcolor 0% 60deg, transparent 0);
          }
        }
      `}</style>
        </div>
    );
};

export { Spinner };
