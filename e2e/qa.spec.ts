import { test, expect, Page, CDPSession } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// QA fixes: History on phones (scrolling, links, text), first tap opens a card, the watch player's controls
// hide on phones, the bottom nav and toasts on phones, Settings languages, the channels' Home feed switch and
// the cards' real durations.

const seed = (page: Page, extra: Record<string, string> = {}) =>
  page.addInitScript((more) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, extra);

async function swipe(page: Page, cdp: CDPSession, x: number, from: number, to: number) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: from }] });
  for (let i = 1; i <= 12; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: from + ((to - from) * i) / 12 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
}

test.describe('Phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones only');

  test('History scrolls all the way down, also when the swipe starts on a Shorts row', async ({ page }) => {
    await seed(page);
    await page.goto('/history');
    const shorts = page.locator('a[href^="/shorts?v="]').locator('visible=true').first();
    await expect(shorts).toBeVisible({ timeout: 10_000 });
    const b = (await shorts.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await swipe(page, cdp, b.x + b.width / 2, b.y + b.height - 10, b.y + 10);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(100);
    const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (let i = 0; i < 30 && (await page.evaluate(() => scrollY)) < max - 5; i++) await swipe(page, cdp, 200, 600, 150);
    expect(await page.evaluate(() => scrollY)).toBeGreaterThanOrEqual(max - 5);
  });

  test('a slow tap on a card opens the video on the first try', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const thumb = page.locator('main a[href^="/videos/"] .aspect-video').locator('visible=true').first();
    await expect(thumb).toBeVisible();
    await page.waitForTimeout(1000); // hydrated
    const b = (await thumb.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    // A deliberate tap: 350ms between finger down and up (a long press is 500ms)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
    await page.waitForTimeout(350);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page).toHaveURL(/\/videos\//);
  });

  test('a tap on the progress bar of a playing card opens the video (only a drag seeks)', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
    const card = (await page.locator('[data-preview]').boundingBox())!;
    await page.touchscreen.tap(card.x + card.width / 3, card.y + card.height - 3);
    await expect(page).toHaveURL(/\/videos\//);
  });

  test('the watch player controls hide by themselves after the video starts, and a tap brings them back', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const player = page.getByRole('region', { name: 'Video player' });
    const controls = page.locator('[role="slider"][aria-label="Seek"]').locator('xpath=ancestor::div[contains(@class,"transition-opacity")][1]');
    await expect(page.locator('iframe[src*="/embed/"]')).toHaveCSS('opacity', '1', { timeout: 10_000 });
    await expect(controls).toHaveCSS('opacity', '0', { timeout: 6000 });
    const b = (await player.boundingBox())!;
    await page.touchscreen.tap(b.x + b.width / 4, b.y + b.height / 2);
    await expect(controls).toHaveCSS('opacity', '1');
    await expect(controls).toHaveCSS('opacity', '0', { timeout: 6000 });
  });

  test('the bottom nav stays put while scrolling, with no line over the current tab', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(nav).toBeVisible();
    const before = (await nav.boundingBox())!;
    expect(Math.round(before.y + before.height)).toBe(page.viewportSize()!.height);
    await page.mouse.wheel(0, 1500);
    await page.waitForTimeout(800);
    const after = (await nav.boundingBox())!;
    expect(Math.round(after.y)).toBe(Math.round(before.y));
    await expect(nav.locator('span.h-0\\.5')).toHaveCount(0);
  });

  test('toasts sit above the bottom nav, and lower on pages without it', async ({ page }) => {
    await seed(page);
    await page.goto('/channels');
    const nav = (await page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox())!;
    await page.getByRole('button', { name: /on your Home feed$/ }).first().click();
    await page.getByRole('menuitemradio', { name: /Hide from Home/ }).click();
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible();
    // Once it has slid in: just above the nav
    const gap = async () => {
      const t = (await toast.boundingBox())!;
      return Math.round(nav.y - (t.y + t.height));
    };
    await expect.poll(gap).toBeGreaterThanOrEqual(8);
    expect(await gap()).toBeLessThanOrEqual(24);

    // A page without the bottom nav: toasts go down near the bottom edge
    await page.goto('/videos/x/v2');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toHaveCount(0);
    await page.getByRole('button', { name: /Watch later|Saved/ }).first().click();
    const lower = page.locator('[data-sonner-toast]').first();
    await expect(lower).toBeVisible();
    const fromBottom = async () => {
      const t = (await lower.boundingBox())!;
      return Math.round(page.viewportSize()!.height - (t.y + t.height));
    };
    await expect.poll(fromBottom).toBeGreaterThanOrEqual(8);
    expect(await fromBottom()).toBeLessThanOrEqual(24);
  });
});

