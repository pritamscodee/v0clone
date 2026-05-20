"use client";

import { cn } from "@/lib/utils";
import { Streamdown } from "streamdown";
import type { ComponentProps } from "react";

/** AI Elements–style markdown response (powered by Streamdown). */
export function Response({
  className,
  children,
  ...props
}: ComponentProps<typeof Streamdown>) {
  return (
    <Streamdown
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    >
      {children}
    </Streamdown>
  );
}
