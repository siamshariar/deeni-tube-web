# Test results: Home's chips go back to "All" (24 November 2026)

With a category chosen on Home, pressing the logo, pressing Home (sidebar, bottom bar) or reloading the page shows "All"
again, from the top.

| Case (category chosen, page scrolled) | Before | Now |
|---|---|---|
| Logo | the category stayed, no scroll | All, top, chip row at its start |
| Home in the sidebar / bottom bar, also with the header hidden | not measured (the same link to "/") | the same |
| Reload (scrolled 300px / 2500px), Chromium desktop | All, but at 300 / 673px | All, top |
| Reload, Chromium Pixel 5 | All, but at 300 / 324px | All, top |
| Reload, WebKit iPhone 13 | All, but at 300 / 382px | All, top |
| Reload, WebKit desktop | All, but at 300 / 673px | All, top |
| Logo opened in a new tab (Ctrl+click) | - | this tab stays as it is |
| Turning the wheel while a reload is still loading | - | the visitor's scrolling is kept |
| Back from a video, desktop (Chromium, WebKit) | at its place (600px) | at its place (600px) |

On youtube.com a reload starts at the top too (channel and search pages, desktop and phone search, scrolled 1500px first).
Its Home shows no chips to a signed-out visitor, so the logo could not be compared there.

The related videos' chips and History's go back to "All" on a reload as before (checked in Chromium and WebKit).

Known, not changed (the same without the new script): on phones, Back from a video lands higher than it was (600px → 314px
in Chromium, 351px in WebKit), because the loading placeholders are shorter than the feed. Back also shows "All", not the
category chosen before.

Checks: `e2e/home-chips.spec.ts`: 9 passed, 3 skipped (mouse or desktop only) on the dev server and the production build.
Full run on the production build: 304 passed, 82 skipped (tests for the other device type), 0 failed. Lint and tsc: 0
problems; the build succeeded. Not tested on a real phone.

## A short removed: "Seek The Forgiveness of Allah #muftimenk" (0m1Mc6dX8XY)

Gone from the Shorts feed (16 left), from Mufti Menk's channel and scholar pages, and from History, Liked and Watch later
saved earlier in a visitor's browser; its old link opens the first short. Test: "a removed short is gone…" in
`e2e/shorts-recovery.spec.ts` (Chromium desktop and Pixel 5: passed).

## Shorts: arrow keys pressed while the feed still slides (found by the full run)

A full run failed once: in WebKit a key pressed during the slide ended it halfway, and the page jumped back a short (1 of 8
and 1 of 16 repeats; that code is unchanged since the last commit; Chromium not checked). Fixed; the new test "arrow keys pressed while
the feed still slides…" in `e2e/ios-playback.spec.ts` failed on the build before the fix (1 of 2) and passes on the one after
it (13 of 13), and the test that had failed passes 34 of 34 (10 of them as it is in the suite, 24 in a copy that logged events).

Full run on the final build: 306 passed, 83 skipped, 1 failed: `e2e/messages.spec.ts` "Watch later: saved says so…", where a Home
card's menu closed before the click. Not reproduced: 85 of 85 repeats passed (60 of them with ten at a time, load average
23); its cause wasn't found. The menus, messages and cards are unchanged since the last commit.

## Data from an external API instead of the built-in lists (checked, nothing changed)

| Check | Result |
|---|---|
| The video page arrives 0 / 4 / 12s after the click (Chrome 158 desktop and Pixel 5 profile, real YouTube) | plays with sound each time |
| The same on an iPhone profile (WebKit, simulated player) | plays with sound each time; the sound starts at the tap, so with a late page it is heard before the page shows |
| The first short is not `FIRST_SHORT_ID` (iPhone profile, simulated player) | the built-in one loads first, then the right one; the sound stays on |
| A video id that isn't in the lists | 404 |

Not tested: a real API, a real iPhone.
