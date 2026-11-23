import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// The watch pages (video, playlist) and opening Shorts from a link, with a fake YouTube player
// (see fake-youtube.ts) so playback and the end of a video can be driven exactly.

const seed = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));

const playerFrame = async (page: Page) => {
  const iframe = page.locator('iframe[src*="/embed/"]');
  // Shown once it plays (until then the thumbnail covers it)
  await expect(iframe).toHaveCSS('opacity', '1', { timeout: 10_000 });
  return (await (await iframe.elementHandle())!.contentFrame())!;
};

test.describe('Watch page', () => {
  test('the player is always 16:9, with no empty sides, and the title and channel show without scrolling', async ({ page, isMobile }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const box = page.getByRole('region', { name: 'Video player' });
    await expect(box).toBeVisible();
    const b = (await box.boundingBox())!;
    expect(Math.abs(b.width / b.height - 16 / 9)).toBeLessThan(0.01);
    if (isMobile) {
      expect(Math.round(b.width)).toBe(page.viewportSize()!.width); // edge to edge
      return;
    }
    const { width, height } = page.viewportSize()!;
    const aside = (await page.locator('[aria-labelledby="related-heading"]').boundingBox())!;
    expect(aside.x).toBeGreaterThan(b.x + b.width); // beside the player
    expect(aside.width).toBeGreaterThanOrEqual(300);
    // No empty space at the sides: the player starts at the page margin and the column ends at the other
    expect(Math.round(b.x)).toBe(24);
    expect(Math.round(aside.x + aside.width)).toBe(width - 24);
    // Title and channel are visible below the player without scrolling
    const title = (await page.locator('main h1').first().boundingBox())!;
    expect(title.y + title.height).toBeLessThanOrEqual(height);
  });

  test("our controls: click to pause, k to play; YouTube's own overlays stay cropped out", async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const frame = await playerFrame(page);
    const player = page.getByRole('region', { name: 'Video player' });
    const state = () => frame.evaluate(() => (window as unknown as { __player: () => { playing: boolean } }).__player().playing);

    // The frame is taller than the box, so YouTube's title bar and "More videos" suggestions are cut off
    const b = (await player.boundingBox())!;
    const f = (await page.locator('iframe[src*="/embed/"]').boundingBox())!;
    expect(f.y).toBeLessThan(b.y - 50);
    expect(f.y + f.height).toBeGreaterThan(b.y + b.height + 50);

    await player.click({ position: { x: b.width / 2, y: b.height / 3 } });
    await expect.poll(state).toBe(false);
    await expect(page.getByRole('button', { name: /^Play( \(k\))?$/ })).toBeVisible();
    await page.keyboard.press('k');
    await expect.poll(state).toBe(true);
    await expect(page.locator('button[aria-label^="Pause"]').first()).toBeAttached();
  });

  test("at the end, our end screen replaces YouTube's: Up next with a countdown, Cancel, Replay, Play now", async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const frame = await playerFrame(page);
    const end = () => frame.evaluate(() => (window as unknown as { __end: () => void }).__end());

    await end();
    await expect(page.getByText(/^Up next in \d$/)).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    const replay = page.getByRole('button', { name: 'Replay' });
    await expect(replay).toBeVisible();
    await replay.click();
    await expect(replay).toHaveCount(0);
    await expect.poll(() => frame.evaluate(() => (window as unknown as { __player: () => { playing: boolean } }).__player().playing)).toBe(true);

    // Play now (or the countdown running out) opens the next video
    const url = page.url();
    await end();
    await page.getByRole('button', { name: 'Play now' }).click();
    await expect(page).not.toHaveURL(url);
    await expect(page).toHaveURL(/\/videos\/[a-z0-9-]+\/[A-Za-z0-9_-]{11}$/);
  });

  test('with Autoplay off, the end screen offers Replay instead of counting down', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the Autoplay switch is in the desktop control bar (on phones: in Settings)');
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const frame = await playerFrame(page);
    await page.getByRole('switch', { name: 'Autoplay is on' }).click({ force: true });
    await expect(page.getByRole('switch', { name: 'Autoplay is off' })).toBeAttached();
    await frame.evaluate(() => (window as unknown as { __end: () => void }).__end());
    await expect(page.getByRole('button', { name: 'Replay' })).toBeVisible();
    await expect(page.getByText(/Up next in/)).toHaveCount(0);
  });

  test('the related column stays in place while the page scrolls and while a menu is open', async ({ page, isMobile }) => {
    test.skip(isMobile, 'the related column sits beside the player from 1016px');
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const aside = page.locator('[aria-labelledby="related-heading"]');
    await expect(aside).toBeVisible();
    const top = () => aside.evaluate((a) => Math.round(a.getBoundingClientRect().top));
    await page.evaluate(() => window.scrollTo(0, 120));
    await expect.poll(top).toBe(80); // sticky under the header
    // Menus lock page scrolling; that must not undo the sticky position (it used to jump up)
    await page.getByRole('button', { name: 'More actions', exact: true }).locator('visible=true').first().click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await top()).toBe(80);
  });

  test('playlist with Autoplay on: the next video starts at the end, with no end screen', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/playlists/monzur-lectures/pl-islamic-1');
    const title = page.locator('main h1').first();
    await expect(title).toBeVisible();
    const first = await title.innerText();
    const frame = await playerFrame(page);
    await frame.evaluate(() => (window as unknown as { __end: () => void }).__end());
    await expect(title).not.toHaveText(first);
    await expect(page.getByRole('button', { name: 'Replay' })).toHaveCount(0);
  });

  test('a link to a short opens right on it, without loading the first short', async ({ page }) => {
    await useFakeYouTube(page);
    await page.goto('/shorts?v=o38RKuY_AUU'); // the 4th short
    const feed = page.locator('section').first().locator('..');
    await expect(feed).toBeVisible();
    await expect.poll(() => feed.evaluate((c) => Math.round(c.scrollTop / (c.firstElementChild as HTMLElement).offsetHeight))).toBe(3);
    await expect(page.locator('section').nth(3).locator('iframe')).toHaveCount(1);
    await expect(page.locator('section').nth(0).locator('iframe')).toHaveCount(0);
  });
});
