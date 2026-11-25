import { test, expect, Page, Locator } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// The same things look and work the same on every screen: the phone's app bar (components/page-bar), page titles
// (components/page-layout), and every three-dot menu (components/action-menu, media-menu, playlist-menu): its rows, their
// order and what each one does.

const seed = (page: Page, guest = false) =>
  page.addInitScript((isGuest) => {
    if (window.top !== window) return;
    if (!localStorage.getItem('deeni-lang-prefs')) localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest }));
    localStorage.setItem('deeni-feed-playback', 'false');
  }, guest);
const message = (page: Page) => page.locator('[data-sonner-toast]:not([data-removed="true"])').last();
const dialog = (page: Page, name: string | RegExp) => page.getByRole('dialog', { name });
const stored = (page: Page, key: string) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), key);
const VIDEO = '/videos/x/v2';

/** Open a three-dot menu (the page may not be ready for the first press). */
async function openMenu(page: Page, button: Locator) {
  const rows = page.locator('[data-action]');
  await expect(rows).toHaveCount(0); // one that was open has gone
  await expect(async () => {
    await button.scrollIntoViewIfNeeded({ timeout: 2000 });
    await button.hover({ timeout: 2000, force: true });
    if (!(await rows.first().isVisible())) await button.click({ timeout: 2000 });
    await expect(rows.first()).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}
const choose = (page: Page, action: string) => page.locator(`[data-action="${action}"]`).click();
const mainMenus = (page: Page) => page.locator('main button[aria-label^="More actions"]').locator('visible=true');

// ── App bar and titles ──────────────────────────────────────────────────────────────────────────────────────────────

const INNER = [
  VIDEO, '/playlists/monzur-lectures/pl-islamic-1', '/channels/monzur', '/scholars/monzur', '/scholars/monzur/about', '/categories/islamic-lecture',
  '/help/get-started', '/help/privacy', '/help/terms', '/help/guidelines', '/more/about', '/more/rate', '/more/suggest', '/donate',
];
const LISTS = ['/scholars', '/channels', '/categories', '/playlists', '/history', '/settings', '/you', '/more', '/help'];

test('phones: every inner page has the same app bar, and no bottom nav under it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  test.setTimeout(120_000);
  await seed(page);
  await useFakeYouTube(page);
  const bars: Record<string, unknown> = {};
  for (const url of INNER) {
    await page.goto(url);
    const bar = page.locator('[data-page-bar]');
    await expect(bar).toBeVisible();
    await expect(page.locator('nav[aria-label="Mobile navigation"]')).toHaveCount(0);
    bars[url] = await bar.evaluate((el) => {
      const r = el.getBoundingClientRect(), button = el.querySelector('button')!, b = button.getBoundingClientRect(), i = button.querySelector('svg')!.getBoundingClientRect();
      const title = el.lastElementChild!, c = getComputedStyle(title);
      return { top: r.top, height: r.height, button: [b.width, b.height], icon: [i.width, i.height, i.left], label: button.getAttribute('aria-label'), titleLeft: title.getBoundingClientRect().left, font: `${c.fontSize} ${c.fontWeight}`, oneLine: title.getBoundingClientRect().height };
    });
  }
  for (const url of INNER) expect(bars[url], url).toEqual({ top: 56, height: 48, button: [44, 44], icon: [24, 24, 12], label: 'Go back', titleLeft: 50, font: '16px 500', oneLine: 24 });
});

test('the app bar: one visible page heading, none from md up', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await seed(page);
  await useFakeYouTube(page);
  for (const url of INNER) {
    await page.goto(url);
    if (!isMobile) await expect(page.locator('[data-page-bar]')).toBeHidden();
    await expect.poll(() => page.locator('h1').locator('visible=true').count(), { message: url }).toBe(1);
  }
});

test('phones: the app bar goes back, and to its parent page when there is nothing to go back to', async ({ page, isMobile, context }) => {
  test.skip(!isMobile, 'phones only');
  await seed(page);
  await page.goto('/categories');
  await page.locator('main a[href="/categories/quran"]').click();
  await expect(page).toHaveURL('/categories/quran');
  await page.locator('[data-page-bar] button').click();
  await expect(page).toHaveURL('/categories');
  // Opened straight from a link, in a new tab
  const [tab] = await Promise.all([context.waitForEvent('page'), page.evaluate(() => window.open('/categories/quran', '_blank', 'noopener') as unknown as void)]);
  await tab.waitForLoadState();
  expect(await tab.evaluate(() => history.length)).toBe(1);
  await expect(async () => {
    await tab.locator('[data-page-bar] button').click({ timeout: 2000 });
    await expect(tab).toHaveURL(/\/categories$/, { timeout: 1500 });
  }).toPass({ timeout: 15_000 });
});

