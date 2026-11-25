import { test, expect, type Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// The menu on the video and playlist pages (components/desktop-sidebar.tsx), YouTube's, measured: over the whole window, with
// the menu button and the logo where the header has them. (Phones have no side menu.)
const VIDEO = '/videos/x/XVscS6piz9A';
const menu = (page: Page) => page.getByRole('dialog', { name: 'Main menu' });
const button = (page: Page) => page.getByRole('button', { name: 'Toggle sidebar' });

test.describe('The menu on a video page (web)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'phones have the bottom nav');
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));
    await fakeYouTube(page);
  });

  for (const url of [VIDEO, '/playlists/monzur-lectures/pl-islamic-1']) test(`as YouTube's: its size and place, its rows, what is behind it (${url.split('/')[1]})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    const at = async (l: ReturnType<typeof button>) => { const b = (await l.boundingBox())!; return [b.x, b.y, b.width, b.height].map(Math.round); };
    const header = [await at(button(page)), await at(page.locator('header a[href="/"] img').locator('visible=true').first())];
    await button(page).click();
    await expect.poll(async () => at(menu(page))).toEqual([0, 0, 240, 900]);
    expect([await at(menu(page).getByRole('button', { name: 'Close the menu' })), await at(menu(page).locator('a[href="/"] img').locator('visible=true').first())]).toEqual(header);
    await expect(menu(page)).toHaveCSS('border-right-width', '0px');
    await expect(menu(page)).toHaveCSS('animation-duration', '0.2s');
    expect(await at(menu(page).getByRole('link', { name: 'Home', exact: true }))).toEqual([12, 68, 204, 40]);
    expect(await at(menu(page).getByRole('link', { name: 'Home', exact: true }).locator('svg'))).toEqual([24, 76, 24, 24]);
    // Half black over everything else, the header too
    const over = await page.evaluate(() => { const e = document.elementFromPoint(700, 28)!; const r = e.getBoundingClientRect(); return [getComputedStyle(e).backgroundColor, r.left, r.top, r.width, r.height]; });
    expect(over).toEqual(['rgba(0, 0, 0, 0.5)', 0, 0, 1440, 900]);
    // Nothing moved
    expect(await page.evaluate(() => [document.documentElement.clientWidth, window.scrollY])).toEqual([1440, 0]);
  });

  test('closed by Escape, a click beside it, its own button or a link; the page and the video stay as they are', async ({ page }) => {
    await page.goto(VIDEO);
    const open = async () => { await button(page).click(); await expect(menu(page)).toBeVisible(); await expect(menu(page)).toHaveAttribute('data-state', 'open'); };
    const url = page.url();
    await open();
    await expect(menu(page).getByRole('button', { name: 'Close the menu' })).toBeFocused();
    const box = page.viewportSize()!;
    await page.mouse.move(box.width - 300, 500);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await page.keyboard.press('k'); // the player's keys wait
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
    await expect(button(page)).toBeFocused();
    await expect(page.getByRole('region', { name: 'Video player' }).getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
    await open();
    await page.mouse.click(box.width - 300, 500);
    await expect(menu(page)).toHaveCount(0);
    await open();
    await menu(page).getByRole('button', { name: 'Close the menu' }).click();
    await expect(menu(page)).toHaveCount(0);
    expect(page.url()).toBe(url);
    await open();
    await menu(page).getByRole('link', { name: 'Channels' }).click();
    await expect(page).toHaveURL(/\/channels$/);
    await expect(menu(page)).toHaveCount(0);
    await expect(page.locator('aside.desktop-sidebar')).toBeVisible();
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('a window that becomes a phone\'s closes it', async ({ page }) => {
    await page.goto(VIDEO);
    await button(page).click();
    await expect(menu(page)).toBeVisible();
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(menu(page)).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveAttribute('data-scroll-locked', /./);
  });
});
