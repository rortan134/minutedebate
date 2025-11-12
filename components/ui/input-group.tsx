"use client";

import { Input, type InputProps } from "@/components/ui/input";
import { Textarea, type TextareaProps } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

function InputGroup({ className, ...props }: React.ComponentProps<"fieldset">) {
    return (
        <fieldset
            className={cn(
                "relative inline-flex w-full min-w-0 flex-col rounded-lg border border-input bg-background text-base/5 shadow-xs ring-ring/24 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 sm:text-sm dark:bg-input/32",
                className
            )}
            data-slot="input-group"
            {...props}
        />
    );
}

const inputGroupAddonVariants = cva(
    "flex h-auto cursor-text select-none items-center justify-center gap-2 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4 not-has-[button]:**:[svg]:opacity-72",
    {
        variants: {
            align: {
                "inline-start":
                    "has-[>[data-slot=badge]]:-ms-1.5 has-[>button]:-ms-2 order-first ps-[calc(--spacing(3)-1px)] has-[>kbd]:ms-[-0.35rem] [[data-size=sm]+&]:ps-[calc(--spacing(2.5)-1px)]",
                "inline-end":
                    "has-[>[data-slot=badge]]:-me-1.5 has-[>button]:-me-2 order-last pe-[calc(--spacing(3)-1px)] has-[>kbd]:me-[-0.35rem] [[data-size=sm]+&]:pe-[calc(--spacing(2.5)-1px)]",
                "block-start":
                    "order-first w-full justify-start px-[calc(--spacing(3)-1px)] pt-[calc(--spacing(3)-1px)] [.border-b]:pb-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
                "block-end":
                    "order-last w-full justify-start px-[calc(--spacing(3)-1px)] pb-[calc(--spacing(3)-1px)] [.border-t]:pt-[calc(--spacing(3)-1px)] [[data-size=sm]+&]:px-[calc(--spacing(2.5)-1px)]",
            },
        },
        defaultVariants: {
            align: "inline-start",
        },
    }
);

function InputGroupAddon({
    className,
    align = "inline-start",
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
    return (
        <Slot
            className={cn(inputGroupAddonVariants({ align }), className)}
            data-align={align}
            data-slot="input-group-addon"
            onMouseDown={(e) => {
                const target = e.target as HTMLElement;
                const isInteractive = target.closest("button, a");
                if (isInteractive) {
                    return;
                }
                e.preventDefault();
                const parent = e.currentTarget.parentElement;
                const input = parent?.querySelector<
                    HTMLInputElement | HTMLTextAreaElement
                >("input, textarea");
                if (
                    input &&
                    !parent?.querySelector("input:focus, textarea:focus")
                ) {
                    input.focus();
                }
            }}
            role="presentation"
            tabIndex={-1}
            {...props}
        />
    );
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
    return (
        <span
            className={cn(
                "flex items-center gap-2 text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none",
                className
            )}
            {...props}
        />
    );
}

function InputGroupInput({ className, ...props }: InputProps) {
    return <Input className={className} unstyled {...props} />;
}

function InputGroupTextarea({ className, ...props }: TextareaProps) {
    return <Textarea className={className} unstyled {...props} />;
}

export {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
    InputGroupTextarea,
};
