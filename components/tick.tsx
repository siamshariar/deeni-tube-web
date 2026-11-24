// components/tick.tsx
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/** A checkbox's box (the row around it is the checkbox): YouTube's blue when on. */
export function Tick({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
        checked ? "border-[#065fd4] bg-[#065fd4] text-white dark:border-[#3ea6ff] dark:bg-[#3ea6ff] dark:text-[#0f0f0f]" : "border-muted-foreground/60"
      )}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}