test.describe('Phones: Shorts thumbnail', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones only');

  test("a short's thumbnail is framed like its video: 9:16, covering the screen (no side strips, no zoom when it plays)", async ({ page }) => {
    await seed(page);
    await page.route(/youtube(-nocookie)?\.com\/embed/, (r) => r.abort()); // only the thumbnail
    await page.goto('/shorts?v=o38RKuY_AUU'); // YouTube's thumbnail has black strips at both sides
    const box = page.locator('.shorts-player-box').nth(3);
    const poster = box.locator('.shorts-poster');
    await expect(poster.locator('img')).toBeVisible();
    const [b, p] = [(await box.boundingBox())!, (await poster.boundingBox())!];
    expect(p.width / p.height).toBeCloseTo(9 / 16, 2);
    expect(p.x).toBeLessThanOrEqual(b.x + 0.5);
    expect(p.x + p.width).toBeGreaterThanOrEqual(b.x + b.width - 0.5);
    expect(p.y).toBeLessThanOrEqual(b.y + 0.5);
    expect(p.y + p.height).toBeGreaterThanOrEqual(b.y + b.height - 0.5);
    // A square video sits in the middle, as YouTube's player shows it
    await page.goto('/shorts?v=PUwTf64igQk');
    const square = page.locator('.shorts-player-box').nth(5).locator('.shorts-poster img').locator('..'); // the 6th short
    await expect(square).toBeVisible();
    const sq = (await square.boundingBox())!;
    expect(Math.abs(sq.width - sq.height)).toBeLessThan(1);
  });
});

test.describe('Everywhere', () => {
  test('History: the channel name opens the video; YouTube text sizes', async ({ page, isMobile }) => {
    await seed(page);
    await page.goto('/history');
    const row = page.locator('main h3').locator('visible=true').filter({ hasText: /\S/ }).last();
    await expect(row).toBeVisible({ timeout: 10_000 });
    const title = page.locator('main a[href^="/videos/"] h3').locator('visible=true').first();
    await expect(title).toHaveCSS('font-size', isMobile ? '14px' : '18px');
    await expect(title).toHaveCSS('font-weight', '400');
    const details = title.locator('xpath=following-sibling::p[1]');
    await expect(details).toHaveCSS('font-size', '12px');
    // The channel name is part of the link to the video, not a link to the channel
    const link = title.locator('xpath=ancestor::a[1]');
    await expect(link).toHaveAttribute('href', /^\/videos\//);
    await details.click();
    await expect(page).toHaveURL(/\/videos\//);
  });

  test('Settings: languages are ticked right in the list (at least one stays)', async ({ page }) => {
    await seed(page);
    await page.goto('/settings');
    const english = page.getByRole('checkbox', { name: /^English/ });
    const bangla = page.getByRole('checkbox', { name: /^Bengali/ });
    await expect(english).toHaveAttribute('aria-checked', 'true');
    await expect(bangla).toHaveAttribute('aria-checked', 'true');
    await english.click();
    await expect(english).toHaveAttribute('aria-checked', 'false');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('deeni-lang-prefs')!).languages)).toEqual(['bn']);
    await bangla.click(); // the last one stays
    await expect(bangla).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Keep at least one language')).toBeVisible();
  });

  test("Channels: the Home feed button hides a channel's videos from Home, with Undo", async ({ page }) => {
    await seed(page);
    await page.goto('/channels');
    await expect(page.getByText('All 10 channels show on your Home feed')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('switch')).toHaveCount(0);
    const button = page.getByRole('button', { name: /on your Home feed$/ }).first();
    await expect(button).toHaveText('On Home');
    const name = (await button.getAttribute('aria-label'))!.split(':')[0];
    await button.click();
    // The menu says what each choice does, with a check on the current one
    await expect(page.getByRole('menuitemradio', { name: /Show on Home/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText('Still here, on its page and in search')).toBeVisible();
    await page.getByRole('menuitemradio', { name: /Hide from Home/ }).click();

    const hidden = page.getByRole('button', { name: `${name}: hidden from your Home feed` });
    await expect(hidden).toHaveText('Hidden');
    await expect(page.getByText('9 of 10 channels show on your Home feed')).toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('feed-visible-channels')!).length)).toBeGreaterThan(0);
    // The Hidden filter lists it
    await page.getByRole('button', { name: /^Hidden 1$/ }).click();
    await expect(page.locator('main li')).toHaveCount(1);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByText('All 10 channels show on your Home feed')).toBeVisible();
    await expect(page.locator('main li')).toHaveCount(10);
  });

  test('Channels: the page scrolls while the Home feed menu is open, and scrolling closes it', async ({ page, isMobile }) => {
    await seed(page);
    await page.setViewportSize({ width: page.viewportSize()!.width, height: 500 });
    await page.goto('/channels');
    await page.getByRole('button', { name: /on your Home feed$/ }).first().click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    // A real wheel scroll over the page (a scroll lock would swallow it)
    await page.mouse.move(isMobile ? 40 : 400, 400); // over the list (not the desktop sidebar)
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    await expect(menu).toHaveCount(0);
  });

  test("cards show the video's real length", async ({ page }) => {
    await seed(page);
    await page.goto('/');
    // "Islamic Halaka: শেষ জামানার ফিতনা" (XVscS6piz9A) is 43:24 on YouTube
    const card = page.locator('a[href$="/XVscS6piz9A"]').locator('visible=true').first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText('43:24')).toBeVisible();
  });
});
