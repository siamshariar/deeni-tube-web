// components/more-button.tsx
// The standard three-dot ("More actions") button used on every card and row:
// solid dots, 20px on phones / 24px from md up, in a 40px circle; always visible (touch screens have no hover).
// Works as a Radix trigger child (`<DropdownMenuTrigger asChild><MoreButton /></DropdownMenuTrigger>`).
"use client";

import * as React from "react";
import { MoreVertIcon } from "@/components/icons/more-vert-icon";
import { cn } from "@/lib/utils";

export const MoreButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, type = "button", "aria-label": ariaLabel = "More actions", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <MoreVertIcon className="h-5 w-5 md:h-6 md:w-6" />
    </button>
  )
);
MoreButton.displayName = "MoreButton";
