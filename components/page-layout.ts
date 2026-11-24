// components/page-layout.ts
// The spaces and headings every page shares, so no screen has sizes of its own.
// (Kept in components/ because Tailwind only scans app/ and components/ for class names.)

/** A page under the fixed header (16px, or 24px from md up, under it): 12px at the sides on phones, 24px from md up.
 *  Padding, not a margin: a margin collapses through the page and moves the whole body when the page appears */
export const PAGE = "px-3 pb-4 pt-[72px] md:px-6 md:pb-6 md:pt-[88px]";
/** The same without its own top offset: pages that start with the phone's back bar (components/page-bar) */
export const PAGE_UNDER_BAR = "px-3 py-4 md:px-6 md:py-6";
/** Text pages (Settings, You, Help…) */
export const PAGE_NARROW = "mx-auto w-full max-w-3xl";

export const PAGE_TITLE = "text-2xl font-bold leading-8";
export const PAGE_SUBTITLE = "mt-1 text-sm leading-5 text-muted-foreground";
/** A section of a list page (Today, Videos, Recent videos) */
export const SECTION_TITLE = "text-lg font-bold leading-7 md:text-xl";
/** The heading of a box */
export const BOX_TITLE = "text-base font-medium leading-6";
export const BOX = "rounded-xl border bg-card";

/** A row of chips (filters): 8px apart, swiped sideways when they don't fit */
export const CHIP_ROW = "flex items-center gap-2 overflow-x-auto scrollbar-none";
/** A chip: 32px high, 14px medium (YouTube's) */
export const CHIP =
  "inline-flex h-8 flex-shrink-0 select-none items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const CHIP_ON = "bg-foreground text-background";
export const CHIP_OFF = "bg-muted text-foreground can-hover:hover:bg-accent active:bg-accent";

/** A row's or card's text: 15px title and 13px details on phones, 16px and 14px from md up */
export const ROW_TITLE = "line-clamp-2 text-[15px] font-medium leading-5 [overflow-wrap:anywhere] md:text-base md:leading-[22px]";
export const ROW_DETAILS = "text-[13px] leading-[18px] text-muted-foreground md:text-sm md:leading-5";
/** Rows with YouTube's large thumbnail (Search, History): the same on phones, 18px regular and 12px from md up */
export const BIG_ROW_TITLE =
  "line-clamp-2 text-[15px] font-medium leading-5 text-foreground [overflow-wrap:anywhere] md:text-lg md:font-normal md:leading-[26px]";
export const BIG_ROW_DETAILS = "text-[13px] leading-[18px] text-muted-foreground md:text-xs";

/** The thumbnail of a list's row on phones: 160px, smaller on phones under 400px, where it left the title a few letters a line */
export const ROW_THUMB = "w-[clamp(112px,calc(50vw-40px),160px)] flex-shrink-0";
