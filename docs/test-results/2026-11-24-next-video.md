# Test results: the next video plays by itself (24 November 2026)

Reported: at the end of a video the "Up next" video doesn't play. The reporter's own browser could not be looked at.

## What was found, with real YouTube

Every video of the catalogue (34) opened, taken to 4 seconds before its end, and left alone (Chrome desktop, three at a time):

| Code | Next video played |
|---|---|
| Before | 30 of 33 (v35 not tried). v33 and v34: YouTube's stream broke off after the jump (loading for 30s, then it gave up): no end screen, no next video. v32 took 40s to start, longer than the check waited. All three worked when tried again, so it comes and goes |
| With the player loaded again after a break-off | 32 of 34 (it broke off in 7; 5 recovered after about 30s, v14 and v34 broke off again) |
| Final: stuck in its last seconds counts as finished | 34 of 34, and 34 of 34 again (9 of the 68 were stuck; they moved on after 8s) |

This is what happens when the bar is dragged to the end to see the next video start. It also worked before, when nothing broke off: four
in a row, opened from a link, in a playlist, Chrome's Pixel 5 profile, WebKit's iPhone 13 profile, and with saved progress at seven
places.

| Other cases | Before | Now |
|---|---|---|
| The next player loses its one play command (simulated) | sat there with a Play button | asked again each second, plays |
| It never starts, or stalls (simulated) | stayed stuck | spinner, loaded again once, then "This video isn't playing" with Try again / Next video |
| YouTube can't play it (simulated) | YouTube's own error, stopped there | "This video isn't available", Autoplay goes on (at most 3 in a row) |
| Safari's engine leaves the video paused (WebKit, real YouTube: Mac and iPad profiles) | never played (3 of 4) | plays in 8 of 8, muted with "Tap to unmute" in 3 |
| Full screen (Chrome, real YouTube) | left full screen for the next video | stays on (two in a row); `f`, Esc and leaving the page end it |
| Autoplay switched off | no way to see or change it at the end | the switch stays; turning it on starts the countdown |
| End of the countdown | "Up next in 0" | 8 to 1, then the next video |
| Phones held sideways, full screen | the video was cut at the top and bottom (851×393: 43px each, calculated) | the whole video shows |

Measured on youtube.com (a 19s video played to its end): countdown from 8, from 3 in full screen; it stays in full screen; with
Autoplay off no countdown.

Not changed: on YouTube the next video plays the moment the page changes; here it takes 1–2s more (each page has its own player).
Not tested: a real phone, Safari on a real Mac, Firefox.

## Automated

Full run on the production build of the final code: 331 passed, 89 skipped (tests for the other device type), 0 failed. New:
`e2e/autoplay-next.spec.ts`, and one in `e2e/ios-playback.spec.ts`. Lint and tsc: 0 problems; the build succeeded.
