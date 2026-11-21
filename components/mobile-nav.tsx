// components/mobile-nav.tsx
"use client"

import type React from "react"
import { useEffect } from "react"
import Link from "next/link"
import { Home, PlaySquare, Users, LayoutGrid, GraduationCap, User } from "lucide-react"
import { usePathname } from "next/navigation"
import { useMediaQuery } from "@/hooks/use-media-query"
import { isActivePath } from "@/lib/utils"

const navItems = [
  { href: "/",          icon: Home,          label: "Home" },
  { href: "/shorts",    icon: PlaySquare,    label: "Shorts" },
  { href: "/channels",  icon: Users,         label: "Channels" },
  { href: "/categories",icon: LayoutGrid,    label: "Categories" },
  { href: "/scholars",  icon: GraduationCap, label: "Scholars" },
  { href: "/you",       icon: User,          label: "You" },
]

// Fixed at the bottom on phones, as in YouTube's app (it stays while the page scrolls), always above the
// phone's own navigation (gesture bar or Back/Home/Recents buttons). Chrome's edge-to-edge pattern: the bar
// is grown by the largest bottom inset up front and pulled down by what's left of it, so it never jumps or
// relays out while the browser's bottom bar moves (see --sab-max in globals.css).
const NAV_STYLE: React.CSSProperties = {
  height: "calc(56px + var(--sab-max))",
  paddingBottom: "var(--sab-max)",
  bottom: "calc(env(safe-area-inset-bottom, 0px) - var(--sab-max))",
}

export default function MobileNav() {
  const pathname = usePathname()
  const isMobile = useMediaQuery("(max-width: 767px)")

  // Hide on detail pages
  const detailPatterns = [
    "/videos/",
    "/shorts",
    "/channels/",
    "/scholars/",
    "/categories/",
    "/playlists/",
    "/more/",
    "/help/",
  ]

  const listPages = ["/channels", "/scholars", "/categories", "/playlists", "/you", "/shorts"]

  // Hide on detail pages, show on list pages. The sign-in page is a standalone screen
  const shown =
    isMobile &&
    pathname !== "/signin" &&
    !detailPatterns.some((prefix) => pathname?.startsWith(prefix) && !listPages.includes(pathname))

  // Toasts sit just above the bar when it's there, and near the bottom edge when it isn't (globals.css)
  useEffect(() => {
    const root = document.documentElement
    if (shown) root.dataset.bottomNav = ""
    else delete root.dataset.bottomNav
  }, [shown])
  useEffect(() => () => { delete document.documentElement.dataset.bottomNav }, [])

  if (!shown) return null

  return (
    <nav
      className="fixed left-0 right-0 z-50 flex border-t border-border bg-background"
      style={NAV_STYLE}
      aria-label="Mobile navigation"
    >
      <div className="flex w-full items-stretch justify-around">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = isActivePath(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none tracking-tight ${isActive ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
