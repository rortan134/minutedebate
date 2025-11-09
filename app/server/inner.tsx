"use client";

import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home({
    preloaded,
}: {
    preloaded: Preloaded<typeof api.myFunctions.listNumbers>;
}) {
    const data = usePreloadedQuery(preloaded);
    const addNumber = useMutation(api.myFunctions.addNumber);
    return (
        <>
            <div className="flex flex-col gap-4 rounded-xl border border-slate-300 bg-slate-100 p-6 shadow-md dark:border-slate-600 dark:bg-slate-800">
                <h2 className="font-bold text-slate-800 text-xl dark:text-slate-200">
                    Reactive client-loaded data
                </h2>
                <code className="overflow-x-auto rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900">
                    <pre className="text-slate-700 text-sm dark:text-slate-300">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </code>
            </div>
            <button
                className="mx-auto cursor-pointer rounded-lg bg-slate-700 px-6 py-3 font-medium text-white shadow-md transition-all duration-200 hover:bg-slate-800 hover:shadow-lg dark:bg-slate-600 dark:hover:bg-slate-500"
                onClick={() => {
                    addNumber({ value: Math.floor(Math.random() * 10) });
                }}
                type="button"
            >
                Add a random number
            </button>
        </>
    );
}
