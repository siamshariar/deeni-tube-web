import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// YouTube's storyboards on our progress bars (lib/storyboard, components/storyboard.tsx): the frame in a box over the
// pointer while hovering, over the whole video while dragging. Sizes are YouTube's, measured on youtube.com. The fake
// player's videos are 30s long; V2's real storyboard has a frame every 10s (L3: 3×3 frames to a sheet).

const V2 = 'UugARckPloo'; // /videos/x/v2
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

async function setUp(page: Page, sheets: 'ok' | 'missing' = 'ok') {
  const asked: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
  });
  await fakeYouTube(page);
  await page.route('https://i.ytimg.com/sb/**', (route) => {
    asked.push(route.request().url());
    return sheets === 'ok' ? route.fulfill({ contentType: 'image/png', body: PIXEL }) : route.fulfill({ status: 403, body: '' });
  });
  return asked;
}
const openVideo = async (page: Page) => {
  await page.goto('/videos/x/v2');
  await expect(page.locator('iframe[src*="/embed/"]').first()).toHaveCSS('opacity', '1', { timeout: 15_000 });
};
const seeks = (page: Page) =>
  page.frames().find((f) => f.url().includes('/embed/'))!.evaluate(() => (window as unknown as { __commands: string[] }).__commands.filter((c) => c === 'seekTo').length);

test.describe('Storyboard: watch page (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  test('hover: the frame and its time over the pointer; never past the ends; nothing loads before the bar is used', async ({ page }) => {
    const asked = await setUp(page);
    await openVideo(page);
    expect(asked).toEqual([]);
    const slider = page.getByRole('slider', { name: 'Seek' });
    const player = (await page.getByRole('region', { name: 'Video player' }).boundingBox())!;
    const line = page.locator('[data-seek-line]');
    const head = page.locator('[data-seek-head]');
    const s = (await slider.boundingBox())!;
    // At rest: a 4px line with a 12px head; under the pointer 6px and 20px, 12px from the sides, 56px from the bottom
    await page.mouse.move(player.x + 200, player.y + 100);
    expect(Math.round((await line.boundingBox())!.height)).toBe(4);
    await expect.poll(async () => Math.round((await head.boundingBox())!.width)).toBe(12);
    await page.mouse.move(s.x + s.width / 2, s.y + 13);
    await expect.poll(async () => Math.round((await line.boundingBox())!.height)).toBe(6);
    await expect.poll(async () => Math.round((await head.boundingBox())!.width)).toBe(20);
    const l = (await line.boundingBox())!;
    expect(Math.round(l.x - player.x)).toBe(12);
    expect(Math.round(player.y + player.height - (l.y + l.height))).toBe(56);

    // Halfway = 0:15 = the second frame (one every 10s): second of the first sheet of the 320×180 frames
    const box = page.locator('[data-storyboard-box]');
    await expect(box).toBeVisible();
    const b = (await box.boundingBox())!;
    expect(Math.round(b.width)).toBe(242);
    expect(Math.round(b.height)).toBe(137);
    expect(Math.round(b.x + b.width / 2)).toBe(Math.round(s.x + s.width / 2));
    const frame = box.locator('[data-storyboard]');
    await expect(frame).toHaveAttribute('data-storyboard', '15');
    expect(await frame.evaluate((e) => (e as HTMLElement).style.backgroundImage)).toContain(`/sb/${V2}/storyboard3_L3/M0.jpg`);
    expect(await frame.evaluate((e) => (e as HTMLElement).style.backgroundSize.split(',')[0])).toBe('300% 300%');
    expect(await frame.evaluate((e) => (e as HTMLElement).style.backgroundPosition.split(',')[0])).toBe('50% 0%');
    const time = slider.getByText('0:15');
    await expect(time).toBeVisible();
    expect((await time.boundingBox())!.y).toBeGreaterThan(b.y + b.height);
    // Near the ends it stays inside the bar
    await page.mouse.move(s.x + 3, s.y + 13);
    await expect.poll(async () => Math.round((await box.boundingBox())!.x)).toBe(Math.round(s.x));
    await page.mouse.move(s.x + s.width - 3, s.y + 13);
    await expect.poll(async () => { const r = (await box.boundingBox())!; return Math.round(r.x + r.width); }).toBe(Math.round(s.x + s.width));
    await page.mouse.move(player.x + 200, player.y + 100);
    await expect(box).toHaveCount(0);
  });

  test('drag: the frame covers the video, dimmed, with the box over the pointer; a plain click only seeks', async ({ page }) => {
    await setUp(page);
    await openVideo(page);
    const s = (await page.getByRole('slider', { name: 'Seek' }).boundingBox())!;
    const player = (await page.getByRole('region', { name: 'Video player' }).boundingBox())!;
    const big = page.locator('[data-storyboard-big]');
    await page.mouse.move(s.x + s.width * 0.3, s.y + 13);
    await expect(page.locator('[data-storyboard-box]')).toBeVisible();
    await page.mouse.down();
    await expect(big).toHaveCount(0);
    await page.mouse.move(s.x + s.width * 0.5, s.y + 13, { steps: 5 });
    await expect(big).toBeVisible();
    const b = (await big.boundingBox())!;
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([Math.round(player.width), Math.round(player.height)]);
    await expect(big.locator('[data-storyboard]')).toHaveCSS('opacity', '0.4');
    await expect(page.locator('[data-storyboard-box] [data-storyboard]')).toHaveAttribute('data-storyboard', '15');
    expect(await seeks(page)).toBe(0); // only on release
    await page.mouse.up();
    await expect(big).toHaveCount(0);
    await expect.poll(() => seeks(page)).toBe(1);
    await page.mouse.click(s.x + s.width * 0.2, s.y + 13);
    await expect(big).toHaveCount(0);
    await expect.poll(() => seeks(page)).toBe(2);
  });

  test("a video whose storyboard can't load: just the time", async ({ page }) => {
    await setUp(page, 'missing');
    await openVideo(page);
    const slider = page.getByRole('slider', { name: 'Seek' });
    const s = (await slider.boundingBox())!;
    await page.mouse.move(s.x + s.width / 2, s.y + 13);
    await expect(slider.getByText('0:15')).toBeVisible();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-storyboard-box]')).toHaveCount(0);
  });
});

