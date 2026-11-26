# Test results: switching between light and dark (26 November 2026)

## Asked: the video page stayed light after switching to dark

Reproduced (1440x900, Appearance → Dark in the account menu): the page's colours were dark, but the screen stayed white
(white text on white) until a reload, everywhere but a strip at the right. Cause: Ambient mode, which shows in the dark
theme, fills its canvas with the page's colour, read from the page when it turns on; that runs before next-themes has
given the page its new colours, so it was the old white, stretched to 1.5 × 2 of the player (-233 to 1261px across).
Now the canvas takes the dark theme's colour itself (`THEME_COLORS.dark`, `lib/theme-colors.ts`).

## Checked on every kind of page: the same as after a reload

Each page opened in one theme, switched on the page, its screen compared with the same page reloaded in the new theme
(pixels that differ by more than 60 of 765), desktop 1440x900 and phone (Pixel 7), both ways: Home, a video, Shorts,
Channels and a channel, Scholars, a scholar and its About, Categories and a category, Playlists and a playlist, search,
History, Liked videos, Watch later, You, Settings, Help and a help page, More and About, Donate, Sign in, a 404.

| | Before | Now |
|---|---|---|
| Video page, desktop, to dark | 28.6% different | 0.01% |
| Every other page, both ways, both sizes | under 1% | under 1% |
| Video and playlist pages in theater mode, both ways | | under 0.1% |
| The phone's own setting changing (theme "System"): video, playlist, Home, Shorts | | colours the same; only the test's empty player at another moment |

## Found with it

- **The phone's browser bar** took the phone's own setting, not the theme chosen in the app: white over the dark page
  (phone light, app dark), dark over the white page (phone dark, app light or not chosen). Now it has the page's colour,
  before first paint (a script at the start of `<body>`) and when the theme changes (`components/theme-provider.tsx`).
  Checked: phone light + app dark, phone dark + app light, phone dark + nothing chosen, "System" with either: right before
  the app's scripts load, after, and after switching.
- **/playlists**: Watch later and Liked videos changed places from one load to the next (their first-visit contents are
  made again on each load, each with its own "now"). Liked videos' now starts a minute earlier: Watch later stays first.

## Tests

- `e2e/ambient.spec.ts`: "switching the theme on the page: the whole page takes it at once" (fails on the old code:
  255 where under 40 is expected) and "the phone's bar has the theme chosen here".
- The 12 test files these changes touch (production build): 354 passed, 0 failed. On the dev server three of them failed
  (a search result opening within 400ms, menus on a phone held sideways, Shorts' captions menu on a phone): the same
  without these changes, and they pass on the production build.
- Type check and lint: 0.
