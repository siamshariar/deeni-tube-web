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

Tests live in `e2e/` covering navigation, Shorts player, video detail, responsive layouts, and the YouTube-style UI rules (`e2e/ui.spec.ts`). `e2e/fake-youtube.ts` replaces the YouTube embed with a fake player that speaks the same postMessage protocol (and can end a video), used by `e2e/shorts-playback.spec.ts` (autoplay/mute rules, lost play commands), `e2e/watch-page.spec.ts` (player size, end screen, playlist autoplay, opening a linked short) and `e2e/inline-preview.spec.ts` (inline playback in cards: hover, progress bar geometry and seeking, on-screen autoplay, touch and hold, the Settings switch). The fake starts muted when the embed URL says `mute=1`. The `playwright.config.ts` at project root auto-starts the dev server via `webServer` config with `reuseExistingServer: true`.

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

All videos are YouTube embeds using `<iframe src="https://www.youtube.com/embed/{videoId}?...">`. On the Shorts page, iframes include `enablejsapi=1` and are controlled via the YouTube postMessage protocol (see Shorts page section below). The watch pages (video, playlist) use `components/youtube-player.tsx`: YouTube's privacy-enhanced embed (`www.youtube-nocookie.com`, which leaves out creators' end-screen cards, the video thumbnails the normal embed shows over a video's last seconds; same postMessage API, so the origin checks use that host) with **our own YouTube-style controls**. Shorts still use `www.youtube.com`. YouTube shows its suggestions (the "More videos" pill, share button, title bar) whenever the embed is paused and for a few seconds after playback starts, so: YouTube's controls are off (`controls=0`); a transparent layer over the frame takes every click and hover; and the frame is `CROP` (120px) taller than the box at the top and bottom, which cuts those edge overlays off while the video still fills the 16:9 box exactly. Only while captions are on and the video plays is the frame box-sized, because YouTube draws captions near its bottom edge. Our controls: play/pause, next, volume (+ slider), time, a seekable red progress bar, an Autoplay switch, captions, a speed menu and full screen (on the player element, so the controls stay; iPhone, which can't, gets a fixed full-window player), plus YouTube's keys (space/k, j/l, ←/→, f, m, c). The thumbnail covers the player (`opacity-0`, for the same layout-shift reason as Shorts) until it plays; the handshake starts on mount as well as on load, because the server-rendered frame can load before React hydrates. Playback starts with `playVideo`; if YouTube reports `onAutoplayBlocked` it plays muted with a "Click to unmute" button. At the end our end screen covers YouTube's: "Up next in N" (8s countdown, Cancel, Play now) when Autoplay is on, else Replay and the "Up next" card. The video page's Autoplay switch is saved per device (`'deeni-autoplay'`); the playlist page passes its own (`autoplay`/`onAutoplayChange`) and moves on at once. On the video page "Up next" is the next video in catalogue order (the related list is rotated to start there). Their layout comes from `components/watch-layout.ts` (YouTube's: two columns from 1016px; the 16:9 player's height ≤ `100vh - 216px`, so the title and channel stay above the fold, never under 640px wide; a 402px side column that takes spare width only up to 480px, past which the player grows instead, so there's never empty space at the sides, as long as the player stays ≤ `100vh - 176px` tall; one column below 1016px). `<body>` uses `overflow-x: clip` (not `hidden`, which makes body a scroll container and silently breaks every `position: sticky`), and `app/globals.css` also keeps it that way while Radix menus/dialogs lock scrolling (`html body[data-scroll-locked]` overrides the lock's `overflow: hidden` and scrollbar `margin-right`, which made the related column jump and the page shift; the lock still blocks wheel/touch scrolling). The player box is always exactly `aspect-video` with no max-height, so YouTube never adds black side bars; on the video page it is one element placed with CSS (edge to edge on phones), not a JS phone/desktop switch, so the server HTML already shows it.

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
| `'deeni-voice-lang'` | Voice search language (`en-US` or `bn-BD`), set in the voice search dialog |
| `'deeni-autoplay'` | The watch page player's Autoplay switch (`"false"` when off) |
| `'deeni-feed-playback'` | Settings → "Playback in feeds" (`false` turns off inline playback in cards; `lib/feed-playback.ts`) |

`hooks/useWatchLater.ts`, `hooks/useLikedVideos.ts` (both via `hooks/useSavedList.ts`), `hooks/useWatchHistory.ts` and `hooks/usePlaylists.ts` are built on `lib/local-store.ts` (`createLocalStore` + `useSyncExternalStore`), so every component shares one copy of the data and writes never use stale state. Use these hooks rather than reading/writing these keys directly. The "Watch Later" (`pl-watch-later`) and "Liked Videos" (`pl-liked-videos`) playlists are derived from their stores, not stored separately. Pages refer to the same video by internal id (`"v3"`) or YouTube id; `lib/media-lookup.ts` resolves both, and the hooks store canonical ids. `lib/language-prefs.ts` merges into `deeni-lang-prefs` without changing `isGuest`.

### Shorts page (`app/shorts/page.tsx`)

The most complex file (~1800 lines), entirely `"use client"`. Key mechanics:

- **Opening a short from a link** (`/shorts?v=ID`): the starting index comes from the URL in the first render and the feed scrolls there before paint, so only that short's player loads (no jump from the first short)
- **Scroll container**: `position: fixed` (phones: from the top down to the bottom nav; desktop: below the header) with `overflow-y-scroll overflow-x-hidden touch-pan-y snap-y snap-mandatory`. It only moves up and down: the hidden action rails of the other shorts slide in from the right and must not make it pannable sideways. `AppShell` gives `/shorts` no padding or minimum height, so the page behind the feed never scrolls.
- **Each section**: `h-full` of the feed on phones, `h-[calc(100%-32px)]` on desktop (the next video peeks at the bottom); the video keeps a 9:16 aspect on desktop. Don't size sections with `100vh`: on phones it is taller than the visible screen while the browser bar shows, so shorts stop fitting the screen.
- **Action rail**: from `lg` up, like/comment/share/save/report sit beside the video as `bg-secondary` circles with `text-foreground` icons (readable in light mode); below `lg` they sit over the video, white on a dark backing, and get smaller on short phones (`short-screen:` variant) so they don't run into the top controls
- **Mobile iframe cover**: `.shorts-player-box` is a size container and `.shorts-video-iframe` is `max(100cqw, 100cqh*9/16)` × `max(100cqh, 100cqw*16/9)`, centred, so the 9:16 player covers the box (cropping the overflow) with no black bars at the sides. Most phones are wider than 9:16 once the bottom nav is counted.
- **Players (instant switching, no black screen)**: the active short and its neighbours (`PRELOAD_RANGE`) have a mounted iframe. Neighbours mount 1.5s after the first short starts playing, when the browser is idle (or after 6s). Each iframe's `src` is fixed (`autoplay=0`) and never rewritten; play/pause/seek/mute go through postMessage. The next short is "primed": played muted under its thumbnail, then paused at 0, so its stream is buffered. Each short's thumbnail covers its iframe, and the iframe stays `opacity-0`, until that player reports `playerState === 1`. Keep the opacity: YouTube resizes its `<video>` while loading, which Lighthouse otherwise counts as layout shift for the page (CLS went 0.94 → 0).
- **Autoplay and sound**: browsers allow sound only after a click, tap or key press on the page (wheel scrolling and swipes don't count). Each player is asked for YouTube's `onAutoplayBlocked` event (`addEventListener` command); when it fires for the active short, the short plays muted at once and a "Tap to unmute" pill shows. That automatic mute (`autoMuted`, not the visitor's choice) is undone by their next click or key press anywhere; a tap on the video then unmutes instead of pausing. Don't mute on a timer: slow-loading shorts were treated as blocked and everything after stayed muted.
- **Play watchdog**: after a switch, `startPlayer` checks every second (5 times) that the active player really plays and resends `playVideo` if not (commands can get lost while a player loads or seeks), muting only as a last resort. The UI shows "paused" only for a real pause after the short has played (`activePlayedRef`), not for the passing states while switching.
- **Taps**: a tap within 250ms of a scroll (stopping a swipe) doesn't toggle play/pause; tapping a short that isn't active (the next one peeking in on desktop) scrolls to it.
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

**Inline playback** (YouTube's "Playback in feeds"): `InlinePreview` (`components/inline-preview.tsx`) wraps the thumbnail link of both card variants and of search results, and the video plays in the thumbnail, muted (the nocookie embed with the watch player's `CROP` trick; YouTube's centre play/pause icon still shows for its first seconds, which is accepted). Opening the card then starts the watch page where the preview was (`takePreviewResume`). One player at a time; none while the tab is hidden; Settings → Playback in feeds turns it all off.
- Mouse (youtube.com, measured): starts after resting 300ms on the thumbnail. The volume button is YouTube's plain white icon (a dark circle on hover). The progress bar is a 5px line on the bottom edge; hovering it lifts it 10px with its ends 12px in, darkens the bottom and shows the 12px playhead (16px dragging) and the time; click or drag seeks (`seekTo` without loading during the drag, a full seek on release).
- Touch (YouTube app / m.youtube.com): once scrolling stops, the card nearest the middle of the screen (thumbnail ≥75% visible, ≥240px wide) plays; it stops at <50% visible. Touch and hold a card (250ms, no scroll) plays it, keeps it until the next scroll, and lifting the finger doesn't open the video. The bar is a 3px line flush with the card's bottom edge with the playhead always on it, straddling the edge; drag sideways (or tap) to seek, while vertical swipes still scroll (`touch-pan-y`). No autoplay with data saver on.
- Kept light (Lighthouse mobile): cards render the same on the server and in the browser (mode and setting are read in effects/handlers, not hooks), a mounting card only joins a page-level list, the player is a separate chunk (`components/inline-preview-player.tsx`, loaded with a plain `import()`), and on touch screens nothing plays until the first scroll or touch, or 5s after load (2.5s let Lighthouse catch the player chunk). The wrapper still costs about +60ms TBT on the mobile home page (≈615 → 675ms median of 8 runs; LCP, CLS and desktop unchanged).

`components/video-grid.tsx` renders a list of `VideoItem`s as the standard grid (md+) plus the phone list, with only the first card loading early. Use it for video lists instead of hand-written cards (category, scholar and channel pages already do). The home feed has its own grid: 3 columns with the full sidebar and 4 with the mini sidebar (at xl+; 3/2 on narrower screens).

`components/short-card.tsx` is the one Shorts card (9:16 thumbnail, title, views, menu) used on the channel, scholar, History, Watch Later and Liked pages. On the video page the related list's thumbnails are 46% of the side column (168–236px wide), using the 480px image. Beside the player (from 1016px) that column is sticky under the header (`top-20`), at most the screen's height (`100vh - 104px`), and scrolls on its own with `yt-scrollbar`, so the page itself only scrolls as far as the description. Card and list-row text is the same everywhere: titles 16px medium on desktop / 15px on phones (`text-[15px] md:text-base`), secondary text 14px / 13px; the compact related list and playlist panel use the phone sizes.

### UI conventions (YouTube-like)

- Font: Roboto via `next/font` (`--font-roboto`, Tailwind `font-sans`). Bangla/Arabic/Urdu text falls back to the system font.
- Colours: the tokens in `app/globals.css` use YouTube's neutrals (`muted` = #f2f2f2 / #272727 fills and chips, `accent` = hover, `muted-foreground` = #606060 / #aaa secondary text). YouTube blue (`#065fd4`, dark `#3ea6ff`) is only for the Sign in button, the search focus border and links inside descriptions.
- Three-dot menus: use `MoreButton` (`components/more-button.tsx`): solid dots (`MoreVertIcon`), 20px on phones and 24px from `md` up, in a 40px circle, always visible on cards and rows. Don't use lucide's `MoreVertical` (its dots are too small).
- Hover-only controls, as on YouTube: the compact lists beside the player (video page related list, playlist panel) use `MoreButton size="sm"` (20px dots, 36px circle), shown on row hover or focus or while open. History's remove ✕ is desktop-only and shown on row hover; on phones "Remove from History" is in the ⋮ menu. Always hide with the `can-hover:` variant (`can-hover:opacity-0 can-hover:group-hover:opacity-100`, defined in `tailwind.config.ts`), so touch screens, which can't hover, still show the control.
- Descriptions (videos, shorts, channel/scholar About): render with `DescriptionText` (`components/description-text.tsx`). It keeps line breaks, wraps long links with `overflow-wrap: anywhere` so they never run off the screen, and turns URLs and #hashtags into links. On phones the video and playlist pages open the full description as a bottom sheet (`Drawer`).
- Sizes: page titles 24px bold, card/list titles 16px medium (14–15px on phones), secondary text 12–14px. Avoid text under 12px except the 10px nav labels.
- Sidebar (`components/sidebar-expanded-content.tsx`), as YouTube's guide: entries Roboto 14px/20px (500 for the current page), 24px icons with a 1.5px line (2px for the current page); section headings 16px/22px medium, and "You ›" is a link row to the You page; a footer of 13px medium grey links and a 12px copyright. Popup and panel titles (e.g. "Notifications") are 16px medium, like their section headings.
- Chips: `h-8 px-3 rounded-lg text-sm font-medium`, `bg-muted hover:bg-accent`, selected `bg-foreground text-background`.
- Dropdown menus (`components/ui/dropdown-menu.tsx`) have YouTube-sized rows: 36px+, 20px icons (the item sets the size and gap; don't add `mr-*` to icons), full-width hover.
- Account menu (`components/account-dropdown.tsx`): profile header with "View your account", then grouped rows; Appearance opens as an in-place sub-page with a back arrow (same on phones).
- Notifications panel (`components/notification-dropdown.tsx`): the list area has a fixed height from the first frame and the loading placeholders fill it, so the panel opens at full size instead of growing after loading.
- Scrollable sidebars, popups and panels use `yt-scrollbar` (`app/globals.css`): thin, no arrows, transparent track, grey thumb while hovered.
- Save dialog (`components/add-to-playlist-dialog.tsx`), as on YouTube: "Save video to...", a checkbox per playlist (tick saves, untick removes, the dialog stays open; Liked videos isn't listed), then "Create new playlist". Playlist forms use `PlaylistNameField` and `PrivacySelect` (`components/playlist-fields.tsx`), not a native `<select>`. Other selects (e.g. the You page's default language) use the same file's `OptionSelect`: an outlined field with a small label and chevron, opening a menu with an optional icon and second line per choice and a check mark.
- Voice search (`components/voice-search.tsx`): the mic in the desktop header and in the phone search screen opens a listening dialog (browser Web Speech API, English or Bangla) and searches what was said. Its z-index is above the phone search screen (z-60).
- Dialog widths: the `max-width: 100vw` guard on `[class*="fixed"]`/`[class*="absolute"]` in `app/globals.css` lives in `@layer base` so `max-w-*` utilities win. Unlayered, it made every dialog full-width on desktop.

### Route patterns

- `/` — home feed
- `/videos/[slug]/[id]` — video detail (no desktop sidebar, full-width player). The address is `/videos/<title in Latin letters>/<YouTube id>`, e.g. `/videos/islamic-halaka-shesh-jamanar-fitna-prof-dr-mohammad-monzur-e/XVscS6piz9A`: readable and clean to share (no `%20` or `%E0%A6…`). Always build links with `videoPath(video)` / `videoPathForId(id)` from `lib/video-url.ts` (the slug comes from `slugify` in `lib/slug.ts`, which writes Bangla in Latin letters). Only the id finds the video; the layout permanently redirects any other slug or the internal id (`/videos/x/v2`, old channel-name links) to the readable address, and sets it as the canonical URL
- `/playlists/[slug]/[id]` — playlist detail (no desktop sidebar)
- `/shorts` — vertical shorts feed (fullscreen, header auto-hides)
- `/channels/[slug]`, `/scholars/[slug]`, `/categories/[slug]` — entity detail pages. Both scholar routes render `app/scholars/[slug]/scholar-view.tsx`, which shows the profile or the About page from the URL; the About tab switches with `window.history.pushState` (Next.js syncs it with `usePathname`), so the About page opens instantly with no request, even in dev
- `/signin` — auth page (no desktop sidebar)
- `/you`, `/history`, `/liked-videos`, `/watch-later` — account/activity pages
- `/more`, `/settings`, `/help` — utility pages (each has sub-pages under the same prefix)
- `/donate`, `/search`, `/playlists` — standalone pages

### Page titles and 404s

Pages are client components, so they can't export `metadata`. Each route has a small server `layout.tsx` that sets the title (the root layout adds the `"%s - Deeni.tube"` template). The `[slug]`/`[id]` layouts for channels, scholars, categories and videos also call `notFound()` for unknown ids, which renders `app/not-found.tsx`. Unknown ids return a real 404. These layouts also export `generateStaticParams`, so every video, scholar (and About), channel and category page is pre-rendered at build time: `<Link>`s prefetch them in full and clicks open them without a server round trip (other URLs, such as `/videos/x/v2`, still render on demand). Don't add an `app/loading.tsx` (or a `loading.tsx` above these layouts): it starts streaming before the check, which turns the 404 into a 200. `/search` and `/shorts` wrap their content in `<Suspense>` because they call `useSearchParams()`. The favicon is `app/icon.png` (cropped from the logo).

### Image loading (measured with Lighthouse, mobile + desktop)

- Load **only one** image per page early: the main (LCP) image, via `imagePriorityProps(...)` / `priorityForIndex(index)` from `lib/image-priority.ts`. Loading several images early made LCP worse on mobile: they compete for bandwidth, and pages that render a hidden desktop/mobile copy of a list download the hidden copy's eager images too.
- Default is `preload` + high priority (React starts the download during render, which helped the heavy client-rendered lists). Watch Later and Liked measured better with `{ preload: false }` (eager + high priority). Don't add early loading to the video page's related list; it measured no better. On the watch pages the main image is the player's thumbnail (preloaded). Video and short cards call `warmYouTube()` (`lib/warm-youtube.ts`) on hover/touch to preconnect to YouTube before the click. On Shorts only the first short's thumbnail loads early (it is the main image until the player starts; mobile LCP 2.6s → 2.3s).
- `youtubeThumb(id, "small")` (320 px) is only for images up to ~170 CSS px wide where the page has no hidden duplicate using the larger size; otherwise use the default 480 px version so both copies share one download.
- The header logo uses `public/logo-header*.webp` (sized for the header); the original PNGs are kept for other uses.
