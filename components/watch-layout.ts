// components/watch-layout.ts
// Column classes for the watch pages (video and playlist player), following YouTube's watch layout:
// - from 1016px wide: two columns, a 16:9 player and a side column (related videos / playlist).
//   The player's height is at most 100vh - 216px (as on YouTube: header, top margin and room for the title
//   and channel below it without scrolling), never under 640px wide. The side column is 402px (can shrink to
//   300px); when that height limit leaves spare width, the side column takes it, but only up to 480px: past
//   that the player gets wider instead (its min-width is the rest of the row), so there's never empty space
//   at the sides, as long as the title and channel still fit on screen (height up to 100vh - 176px; on very
//   big screens the side column then takes up to 520px). (Flexbox: the player's huge grow factor gives it
//   the free width first.)
// - below that: one column, the side column under the player, both at the player's width.
// The player box itself is always exactly 16:9 (`aspect-video`, no max-height), so YouTube never adds black
// bars at the sides.
// (Kept in components/ because Tailwind only scans app/ and components/ for class names.)

const PLAYER_MAX = "md:max-w-[max(640px,calc((100vh-216px)*16/9))]";

export const WATCH_COLUMNS = "mx-auto flex flex-col gap-6 min-[1016px]:flex-row min-[1016px]:justify-center";
export const WATCH_PRIMARY = `w-full min-w-0 md:mx-auto ${PLAYER_MAX} min-[1016px]:mx-0 min-[1016px]:w-auto min-[1016px]:flex-[1000000_1_0%] min-[1016px]:min-w-[max(640px,min(calc(100%-504px),calc((100vh-176px)*16/9)))]`;
export const WATCH_SECONDARY = `w-full md:mx-auto ${PLAYER_MAX} min-[1016px]:mx-0 min-[1016px]:w-auto min-[1016px]:flex-[1_1_402px] min-[1016px]:min-w-[300px] min-[1016px]:max-w-[520px]`;