test.describe('Storyboard: cards (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  test('hover the bar of a playing card: the frame over the pointer; drag: over the whole card', async ({ page }) => {
    await setUp(page);
    await page.goto('/');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(thumb).toBeVisible();
    await expect(async () => {
      await page.mouse.move(5, 400);
      await thumb.hover();
      await expect(page.locator('[data-preview] iframe')).toHaveCSS('opacity', '1', { timeout: 3000 });
    }).toPass({ timeout: 15_000 });
    const card = (await thumb.boundingBox())!;
    const y = card.y + card.height - 11;
    await page.mouse.move(card.x + card.width / 2, y);
    const box = page.locator('[data-storyboard-box]');
    await expect(box).toBeVisible();
    const b = (await box.boundingBox())!;
    // A 160×90 frame in a 2px border, 56px above the card's bottom edge (the bar's 28px and the time)
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([164, 94]);
    expect(Math.round(card.y + card.height - (b.y + b.height))).toBe(56);
    expect(Math.round(b.x + b.width / 2)).toBe(Math.round(card.x + card.width / 2));
    expect(await box.locator('[data-storyboard]').evaluate((e) => (e as HTMLElement).style.backgroundImage)).toContain('/storyboard3_L2/M0.jpg');
    await expect(page.locator('[data-preview]').getByText('0:15')).toBeVisible();
    // At the left end: 8px in from the card's edge
    await page.mouse.move(card.x + 4, y);
    await expect.poll(async () => Math.round((await box.boundingBox())!.x - card.x)).toBe(8);

    const url = page.url();
    await page.mouse.move(card.x + card.width * 0.3, y);
    await page.mouse.down();
    await page.mouse.move(card.x + card.width / 2, y, { steps: 5 });
    const big = page.locator('[data-storyboard-big]');
    await expect(big).toBeVisible();
    await expect(box).toHaveCount(0);
    const full = (await big.boundingBox())!;
    expect([Math.round(full.width), Math.round(full.height)]).toEqual([Math.round(card.width), Math.round(card.height)]);
    await expect(page.locator('[data-preview]').getByText('0:15')).toBeVisible();
    await page.mouse.up();
    await expect(big).toHaveCount(0);
    expect(page.url()).toBe(url);
  });
});

test.describe('Storyboard: touch', () => {
  test.skip(({ isMobile, browserName }) => !isMobile || browserName !== 'chromium', 'touch (CDP) only');

  test('watch page: dragging the bar shows the frame over the video and the time; the buttons step aside', async ({ page }) => {
    await setUp(page);
    await openVideo(page);
    const player = (await page.getByRole('region', { name: 'Video player' }).boundingBox())!;
    await page.waitForTimeout(3500); // the controls hide
    await page.touchscreen.tap(player.x + player.width * 0.7, player.y + 50);
    const slider = page.getByRole('slider', { name: 'Seek' });
    const s = (await slider.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x = 0) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: s.y + 10 }] });
    await page.waitForTimeout(500);
    await touch('touchStart', s.x + 40);
    for (let k = 1; k <= 8; k++) await touch('touchMove', s.x + 40 + (k * (s.width / 2 - 40)) / 8);
    const big = page.locator('[data-storyboard-big]');
    await expect(big).toBeVisible();
    const b = (await big.boundingBox())!;
    expect([Math.round(b.width), Math.round(b.height)]).toEqual([Math.round(player.width), Math.round(player.height)]);
    await expect(big.locator('[data-storyboard]')).toHaveCSS('opacity', '1');
    await expect(page.getByRole('region', { name: 'Video player' }).getByText('0:15', { exact: true })).toBeVisible();
    await expect(page.locator('[data-storyboard-box]')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Video player' }).getByRole('button', { name: 'Full screen', exact: true })).toBeHidden();
    await touch('touchEnd');
    await expect(big).toHaveCount(0);
    await expect.poll(() => seeks(page)).toBe(1);
  });

  test("the player's speed menu fits in the video and scrolls to every speed", async ({ page }) => {
    await setUp(page);
    await openVideo(page);
    const region = page.getByRole('region', { name: 'Video player' });
    const player = (await region.boundingBox())!;
    await page.waitForTimeout(3500);
    await page.touchscreen.tap(player.x + player.width * 0.7, player.y + 50);
    await region.getByRole('button', { name: 'Settings' }).tap();
    await region.getByRole('menuitem', { name: /Playback speed/ }).tap();
    await page.waitForTimeout(100);
    const menu = (await region.getByRole('menu').boundingBox())!;
    expect(menu.y).toBeGreaterThanOrEqual(player.y);
    expect(menu.y + menu.height).toBeLessThanOrEqual(player.y + player.height);
    await region.getByRole('menuitemradio', { name: '0.25' }).tap();
    await expect(region.getByRole('menu')).toHaveCount(0);
  });
});
