# Test results: the same things look and work the same on every screen (24 November 2026)

Reported: the app bar of a scholar or channel differs from a category's (one font much smaller); the three-dot menus differ in what they
offer. Asked for: every screen, phone and web, small and large.

## What differed, measured (Chrome, Pixel 5 profile) and now

| Thing | Before | Now |
|---|---|---|
| Phone app bar | scholar, channel 41px, 14px text, 24px arrow · video, playlist 45px, 15px, 20px · category 53px, 18px, 20px · help, more, donate 69px, 18px, 20px | 48px, 16px medium, 24px arrow in a 44px button, on 14 pages |
| Page title | 24px, 20px (You, History, Playlists; phones), 30px (help pages; desktop) | 24px everywhere, at the same place |
| Bottom nav with an app bar | hidden, except on Donate | hidden on every page with the app bar |
| Three-dot menu, phones | a sheet on some pages (icons 16, 20 or 24px, text 14 or 15px), a small menu on others (Liked, Watch later, playlists) | a sheet everywhere; 48px rows, 24px icons, 15px |
| Three-dot menu, desktop | 5 widths (192–256px), gaps 12 or 16px | 36px rows, 20px icons, 14px, 256px wide |
| A video's actions | 6 on Home, 3 in search, 4 in related, 3 on a channel's shorts; in different orders | the same 6 in the same order wherever the app lists a video or short |
| Own lists (History, Liked, Watch later, a playlist) | different orders; History's shorts couldn't be removed; Share copied a link on two of them | the same first three, then the list's own, "Remove from …" last |
| Search box | 5 designs (36–44px high) | one, 40px |
| Sort | 3 designs; the one in use not ticked on Playlists | one, with its tick |
| Empty lists, playlist cards, Share, Report, feedback, checkboxes, lengths on thumbnails | several versions each | one each |

## Behaviour and data that were wrong