test('list pages: the same title, at the same place', async ({ page, isMobile }) => {
  test.setTimeout(120_000);
  await seed(page);
  for (const url of LISTS) {
    await page.goto(url);
    const h1 = page.locator('h1').locator('visible=true').first();
    await expect(h1).toBeVisible();
    const t = await h1.evaluate((el) => ({ font: `${getComputedStyle(el).fontSize} ${getComputedStyle(el).fontWeight}`, top: el.getBoundingClientRect().top }));
    expect(t, url).toEqual({ font: '24px 700', top: isMobile ? 72 : 88 });
  }
});

test('search boxes and sort buttons: one size', async ({ page }) => {
  await seed(page);
  for (const url of ['/scholars', '/channels', '/categories', '/categories/islamic-lecture', '/playlists', '/history', '/playlists/monzur-lectures/pl-islamic-1']) {
    await page.goto(url);
    const box = page.locator('main input[placeholder^="Search"]').locator('visible=true').first();
    await expect(box).toBeVisible();
    expect((await box.boundingBox())!.height, url).toBe(40);
  }
  for (const url of ['/scholars', '/channels', '/categories', '/categories/islamic-lecture']) {
    await page.goto(url);
    const sort = page.getByRole('button', { name: /^Sort by:/ });
    await expect(sort).toHaveText('Default');
    expect((await sort.boundingBox())!.height, url).toBe(40);
  }
});

// ── Every menu ──────────────────────────────────────────────────────────────────────────────────────────────────────

const SUGGESTED = ['watch-later', 'playlist', 'share', 'not-interested', 'dont-recommend', 'report'];
const tab = (name: string) => async (page: Page) => {
  await expect(async () => {
    await page.getByRole('tab', { name }).click({ timeout: 2000 });
    await expect(page.getByRole('tab', { name })).toHaveAttribute('data-state', 'active', { timeout: 1000 });
  }).toPass({ timeout: 10_000 });
};
const nth = (i: number) => (page: Page) => (i < 0 ? mainMenus(page).last() : mainMenus(page).nth(i));
const MENUS: { name: string; url: string; before?: (page: Page) => Promise<void>; button: (page: Page, isMobile: boolean) => Locator; rows: string[] }[] = [
  { name: 'Home card', url: '/', button: nth(0), rows: SUGGESTED },
  { name: 'category card', url: '/categories/islamic-lecture', button: nth(0), rows: SUGGESTED },
  { name: "channel's video", url: '/channels/monzur', button: nth(1), rows: SUGGESTED },
  { name: "channel's short", url: '/channels/monzur', before: tab('Shorts'), button: nth(1), rows: SUGGESTED },
  { name: "scholar's video", url: '/scholars/monzur', button: nth(1), rows: SUGGESTED },
  { name: "scholar's short", url: '/scholars/monzur', before: tab('Shorts'), button: nth(1), rows: SUGGESTED },
  { name: 'search result', url: '/search?q=allah', button: nth(0), rows: SUGGESTED },
  {
    name: 'related video', url: VIDEO, rows: SUGGESTED,
    button: (page, isMobile) => (isMobile ? page.locator('section[aria-labelledby="related-heading-mobile"]') : page.locator('.group\\/rel').nth(1)).locator('button[aria-label="More actions"]').first(),
  },
  { name: 'channel', url: '/channels/monzur', button: nth(0), rows: ['report'] },
  { name: 'scholar', url: '/scholars/monzur', button: nth(0), rows: ['report'] },
  { name: "channel's playlist", url: '/channels/monzur', before: tab('Playlists'), button: nth(1), rows: ['play', 'share'] },
  { name: "scholar's playlist", url: '/scholars/monzur', before: tab('Playlists'), button: nth(1), rows: ['play', 'share'] },
  { name: 'History short', url: '/history', button: nth(0), rows: ['watch-later', 'playlist', 'share', 'remove'] },
  { name: 'History video', url: '/history', button: (page) => page.locator('main section .group button[aria-label="More actions"]').locator('visible=true').first(), rows: ['watch-later', 'playlist', 'share', 'remove'] },
  { name: 'liked video', url: '/liked-videos', button: nth(0), rows: ['watch-later', 'playlist', 'share', 'remove'] },
  { name: 'liked short', url: '/liked-videos', button: nth(-1), rows: ['watch-later', 'playlist', 'share', 'remove'] },
  { name: 'Watch later video', url: '/watch-later', button: nth(0), rows: ['playlist', 'share', 'top', 'bottom', 'remove'] },
  { name: 'Watch later short', url: '/watch-later', button: nth(-1), rows: ['playlist', 'share', 'remove'] },
  { name: 'own playlist', url: '/playlists', button: (page) => page.getByRole('button', { name: 'More actions for Study & Learning Playlist' }), rows: ['play', 'share', 'edit', 'delete'] },
  { name: 'private playlist', url: '/playlists', button: (page) => page.getByRole('button', { name: 'More actions for Owned Collection' }), rows: ['play', 'edit', 'delete'] },
  { name: 'Watch later as a playlist', url: '/playlists', button: (page) => page.getByRole('button', { name: 'More actions for Watch later' }), rows: ['play'] },
  { name: 'playlist being played', url: '/playlists/monzur-lectures/pl-islamic-1', button: (page) => page.getByRole('button', { name: 'Playlist actions' }), rows: ['share', 'edit', 'delete'] },
  { name: "playlist's video", url: '/playlists/monzur-lectures/pl-islamic-1', button: (page) => page.locator('button[aria-label^="More actions for"]').nth(1), rows: ['watch-later', 'playlist', 'share', 'remove'] },
  { name: "channel's playlist's video", url: '/playlists/monzur-lectures/pl-islamic-1?source=channel', button: (page) => page.locator('button[aria-label^="More actions for"]').nth(1), rows: ['watch-later', 'playlist', 'share'] },
  { name: 'the video itself', url: VIDEO, button: nth(0), rows: ['not-interested', 'dont-recommend', 'report'] },
  { name: 'Shorts', url: '/shorts', button: (page) => page.getByRole('button', { name: 'More options' }).locator('visible=true').first(), rows: ['description', 'captions', 'speed', 'watch-later', 'playlist', 'share', 'dont-recommend', 'report', 'feedback'] },
];

