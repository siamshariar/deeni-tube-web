# Test results: kept settings, Share, Shorts' translation, Ambient mode (25 November 2026)

Asked: make sure the same or similar problems don't come back; Shorts' translation doesn't show; the player's settings don't
close on a click outside; Share needs every site, as in our other apps; theater mode's background as on YouTube, not only black.

## Found while checking, and fixed

| What | Before | Now |
|---|---|---|
| Volume, mute and speed on the next video (real YouTube) | 30% → 100%, muted → sound, 1.5x → normal | kept, also after a reload; volume and mute on Shorts too |
| Shorts: Unmute at volume 0 | stayed silent | 50% |
| Sleep timer ending on a page without a video | stopped the next video that was opened | it is simply over |
| Sleep timer ending during "Up next in N" | the next video still played | the countdown stops |
| Theater mode switched in another tab | the button changed, the layout didn't | both |
| Browser storage blocked (all cookies blocked) | every page: "This page couldn't load" | every page works |
| Damaged saved data | 10 pages broke on an empty list entry; searching from the header broke | they show; search works |
| Copy in Share over http (a phone on the local network) | an error | copies |
| Captions on square shorts (3 of 16) | in the middle, over the speaker's face | above the title, as on the others |

## Asked

| | YouTube or our other apps | Now |
|---|---|---|
| Shorts' captions menu | off, the languages, Auto-translate | the same (156 languages); translation checked with real YouTube, Bangla → English and English → Bangla, computer and phone, kept for the next short |
| The player's settings | close on a click outside | close on a press anywhere else, on the video without pausing it, and with Escape |
| Share | our apps: Email, Facebook, X, LinkedIn, WhatsApp, LINE, Telegram, Viber, Reddit, Tumblr, copy | all of them, and Pinterest, Threads, Bluesky, VK, Messenger (Android), the phone's own share sheet; before: 3 |
| Theater mode | the video's colours at its sides, a dark header in both themes | the same: place and size equal (-580, -309, 2599×1462), header rgb(15,15,15) |
| Default view, dark | the colours around the player and under a see-through header that fills in over 28px | the same (-233, -212, 1494×1121) |
| Settings | Ambient mode | the same switch, kept |

Every share address was opened in Chrome with an example link: each opens its share or sign-in page (LinkedIn and Reddit ask an
automated browser to prove it's human).

## Tests

- Full run on the production build: 549 passed, 169 skipped, 0 failed (718). After it only where Shorts' captions begin was changed
  (under the top buttons): captions, kept settings, Shorts and iPhone tests again: 68 passed, 1 failed under load (load average 18,
  other work on the machine); that test and the one that failed when repeating: 30 of 30 with one worker.
- Accessibility (axe): 156 scans of 26 pages and 14 of the new popups, 0 problems. Type check and lint: 0 problems.

## YouTube's own

- In some sessions (3 of about 40 here) it draws captions larger, in one style at the top of their box; on Shorts they then stand under the top buttons.
- Its note "Click ⚙ for settings" shows for 3 seconds when captions start; hiding it on Shorts would hide those captions too.

Not tested: a real iPhone, a real Android phone with these changes, Firefox, sharing with real accounts.

## Also asked: the header's search, search icon and microphone as on YouTube, on every screen

Measured on youtube.com (1920 to 360px, both themes, focused, typed) and m.youtube.com.

| | YouTube | Before | Now |
|---|---|---|---|
| Search, microphone and bell icons (also on phones) | 24px | 16px | 24px |
| Box; button; microphone | 536×40; 64×40; 40px, 16px after it | the colours and the place differed | the same, at YouTube's place from 1280px |
| Focused | 32px to the left, an icon in it, blue border, the text stays | a blue border | the same |
| List under it | as wide as the box, 44px rows, 12px corners, narrows while typing | all of it, always | the same |
| Microphone | wide, a short arc | lucide's | YouTube's shape |
| Phone's search screen | back, the box with its button, the microphone (gone while typing) in one bar | a title, then the box | the same |
| 480–767px | the microphone in the header | none | the same |

Full run on the production build: 561 passed, 181 skipped, 0 failed (742). Accessibility: 156 scans, 0 problems.

## Also asked: the voice popup, the bell and avatar, offline, and search engines

| What | Before | Now |
|---|---|---|
| Voice search's popup | in the middle of the page | over the search box, YouTube's place and size (424, 8, 592×440 at 1440px); a page of its own on phones |
| Voice search's session | started twice on the dev server; stopped after 8s of silence | once, inside the press; 24s of silence (speech after 12s was heard and searched, with Chrome's real engine) |
| No microphone, blocked, asking, offline | "Listening..." flashed | each says what it is |
| Bell, badge, avatar | 40px with a 16px bell, an 18px badge | YouTube's: 24px bell, 20px badge, 32px avatar; on phones 24px in 48px |
| Connection lost and back | nothing | "You're offline" / "Back online" along the bottom; the players wait and go on from the same second (real YouTube: 900s → playing 3s after it was back); pictures load again; opening or reloading a page shows "Connect to the internet" |
| Search engines and shared links | a title on every page; no pictures, addresses, sitemap or robots | 113 pages in the sitemap, each with its own title, description, address, picture and structured data (50 videos with their real dates): 0 problems; 36 share cards; shorts share as /shorts/<id> |

