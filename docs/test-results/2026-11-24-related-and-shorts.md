# Test results: related videos and stuck shorts (23–24 November 2026)

What changed: the video page's related videos in YouTube's current layout (chips above them, sizes, hover colour, a
thumbnail that moves on hover without playing); shorts that never stay stuck on their picture; one short replaced.

| Check | Result |
|---|---|
| `npx playwright test` on the production build (Chromium desktop and Pixel 5, WebKit iPhone 13) | 295 passed, 79 skipped (tests for the other device type), 0 failed (*) |
| New tests: `e2e/related.spec.ts`, `e2e/shorts-recovery.spec.ts`, two in `e2e/ios-playback.spec.ts` | all passed |
| `npm run lint`, `npx tsc --noEmit` | 0 problems |
| `npm run build` | succeeded |

(*) The full run gave 294 passed and 1 failed: a new phone test measured the chips before the phone layout had appeared.
The test now waits for it; then its file passed three times in a row, and those changed since once more. A first full
run also found a real mistake, fixed: the related column was 12px too tall, so the end of the page pushed it up.

## Shorts: "stuck and doesn't play" at /shorts?v=goHfO28fE-A

**Not reproduced here.** Real YouTube, real Chrome (desktop and Android profile) and WebKit (iPhone profile), local and
deployed site: about 90 switches between shorts, 18 at the exact moment the short was being preloaded, opened from a link,
from History, and on slow 4G and 3G: it always played. Its availability, formats and flags are the same as the others'
(no ads, embeddable everywhere). What was found instead:

| Cause | Before | Now |
|---|---|---|
| Its stream stalls, or the player never answers (simulated) | its picture stayed for good, with no sign | spinner from 1s, its player loaded again at 10s, after 15s more "This short isn't playing" with Try again / Next short |
| YouTube says it can't be played (simulated) | its picture stayed for good | "This short isn't available", Next short |
| iPhone, iPad, Safari: the end of any short (real YouTube) | froze on its last frame | loops (26.4s → 0.7s) |

YouTube itself sometimes takes 5–7s to start a short (seen 4 times, different shorts): then the spinner shows.
Because the cause on the visitor's device is not known, the short was also replaced by `Pr5qe5nQfWc` (same scholar,
27s; started in 1.5–1.6s three times in a row); old links to `goHfO28fE-A` open it.

With real YouTube on the new code: 67 starts on desktop, Android and iPhone profiles, all played; a stream stalled for
16s played by itself after the reload. Start on slow 3G / slow 4G (median of 2): 10.2 / 6.2 s, deployed site before: 9.3 / 5.5 s
(another short; the same one on the new build: 9.9 / 6.6 s): the difference is within the spread between runs (5.3–7.9 s).

## Related videos, measured against YouTube

| Window | Player | Column | Thumbnail | Title | |
|---|---|---|---|---|---|
| 1016×700 | 648×364.5 | 320 | 200×112.5 | 14/20 px, 2 lines | same on both |
| 1280×720 | 880×495 | 352 | 220×123.8 | 14/20 px, 3 lines | same on both |
| 1366×768 | 942.4×530.1 | 375.6 | 234.8×132 | 14/20 px, 3 lines | same on both |
| 1440×900 | 996×560.3 | 396 | 247.5×139.2 | 14/20 px, 3 lines | same on both |
| 1920×1080 | 1344×756 | 528 | 330×185.6 | 14/20 px, 3 lines | same on both |
| 2560×1440 | 1812×1019.3 | 700 | 437.5×246.1 | 14/20 px | same on both |
| 900×900 (list under the player) | | 2 × 426 | 426×239.6 | 14/20 px | same cards; YouTube's player there is edge to edge |

Rows 8px apart, 12px between thumbnail and text, 12/18 px lines, hover colour 6px out with 8px corners (13% light, 17% dark):
the same. Chips 32px high, 8px apart, 14/20 px medium, 8px corners, 12px padding, 8px to the list, faded side 51–77px: from
YouTube's style sheet and its search page (signed-out YouTube shows no chips on the watch page).

**Where it differs on purpose.** In a low window the player stops at `100vh - 176px` (YouTube's at `100vh - 116px`), so the
channel stays on screen, as asked earlier; thumbnails keep YouTube's size there. The moving thumbnail uses the video's
storyboard frames (one every 400ms), not YouTube's 8-per-second `an_webp` picture: its signed link is made anew about every
hour and can't be kept in a static site. It starts about 0.4s after the hover (YouTube's 0.2s). The three dots stay 20px.
Phones keep the small rows, with the chips.

Layout shift (production build, before → now): watch page desktop 0.112 → 0.001, phone 0 → 0; Shorts 0.001 and 0.
The playlist page on desktop has 0.62–0.65 both before and now (not part of this change).

**Not tested:** a real iPhone, iPad or Android phone; signed-in YouTube.
