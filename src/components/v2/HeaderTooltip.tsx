"use client";

import type { ReactElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const HEADER_TOOL_BUTTON_CLASS = "h-9 w-9 border border-transparent text-muted-foreground hover:border-primary/30 hover:bg-primary/15 hover:text-primary focus-visible:border-primary/40 focus-visible:bg-primary/15 data-[state=open]:border-primary/40 data-[state=open]:bg-primary/20 data-[state=open]:text-primary aria-pressed:border-primary/50 aria-pressed:bg-primary/25 aria-pressed:text-primary";

export function HeaderTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        sideOffset={8}
        className="max-w-64 text-center data-[state=closed]:hidden"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