This computer has no microphone turned on (its sound profile is output only, Chrome sees none), so the microphone itself wasn't tested;
Chrome's speech engine was, with a synthetic voice.

Full run on the production build: 600 passed, 184 skipped, 2 failed (784): one test, on both sizes, that expected a short's old share
address; corrected, passed. Accessibility: 156 scans, 0 problems. The run before the SEO work: 597 passed, 0 failed.

## A real phone (Realme RMX2030, Android 10, Chrome 158, 360×716; the production build, in one tab of its own)

| What | Result |
|---|---|
| 25 pages: wider than the screen, broken pictures, errors, headings | 0 problems after the fix below |
| Header: search, bell, avatar | 24px in 48px, as on m.youtube.com |
| A video (real YouTube): plays in 1.3s, controls hide, a tap shows Previous, Play, Next; Settings closes with a tap on the video (it goes on) and on the page; captions | all right |
| Shorts: plays in 1s, `/shorts/<id>`, a swipe goes on to the next (it plays), Captions with 155 languages, translation | all right after the fix below |
| Share: 16 places, with Messenger and the phone's own sheet | shown (not opened) |
| Search: focused, the microphone makes room, results | all right |
| Connection lost and back | "You're offline", "Back online", still playing |

Found only there, and fixed:
- an old address of a video came up as "not found": the offline helper passed a redirect on that `next start` answers twice. It now does
  nothing at all while there is a connection (tested);
- the fade at the bottom of Shorts darkened the captions: with captions on it is only behind the title (tested).

The microphone was tried on the phone later (see the end). On this computer there is none turned on; voice search says so at once.

## Also asked: Shorts' captions at the top, and YouTube's note hidden

| What | YouTube | Before | Now |
|---|---|---|---|
| Where a short's captions are (real YouTube embed, our Shorts page, phone and desktop) | its upper part (its rule: 69px from the top) | above the title, 80% of the way down | 18–34% of the short's height, below the buttons, on every run |
| YouTube's note "Click ⚙ for settings" | not on Shorts | at the top of the short for 2 seconds | always above the visible part (−9% to −2%), gone after 5 seconds |
| Text size | — | a lost size left it at 7.5px once | the same (14.9px) on every run |

`lib/site.ts` uses https://deeni-tube-web.vercel.app when no other address is given, so a build made anywhere shows its own pictures.

Last full run, with everything above (production build): 604 passed, 184 skipped, 0 failed (788). Accessibility: 92 scans, 0 problems.

## On the phone again (RMX2030, Android 10, Chrome 158, the production build, real YouTube)

| What | Result |
|---|---|
| Shorts' captions, plain and translated (4 runs) | 22–34% of the short's height, 14.96px, at least 63px from the sides; the note stays above the visible part |
| A translation chosen by taps | applied and saved; YouTube answered "too many requests" (429) to some of them after many test runs, and the captions came once it answered again |
| Settings of the player | close on a tap below the player and on the video |
| Old video links, a short's shared link, an unknown video | the right page; "Page not found" |
| Offline and back online (simulated in the tab) | both messages, the second goes by itself |
| Share | 15 sites, More and Copy (nothing was sent) |
| 30 pages | no errors, nothing off the screen, no broken pictures |
| Voice search, spoken by the user | two searches, both heard and searched; the phone's engine gave up once in each and was started again by itself; open about 16 seconds in the first |

## Found with it: search only found the exact phrase

"quran" found videos, "quran video", "zakir naik video" and the spoken "manjur video" found none. `lib/search-match.ts` (the search page and the
search boxes of History, Scholars, Channels, Categories and Playlists):

| Search | Before | Now |
|---|---|---|
| quran / quran video | 4 / 0 | 4 / 4 |
| zakir naik / zakir naik video / jakir nayek | not measured / 0 / not measured | 6 / 6 / 6, the same videos |
| monzur / manjur video / মনজুর ভিডিও | 5 / 0 / not measured | 5 / 5 / 5, the same videos |
| songs video (also zzzznomatch and !!!, not measured before) | 0 | 0 |

