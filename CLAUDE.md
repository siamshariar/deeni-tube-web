# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint (must pass with 0 problems)
npm run start    # serve production build
```

**E2E tests** use Playwright:
```bash
npx playwright install chromium   # first time only
npx playwright test               # run all tests (starts dev server automatically)
npx playwright test e2e/navigation.spec.ts --project=chromium  # single file
```

Tests live in `e2e/` covering navigation, Shorts player, video detail, responsive layouts, and the YouTube-style UI rules (`e2e/ui.spec.ts`). The `playwright.config.ts` at project root auto-starts the dev server via `webServer` config with `reuseExistingServer: true`.

TypeScript build errors are suppressed (`typescript.ignoreBuildErrors: true` in `next.config.mjs`), so run `npx tsc --noEmit` to type-check (it should report 0 errors). `npm run lint` runs ESLint 9 with `eslint-config-next` (flat config in `eslint.config.mjs`; Next 16 removed `next lint`) and should pass with 0 problems. Generated shadcn code in `components/ui/` is excluded. The few `eslint-disable` comments each say why: mostly effects that read localStorage or the URL after hydration.

## Stack

- **Next.js 16** (App Router, Turbopack for `dev` and `build`), **React 19**, **TypeScript**, **Tailwind CSS v3**
- Server `layout.tsx` files must `await params` (Next 16 removed synchronous access); client pages use `useParams()`/`useSearchParams()`
- `next/image`: use the `preload` prop (`priority` is deprecated in Next 16)
- **shadcn/ui** (Radix UI primitives) — components live in `components/ui/`
- **lucide-react** for icons, **next-themes** for dark/light mode, **sonner** for toasts
- No backend, no API routes, no database — all data is static mock data

## Architecture

### Layout shell

`app/layout.tsx` composes the full shell in this order:

```
HeaderProvider
  AppHeader          (fixed top, 56px, z-40)
  DesktopSidebar     (fixed left, 240px/72px, z-30, hidden on video/playlist/signin pages)
  AppShell           (<main> that offsets left-padding to match sidebar width)
    {children}
  MobileNav          (fixed bottom bar, mobile only, hidden on detail/fullscreen pages)
