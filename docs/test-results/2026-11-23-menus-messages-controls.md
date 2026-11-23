# Test results: menus, messages, player controls and the Save card (23 November 2026)

What changed: every menu lets the page scroll and closes when it does; messages at the bottom show only where they
help, with Undo, as a card at the bottom left with the video's picture; the watch player's controls in YouTube's updated
style, each group on its own dark backing; YouTube's "Save to..." card instead of a centred dialog; YouTube's Share and
Save icons everywhere.

| Check | Result |
|---|---|
| `npx playwright test` (Chromium desktop and Pixel 7, plus WebKit iPhone 13) | 267 passed, 71 skipped (tests for the other device type), 0 failed |
| New tests: `e2e/menus.spec.ts`, `e2e/messages.spec.ts`, `e2e/player-controls.spec.ts`, `e2e/save-card.spec.ts` | all passed |
| `npm run lint`, `npx tsc --noEmit` | 0 problems |
| `npm run build` | succeeded |

**Measured against YouTube** (Playwright, 1440×900 and a Pixel 7):

| | YouTube | Deeni.tube |
|---|---|---|
| Control groups: height, above the bottom edge, from the sides | 40, 8, 12 px | 40, 8, 12 px |
| Their backing | black 30% | black 30% |
| Time group | 107 px wide | 107 px wide |
| Volume slider, open | 52 px | 52 px |
| Settings menu above the bottom edge | 62 px | 62 px |
| Phone: play button, bar's line above the bottom edge | 56, 22 px | 56, 22 px |

**Where it differs from YouTube on purpose:** YouTube blocks scrolling while a 3-dot menu is open (measured on its related
videos); here the page scrolls and the menu closes. There is no theatre mode button, and no Previous button.

**The Save card.** YouTube's needs a signed-in account, so its rows were not checked on the live site. Measured there:
its popup opens right at the button (the signed-out one does), 12px corners, 0 4px 32px shadow, a 48px header and a
footer with 12px padding; the rows' sizes come from its style sheet. Its closing after one choice comes from a March 2026
user script's description and YouTube's help page (a message says which playlist). Share and Save icons are the
live page's own.

**Messages.** What other guidelines say: Material ("Not all actions warrant a confirmation or an acknowledgment"; a check
mark needs no more; offer Undo; one at a time), Firefox's Acorn (not for something tied to one element). Which
actions show a message on YouTube mostly needs a signed-in account and is not documented, so that was not checked on the
live site. Its look was, with the one message shown signed out ("Link copied to clipboard"): light page #0f0f0f with
#f1f1f1 text, dark page #f1f1f1 with #0f0f0f text, 48px high, 8px corners, 14px text. Ours has the same colours and
corners, the same place on desktop (16px in, 30px up) and the same height (56px with a picture).

**Not tested:** a real iPhone or iPad (WebKit with an iPhone profile only).
