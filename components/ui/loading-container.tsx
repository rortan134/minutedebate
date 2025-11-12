"use client";

import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";

interface LoadingContainerProps {
    children?: ReactNode;
}

export function LoadingContainer({ children }: LoadingContainerProps) {
    return (
        <div className="flex size-full flex-1 flex-col items-center justify-center gap-4">
            <Spinner className="scale-50" />
            {children}
        </div>
    );
}