test.describe('Every three-dot menu', () => {
  for (const m of MENUS)
    test(`${m.name}: ${m.rows.length} actions`, async ({ page, isMobile }) => {
      await seed(page);
      await useFakeYouTube(page);
      await page.goto(m.url);
      await m.before?.(page);
      await openMenu(page, m.button(page, !!isMobile));
      const rows = page.locator('[data-action]');
      expect(await rows.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.action))).toEqual(m.rows);
      // A sheet along the bottom on phones, a menu from md up; one row height, icon and text size
      await expect(page.getByRole(isMobile ? 'dialog' : 'menu')).toBeVisible();
      const look = await rows.evaluateAll((els) =>
        [...new Set(els.map((el) => `${Math.round((el as HTMLElement).offsetHeight)} ${(el.querySelector('svg')! as unknown as SVGElement).clientWidth || Math.round(el.querySelector('svg')!.getBoundingClientRect().width)} ${getComputedStyle(el).fontSize}`))]
      );
      expect(look).toEqual([isMobile ? '48 24 15px' : '36 20 14px']);
      await page.waitForTimeout(350); // opened all the way
      const box = (await page.getByRole(isMobile ? 'dialog' : 'menu').boundingBox())!;
      const view = page.viewportSize()!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(view.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(view.height + 1);
      if (isMobile) expect(Math.round(box.width)).toBe(view.width);
    });
});

// ── What the actions do ─────────────────────────────────────────────────────────────────────────────────────────────

