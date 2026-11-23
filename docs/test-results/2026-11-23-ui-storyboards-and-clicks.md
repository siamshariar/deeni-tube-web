# Test results: storyboards and click leftovers (23 November 2026)

What changed: YouTube's storyboards on the progress bars (watch page and playing cards), the watch page's progress
bar sized like YouTube's, and nothing left behind after a click (focus borders, the related list's 3-dot button,
menus that stayed open under their dialog, grey buttons after a tap on phones, the player's speed menu cut off on phones).

| Check | Result |
|---|---|
| `npx playwright test` (Chromium desktop and Pixel 7, plus WebKit iPhone 13) | 242 passed, 51 skipped (tests for the other device type), 1 failed, see below |
| `e2e/ui.spec.ts` "shorts description wraps…", after fixing the test | 20 of 20 passed (10 desktop, 10 phone) |
| All Shorts tests again (`ui`, `shorts`, `shorts-playback`) | 23 passed, 1 skipped |
| New tests: `e2e/storyboard.spec.ts`, `e2e/click-ui.spec.ts` | all passed |
| `npm run lint`, `npx tsc --noEmit` | 0 problems |
| `npm run build` | succeeded; the storyboard data is its own 4.4 KB (gzip) chunk, in no page's first load |

**The failed test** clicked the Shorts menu before the page was ready (hydrated), when a click does nothing. The same
click does nothing on the code before this change (`c6fca13`) too, 8 of 8 times with YouTube blocked, so it is the
test's timing and not a regression. The test now waits for the menu to open.

**Measured against youtube.com** (Playwright, 1440×900, full screen and a narrow window; m.youtube.com on a phone):

| | YouTube | Deeni.tube |
|---|---|---|
| Watch page bar: line at rest / under the pointer | 4 / 6 px | 4 / 6 px |
| Playhead at rest / under the pointer | 12 / 20 px | 12 / 20 px |
| Bar to the bottom of the player, to its sides | 56 px, 12 px | 56 px, 12 px |
| Storyboard box; gap to the line | 242×138; 59 px | 242×137; 59 px |
| Time pill | 63×31 px | 63×31 px |
| Card: storyboard box; above the bottom edge | 163×94; 56 px | 164×94; 56 px |
| Dragging, mouse / finger | dimmed frame and box / full frame and time | the same |

**Not tested:** a real iPhone or iPad (WebKit with an iPhone profile only).
