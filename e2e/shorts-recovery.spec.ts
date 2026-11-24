import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube, type Trouble } from './fake-youtube';

// A short never stays stuck on its picture (app/shorts/page.tsx): a stalled stream or a player that never answers shows
// the spinner, is loaded again, and then says so with "Try again"; a removed video says so; shorts loop, also in the
// iPhone's shared player. Waits are real (10s + 15s), so these tests are slow.

const FIRST = 'MBxDbbkk0gQ';
const SECOND = 'Pr5qe5nQfWc';
const seed = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));
const index = (page: Page) =>
  page.locator('section').first().locator('..').evaluate((c) => Math.round(c.scrollTop / (c.firstElementChild as HTMLElement).offsetHeight));
const cover = (page: Page, n: number) => page.locator('section').nth(n).locator('.shorts-poster').locator('..');
const spinner = (page: Page) => page.getByRole('status', { name: 'Loading' });

test.describe('Shorts: nothing stays stuck', () => {
  test('a stalled short: spinner, then its player is loaded again and plays', async ({ page }) => {
    test.setTimeout(60_000);
    await seed(page);
    let stalled = true;
    let loads = 0;
    await fakeYouTube(page, { trouble: (id) => { if (id === SECOND) loads++; return id === SECOND && stalled ? 'stalled' : undefined; } });
    await page.goto(`/shorts?v=${SECOND}`);
    await expect(spinner(page)).toBeVisible({ timeout: 6_000 });
    await expect(cover(page, 1)).toHaveCSS('opacity', '1');
    stalled = false;
    const before = loads;
    await expect(cover(page, 1)).toHaveCSS('opacity', '0', { timeout: 20_000 }); // plays after the reload
    expect(loads).toBe(before + 1);
    await expect(spinner(page)).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: 'This short' })).toHaveCount(0);
  });

  test('still stalled: it says so; "Try again" loads it once more, "Next short" goes on', async ({ page }) => {
    test.setTimeout(120_000);
    await seed(page);
    let broken = true;
    await fakeYouTube(page, { trouble: (id) => (id === SECOND && broken ? 'stalled' : undefined) });
    await page.goto(`/shorts?v=${SECOND}`);
    const message = page.getByRole('alert').filter({ hasText: "This short isn't playing" });
    await expect(message).toBeVisible({ timeout: 45_000 });
    await expect(spinner(page)).toHaveCount(0);
    broken = false;
    await message.getByRole('button', { name: 'Try again' }).click();
    await expect(message).toHaveCount(0);
    await expect(cover(page, 1)).toHaveCSS('opacity', '0', { timeout: 15_000 });
    expect(await index(page)).toBe(1);
  });

  for (const trouble of ['unavailable', 'silent'] as Trouble[])
    test(`${trouble}: a message with "Next short", which plays the next one`, async ({ page }) => {
      test.setTimeout(120_000);
      await seed(page);
      await fakeYouTube(page, { trouble: (id) => (id === SECOND ? trouble : undefined) });
      await page.goto(`/shorts?v=${SECOND}`);
      const message = page.getByRole('alert').filter({ hasText: trouble === 'unavailable' ? "This short isn't available" : "This short isn't playing" });
      await expect(message).toBeVisible({ timeout: trouble === 'unavailable' ? 10_000 : 80_000 });
      if (trouble === 'unavailable') await expect(message.getByRole('button', { name: 'Try again' })).toHaveCount(0);
      await message.getByRole('button', { name: 'Next short' }).click();
      await expect.poll(() => index(page)).toBe(2);
      await expect(cover(page, 2)).toHaveCSS('opacity', '0', { timeout: 15_000 });
      await expect(message).toHaveCount(0);
    });

  test('an unavailable short preloaded off screen says so when it comes on screen', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => (id === SECOND ? 'unavailable' : undefined) });
    await page.goto('/shorts');
    await expect(cover(page, 0)).toHaveCSS('opacity', '0', { timeout: 15_000 });
    await expect(page.locator('section').nth(1).locator('iframe')).toHaveCount(1, { timeout: 15_000 });
    await page.waitForTimeout(1000);
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('alert').filter({ hasText: "This short isn't available" })).toBeVisible();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('alert').filter({ hasText: 'This short' })).toHaveCount(0);
    await expect(cover(page, 0)).toHaveCSS('opacity', '0');
  });

  test('a normal short shows no spinner and no message', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page, { clock: true });
    await page.goto('/shorts');
    await expect(cover(page, 0)).toHaveCSS('opacity', '0', { timeout: 15_000 });
    await page.waitForTimeout(3000);
    await expect(spinner(page)).toHaveCount(0);
    await expect(page.getByRole('alert').filter({ hasText: 'This short' })).toHaveCount(0);
  });

  test('the short that stuck is replaced; its old links open the new one', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/shorts?v=goHfO28fE-A');
    await expect.poll(() => index(page)).toBe(1);
    await expect(page.locator('section').nth(1).locator(`iframe[src*="${SECOND}"]`)).toHaveCount(1);
    await expect(page.locator('iframe[src*="goHfO28fE-A"]')).toHaveCount(0);
    await expect(page.locator('section').nth(0).locator(`iframe[src*="${FIRST}"]`)).toHaveCount(0);
  });

  test('a removed short is gone from the feed, its channel and scholar pages, and what was saved earlier', async ({ page }) => {
    const REMOVED = '0m1Mc6dX8XY';
    await seed(page);
    await page.addInitScript((id) => {
      const short = {
        id: 's13', videoId: id, type: 'short', title: 'Seek The Forgiveness of Allah #muftimenk', channel: 'Mufti Menk', channelId: 'mufti-menk', channelAvatar: '',
        thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`, duration: '1:10', views: '94,721', timeAgo: '4 months ago',
      };
      const kept = { ...short, id: 's14', videoId: 'HKRq0DE-GTo', title: "Just Don't Get Angry #muftimenk", thumbnail: 'https://img.youtube.com/vi/HKRq0DE-GTo/hqdefault.jpg' };
      localStorage.setItem('deeni-watch-history', JSON.stringify([short, kept].map((s) => ({ ...s, watchedDate: Date.now() }))));
      for (const key of ['deeni-liked-videos', 'deeni-watch-later'])
        localStorage.setItem(key, JSON.stringify([short, kept].map((s) => ({ ...s, addedAt: Date.now() }))));
    }, REMOVED);
    await fakeYouTube(page);
    const gone = page.locator(`main a[href*="${REMOVED}"], main img[src*="${REMOVED}"], main :text("Seek The Forgiveness")`);
    for (const path of ['/history', '/liked-videos', '/watch-later', '/channels/mufti-menk', '/scholars/mufti-menk']) {
      await page.goto(path);
      if (path.startsWith('/channels') || path.startsWith('/scholars')) await page.getByRole('button', { name: /^Shorts/ }).or(page.getByRole('tab', { name: /^Shorts/ })).first().click();
      await expect(page.locator('main a[href*="HKRq0DE-GTo"]').first(), path).toBeAttached({ timeout: 10_000 }); // the one kept
      expect(await gone.count(), path).toBe(0);
    }
    // Its old link opens the feed, at the first short
    await page.goto(`/shorts?v=${REMOVED}`);
    await expect(page.locator('section').first()).toBeVisible();
    expect(await index(page)).toBe(0);
    expect(await gone.count()).toBe(0);
    await expect(page.locator('section').nth(0).locator(`iframe[src*="${FIRST}"]`)).toHaveCount(1);
  });

  test('phones: the play icon shows while a short is paused', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones');
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/shorts');
    await expect(cover(page, 0)).toHaveCSS('opacity', '0', { timeout: 15_000 });
    const icon = page.locator('[data-paused-icon]');
    await expect(icon).toHaveCount(0);
    const tap = async () => { const b = (await page.locator('.shorts-player-box').first().boundingBox())!; await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 3); };
    await tap();
    await expect(icon).toBeVisible();
    await tap();
    await expect(icon).toHaveCount(0);
  });
});
