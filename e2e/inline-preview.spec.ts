import { test, expect, Page, Frame } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// Inline playback in video cards (components/inline-preview.tsx), with the fake YouTube player: on hover with
// a mouse, on screen while scrolling on phones, and the Settings switch that turns both off.

const seed = (page: Page, feedPlayback?: boolean) =>
  page.addInitScript((on) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    if (on !== null) localStorage.setItem('deeni-feed-playback', JSON.stringify(on));
  }, feedPlayback ?? null);

type FakeWindow = { __player: () => { playing: boolean; muted: boolean }; __end: () => void; __commands: string[] };
const previewFrame = async (page: Page): Promise<Frame> => {
  const iframe = page.locator('[data-preview] iframe');
  await expect(iframe).toHaveCount(1);
  return (await (await iframe.elementHandle())!.contentFrame())!;
};
const playing = (frame: Frame) => frame.evaluate(() => (window as unknown as FakeWindow).__player());

test.describe('Inline playback: hover (mouse)', () => {
  test.skip(({ isMobile }) => isMobile, 'mouse only');

  test('rest on a thumbnail: it plays muted; a quick pass loads nothing; leaving removes the player', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(thumb).toBeVisible();

    // A quick pass over the card doesn't start anything
    await thumb.hover();
    await page.mouse.move(5, 400);
    await page.waitForTimeout(600);
    await expect(page.locator('[data-preview]')).toHaveCount(0);

    await expect(async () => {
      await page.mouse.move(5, 400);
      await thumb.hover();
      await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 3000 });
    }).toPass({ timeout: 15_000 });
    const frame = await previewFrame(page);
    expect(await playing(frame)).toEqual({ playing: true, muted: true });
    await expect(page.locator('[data-preview]').getByRole('button', { name: 'Unmute' })).toBeVisible();

    // The volume button unmutes, without opening the video
    const url = page.url();
    await page.locator('[data-preview]').getByRole('button', { name: 'Unmute' }).click();
    await expect.poll(async () => (await playing(frame)).muted).toBe(false);
    await expect(page.locator('[data-preview]').getByRole('button', { name: 'Mute' })).toBeVisible();
    expect(page.url()).toBe(url);

    await page.mouse.move(5, 400);
    await expect(page.locator('[data-preview]')).toHaveCount(0);
  });

  test('the progress bar lifts on hover and seeks on click; opening the video continues from there', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(thumb).toBeVisible();
    await expect(async () => {
      await page.mouse.move(5, 400);
      await thumb.hover();
      await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 3000 });
    }).toPass({ timeout: 15_000 });
    const frame = await previewFrame(page);
    const box = (await thumb.boundingBox())!;
    const bar = page.locator('[data-preview-bar]');
    // As on youtube.com: a 5px line along the bottom edge, full width
    const resting = (await bar.boundingBox())!;
    expect(Math.round(resting.y + resting.height)).toBe(Math.round(box.y + box.height));
    expect(Math.round(resting.height)).toBe(5);
    expect(Math.round(resting.width)).toBe(Math.round(box.width));

    // Hover: lifted 10px off the bottom, its ends 12px in, with the playhead and the time under the pointer
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 5);
    await expect.poll(async () => Math.round((await bar.boundingBox())!.x - box.x)).toBe(12);
    const lifted = (await bar.boundingBox())!;
    expect(Math.round(box.y + box.height - (lifted.y + lifted.height))).toBe(10);
    expect(Math.round(lifted.width)).toBe(Math.round(box.width - 24));
    await expect(page.locator('[data-preview]').getByText('0:15')).toBeVisible(); // half of the fake's 30 s

    // Click at the middle: seeks there, stays on the page
    const url = page.url();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height - 5);
    await expect.poll(() => frame.evaluate(() => (window as unknown as FakeWindow).__commands.includes('seekTo'))).toBe(true);
    expect(page.url()).toBe(url);

    // Opening the video now: the watch page starts where the preview was (≈15 s)
    await thumb.click({ position: { x: box.width / 2, y: box.height / 3 } });
    await page.waitForURL(/\/videos\//);
    const player = page.locator('iframe[src*="/embed/"]');
    await expect(player).toHaveCSS('opacity', '1', { timeout: 10_000 });
    const watchFrame = (await (await player.elementHandle())!.contentFrame())!;
    await expect.poll(() => watchFrame.evaluate(() => (window as unknown as FakeWindow).__commands.includes('seekTo'))).toBe(true);
  });

  test('at the end of the video it goes back to the thumbnail', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(async () => {
      await page.mouse.move(5, 400);
      await thumb.hover();
      await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 3000 });
    }).toPass({ timeout: 15_000 });
    const frame = await previewFrame(page);
    await frame.evaluate(() => (window as unknown as FakeWindow).__end());
    await expect(page.locator('[data-preview]')).toHaveCount(0);
  });

  test('Settings → Playback in feeds off: hovering plays nothing', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/settings');
    const toggle = page.getByRole('switch', { name: 'Playback in feeds' });
    await expect(toggle).toBeChecked();
    await expect(async () => {
      await toggle.click();
      await expect(toggle).not.toBeChecked({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    expect(await page.evaluate(() => localStorage.getItem('deeni-feed-playback'))).toBe('false');

    await page.goto('/');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(thumb).toBeVisible();
    await page.waitForTimeout(1000);
    await thumb.hover();
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-preview]')).toHaveCount(0);
  });
});