test.describe('Actions', () => {
  test.beforeEach(async ({ page }) => {
    await useFakeYouTube(page);
  });

  for (const [name, url, before, kind, link] of [
    ['a video', '/channels/zakir-naik', null, 'video', /\/videos\/.+\/[\w-]{11}$/],
    ['a short', '/channels/zakir-naik', 'Shorts', 'short', /\/shorts\/[\w-]{11}$/],
    ['a search result', '/search?q=allah', null, 'video', /\/videos\/.+\/[\w-]{11}$/],
  ] as const)
    test(`${name}: Watch later, Share, Not interested and Report`, async ({ page }) => {
      await seed(page);
      await page.addInitScript(() => {
        if (window.top === window && !sessionStorage.getItem('emptied')) {
          sessionStorage.setItem('emptied', '1');
          localStorage.setItem('deeni-watch-later', '[]');
        }
      });
      await page.goto(url);
      if (before) await tab(before)(page);
      const button = mainMenus(page).nth(url.startsWith('/search') ? 0 : 1);

      await openMenu(page, button);
      await choose(page, 'watch-later');
      await expect(message(page)).toContainText('Saved to Watch later');
      const saved = await stored(page, 'deeni-watch-later');
      expect(saved[0].type).toBe(kind);
      await openMenu(page, button);
      await expect(page.locator('[data-action="watch-later"]')).toHaveText('Remove from Watch later');
      await choose(page, 'watch-later');
      await expect(message(page)).toContainText('Removed from Watch later');
      expect((await stored(page, 'deeni-watch-later')).some((v: { id: string }) => v.id === saved[0].id)).toBe(false);

      await openMenu(page, button);
      await choose(page, 'share');
      await expect(dialog(page, 'Share')).toBeVisible();
      await expect(dialog(page, 'Share').getByRole('textbox', { name: 'Link' })).toHaveValue(link);
      await expect(dialog(page, 'Share').getByRole('group', { name: 'Share on' }).getByRole('button', { name: 'Share on WhatsApp' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog(page, 'Share')).toHaveCount(0);

      await openMenu(page, button);
      await choose(page, 'report');
      const report = dialog(page, `Report ${kind}`);
      await expect(report).toBeVisible();
      await expect(report.getByRole('button', { name: 'Report' })).toBeDisabled();
      await report.getByRole('radio', { name: 'Spam or misleading' }).click();
      await report.getByRole('button', { name: 'Report' }).click();
      await expect(message(page)).toContainText('Thanks for reporting');
      await expect(report).toHaveCount(0);

      await openMenu(page, button);
      await choose(page, 'not-interested');
      const gone = page.getByRole('status').filter({ hasText: kind === 'short' ? 'Short removed' : 'Video removed' });
      await expect(gone).toBeVisible();
      await gone.getByRole('button', { name: 'Undo' }).click();
      await expect(gone).toHaveCount(0);
      // The page takes presses again
      expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe('none');
    });

  test("Don't recommend channel hides it from Home, with Undo; guests are asked to sign in", async ({ page }) => {
    await seed(page);
    await page.goto('/channels/zakir-naik');
    await openMenu(page, mainMenus(page).nth(1));
    await choose(page, 'dont-recommend');
    await expect(message(page)).toContainText("won't be recommended");
    await page.goto('/channels');
    await expect(page.getByText('9 of 10 channels show on your Home feed')).toBeVisible();
  });

  test("Don't recommend channel, as a guest", async ({ page }) => {
    await seed(page, true);
    await page.goto('/channels/zakir-naik');
    await openMenu(page, mainMenus(page).nth(1));
    await choose(page, 'dont-recommend');
    await expect(message(page)).toContainText('Sign in');
  });

  test('a short saved to a playlist is in it, counted, and opens there; saved from two places it is there once', async ({ page }) => {
    await seed(page);
    await page.goto('/channels/mufti-menk');
    await tab('Shorts')(page);
    await openMenu(page, mainMenus(page).nth(1));
    await choose(page, 'playlist');
    await page.getByRole('dialog', { name: 'Save to...' }).getByRole('checkbox', { name: /Study & Learning Playlist/ }).click();
    await expect(message(page)).toContainText('Saved to Study & Learning Playlist');
    await page.goto('/playlists');
    const card = page.locator('main .group').filter({ has: page.getByRole('link', { name: 'Study & Learning Playlist' }) });
    await expect(card).toContainText('21');
    await card.getByRole('link').click();
    await expect(page.getByText("Just Don't Get Angry #muftimenk")).toBeVisible();

    // Watch later: from the channel and from the Shorts page, the same one
    await page.evaluate(() => localStorage.setItem('deeni-watch-later', '[]'));
    await page.goto('/channels/mufti-menk');
    await tab('Shorts')(page);
    await openMenu(page, mainMenus(page).nth(1));
    await choose(page, 'watch-later');
    await page.goto('/shorts?v=HKRq0DE-GTo');
    const save = page.getByRole('button', { name: 'Saved' }).locator('visible=true').first();
    await expect(save).toBeVisible();
    expect(await stored(page, 'deeni-watch-later')).toHaveLength(1);
  });

  test('History, Liked and Watch later: Remove takes it out, Undo puts it back', async ({ page }) => {
    for (const [url, text] of [['/history', 'Removed from History'], ['/liked-videos', 'Removed from Liked videos'], ['/watch-later', 'Removed from Watch later']] as const) {
      await seed(page);
      await page.goto(url);
      await expect(mainMenus(page).first()).toBeVisible();
      const all = () => page.getByRole('button', { name: /^All \d+$/ }).innerText();
      const before = await all();
      await openMenu(page, mainMenus(page).first());
      await choose(page, 'remove');
      await expect(message(page)).toContainText(text);
      await expect.poll(all).not.toBe(before);
      await message(page).getByRole('button', { name: 'Undo' }).click();
      await expect.poll(all).toBe(before);
    }
  });

  test('Watch later: Move to bottom and top', async ({ page }) => {
    await seed(page);
    await page.goto('/watch-later');
    const titles = () => page.locator('main section').first().locator('h3').allInnerTexts();
    await expect(mainMenus(page).first()).toBeVisible();
    const before = await titles();
    await openMenu(page, mainMenus(page).first());
    await choose(page, 'bottom');
    await expect.poll(titles).toEqual([...before.slice(1), before[0]]);
    await openMenu(page, mainMenus(page).nth(before.length - 1));
    await choose(page, 'top');
    await expect.poll(titles).toEqual(before);
  });

  test('a playlist: Edit renames it, Delete asks first and can be undone; inside it too', async ({ page }) => {
    await seed(page);
    await page.goto('/playlists');
    await openMenu(page, page.getByRole('button', { name: 'More actions for Owned Collection' }));
    await choose(page, 'edit');
    await dialog(page, 'Edit playlist').getByRole('textbox').fill('My lectures');
    await dialog(page, 'Edit playlist').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('link', { name: 'My lectures' })).toBeVisible();

    await page.getByRole('link', { name: 'My lectures' }).click();
    await openMenu(page, page.getByRole('button', { name: 'Playlist actions' }));
    await choose(page, 'edit');
    await dialog(page, 'Edit playlist').getByRole('textbox').fill('My lectures 2');
    await dialog(page, 'Edit playlist').getByRole('button', { name: 'Save' }).click();
    await expect(page.locator('h2').filter({ hasText: 'My lectures 2' })).toBeVisible();

    await openMenu(page, page.getByRole('button', { name: 'Playlist actions' }));
    await choose(page, 'delete');
    await dialog(page, 'Delete playlist').getByRole('button', { name: 'Delete' }).click();
    await expect(page).toHaveURL('/playlists');
    await expect(message(page)).toContainText('Playlist deleted');
    await expect(page.getByRole('link', { name: 'My lectures 2' })).toHaveCount(0);
    await message(page).getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByRole('link', { name: 'My lectures 2' })).toBeVisible();
  });

  test('a menu on a card never opens the card', async ({ page }) => {
    await seed(page);
    for (const [url, before] of [['/scholars/monzur', 'Playlists'], ['/playlists', null], ['/channels/monzur', 'Playlists']] as const) {
      await page.goto(url);
      if (before) await tab(before)(page);
      await openMenu(page, mainMenus(page).nth(1));
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-action]')).toHaveCount(0);
      await page.waitForTimeout(400);
      expect(new URL(page.url()).pathname).toBe(url);
    }
  });

  test('Shorts: every action of its menu', async ({ page }) => {
    await seed(page);
    await page.goto('/shorts');
    const more = page.getByRole('button', { name: 'More options' }).locator('visible=true').first();
    await openMenu(page, more);
    await choose(page, 'share');
    await expect(dialog(page, 'Share').getByRole('textbox', { name: 'Link' })).toHaveValue(/\/shorts\/MBxDbbkk0gQ$/);
    await page.keyboard.press('Escape');
    await openMenu(page, more);
    await choose(page, 'report');
    await expect(dialog(page, 'Report short')).toBeVisible();
    await page.keyboard.press('Escape');
    await openMenu(page, more);
    await choose(page, 'feedback');
    await dialog(page, 'Send feedback').getByRole('textbox').fill('Nice');
    await dialog(page, 'Send feedback').getByRole('button', { name: 'Send' }).click();
    await expect(page.getByText('Thank you')).toBeVisible();
    await expect(dialog(page, 'Send feedback')).toHaveCount(0, { timeout: 5000 });
    await openMenu(page, more);
    await choose(page, 'playlist');
    await expect(dialog(page, 'Save to...')).toBeVisible();
    await page.keyboard.press('Escape');
    await openMenu(page, more);
    await expect(page.locator('[data-action="captions"]')).toContainText('Off');
    await choose(page, 'captions');
    await dialog(page, 'Captions').getByRole('radio', { name: 'Bangla (auto-generated)' }).click();
    await expect(dialog(page, 'Captions')).toHaveCount(0);
    await openMenu(page, more);
    await expect(page.locator('[data-action="captions"]')).toContainText('Bangla');
    await choose(page, 'description');
    await expect(page.getByText('Description', { exact: true }).locator('visible=true').first()).toBeVisible();
  });
});

