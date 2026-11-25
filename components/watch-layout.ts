// components/watch-layout.ts
// Column classes for the watch pages (video and playlist player), following YouTube's watch layout (measured again
// on Nov 23, 2026): 16px at the sides and between the columns, 12px under the header.
// - from 1016px wide: two columns, a 16:9 player and a side column (related videos / playlist). The side column is
//   27.5% of the window, 320–700px; the player takes the rest. In a low window the player's height stops at
//   100vh - 176px, so the title and channel stay on screen without scrolling (YouTube's goes on to 100vh - 116px);
//   the side column then takes the spare width, up to 35% of the window (700px at most). The player is never under
//   640px wide. (Flexbox: the player's huge grow factor gives it the free width first.)
// - below that: one column, the side column under the player, both at the player's width.
// The player box itself is always exactly 16:9 (`aspect-video`, no max-height), so YouTube never adds black
// bars at the sides.
// Theater mode: `.watch-*` in app/globals.css (the page itself is `watch-page`).
// (Kept in components/ because Tailwind only scans app/ and components/ for class names.)

// In a very low window, and on phones held sideways (`low`), it is never taller than what's left under the header
// either, so the whole player shows, its bar included.
const PLAYER_MAX = "md:max-w-[max(640px,calc((100vh-176px)*16/9))] md:low:!max-w-[min(max(640px,calc((100vh-176px)*16/9)),max(356px,calc((100svh-80px)*16/9)))]";

/** The page's own space around the columns */
export const WATCH_PAGE = "watch-top px-3 md:px-4 md:pt-3";
export const WATCH_COLUMNS = "mx-auto flex flex-col gap-6 min-[1016px]:flex-row min-[1016px]:justify-center min-[1016px]:gap-4";
export const WATCH_PRIMARY = `w-full min-w-0 md:mx-auto ${PLAYER_MAX} min-[1016px]:mx-0 min-[1016px]:w-auto min-[1016px]:flex-[1000000_1_0%] min-[1016px]:min-w-[640px] low:!min-w-0`;
export const WATCH_SECONDARY = `watch-side w-full md:mx-auto ${PLAYER_MAX} min-[1016px]:mx-0 min-[1016px]:w-auto min-[1016px]:flex-[1_1_clamp(320px,27.5vw,700px)] min-[1016px]:min-w-[300px] min-[1016px]:max-w-[clamp(320px,35vw,700px)] min-[1016px]:low:!max-w-[clamp(320px,35vw,700px)]`;
/** Around the player box: edge to edge on phones, black at its sides when it is held sideways (the page's own columns
 *  from md up) */
export const PLAYER_FRAME = "watch-frame -mx-3 bg-black md:mx-0 md:bg-transparent";
export const PLAYER_BOX = "watch-box relative mx-auto aspect-video w-full bg-black low:max-w-[calc((100svh-104px)*16/9)] md:max-w-none md:overflow-hidden md:rounded-xl";
/** A related video's thumbnail: 62.5% of YouTube's side column (also where ours is wider, in a low window) */
export const RELATED_THUMB = "min-[1016px]:w-[calc(0.625*clamp(320px,27.5vw,700px))]";