Tests: `e2e/search-words.spec.ts`, 12 passed.

Correction: "lint: 0 problems" above was wrong, it had 2 warnings (unused imports). They are removed; lint and the type check are at 0.

Full run before the search change (two unused imports removed): 604 passed, 184 skipped, 0 failed (788).

## Also asked: captions as on YouTube (place, size, look) on web, mobile and tablet; CC buttons; no Comment button in Shorts

Both sides drew the same captured caption file, in YouTube's own player (its pages give automated browsers an empty one).

| Where | YouTube | Before | Now |
|---|---|---|---|
| Video, desktop (996x560) | 24.9px, 11px from the bottom, 81px with the controls | the same | the same |
| Video, phone (393 wide) | 14.7px, 28px, 23px from the left; the controls don't move it | 15.9px, 20px, 12px; moved over the play button | 14.7px, 28px, 22px; stays |
| Video, Android tablet (712 wide) | 26.7px, 33px, 36px | 18.5px on a tablet held sideways | 26.7px, 32px, 35px |
| Video, iPad (656 wide) | 16.4px, 7px, 139px | - | 16.4px, 7px, 139px |
| Shorts, desktop | 15.1px; placed at the top, it begins 85px down | 14.9px, 145px and lower | 15px, 85px |
| Shorts, phone (393 wide) | 13.1px | 14.9px | 13.1px, 83px down |
| Shorts, Android tablet (712 wide) | 23.7px | - | 23.7px |
| Card, mouse / touch | 1.5 / 1.125 times, 28-30px from the bottom, on from the start, CC under the volume (48px) | no captions | the same |
| CC button | another icon, nothing else | a red line under it (video); the dark fade changed (Shorts) | another icon, nothing else |
| The note "Click ⚙ for settings" | not on phones and cards | - | out of sight on Shorts, phones and cards |

Where the place of Shorts' captions comes from: on its own pages YouTube places them at the top (seen on the real mobile site, on the user's phone, below);
its embed gets a file that places them at the bottom, which ours moves up. (With the embed's file YouTube's own page drew them at the bottom, behind the title.)

Not possible in YouTube's embed: the phone site's medium weight (500; ours 400) and its 8px clear border around the text.
In about 1 of 15 sessions the embed used another base size for the text (14 instead of 16); not seen on YouTube's own pages.

Tests: `e2e/captions.spec.ts` (sizes, places, the CC button, cards), `e2e/screen-sizes.spec.ts` (no Comment button; the panel's tests are skipped).

Last full run, with the search and the captions (production build): 613 passed, 191 skipped, 4 failed (808). Three were tests to correct (two took the
cards' new CC button for a category chip, one had the iPhone's old caption height); one was timing. All four pass now: home-chips and ios-playback
22 passed, the timing one 8 of 8. Only tests were changed after the run. Accessibility: 92 scans, 0 problems. Type check and lint: 0.

## On the phone with the captions' changes (RMX2030, Android 10, Chrome 158, the production build, real YouTube)

| What | Result |
|---|---|
| Shorts, 9:16, square and translated (360x660) | begin 83px from the top, 12px, the note out of sight; "Tap to unmute" (136-172px) is under them; Like, Share, Save, Report, no Comment |
| Video (360x203) | 13.5px, 28px from the bottom; the same with the controls showing; the CC button turns them off |
| Card (360x203) | 10.1px, 28px from the bottom; CC under the volume; a tap switches them off and on and doesn't open the video |
| Page errors | 0 |

With the controls showing, the time lies over the captions. On m.youtube.com its captions (178-230px) and its time (187-211px) are in the same place too and don't
move; no picture of it was got. 

## Real YouTube's Shorts on the phone (m.youtube.com, 360x716, the user's Chrome, with their OK)

| What | YouTube | Ours |
|---|---|---|
| Place | at the top: text from 22px, behind YouTube's own header (logo and buttons, 0-48px) | from 83px, under our buttons, so it can be read |
| Left edge | 74px | 54-74px (the text of YouTube's new style is in the middle) |
| Size, font | 12px, Roboto, weight 500 | 12px, Roboto, weight 400 (the embed's) |
| Translated (English) | the same place and size | the same place and size |
| The note "Click ⚙ for settings" | not shown | not shown |

Captions were on there already; the track was put back (Bangla, not translated), and the tab closed. The computer's site places a top caption at 85px (69px and 2%).