// ── Sheets and dialogs ──────────────────────────────────────────────────────────────────────────────────────────────

test('phones: a sheet closes when its handle is pulled down, or on a tap above it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await seed(page);
  await page.goto('/channels/monzur');
  await openMenu(page, mainMenus(page).nth(1));
  await page.waitForTimeout(300);
  const handle = (await page.locator('[data-sheet-handle]').boundingBox())!;
  const x = handle.x + handle.width / 2;
  await page.mouse.move(x, handle.y + 10);
  await page.mouse.down();
  for (const dy of [30, 70, 120]) await page.mouse.move(x, handle.y + 10 + dy);
  await page.mouse.up();
  await expect(page.locator('[data-action]')).toHaveCount(0);
  await openMenu(page, mainMenus(page).nth(1));
  await page.touchscreen.tap(x, 150);
  await expect(page.locator('[data-action]')).toHaveCount(0);
  await expect(page).toHaveURL('/channels/monzur');
});

// ── The numbers ─────────────────────────────────────────────────────────────────────────────────────────────────────

test('counts: what a page says is what it shows', async ({ page }) => {
  test.setTimeout(120_000);
  await seed(page);
  await page.goto('/categories');
  const cards = page.locator('main a[href^="/categories/"]');
  await expect(cards.first()).toBeVisible();
  const categories = await cards.evaluateAll((els) => els.map((el) => ({ href: el.getAttribute('href')!, count: Number(/(\d+) videos?/.exec(el.textContent!)![1]) })));
  for (const c of categories) {
    await page.goto(c.href);
    await expect(page.getByText(new RegExp(`\\b${c.count} videos?\\b`)).first()).toBeVisible();
    await expect.poll(() => page.locator('main h3 a[href^="/videos/"], main a.line-clamp-2[href^="/videos/"]').locator('visible=true').count(), { message: c.href }).toBe(c.count);
  }
  // A video's channel line is its channel's
  for (const [url, text] of [['/videos/x/v2', '780K subscribers'], ['/channels/zakir-naik', '3.5M subscribers'], ['/channels/mufti-menk', '5.2M subscribers']]) {
    await page.goto(url);
    await expect(page.getByText(text).locator('visible=true').first()).toBeVisible();
  }
  await page.goto('/search?q=zakir');
  await page.locator('main h3').locator('visible=true').first().click();
  await expect(page.getByText('3.5M subscribers')).toBeVisible();
});

