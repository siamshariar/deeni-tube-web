// components/person-item.tsx
// A channel or a scholar in a list (Channels, Scholars): a row with the picture, name and details. On phones narrower than
// 400px a card, two beside each other, with the picture on top and the rest under it, so names are never cut.
import Link from "next/link";
import type { ReactNode } from "react";
import { VerifiedName } from "@/components/icons/verified-icon";
import { ROW_DETAILS } from "@/components/page-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const PERSON_LIST = "max-[399px]:grid max-[399px]:grid-cols-2 max-[399px]:gap-2 max-[299px]:grid-cols-1";

interface PersonItemProps {
  href: string;
  avatar: string;
  name: string;
  verified?: boolean;
  details: string;
  /** Faded (a channel hidden from Home) */
  dim?: boolean;
  /** At the row's end; the card's last line */
  children?: ReactNode;
}

export function PersonItem({ href, avatar, name, verified, details, dim, children }: PersonItemProps) {
  return (
    <li className="flex items-center gap-2 rounded-xl px-2 py-2.5 transition-colors can-hover:hover:bg-muted/50 max-[399px]:flex-col max-[399px]:gap-3 max-[399px]:border max-[399px]:px-1 max-[399px]:py-4 max-[399px]:text-center md:gap-4">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 max-[399px]:w-full max-[399px]:flex-col max-[399px]:gap-2 max-[399px]:px-1 md:gap-4">
        <Avatar className={cn("h-12 w-12 flex-shrink-0 transition-opacity max-[399px]:h-[72px] max-[399px]:w-[72px] md:h-14 md:w-14", dim && "opacity-50")}>
          <AvatarImage src={avatar} alt="" />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 max-[399px]:w-full">
          <h3 className="line-clamp-2 text-[15px] max-[399px]:line-clamp-none font-medium leading-5 [overflow-wrap:anywhere] md:text-base md:leading-[22px]">
            <VerifiedName name={name} verified={verified} className="ml-1 h-4 w-4 align-[-2px]" />
          </h3>
          <p className={cn("line-clamp-2 max-[399px]:mt-0.5 max-[399px]:line-clamp-3", ROW_DETAILS)}>{details}</p>
        </div>
      </Link>
      {children}
    </li>
  );
}
