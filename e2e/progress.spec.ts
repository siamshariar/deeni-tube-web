import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// How far a video was watched (lib/watch-progress), as on YouTube: a red bar on its thumbnails, the video goes on
// from there (also opened from History), a finished one starts again; playing a video in a card adds it to
// History and saves its place too. The fake player's videos are 30s long.

const V2 = 'UugARckPloo'; // /videos/x/v2

const seed = (page: Page, progress?: Record<string, { t: number; d: number }>) =>
  page.addInitScript((p) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    if (p && !sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      const now = Date.now();
      localStorage.setItem('deeni-watch-progress', JSON.stringify(Object.fromEntries(Object.entries(p).map(([id, e]) => [id, { ...e, at: now }]))));
    }
  }, progress);

const saved = (page: Page, id: string) =>
  page.evaluate((v) => (JSON.parse(localStorage.getItem('deeni-watch-progress') || '{}')[v] ?? null) as { t: number; d: number } | null, id);

type FakeState = { playing: boolean; time: number; videoId: string };
const watchFrame = async (page: Page) => {
  const iframe = page.locator('iframe[src*="/embed/"]').first();
  await expect(iframe).toHaveCSS('opacity', '1', { timeout: 10_000 });
  return (await iframe.elementHandle())!.contentFrame().then((f) => f!);
};

test.describe('Watched progress', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop (mouse) only');

  test('the watch page saves how far it got; cards and History show it, and the video goes on from there', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    await expect(page).toHaveURL(new RegExp(`/${V2}$`));
    const frame = await watchFrame(page);
    // 10s in (l = +10s), then pause
    await page.keyboard.press('l');
    await expect.poll(() => frame.evaluate(() => (window as unknown as { __player: () => FakeState }).__player().time)).toBe(10);
    await page.keyboard.press('k');
    await expect.poll(() => saved(page, V2)).toMatchObject({ t: 10, d: 30 });

    // Its cards: a red bar a third of the way along
    await page.goto('/');
    const card = page.locator(`main a[href$="/${V2}"]`).locator('visible=true').first();
    await expect(card.locator('[data-watched]')).toHaveAttribute('data-watched', '33', { timeout: 10_000 });
    const bar = (await card.locator('[data-watched]').boundingBox())!;
    const thumb = (await card.locator('.aspect-video').first().boundingBox())!;
    expect(Math.round(bar.y + bar.height)).toBe(Math.round(thumb.y + thumb.height)); // along the bottom edge
    expect(bar.height).toBe(4);

    // History: the same bar, and opening it goes on from 0:10
    await page.goto('/history');
    const row = page.locator(`main a[href$="/${V2}"]`).locator('visible=true').first();
    await expect(row.locator('[data-watched]')).toHaveAttribute('data-watched', '33');
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/${V2}$`));
    const again = await watchFrame(page);
    await expect.poll(() => again.evaluate(() => (window as unknown as { __player: () => FakeState }).__player())).toMatchObject({ playing: true, time: 10 });
  });

  test('a finished video shows a full bar and starts again from the beginning', async ({ page }) => {
    await seed(page, { [V2]: { t: 30, d: 30 } });
    await useFakeYouTube(page);
    await page.goto('/');
    const card = page.locator(`main a[href$="/${V2}"]`).locator('visible=true').first();
    await expect(card.locator('[data-watched]')).toHaveAttribute('data-watched', '100', { timeout: 10_000 });
    await page.goto('/videos/x/v2');
    const frame = await watchFrame(page);
    const log = await frame.evaluate(() => (window as unknown as { __commands: string[] }).__commands);
    expect(log).not.toContain('seekTo');
    expect(await frame.evaluate(() => (window as unknown as { __player: () => FakeState }).__player().time)).toBe(0);
  });

  test('playing in a card: into History after 5 seconds, with its place saved; the card goes on from there', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { clock: true });
    await page.goto('/');
    const link = page.locator('main a[href^="/videos/"]').locator('visible=true').first();
    const id = (await link.getAttribute('href'))!.split('/').pop()!;
    const thumb = link.locator('.aspect-video').first();
    await page.waitForTimeout(1000);
    await thumb.hover();
    const preview = page.locator('[data-preview] iframe');
    await expect(preview).toHaveCSS('opacity', '1', { timeout: 10_000 });
    const top = () => page.evaluate(() => JSON.parse(localStorage.getItem('deeni-watch-history') || '[]')[0]?.videoId);
    expect(await top()).not.toBe(id);
    await expect.poll(top, { timeout: 10_000 }).toBe(id);
    // Away from the card: it stops, and its red bar shows how far it got
    await page.mouse.move(5, 5);
    await expect(preview).toHaveCount(0);
    const place = (await saved(page, id))!;
    expect(place.t).toBeGreaterThanOrEqual(5);
    await expect(link.locator('[data-watched]')).toBeVisible();
    // Played again in the card: it goes on from that place
    await thumb.hover();
    await expect(preview).toHaveAttribute('src', new RegExp(`[?&]start=${Math.floor(place.t)}(&|$)`));
  });
});