test('a channel and its scholar list the same videos and shorts', async ({ page }) => {
  await seed(page);
  for (const slug of ['monzur', 'abdullah-jahangir', 'zakir-naik', 'mufti-menk']) {
    const lists: string[][] = [];
    for (const kind of ['channels', 'scholars']) {
      await page.goto(`/${kind}/${slug}`);
      await tab('Shorts')(page);
      lists.push(await page.locator('main h3').locator('visible=true').allInnerTexts());
    }
    expect(lists[0].length, slug).toBeGreaterThan(0);
    expect(lists[0], slug).toEqual(lists[1]);
  }
});

test('what visitors saved earlier: the right short, once, and counts that match', async ({ page }) => {
  await seed(page);
  const thumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  await page.addInitScript(([a, b]) => {
    if (window.top !== window || sessionStorage.getItem('old')) return;
    sessionStorage.setItem('old', '1');
    const item = (id: string, thumbnail: string, extra = {}) => ({ id, title: 'Old title', channel: 'Old channel', channelAvatar: '', thumbnail, views: '50K', timeAgo: '1 week ago', duration: '0:51', addedAt: 1, ...extra });
    // Lists once gave shorts ids of their own: "sh3" was one short on a channel's page and another in History
    localStorage.setItem('deeni-watch-later', JSON.stringify([item('sh3', a), item('s3', a, { type: 'short' }), item('sh3', b)]));
    // History held some shorts several times, with other titles
    localStorage.setItem('deeni-watch-history', JSON.stringify([
      { ...item('sh1', a), type: 'short', videoId: '8YfQCDjlQsc', channelId: 'monzur', watchedDate: Date.now() - 1000 },
      { ...item('sh16', a), type: 'short', videoId: '8YfQCDjlQsc', channelId: 'monzur', watchedDate: Date.now() - 2000 },
    ]));
    // A playlist with a short under such an id, and a video that is gone
    localStorage.setItem('deeni-playlists', JSON.stringify([{ id: 'p1', slug: 'mine', name: 'Mine', videoIds: ['v2', 'sh1', 'v7'], updatedAt: 'Just now', isPublic: false, type: 'playlist', thumbnailColor: '#555' }]));
  }, [thumb('8YfQCDjlQsc'), thumb('PUwTf64igQk')]);

  await page.goto('/watch-later');
  await expect(page.getByRole('button', { name: 'All 2', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shorts 2', exact: true })).toBeVisible();
  await expect(page.getByText('Old title')).toHaveCount(0);

  await page.goto('/history');
  await expect(page.getByRole('button', { name: 'All 1', exact: true })).toBeVisible();
  await expect(page.getByText('Old title')).toHaveCount(0);
  await openMenu(page, mainMenus(page).first());
  await choose(page, 'remove');
  await expect(page.getByText('History is empty')).toBeVisible(); // every copy went
  await message(page).getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'All 1', exact: true })).toBeVisible();

  await page.goto('/playlists');
  const card = page.locator('main .group').filter({ has: page.getByRole('link', { name: 'Mine', exact: true }) });
  await expect(card.getByText(/^1( video)?$/).locator('visible=true')).toBeVisible();
  await card.getByRole('link').click();
  await expect(page.getByText('1 / 1')).toBeVisible();
});

