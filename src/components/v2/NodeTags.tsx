import type { CSSProperties } from "react";

import { parseNodeTags } from "@/lib/nodeTags";
import { cn } from "@/lib/utils";

type NodeTagStyle = CSSProperties & { "--node-tag-color": string };

export function NodeTags({
  tags,
  className,
  concealed = false,
}: {
  tags: string;
  className?: string;
  concealed?: boolean;
}) {
  const parsedTags = parseNodeTags(tags);
  if (parsedTags.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap gap-1 transition-[filter] duration-150",
        concealed && "pointer-events-none select-none blur-[5px]",
        className,
      )}
      role="list"
      aria-hidden={concealed || undefined}
    >
      {parsedTags.map((tag, index) => (
        <span
          key={`${tag.text}-${tag.color}-${index}`}
          role="listitem"
          className="inline-flex max-w-full items-center rounded-[4px] border px-1.5 py-0.5 text-[10px] font-medium leading-4"
          style={{
            "--node-tag-color": tag.hex,
            color: "color-mix(in srgb, var(--node-tag-color) 72%, var(--foreground))",
            backgroundColor: "color-mix(in srgb, var(--node-tag-color) 14%, var(--card))",
            borderColor: "color-mix(in srgb, var(--node-tag-color) 42%, var(--border))",
          } as NodeTagStyle}
          title={concealed ? undefined : tag.text}
        >
          <span className="truncate">{tag.text}</span>
        </span>
      ))}
    </div>
  );
}