| What | Now |
|---|---|
| Every video said "780K subscribers" | its channel's number |
| "Edit playlist" in a playlist only opened the playlists page; Delete asked on one page and not on the other | edits it; asks on both, with Undo |
| A private Watch later's menu in the playlist was empty | no button when there is nothing to offer |
| A short saved to a playlist was counted but never shown | it is in the playlist and plays there, whole, with black at its sides (real YouTube: Chrome phone and desktop, Safari's engine; also paused) |
| Three lists of shorts with ids that meant different shorts: saving one marked another as saved; the same short could be saved twice | one list; what visitors saved earlier is resolved to the right short, once |
| History's demo shorts had other videos' titles, and the same short three times | real titles, each once |
| A channel listed 5 shorts and its scholar 3 | the same |
| Watch later 7 / Liked 10 on Playlists, 11 / 14 on their own pages | 11 / 14 |
| Home chips with nothing behind them (Tafsir, Health…, 8 of 18) | the 10 categories that have videos |
| "Report" on a comment did nothing; on a channel or scholar it said "Report video" | reports what it is on |
| "Dr. … Jahangir Rh.", "Dr. Mohammad Imam Hossain" on cards, another name on the channel's page | the channel's name |
| The menu of a playlist on a scholar's page was inside its link | beside it |
| A playlist's current video showed a made-up 60% bar | its real progress |
| A page opened straight from a link: Back did nothing | goes to its parent page |
| Found while testing: a tap above a sheet didn't close it (new code), a pulled-down sheet reopened lower (new code) | fixed, with tests |

## Checked by hand or script

- 24 menus on phone and desktop: rows, order, sizes, inside the screen. 26 pages at 320, 360, 430, 667×375, 768, 1024, 1280 and 1920 wide:
  nothing wider than the screen, cut off or under 11px. Every sheet and dialog in light and dark.
- Safari's engine (iPhone 13, iPhone SE, iPad profiles): sheets open along the bottom, a tap above closes them, Share has the right link.
- Console: no errors of ours on 34 pages (one development-only React notice on a missing video's page; errors inside YouTube's player).
- Script size per page: within 2% of the live site (e.g. Home 273 → 275 KB, video page 293 → 293 KB, compressed).

Safari's engine, real YouTube, choosing another video in a playlist: 17 of 18 started within 4s on the production build; in one the stream
stalled for over 36s. The live site (before): 8 of 10 within 4s, two took 23s. On the development server 3 of 6 stalled.

Not tested: a real phone, a real Mac, Firefox, screen readers.

## Automated

New: `e2e/consistency.spec.ts` (app bars, titles, search boxes, 26 menus, what each action does, counts, older saved data). Changed to the
new design: `qa.spec.ts` ("Bangla", History's phone sizes), `ui.spec.ts` (Shorts' Description), `home-chips.spec.ts` (the last chip).

First full run, before the last changes below: 420 passed, 92 skipped (tests for the other device type), 0 failed. Lint and tsc: 0
problems; the build succeeded.

After that run: the short in a playlist (it was cut off at the top and bottom; found by looking at it), and the production check below. Full
run again at the end: see there.

## Production check (accessibility, jumps, speed)

| Check | Before | Now |
|---|---|---|
| axe (WCAG 2 A/AA, 2.1, 2.2, best practices), 28 screens × phone/desktop × light/dark | 12 kinds of problems (pictures and links without names, a button inside a button, tabs pointing at nothing, targets under 24px, headings out of order…) | 1: text of an open menu isn't inside a landmark (Radix menus; advice, not a rule) |
| Page jumps while loading (CLS, slow network; the page itself) | playlist 0.22 phone / 0.56 desktop, You 0.28 / 0.09, search 0.08 / 0.05, video page 0.06 phone | 0.003 at most on 19 pages |
| Lighthouse mobile, channel page | 66 (LCP 4.6s, TBT 700ms; one run) | 87 (3.4s, 244ms; middle of 3) |
| Lighthouse mobile, Home | 82 (TBT 572ms; middle of 3) | 85 (456ms; middle of 5) |
| Lighthouse mobile, History | 65 (one run) | 69 (middle of 3) |

What changed for it: lists and channel pages no longer wait 0.6s (Home 0.8s) before showing what they already have; the playlist page's and
You's placeholders have the page's own shape; pages start with padding instead of a margin that moved the whole body; pinch-zoom is allowed
(fields are 16px on phones, so iPhones don't zoom in on them); a page that breaks shows "Something went wrong" with Try again
(`app/error.tsx`).

Lighthouse still shows a CLS of 0.43 (phone) and 0.74–0.82 (desktop) on the video page, the same on the live site: it counts the moves inside
YouTube's own player.

Final full run on the production build of the final code: 419 passed, 92 skipped, 3 failed: one test at three sizes expected the Shorts Like
button to be named "Like" alone (it is now "Like, 15K"). Test updated, the three pass. Lint and tsc: 0 problems.

Still demo, not production: sign-in (any email signs in as a demo account), Donate (no payment), Contact support, Suggest, Rate, Report and
feedback (nothing is sent), videos, channels, comments and notifications (data in the code). No picture when a link is shared (no Open
Graph tags), no robots.txt or sitemap.

## Every screen size

Checked: 31 pages at 280–2560px (about 4,000 page and width pairs, touch and mouse), 23 popups at 12 sizes, Safari's engine at five widths, 125% and 150%
browser text, and a notch (47px on both sides, emulated).

| Found | Now |
|---|---|
| Shorts on phones held sideways: buttons on top of each other, some above the screen, the video zoomed to a strip | Buttons beside a whole 9:16 video |
| The player on phones held sideways was taller than the screen; its settings menu opened below it | Fits under the header, its bar and menu included |
| Shorts' comments on tablets squeezed the video to a strip (768, 820px) or cut it (1024px, 1180px) | A sheet below 1024px; beside it from there, and the short shrinks to stay whole |
| Shorts' menu, the sort menu and the new playlist form went below low screens (some rows unreachable) | They scroll inside |
| Phones with a notch, held sideways: the header, lists and player controls reached under it | Clear of it |
| Under 360px: "Private • Playlist" ran off, the playlists' search box had no room, the stars on Rate ran off, notification and search rows had a few letters a line | All fit at 280px |
| 125–150% text: the header's account button, the sidebar's heading, the stars and the search boxes ran off | All fit |
| Before the page's script ran, phones showed the desktop's related list and description, and no bottom nav | The phone's, at once |

New tests: `e2e/screen-sizes.spec.ts` (25). Not tested: a real phone.

Full run on this build: 382 passed, 117 skipped, 1 failed (it took hold of a button before the page's script had run; the test now waits,
and passes). That run was without the 64 tests of `e2e/responsive.spec.ts`, which had been overwritten by mistake and were restored from git;
they were then run on the same build with `click-ui` and `screen-sizes`: 95 passed, 31 skipped. Lint and tsc: 0 problems. axe: as before.
Page jumps while loading (CLS): 0.003 at most on 18 pages, 0.014 on the playlist page on phones.

## Small phones, the Home feed button, and a real phone

Phone: realme 5i (RMX2030), Android 10, Chrome 158, 360x716 visible, over Wi-Fi from the production build, in a tab of its own.

| Checked on the phone | Result |
|---|---|
| 12 pages: nothing wider than the screen or off it; the bottom nav at the bottom | Fine; first paint 0.2–0.9s (local network) |
| Home feed button: menu, Hide, Undo, Add to Home | Fine |
| Card menu, closing it by a tap above, save card | Fine |
| A video by a tap on Home | Plays with sound after 4.8s; place kept |
| Full screen, sideways, back | **Broke** ("Something went wrong"): see below. Fixed: 9 pages turned, no error, the video goes on |
| Shorts: a tap for sound, then five swipes | Each plays after 1.7–3.5s, with sound |
| Keyboard: search, new playlist, comment, suggestion | Search's button was behind it: fixed. Fields visible in all |

| Found | Now |
|---|---|
| Turning a phone sideways broke the video page; on Home it raised errors (also on the live site): every menu had its own media query listener, and 50+ updates one inside the other stop React | One listener per query |
| Under 400px: channel header squeezed beside the picture, names cut on Channels and Scholars, icon-only Home buttons, rows' views and times cut, "Devi…" in Settings, "Playl…" on Playlists, search placeholders cut off, "•" at the end of lines, the video's Save and ⋮ out of view | Stacked headers, cards, full texts, everything in view at 360px |
| A channel's and a scholar's page had no way to show or hide it on Home but "Don't recommend" in the ⋮ | The Home feed button, the same as on Channels |

Not tested: turning the phone by hand (Chrome turned it), an iPhone.

Then, as asked: a category's (and channel's and scholar's) cards in Home's grid (3 columns, 4 beside the mini sidebar; tested also after a
reload); on phones' Shorts the title 19px above the bottom and the actions 27px, as measured on m.youtube.com (they were 24–44px plus a
hidden 7px, and 64–112px); the search page shows what was searched on phones and its results at once (no artificial 0.4s wait).

Full runs: before these last three changes 462 passed, 132 skipped, 0 failed; on the final build 464 passed, 137 skipped, 3 failed: one test at three
sizes expected the Shorts buttons above the title (they are beside it now, as on YouTube; 20px or more apart at nine sizes). Test
updated, the three pass. Lint and tsc: 0 problems. The last three changes were not checked on the phone.

Search results open in the search page (`/search/<title>/<id>?q=…`), with the page and player of a video:

| A click until the player is on screen (ms, middle of 4) | Before | Now |
|---|---|---|
| Search result, production, desktop / phone size | 200 / 184 | 124 / 100 |
| Search result, `npm run dev`, desktop / phone size | 1200 / 1250 | 450 / 325 |
| Search result, slow network and 4x slower CPU, desktop / phone size | 1060 / 810 | 548 / 490 |
| A card on Home, production, desktop / phone size | 214 / 174 | 166 / 118 |

No request is made (tested); the related list's first rows come with the player, the rest right after.

Full run on this build: 473 passed, 143 skipped, 0 failed. Lint and tsc: 0 problems. Not checked on the phone.

Then, as asked: the related and next videos of a search result open in the video page (`/videos`). Related specs (screen sizes, related,
watch page, autoplay, iPhone, regressions, navigation): 159 passed, 76 skipped, 1 failed (the test counted the related links' prefetches as
requests; corrected, and the 6 search tests pass). Lint and tsc: 0 problems.

## Ready as a mock? (final build)

| Check | Result |
|---|---|
| Full test run | 475 passed, 143 skipped, 0 failed |
| Internal links, from 30 pages as a user and as a guest, phone and desktop | 114, all open |
| Errors on those pages | None of the app's own (one network hiccup on Shorts) |
| Every kind of button pressed on 27 pages, phone and desktop | 585; 8 not reachable by the script. Nothing happened for: Search with an empty box, the playlist row already playing (both as intended), and Shuffle when it picked the video already playing: fixed, with a test |
| axe, 26 pages, phone, 320px phone, desktop, light and dark | 156 scans, 0 problems |
| Lint, tsc | 0 problems |

Missing for going public: share pictures (Open Graph), robots.txt, sitemap.

