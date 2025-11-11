"use client";

import { cn } from "@/lib/cn";
import { motion, useComposedRefs, useReducedMotion } from "motion/react";
import type * as React from "react";
import useMeasure from "react-use-measure";

const AnimateHeight = ({
    className,
    ref,
    ...props
}: React.ComponentProps<"div">) => {
    const shouldReduceMotion = useReducedMotion();
    const [internalRef, bounds] = useMeasure({
        offsetSize: true,
    });
    const composedRefs = useComposedRefs(ref, internalRef);
    const height: number | "auto" = bounds.height > 0 ? bounds.height : "auto";

    return (
        <motion.div
            animate={shouldReduceMotion ? {} : { height }}
            className={cn("relative w-full overflow-hidden", className)}
            style={shouldReduceMotion ? {} : { height }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
        >
            <div ref={composedRefs} {...props} />
        </motion.div>
    );
};

export { AnimateHeight };
