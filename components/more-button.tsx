// components/more-button.tsx
// The standard three-dot ("More actions") button used on every card and row:
// solid dots, 20px on phones / 24px from md up, in a 40px circle; always visible (touch screens have no hover).
// `size="sm"` is for compact lists (the video page's related list): 20px dots in a 36px circle.
// Works as a Radix trigger child (`<DropdownMenuTrigger asChild><MoreButton /></DropdownMenuTrigger>`).
"use client";

import * as React from "react";
import { MoreVertIcon } from "@/components/icons/more-vert-icon";
import { cn } from "@/lib/utils";

type MoreButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: "default" | "sm" };

export const MoreButton = React.forwardRef<HTMLButtonElement, MoreButtonProps>(
  ({ className, size = "default", type = "button", "aria-label": ariaLabel = "More actions", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-9 w-9" : "h-10 w-10",
        className
      )}
      {...props}
    >
      <MoreVertIcon className={size === "sm" ? "h-5 w-5" : "h-5 w-5 md:h-6 md:w-6"} />
    </button>
  )
);
MoreButton.displayName = "MoreButton";
