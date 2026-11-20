// components/sidebar-expanded-content.tsx
// Shared expanded sidebar content used by both the desktop sidebar and the
// mobile sidenav drawer.  Pass onLinkClick to close the drawer on navigation.
"use client";

import type React from "react";
import Link from "next/link";
import {
  Home,
  History,
  PlaySquare,
  Settings,
  HelpCircle,
  Users,
  GraduationCap,
  FolderOpen,
  BookMarked,
  LayoutGrid,
  // Clock,    // Watch Later — hidden, keep for easy re-enable
  // ThumbsUp, // Liked Videos — hidden, keep for easy re-enable
} from "lucide-react";
import { cn, isActivePath } from "@/lib/utils";

// ─── SidebarItem ─────────────────────────────────────────────────────────────

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ href, icon, label, active, collapsed, onClick }: SidebarItemProps) {
  // YouTube guide sizes: 40px rows with 24px icons; the mini guide uses 74px tiles with 10px labels
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-[10px] transition-colors duration-150 hover:bg-muted active:bg-accent [&_svg]:h-6 [&_svg]:w-6",
        collapsed
          ? "mx-1 flex-col justify-center gap-1.5 px-1 pb-3.5 pt-4"
          : "mx-3 h-10 gap-6 px-3 text-sm",
        active && "bg-muted font-medium hover:bg-accent"
      )}
      title={label}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span
        className={cn(
          "whitespace-nowrap truncate",
          collapsed ? "w-full text-center text-[10px] leading-[14px]" : "text-sm"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

// ─── UserIcon SVG ─────────────────────────────────────────────────────────────

export function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

// ─── SidebarExpandedContent ───────────────────────────────────────────────────

export interface SidebarExpandedContentProps {
  pathname: string | null;
  onLinkClick?: () => void;
}

export function SidebarExpandedContent({ pathname, onLinkClick }: SidebarExpandedContentProps) {
  return (
    <>
      <SidebarItem href="/" icon={<Home className="h-5 w-5 flex-shrink-0" />} label="Home" active={isActivePath(pathname, "/")} collapsed={false} onClick={onLinkClick} />
      <SidebarItem href="/shorts" icon={<PlaySquare className="h-5 w-5 flex-shrink-0" />} label="Shorts" active={isActivePath(pathname, "/shorts")} collapsed={false} onClick={onLinkClick} />

      {/* Browse */}
      <div className="border-t mt-3 pt-3">
        <SidebarItem href="/channels" icon={<Users className="h-5 w-5 flex-shrink-0" />} label="Channels" active={isActivePath(pathname, "/channels")} collapsed={false} onClick={onLinkClick} />
        <SidebarItem href="/scholars" icon={<GraduationCap className="h-5 w-5 flex-shrink-0" />} label="Scholars" active={isActivePath(pathname, "/scholars")} collapsed={false} onClick={onLinkClick} />
      </div>

      {/* You */}
      <div className="border-t mt-3 pt-3">
        <div className="px-6 pb-1 pt-1.5">
          <h3 className="text-base font-medium whitespace-nowrap">You</h3>
        </div>
        <SidebarItem href="/you" icon={<UserIcon className="h-5 w-5 flex-shrink-0" />} label="Your account" active={isActivePath(pathname, "/you")} collapsed={false} onClick={onLinkClick} />
        <SidebarItem href="/history" icon={<History className="h-5 w-5 flex-shrink-0" />} label="History" active={isActivePath(pathname, "/history")} collapsed={false} onClick={onLinkClick} />
        <SidebarItem href="/playlists" icon={<BookMarked className="h-5 w-5 flex-shrink-0" />} label="Playlists" active={isActivePath(pathname, "/playlists")} collapsed={false} onClick={onLinkClick} />
        {/* Watch Later — hidden; uncomment to re-enable */}
        {/* <SidebarItem href="/watch-later" icon={<Clock className="h-5 w-5 flex-shrink-0" />} label="Watch Later" active={isActivePath(pathname, "/watch-later")} collapsed={false} onClick={onLinkClick} /> */}
        {/* Liked Videos — hidden; uncomment to re-enable */}
        {/* <SidebarItem href="/liked-videos" icon={<ThumbsUp className="h-5 w-5 flex-shrink-0" />} label="Liked Videos" active={isActivePath(pathname, "/liked-videos")} collapsed={false} onClick={onLinkClick} /> */}
      </div>

      {/* Explore */}
      <div className="border-t mt-3 pt-3">
        <div className="px-6 pb-1 pt-1.5">
          <h3 className="text-base font-medium whitespace-nowrap">Explore</h3>
        </div>
        <SidebarItem href="/categories" icon={<FolderOpen className="h-5 w-5 flex-shrink-0" />} label="Categories" active={isActivePath(pathname, "/categories")} collapsed={false} onClick={onLinkClick} />
      </div>

      {/* More from Deeni.tube */}
      <div className="border-t mt-3 pt-3">
        <div className="px-6 pb-1 pt-1.5">
          <h3 className="text-base font-medium whitespace-nowrap">More from Deeni.tube</h3>
        </div>
        <SidebarItem href="/more" icon={<LayoutGrid className="h-5 w-5 flex-shrink-0" />} label="More" active={isActivePath(pathname, "/more")} collapsed={false} onClick={onLinkClick} />
      </div>

      {/* Settings */}
      <div className="border-t mt-3 pt-3">
        <SidebarItem href="/settings" icon={<Settings className="h-5 w-5 flex-shrink-0" />} label="Settings" active={isActivePath(pathname, "/settings")} collapsed={false} onClick={onLinkClick} />
        <SidebarItem href="/help" icon={<HelpCircle className="h-5 w-5 flex-shrink-0" />} label="Help" active={isActivePath(pathname, "/help")} collapsed={false} onClick={onLinkClick} />
      </div>

      {/* Footer — mt-auto pins copyright to the very bottom of the sidebar */}
      <div className="px-6 py-4 mt-auto border-t">
        <p className="text-xs leading-tight text-muted-foreground">
          © 2026 Deeni.tube All rights reserved.
        </p>
      </div>
    </>
  );
}
