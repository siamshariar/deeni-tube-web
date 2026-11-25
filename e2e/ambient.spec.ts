import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// Ambient mode (components/ambient-light.tsx), measured on youtube.com: the video's colours around the player and under the
// header in the dark theme, at the video's sides in theater mode in both themes; its switch; the header over theater mode.

const URL_ = '/videos/x/T9oT-oOaTNU';
const PLAYER = '[aria-label="Video player"]';
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });
const rect = (page: Page, css: string) => page.locator(css).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); });
// A storyboard sheet of one colour
const SHEET = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="#f00"/></svg>';
const open = async (page: Page, theme: 'dark' | 'light', url = URL_) => {
  await page.addInitScript((t) => {
    if (top !== window) return;
    localStorage.setItem('theme', t);
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
  }, theme);
  await page.route(/i\.ytimg\.com\/sb\//, (r) => r.fulfill({ contentType: 'image/svg+xml', body: SHEET }));
  await fakeYouTube(page, { clock: true });
  await page.goto(url);
  await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
};
/** The colour at a point of the screen */
const colour = async (page: Page, x: number, y: number) => {
  const png = (await page.screenshot({ clip: { x, y, width: 1, height: 1 } })).toString('base64');
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = document.createElement('canvas').getContext('2d')!;
    c.drawImage(img, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }, png);
};
const bar = (page: Page) => page.locator('.app-bar').evaluate((e) => getComputedStyle(e).backgroundColor);
const away = (page: Page) => page.mouse.move(700, 880);

test.describe('Ambient mode', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const url of [URL_, '/playlists/monzur-lectures/pl-islamic-1']) test(`dark theme: around the player, the page no longer for it: ${url.split('/')[1]}`, async ({ page }) => {
    await open(page, 'dark', url);
    await expect(page.locator('.ambient')).toHaveCount(1);
    expect(await rect(page, '.ambient-box')).toEqual([-233, -212, 1494, 1121]);
    await away(page);
    // Beside and above the player; the page's own colour far from it
    await expect.poll(async () => (await colour(page, 5, 350))[0], { timeout: 15_000 }).toBeGreaterThan(80);
    const [r, g, b] = await colour(page, 5, 350);
    expect(r - Math.max(g, b)).toBeGreaterThan(60);
    expect((await colour(page, 500, 62))[0]).toBeGreaterThan(50); // in the 12px under the header
    expect(await colour(page, 1430, 880)).toEqual([15, 15, 15]);
    const height = () => page.evaluate(() => document.documentElement.scrollHeight);
    const withGlow = await height();
    await page.evaluate(() => { localStorage.setItem('deeni-ambient', 'false'); window.dispatchEvent(new StorageEvent('storage', { key: 'deeni-ambient' })); });
    await expect(page.locator('.ambient')).toHaveCount(0);
    expect(await height()).toBe(withGlow);
  });

  test('the header is see-through at the top and fills in over 28px', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 520 });
    await open(page, 'dark');
    await expect(page.locator('.ambient')).toHaveCount(1);
    await expect.poll(() => bar(page)).toBe('rgba(15, 15, 15, 0)');
    await page.evaluate(() => scrollTo(0, 14));
    await expect.poll(() => bar(page)).toBe('rgba(15, 15, 15, 0.5)');
    await page.evaluate(() => scrollTo(0, 40));
    await expect.poll(() => bar(page)).toBe('rgb(15, 15, 15)');
    await page.locator('.app-bar a[href="/"]').first().click();
    await page.waitForURL((u) => u.pathname === '/');
    await expect.poll(() => bar(page)).toBe('rgb(15, 15, 15)');
  });

  for (const theme of ['dark', 'light'] as const) test(`theater mode, ${theme}: at the video's sides, under a dark header`, async ({ page }) => {
    await open(page, theme);
    await expect(page.locator('.ambient')).toHaveCount(theme === 'dark' ? 1 : 0); // the light theme's default view has none
    await page.keyboard.press('t');
    await expect.poll(() => rect(page, '.ambient-box')).toEqual([-580, -309, 2599, 1462]);
    await away(page);
    await expect.poll(async () => (await colour(page, 5, 400))[0], { timeout: 15_000 }).toBeGreaterThan(theme === 'dark' ? 80 : 50);
    expect(Math.max(...(await colour(page, 5, 400)).slice(1))).toBeLessThan(12);
    expect(await colour(page, 300, 795)).toEqual(theme === 'dark' ? [15, 15, 15] : [255, 255, 255]); // not under the player
    expect(await bar(page)).toBe('rgb(15, 15, 15)');
    await expect(page.locator('.app-bar img[src*="dark"]').first()).toBeVisible();
    // From the first moment after a reload, and not on other pages
    await page.reload({ waitUntil: 'commit' });
    await page.waitForSelector('.app-bar', { state: 'attached' });
    await expect.poll(() => bar(page)).toBe('rgb(15, 15, 15)');
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await page.locator('.app-bar a[href="/"]').first().click();
    await page.waitForURL((u) => u.pathname === '/');
    await expect.poll(() => bar(page)).toBe(theme === 'dark' ? 'rgb(15, 15, 15)' : 'rgb(255, 255, 255)');
  });

  test('its switch in the settings, kept', async ({ page }) => {
    await open(page, 'light');
    const settings = async () => {
      await page.mouse.move(300 + Math.random() * 40, 300);
      await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
    };
    await settings();
    await expect(player(page).getByRole('menuitem', { name: /Sleep timer/ })).toBeVisible();
    await expect(player(page).getByRole('menuitemcheckbox', { name: /Ambient/ })).toHaveCount(0); // nothing to switch
    await page.keyboard.press('Escape');
    await page.keyboard.press('t');
    await expect(page.locator('.ambient')).toHaveCount(1);
    await expect(page.locator('html[data-theater-moving]')).toHaveCount(0);
    await settings();
    await player(page).getByRole('menuitemcheckbox', { name: /Ambient/ }).click();
    await expect(page.locator('.ambient')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await away(page);
    await expect.poll(() => colour(page, 5, 400)).toEqual([0, 0, 0]);
    await page.reload();
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await expect(page.locator('.ambient')).toHaveCount(0);
  });
});

test('phones have none', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phones only');
  await open(page, 'dark');
  await expect(page.locator('.ambient')).toHaveCount(0);
});