```

**AppShell** (`components/app-shell.tsx`) dynamically sets `md:pl-[240px]` or `md:pl-[72px]` on `<main>` by reading sidebar width from `window.__sidebarGetState`. The desktop sidebar and AppShell both listen to the custom `"sidebar-state-change"` window event to stay in sync.

### Sidebar communication (global window pattern)

The desktop sidebar exposes two globals set in a `useEffect`:

- `window.__sidebarToggle()` — toggles collapsed state; called only by the hamburger in `AppHeader`
- `window.__sidebarGetState()` — returns current `isCollapsed` boolean

Sidebar state is persisted to `localStorage` key `'sidebar-collapsed'`. The sidebar reads this on mount to restore state across navigations. The header hamburger button toggles the desktop sidebar on pages that have one. On `/videos/*` and `/playlists/*`, `DesktopSidebar` switches to overlay mode, so the hamburger slides the sidebar in over the content. `/signin` has no global header, sidebar or bottom nav. A script in `app/layout.tsx` applies the saved collapsed state before first paint (see the "Sidebar first paint" block in `app/globals.css`).

### Data layer

All data is static TypeScript arrays in `lib/`:

| File | Contents |
|---|---|
| `lib/video-data.ts` | `VideoItem[]` — main feed videos with YouTube video IDs |
| `lib/shorts-data.ts` | Shorts feed data |
| `lib/mock-data.ts` | Channels and scholars for listing pages |
| `lib/channel-data.ts` | Sidebar channel list |
| `lib/scholar-data.ts` | Sidebar scholar list |
| `lib/playlist-data.ts` | Static playlist definitions |

All videos are YouTube embeds using `<iframe src="https://www.youtube.com/embed/{videoId}?...">`. On the Shorts page, iframes include `enablejsapi=1` and are controlled via the YouTube postMessage protocol (see Shorts page section below). On all other pages, `isPlaying` state is UI-only and does not control the iframe.

### User state via localStorage

All user-generated state is persisted directly to `localStorage`:

| Key | Contents |
|---|---|
| `'sidebar-collapsed'` | Desktop sidebar state |
| `'deeni-lang-prefs'` | Auth/guest status (`{ isGuest: boolean }`) |
| `'recentSearches'` | Search history array |
| `'deeni-watch-later'` | Watch Later items (seeded with demo items on first visit) |
| `'deeni-liked-videos'` | Liked videos and shorts (seeded on first visit) |
| `'deeni-watch-history'` | Watch history, recorded by the video page, playlist player and Shorts (seeded from `lib/history-data.ts`) |
| `'deeni-playlists'` | All library playlists (seeded from `extendedPlaylists` on first visit; `videoIds` use internal ids like `"v3"`) |
| `'deeni-notification-prefs'` | Settings page notification toggles |
| `'feed-visible-channels'` | Channels shown in the home feed (`hooks/useFeedPreferences.ts`; "Don't recommend channel" removes one) |

`hooks/useWatchLater.ts`, `hooks/useLikedVideos.ts` (both via `hooks/useSavedList.ts`), `hooks/useWatchHistory.ts` and `hooks/usePlaylists.ts` are built on `lib/local-store.ts` (`createLocalStore` + `useSyncExternalStore`), so every component shares one copy of the data and writes never use stale state. Use these hooks rather than reading/writing these keys directly. The "Watch Later" (`pl-watch-later`) and "Liked Videos" (`pl-liked-videos`) playlists are derived from their stores, not stored separately. Pages refer to the same video by internal id (`"v3"`) or YouTube id; `lib/media-lookup.ts` resolves both, and the hooks store canonical ids. `lib/language-prefs.ts` merges into `deeni-lang-prefs` without changing `isGuest`.

### Shorts page (`app/shorts/page.tsx`)

The most complex file (~1800 lines), entirely `"use client"`. Key mechanics:

- **Scroll container**: `position: fixed; inset: 0; top: 56px` with `overflow-y-scroll snap-y snap-mandatory`
- **Each section**: `h-[calc(100vh-56px)]` on mobile (full screen), `h-[calc(100vh-88px)]` on desktop (the next video peeks at the bottom); the video keeps a 9:16 aspect on desktop
- **Action rail**: from `lg` up, like/comment/share/save/report sit beside the video as `bg-secondary` circles with `text-foreground` icons (readable in light mode); below `lg` they sit over the video, white on a dark backing
- **Mobile iframe cover**: CSS class `.shorts-video-iframe` uses `position: absolute; height: 100%; aspect-ratio: 9/16; min-width: 100%; transform: translate(-50%, -50%)` to cover any portrait container without letterboxing
- **Players (instant switching, no black screen)**: the active short and its neighbours (`PRELOAD_RANGE`) have a mounted iframe. Neighbours mount 1.5s after the first short starts playing, when the browser is idle (or after 6s). Each iframe's `src` is fixed (`autoplay=0`) and never rewritten; play/pause/seek/mute go through postMessage. The next short is "primed": played muted under its thumbnail, then paused at 0, so its stream is buffered. Each short's thumbnail covers its iframe, and the iframe stays `opacity-0`, until that player reports `playerState === 1`. Keep the opacity: YouTube resizes its `<video>` while loading, which Lighthouse otherwise counts as layout shift for the page (CLS went 0.94 → 0).
- **Autoplay**: if the browser blocks playback with sound (no interaction yet), the short starts muted after 1.5s and the mute button shows "Unmute", as on YouTube.
- **Scroll detection**: `scrollend` event (Chrome/Firefox) with a 250ms debounced fallback; arrow keys and the up/down buttons switch immediately
- **Controls visibility**: gated on `isActive && !isScrolling` for the current video; `(isHovered || isActive) && !isScrolling` for top controls
- **YouTube postMessage protocol**: iframes use `enablejsapi=1`. After an iframe loads, `{ event: 'listening', id }` is sent repeatedly until the player answers. Incoming messages are matched to the iframe that sent them (`e.source`), so only the active player drives the progress bar and play state. YouTube sends periodic `infoDelivery` messages (`currentTime`, `duration`, `playerState`). Commands are `{ event: 'command', func, args }` (`playVideo`, `pauseVideo`, `seekTo`, `mute`, …). All postMessage calls target `'https://www.youtube.com'`.
- **Progress bar**: `absolute bottom-0` inside the video container, 3px tall, red fill. `videoCurrentTime`/`videoDuration` state is reset to 0 on every video switch. `videoDurationRef` (a ref mirroring `videoDuration`) is used inside mouse/touch drag closures to avoid stale state captures. Drag-to-seek wires `mousemove`/`mouseup` on `window` and `touchmove` on the bar element.

### Contexts

`app/contexts/header-context.tsx` provides `{ headerVisible, setHeaderVisible }` — used by the Shorts page to auto-hide the header and by `AppHeader`/`DesktopSidebar` to slide up/down.

### Theming

CSS custom properties defined in `app/globals.css` for all colour tokens (`--background`, `--foreground`, `--primary`, etc.), using a YouTube-like neutral palette (see "UI conventions"). Tailwind uses these via `hsl(var(--...))` mappings in `tailwind.config.ts`. Dark mode is toggled via the `class` strategy (`next-themes`).

### Header clearance rules

The `AppHeader` is `fixed top-0 h-14 z-40` (56px). Every page must push its content below the header. There are two patterns:

**Standard pages** — add `mt-14 md:mt-16` to the outermost content wrapper. This applies to all pages except video/playlist detail.

**Video & playlist detail pages** (`/videos/*`, `/playlists/*`) — these have a `sticky` back button bar that must stack on top of the content below the header:
- Add `pt-14` to the outermost `<div>` wrapper (not `mt-14`)
- The sticky back button uses `sticky top-14 z-10` (same 56px)
- The mobile video element directly below the back button must have **no** extra top padding — `pt-14` on the wrapper already handles clearance
- Desktop inner content divs must have no `pt-*` top padding (it stacks naturally)

The math: header occupies 0–56px. With `pt-14`, content starts at 56px. The `sticky top-14` back button sticks at exactly 56px, immediately below the header. The video below the back button starts at 56px + back-button height (~40px) = 96px, with no gap.

### VideoCard and VideoGrid

`components/video-card.tsx` follows YouTube's card: rounded thumbnail, 36px channel avatar, 16px title (2 lines), 14px channel and views lines, no card border or shadow. Two render paths, gated on `isHorizontal`:
- `isHorizontal={false}` (default): grid card.
- `isHorizontal={true}`: phone list item, with an edge-to-edge thumbnail and "channel · views · time" on one line.

`components/video-grid.tsx` renders a list of `VideoItem`s as the standard grid (md+) plus the phone list, with only the first card loading early. Use it for video lists instead of hand-written cards (category, scholar and channel pages already do). The home feed has its own grid: 3 columns with the full sidebar and 4 with the mini sidebar (at xl+; 3/2 on narrower screens).

`components/short-card.tsx` is the one Shorts card (9:16 thumbnail, title, views, menu) used on the channel, scholar, History, Watch Later and Liked pages. Card and list-row text is the same everywhere: titles 16px medium on desktop / 15px on phones (`text-[15px] md:text-base`), secondary text 14px / 13px; the compact related list and playlist panel use the phone sizes.

### UI conventions (YouTube-like)

- Font: Roboto via `next/font` (`--font-roboto`, Tailwind `font-sans`). Bangla/Arabic/Urdu text falls back to the system font.
- Colours: the tokens in `app/globals.css` use YouTube's neutrals (`muted` = #f2f2f2 / #272727 fills and chips, `accent` = hover, `muted-foreground` = #606060 / #aaa secondary text). YouTube blue (`#065fd4`, dark `#3ea6ff`) is only for the Sign in button and the search focus border.
- Three-dot menus: use `MoreButton` (`components/more-button.tsx`): solid dots (`MoreVertIcon`), 20px on phones and 24px from `md` up, in a 40px circle. Always visible, never hover-only (phones have no hover); the same goes for row buttons like History's remove ✕. Don't use lucide's `MoreVertical` (its dots are too small).
- Sizes: page titles 24px bold, card/list titles 16px medium (14–15px on phones), secondary text 12–14px. Avoid text under 12px except the 10px nav labels.
- Chips: `h-8 px-3 rounded-lg text-sm font-medium`, `bg-muted hover:bg-accent`, selected `bg-foreground text-background`.
- Dropdown menus (`components/ui/dropdown-menu.tsx`) have YouTube-sized rows: 36px+, 20px icons (the item sets the size and gap; don't add `mr-*` to icons), full-width hover.
- Account menu (`components/account-dropdown.tsx`): profile header with "View your account", then grouped rows; Appearance opens as an in-place sub-page with a back arrow (same on phones).
- Notifications panel (`components/notification-dropdown.tsx`): the list area has a fixed height from the first frame and the loading placeholders fill it, so the panel opens at full size instead of growing after loading.

### Route patterns

- `/` — home feed
- `/videos/[slug]/[id]` — video detail (no desktop sidebar, full-width player)
- `/playlists/[slug]/[id]` — playlist detail (no desktop sidebar)
- `/shorts` — vertical shorts feed (fullscreen, header auto-hides)
- `/channels/[slug]`, `/scholars/[slug]`, `/categories/[slug]` — entity detail pages
- `/signin` — auth page (no desktop sidebar)
- `/you`, `/history`, `/liked-videos`, `/watch-later` — account/activity pages
- `/more`, `/settings`, `/help` — utility pages (each has sub-pages under the same prefix)
- `/donate`, `/search`, `/playlists` — standalone pages

### Page titles and 404s

Pages are client components, so they can't export `metadata`. Each route has a small server `layout.tsx` that sets the title (the root layout adds the `"%s - Deeni.tube"` template). The `[slug]`/`[id]` layouts for channels, scholars, categories and videos also call `notFound()` for unknown ids, which renders `app/not-found.tsx`. Unknown ids return a real 404. Don't add an `app/loading.tsx` (or a `loading.tsx` above these layouts): it starts streaming before the check, which turns the 404 into a 200. `/search` and `/shorts` wrap their content in `<Suspense>` because they call `useSearchParams()`. The favicon is `app/icon.png` (cropped from the logo).

### Image loading (measured with Lighthouse, mobile + desktop)

- Load **only one** image per page early: the main (LCP) image, via `imagePriorityProps(...)` / `priorityForIndex(index)` from `lib/image-priority.ts`. Loading several images early made LCP worse on mobile: they compete for bandwidth, and pages that render a hidden desktop/mobile copy of a list download the hidden copy's eager images too.
- Default is `preload` + high priority (React starts the download during render, which helped the heavy client-rendered lists). Watch Later and Liked measured better with `{ preload: false }` (eager + high priority). Don't add early loading to the video page's related list; it measured no better. On Shorts only the first short's thumbnail loads early (it is the main image until the player starts; mobile LCP 2.6s → 2.3s).
- `youtubeThumb(id, "small")` (320 px) is only for images up to ~170 CSS px wide where the page has no hidden duplicate using the larger size; otherwise use the default 480 px version so both copies share one download.
- The header logo uses `public/logo-header*.webp` (sized for the header); the original PNGs are kept for other uses.
