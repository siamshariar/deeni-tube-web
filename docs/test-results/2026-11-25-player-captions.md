# Test results: the player's buttons, captions, theater mode, hover effects (25 November 2026)

Asked: on YouTube the play button has its own background and there is no Next button, would the same be better here; and when captions
are on, does the frame show as on YouTube?

## The buttons, measured on youtube.com and m.youtube.com (signed out)

| | YouTube | Before | Now |
|---|---|---|---|
| A video, mouse (also theatre and full screen) | Play alone in a 40px circle, 12px in; volume 12px after it; no Next | Play and Next in one group | the same as YouTube |
| A playlist, mouse | Play; 8px after it Previous and Next in one pill, 52px each; volume 12px after | Play and Next in one group | the same (12, 60, 112, 176px) |
| Phone | Previous 48px, Play 56px, Next 48px; Previous dimmed on the first video | no Previous | the same |
| Keys | Shift+N, Shift+P | none | the same |

## Captions: what was wrong (real YouTube player in our page)

| What | Before | Now |
|---|---|---|
| Videos whose only captions are YouTube's own Bangla ones (18 of 34) | switched on, nothing showed | they show |
| Videos without captions (7 of 34) | could be switched on, nothing showed | the button is dimmed, "unavailable"; no row in Settings (as on YouTube) |
| YouTube's title, "More videos" and logo | showed over the video for about 4s after every start and jump while captions were on | never |
| Captions under our controls | the progress bar and the time went through the text | above the controls |
| Paused | captions disappeared | they stay |
| Choosing a language | not possible | Settings → Subtitles/CC: Off, the languages, Auto-translate (156 languages; Bangla → English works) |
| The choice | gone with the next video | kept, also for Shorts and the next visit |
| Phones | 10px text | 14–16px, and clear of the controls |
| Shorts | captions behind the title and the buttons | above the title, clear of the buttons |
| Shorts, first seconds | YouTube's title, logo and "More videos" showed through | cut off, as on the watch page |
| The one video that isn't 16:9 (3:2) | its top and bottom were cut off (16%) | shows whole, with black at its sides |

YouTube's own pause icon still shows in the middle for the first 3 seconds (it can't be cut off); on Shorts with Previous and Next beside it.

## Where captions are, real YouTube embed (Chrome)

| | YouTube | Ours |
|---|---|---|
| Player 996×560, controls hidden | 11px above the bottom, 24.9px text | 11px, 24.9px |
| Controls showing | 81px | 81px, 24.9px |
| Full screen 1440×900 | 18px, 36px text | 16px, 36px text |
| Phone 393×221, controls hidden | 20px (m.youtube.com) | 20px, 15.9px text |
| Phone, controls showing | 20px, under the controls | over the play button |

Checked with a Bangla, an English and a two-language video, one without captions, the 3:2 one, and two shorts: on, controls up and down,
after a jump, paused, full screen and back, off. No page errors.

All 27 videos that have captions were opened once each: their captions show, inside the visible video (27 of 27). YouTube's title, "More
videos" and logo were looked for in the visible video at the start, later, after a jump and when paused: none, on a computer and a phone.

## Also asked: theater mode, settings, hover, donate, the info pages

| | YouTube, measured | Now |
|---|---|---|
| Theater mode, 1440×900 | player 0, 56, 1440×731; title at 799; side column at 811 | the same, in the same player (it goes on playing), kept for the next visit; button and `t` |
| Theater mode, 1100×650 | 1100×481 | the same |
| A grid card on hover | its thumbnail's colour at 13%, 12px out, 16px corners | the same (17% in dark) |
| A list's row on hover | 8px out, 8px corners; the thumbnail moves | the same on History, Watch later and Liked |
| Shorts cards, search results on hover | no colour | no colour |
| Settings | Subtitles/CC, sleep timer, speed, quality, stable volume, voice boost, annotations | the first three; the others can't be set through YouTube's embed |
| Shorts' menu | | playback speed added |
| Donate | | "JazakAllahu khairan" with what was chosen, until the visitor goes on; says it is a demo |

More, Help and Donate with their pages (10) at 280, 320, 390, 800×360, 820 and 1440px: 60 checks; one 20px-high link on About made 24px.

## Tests

- Full run on the production build: 508 passed, 157 skipped, 1 failed (666). The failed one was a race in a new test (it left full screen
  before the browser had entered it); fixed, then 8 of 8. The run before it: 494 passed, 1 failed (Home's reload to the top, not touched
  here; 15 of 15 when repeated, and it passed in the later full run).
- Accessibility (axe): 156 scans of 26 pages, 0 problems. Type check and lint: 0 problems.

Subtitles' rounded corners are YouTube's own: its player draws them rounded in some visits and square in others, and a page can't change it.

Not tested: a real iPhone (Safari's engine is), real Android phone, Firefox. The captions' place uses an option of YouTube's embed that
isn't documented: if YouTube drops it, captions are cut off at the bottom again, and nothing else changes.
