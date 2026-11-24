import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// The video page's related videos, as on YouTube (components/related-videos.tsx; sizes measured on youtube.com): the
// chips above them, the size of a row, and what a row does under the mouse: its thumbnail moves (frames of the video,
// no player), takes the thumbnail's colour and shows its three dots.

const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function open(page: Page, { sheets = 'ok', playback = true, history = [] as string[] } = {}) {
  const asked: string[] = [];
  await page.addInitScript(([playback, history]) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    localStorage.setItem('deeni-feed-playback', JSON.stringify(playback));
    localStorage.setItem('deeni-watch-history', JSON.stringify((history as string[]).map((videoId) => ({ id: videoId, videoId, type: 'video', title: videoId, channel: '', channelAvatar: '', thumbnail: '', duration: '', views: '', timeAgo: '', watchedDate: Date.now() }))));
  }, [playback, history] as const);
  await fakeYouTube(page);
  await page.route('https://i.ytimg.com/sb/**', (route) => {
    asked.push(route.request().url());
    return sheets === 'ok' ? route.fulfill({ contentType: 'image/png', body: PIXEL }) : route.fulfill({ status: 403, body: '' });
  });
  await page.goto('/videos/x/v2');
  await expect(chipBar(page)).toBeVisible();
  // Phones: the server's page has the desktop list; theirs comes once the page has hydrated
  if (page.viewportSize()!.width < 768) await expect(page.locator('[aria-labelledby="related-heading-mobile"] h3').first()).toBeVisible();
  return asked;
}
const chipBar = (page: Page) => page.getByRole('group', { name: 'Filter related videos' });
const chip = (page: Page, name: string) => chipBar(page).getByRole('button', { name, exact: true });
const rows = (page: Page) => page.locator('aside .group\\/rel');
const moving = (page: Page) => page.locator('[data-moving]');

test.describe('Related videos: chips', () => {
  test('All, the channel, Related, topics and the newest, which filter the list; one is always on', async ({ page, isMobile }) => {
    await open(page, { history: [] });
    const titles = page.locator(isMobile ? '[aria-labelledby="related-heading-mobile"] h3' : 'aside[aria-labelledby="related-heading"] h3');
    const all = await titles.count();
    expect(all).toBeGreaterThan(20);
    const names = await chipBar(page).getByRole('button').allInnerTexts();
    expect(names.slice(0, 3)).toEqual(['All', 'From Dr. Mohammad Monzur-E-Elahi', 'Related']);
    expect(names).toContain('Recently uploaded');
    expect(names).not.toContain('Watched'); // nothing watched (but this video, which isn't in its own list)
    await expect(chip(page, 'All')).toHaveAttribute('aria-pressed', 'true');

    await chip(page, 'From Dr. Mohammad Monzur-E-Elahi').click();
    await expect(chip(page, 'All')).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => titles.count()).toBe(4);
    await chip(page, 'Dawah').click();
    await expect(chip(page, 'Dawah')).toHaveAttribute('aria-pressed', 'true');
    const dawah = await titles.count();
    expect(dawah).toBeGreaterThan(1);
    expect(dawah).toBeLessThan(all);
    await chip(page, 'All').click();
    await expect.poll(() => titles.count()).toBe(all);
  });

  test('"Watched" lists the videos in History', async ({ page, isMobile }) => {
    await open(page, { history: ['XVscS6piz9A', 'gZ3C_UO_tZM'] });
    await chip(page, 'Watched').click();
    await expect(page.locator(isMobile ? '[aria-labelledby="related-heading-mobile"] h3' : 'aside[aria-labelledby="related-heading"] h3')).toHaveCount(2);
  });

  test('YouTube\'s size; a finger scrolls the row sideways, also under a vertical swipe the page scrolls', async ({ page, isMobile }) => {
    await open(page);
    const first = (await chip(page, 'All').boundingBox())!;
    const second = (await chip(page, 'From Dr. Mohammad Monzur-E-Elahi').boundingBox())!;
    expect(Math.round(first.height)).toBe(32);
    expect(Math.round(second.x - first.x - first.width)).toBe(8);
    const css = await chip(page, 'All').evaluate((e) => { const c = getComputedStyle(e); return [c.fontSize, c.lineHeight, c.fontWeight, c.borderRadius, c.paddingLeft]; });
    expect(css).toEqual(['14px', '20px', '500', '8px', '12px']);
    expect(await chipBar(page).evaluate((e) => getComputedStyle(e).touchAction)).toBe('auto');
    if (isMobile) {
      expect(await chipBar(page).evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
      await expect(page.getByRole('button', { name: 'More chips' }).locator('visible=true')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
    }
  });

  test('with a mouse: the side with more chips fades, with an arrow that scrolls; a chosen chip comes into view', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'mouse only');
    await open(page);
    const more = page.getByRole('button', { name: 'More chips' });
    const back = page.getByRole('button', { name: 'Previous chips' });
    const mask = () => chipBar(page).evaluate((e) => getComputedStyle(e).maskImage);
    await expect(more).toBeVisible();
    await expect(back).toHaveCount(0);
    expect(await mask()).toContain('linear-gradient(270deg');
    await more.click();
    await expect(back).toBeVisible();
    for (let i = 0; i < 8 && (await more.count()); i++) {
      await more.click().catch(() => {});
      await page.waitForTimeout(400);
    }
    await expect(more).toHaveCount(0);
    expect(await mask()).toContain('linear-gradient(90deg');
    // The last chip is fully in view
    const bar = (await chipBar(page).boundingBox())!;
    const last = (await chipBar(page).getByRole('button').last().boundingBox())!;
    expect(last.x + last.width).toBeLessThanOrEqual(bar.x + bar.width + 1);
    // A chip half under the faded side comes out from under it when chosen
    await chipBar(page).evaluate((e) => e.scrollTo({ left: 0 }));
    await expect(back).toHaveCount(0);
    const target = chip(page, 'Related');
    await target.evaluate((e) => (e as HTMLElement).click());
    await expect.poll(async () => (await target.boundingBox())!.x + (await target.boundingBox())!.width).toBeLessThanOrEqual(bar.x + bar.width - 50);
  });
});