test('a short in a playlist: the whole of it shows, as high as the player and 9:16; a video fills the player', async ({ page }) => {
  await seed(page);
  await useFakeYouTube(page);
  await page.addInitScript(() => {
    if (window.top === window) localStorage.setItem('deeni-playlists', JSON.stringify([{ id: 'p1', slug: 'mine', name: 'Mine', videoIds: ['s14', 'v2'], updatedAt: 'Just now', isPublic: false, type: 'playlist', thumbnailColor: '#555' }]));
  });
  await page.goto('/playlists/mine/p1');
  const region = page.getByRole('region', { name: 'Video player' });
  const sizes = async () => {
    const box = (await region.boundingBox())!, frame = (await region.locator('iframe').boundingBox())!;
    return { box, frame, band: Math.round(box.y - frame.y) };
  };
  await expect(region.locator('iframe')).toHaveAttribute('src', /HKRq0DE-GTo/);
  const tall = await sizes();
  expect(Math.abs(tall.frame.width - (tall.box.height * 9) / 16)).toBeLessThan(2);
  expect(Math.abs(tall.frame.x + tall.frame.width / 2 - (tall.box.x + tall.box.width / 2))).toBeLessThan(2); // in the middle
  expect(Math.abs(tall.frame.height - (tall.box.height + 2 * tall.band))).toBeLessThan(2); // the same band above and below
  expect(tall.band).toBe(60);

  await page.getByRole('button', { name: /কুরআন-সুন্নাহ নির্দেশনা/ }).first().click();
  await expect(region.locator('iframe')).toHaveAttribute('src', /UugARckPloo/);
  const wide = await sizes();
  expect(Math.abs(wide.frame.width - wide.box.width)).toBeLessThan(2);
  expect(wide.band).toBe(120);
});

test('Shuffle in a playlist always goes to another video', async ({ page }) => {
  await seed(page);
  await useFakeYouTube(page);
  await page.goto('/playlists/monzur-lectures/pl-islamic-1');
  const title = page.locator('main h1').locator('visible=true').first();
  const shuffle = page.getByRole('button', { name: 'Shuffle' }).locator('visible=true').first();
  await expect(shuffle).toBeVisible();
  for (let i = 0; i < 12; i++) {
    const before = (await title.textContent())!;
    await shuffle.click();
    await expect(title).not.toHaveText(before);
  }
});
