import { Spinner } from "@/components/ui/spinner";
import type { PropsWithChildren } from "react";

export function LoadingContainer({ children }: PropsWithChildren) {
    return (
        <div className="flex size-full flex-1 flex-col items-center justify-center gap-4">
            <Spinner className="scale-50" />
            {children}
        </div>
    );
}
