"use client";

import type { ReactElement } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const HEADER_TOOL_BUTTON_CLASS = "h-9 w-9 hover:bg-[var(--accent-6)] hover:text-[var(--accent-12)] focus-visible:bg-[var(--accent-6)] data-[state=open]:bg-[var(--accent-6)] data-[state=open]:text-[var(--accent-12)]";

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