test.describe('Related videos: rows', () => {
  test.skip(({ isMobile }) => !!isMobile, 'beside the player');

  test("YouTube's sizes at each window width", async ({ page }) => {
    await open(page);
    // [window, column, thumbnail, title's lines at most] measured on youtube.com
    for (const [w, h, column, thumb, height, lines] of [
      [1016, 700, 320, 200, 112.5, 2],
      [1366, 768, 375.6, 234.8, 132, 3],
      [1440, 900, 396, 247.5, 139.2, 3],
      [1920, 1080, 528, 330, 185.6, 3],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      const [row, next] = [(await rows(page).nth(0).boundingBox())!, (await rows(page).nth(1).boundingBox())!];
      const image = (await rows(page).nth(0).locator('a').first().boundingBox())!;
      const title = rows(page).nth(0).locator('h3');
      expect(Math.abs(row.width - column), `column at ${w}`).toBeLessThan(0.6);
      expect(Math.abs(image.width - thumb), `thumbnail at ${w}`).toBeLessThan(0.6);
      expect(Math.abs(image.height - height), `thumbnail height at ${w}`).toBeLessThan(0.6);
      expect(Math.round(next.y - row.y - row.height)).toBe(8);
      expect(Math.round((await title.boundingBox())!.x - image.x - image.width)).toBe(12);
      const css = await title.evaluate((e) => { const c = getComputedStyle(e); return [c.fontSize, c.lineHeight, c.fontWeight, c.webkitLineClamp]; });
      expect(css).toEqual(['14px', '20px', '500', String(lines)]);
    }
    const channel = rows(page).nth(0).locator('a[href^="/channels/"]');
    expect(await channel.evaluate((e) => [getComputedStyle(e).fontSize, getComputedStyle(e).lineHeight])).toEqual(['12px', '18px']);
    // "950K  1mo ago", as YouTube writes it; the full text for screen readers
    await expect(rows(page).nth(0).locator('p')).toContainText(/^[\d.]+[KM][\d.]+[KM] views\d+(h|d|w|mo|y) ago$/);
    // Under the player (one column): two columns of cards
    await page.setViewportSize({ width: 900, height: 900 });
    const [a, b] = [(await rows(page).nth(0).boundingBox())!, (await rows(page).nth(1).boundingBox())!];
    expect(Math.round(a.y)).toBe(Math.round(b.y));
    expect(Math.round(a.width)).toBe(426);
  });

  test('hover: the thumbnail moves over its duration, without a player; back to the thumbnail on leaving', async ({ page }) => {
    const asked = await open(page);
    await page.waitForTimeout(500);
    expect(asked).toEqual([]); // nothing loads before
    const players = await page.locator('iframe').count();
    const row = rows(page).nth(0);
    await row.locator('h3').hover(); // anywhere on the row
    await expect(moving(page)).toHaveCount(1);
    const box = (await moving(page).boundingBox())!;
    const thumb = (await row.locator('a').first().boundingBox())!;
    expect(Math.abs(box.width - thumb.width) + Math.abs(box.height - thumb.height)).toBeLessThan(1);
    // It lies over the duration
    expect(await row.locator('span', { hasText: /^\d+:\d\d/ }).first().evaluate((e) => {
      const r = e.getBoundingClientRect();
      return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('[data-moving]');
    })).toBe(true);
    // The frames change (one every 400ms)
    const frame = () => moving(page).locator('div').evaluate((e) => { const c = (e as HTMLElement).style; return c.backgroundImage.split(', ')[0] + c.backgroundPosition.split(', ')[0]; });
    const seen = new Set<string>();
    for (let i = 0; i < 10; i++) {
      seen.add(await frame());
      await page.waitForTimeout(200);
    }
    expect(seen.size).toBeGreaterThanOrEqual(4);
    expect(asked.every((u) => u.includes('storyboard3_L3'))).toBe(true); // the sharp frames only
    expect(await page.locator('iframe').count()).toBe(players);
    // The row in its thumbnail's colour, 6px out, and the three dots at its bottom right
    const tint = row.locator('[data-tint]');
    await expect(tint).toHaveCSS('opacity', '1');
    const [t, r, dots] = [(await tint.boundingBox())!, (await row.boundingBox())!, (await row.locator('button').boundingBox())!];
    expect([t.x - r.x, t.y - r.y, t.width - r.width, t.height - r.height].map(Math.round)).toEqual([-6, -6, 12, 12]);
    expect([r.x + r.width - dots.x - dots.width, r.y + r.height - dots.y - dots.height].map(Math.round)).toEqual([0, 0]);
    await page.mouse.move(200, 300);
    await expect(moving(page)).toHaveCount(0);
    await expect(tint).toHaveCSS('opacity', '0');
    await expect(row.locator('button')).toHaveCSS('opacity', '0');
  });

  test('a passing mouse loads nothing; without frames, or with playback in feeds off, the thumbnail stays', async ({ page }) => {
    const asked = await open(page);
    const b = (await rows(page).nth(1).boundingBox())!;
    await page.mouse.move(b.x + 50, b.y + 50);
    await page.mouse.move(b.x - 200, b.y + 50);
    await page.waitForTimeout(400);
    expect(asked).toEqual([]);

    const missing = await page.context().newPage();
    await open(missing, { sheets: 'missing' });
    await rows(missing).nth(0).hover();
    await missing.waitForTimeout(900);
    await expect(moving(missing)).toHaveCount(0);
    await expect(rows(missing).nth(0).locator('img')).toBeVisible();

    const off = await page.context().newPage();
    const askedOff = await open(off, { playback: false });
    await rows(off).nth(0).hover();
    await off.waitForTimeout(700);
    await expect(moving(off)).toHaveCount(0);
    expect(askedOff).toEqual([]);
  });

  test('the text side opens the video, the channel its page; the list starts at the top after a chip', async ({ page }) => {
    await open(page);
    const list = page.locator('[aria-label="Related videos list"]');
    await list.evaluate((e) => e.scrollTo({ top: 600 }));
    await chip(page, 'Recently uploaded').evaluate((e) => (e as HTMLElement).click());
    await expect.poll(() => list.evaluate((e) => e.scrollTop)).toBe(0);
    const row = rows(page).nth(0);
    const href = (await row.locator('a').first().getAttribute('href'))!;
    // Beside the views, under the channel: still the video
    const meta = (await row.locator('p').boundingBox())!;
    await page.mouse.click(meta.x + 30, meta.y + 8);
    await expect(page).toHaveURL(new RegExp(href.split('/').pop()!));
    await page.goBack();
    await rows(page).nth(0).locator('a[href^="/channels/"]').click();
    await expect(page).toHaveURL(/\/channels\//);
  });
});