test.describe('Inline playback: on screen (phones)', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch only');

  const playingCard = (page: Page) =>
    page.evaluate(() => {
      const el = document.querySelector('[data-preview]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { id: el.getAttribute('data-preview'), top: r.top, bottom: r.bottom };
    });

  test('the card on screen plays muted once scrolling stops; one at a time; it stops when scrolled away', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    await expect(page.locator('main a[href^="/videos/"]').locator('visible=true').first()).toBeVisible();

    // Starts on its own a moment after the page has loaded
    await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
    const first = (await playingCard(page))!;
    expect(await playing(await previewFrame(page))).toEqual({ playing: true, muted: true });
    await expect(page.locator('[data-preview]').getByRole('button', { name: 'Unmute' })).toBeVisible();

    // Scroll the card off screen: it stops, and the card now in the middle plays (never two at once)
    await page.mouse.wheel(0, first.bottom);
    await expect.poll(async () => (await playingCard(page))?.id ?? null, { timeout: 10_000 }).not.toBe(first.id);
    await expect.poll(async () => (await playingCard(page))?.id ?? null, { timeout: 10_000 }).not.toBeNull();
    expect(await page.locator('[data-preview]').count()).toBe(1);
    const second = (await playingCard(page))!;
    expect(second.top).toBeGreaterThanOrEqual(0);
    expect(second.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
  });

  test('touch and hold a card: it plays (and lifting the finger does not open it)', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const thumbs = page.locator('main a[href^="/videos/"] .aspect-video').locator('visible=true');
    await expect(thumbs.nth(1)).toBeVisible();
    await page.waitForTimeout(1000); // hydrated
    const target = thumbs.nth(1);
    await target.scrollIntoViewIfNeeded();
    const b = (await target.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const url = page.url();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
    await page.waitForTimeout(700);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => {
      const p = await playingCard(page);
      return p ? Math.round(p.top) : null;
    }).toBe(Math.round(b.y));
    await page.waitForTimeout(500);
    expect(page.url()).toBe(url);
  });

  test('the progress bar sits on the bottom edge with its playhead; dragging along it seeks', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
    const frame = await previewFrame(page);
    const card = (await page.locator('[data-preview]').boundingBox())!;
    const bar = (await page.locator('[data-preview-bar]').boundingBox())!;
    // Flush with the card's bottom edge, full width, 3px
    expect(Math.round(bar.y + bar.height)).toBe(Math.round(card.y + card.height));
    expect(Math.round(bar.width)).toBe(Math.round(card.width));
    expect(Math.round(bar.height)).toBe(3);
    // The playhead shows, centred on the line
    const head = (await page.locator('[data-preview-head]').boundingBox())!;
    expect(Math.round(head.y + head.height / 2)).toBe(Math.round(bar.y + bar.height / 2));

    // Drag sideways along it: seeks, shows the time, and doesn't open the video
    const url = page.url();
    const cdp = await page.context().newCDPSession(page);
    const y = card.y + card.height - 3;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: card.x + 20, y }] });
    for (let k = 1; k <= 8; k++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: card.x + 20 + k * ((card.width / 2 - 20) / 8), y }] });
      await page.waitForTimeout(30);
    }
    await expect(page.locator('[data-preview]').getByText('0:15')).toBeVisible();
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(() => frame.evaluate(() => (window as unknown as FakeWindow).__commands.filter((c) => c === 'seekTo').length)).toBeGreaterThan(0);
    await page.waitForTimeout(500);
    expect(page.url()).toBe(url);
  });

  test('Playback in feeds off: nothing plays', async ({ page }) => {
    await seed(page, false);
    await useFakeYouTube(page);
    await page.goto('/');
    await expect(page.locator('main a[href^="/videos/"]').locator('visible=true').first()).toBeVisible();
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(4000);
    await expect(page.locator('[data-preview]')).toHaveCount(0);
  });
});
