import * as React from "react";

const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    // Modern browsers show a generic message and ignore this value.
    // But it's required for older browser compatibility.
    event.returnValue = "";
    return "";
};

export const usePreventWindowUnload = (preventDefault: boolean) => {
    React.useEffect(() => {
        if (!preventDefault) {
            return;
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () =>
            window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [preventDefault]);
};
