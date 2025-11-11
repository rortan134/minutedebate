import * as React from "react";

export const usePreventWindowUnload = (
    shouldPreventDefault: boolean,
    message?: string
) => {
    const handleBeforeUnload = React.useCallback(
        (event: BeforeUnloadEvent) => {
            if (!shouldPreventDefault) {
                return;
            }

            event.preventDefault();
            // Modern browsers show a generic message and ignore this value.
            // But it's required for older browser compatibility.
            event.returnValue = message ?? "";
            return "";
        },
        [shouldPreventDefault, message]
    );

    React.useEffect(() => {
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [handleBeforeUnload]);
};
