import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// The short messages at the bottom (lib/notify.ts): only where the page doesn't show the result itself, one line, one
// at a time, with Undo when something was removed.

const seed = (page: Page, extra: Record<string, unknown> = {}) =>
  page.addInitScript((e) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    for (const [k, v] of Object.entries(e)) localStorage.setItem(k, JSON.stringify(v));
  }, extra);
const message = (page: Page) => page.locator('[data-sonner-toast]:not([data-removed="true"])');
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('deeni-watch-later') || '[]').map((v: { id: string }) => v.id));

test.describe('Messages', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop menus');

  test('Watch later: saved says so; removing can be undone; one message at a time', async ({ page }) => {
    await seed(page, { 'deeni-watch-later': [] });
    await useFakeYouTube(page);
    await page.goto('/');
    const dots = page.locator('.group\\/card button[aria-label="More actions"]').first();
    await page.waitForTimeout(1000);
    await dots.click();
    await page.getByRole('menuitem', { name: 'Save to Watch later' }).click();
    await expect(message(page)).toContainText('Saved to Watch later');
    await expect(message(page).getByRole('button', { name: 'Change' })).toBeVisible();
    const ids = await saved(page);
    expect(ids).toHaveLength(1);
    await dots.click();
    await page.getByRole('menuitem', { name: 'Remove from Watch later' }).click();
    await expect(message(page)).toHaveCount(1);
    await expect(message(page)).toContainText('Removed from Watch later');
    await expect.poll(() => saved(page)).toEqual([]);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => saved(page)).toEqual(ids);
  });

  test('Undo puts a removed video back in its place (Watch later, History)', async ({ page }) => {
    await seed(page);
    // The videos on the page, in order
    const listed = () => page.locator('main a[href^="/videos/"]').locator('visible=true').evaluateAll((els) => [...new Set(els.map((a) => a.getAttribute('href')))]);
    await page.goto('/watch-later');
    await page.waitForTimeout(1000);
    const before = await listed();
    expect(before.length).toBeGreaterThan(3);
    await page.locator('main button[aria-label="More actions"]').locator('visible=true').nth(1).click();
    await page.getByRole('menuitem', { name: /Remove from/ }).click();
    await expect(message(page)).toContainText('Removed from Watch later');
    await expect.poll(async () => (await listed()).length).toBe(before.length - 1);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(listed).toEqual(before);

    await page.goto('/history');
    await page.waitForTimeout(1500);
    const rows = await listed();
    await page.locator('button[aria-label$="from history"]').nth(1).hover();
    await page.locator('button[aria-label$="from history"]').nth(1).click();
    await expect(message(page)).toContainText('Removed from History');
    await expect.poll(async () => (await listed()).length).toBe(rows.length - 1);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect.poll(listed).toEqual(rows);
  });

  test('"Not interested": the card itself says so, with Undo, and no message', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    await page.waitForTimeout(1000);
    const card = page.locator('.group\\/card').first();
    const box = (await card.boundingBox())!;
    await card.locator('button[aria-label="More actions"]').click();
    await page.getByRole('menuitem', { name: 'Not interested' }).click();
    const gone = page.getByRole('status').filter({ hasText: 'Video removed' });
    await expect(gone).toBeVisible();
    expect(Math.round((await gone.boundingBox())!.width)).toBe(Math.round(box.width));
    await expect(message(page)).toHaveCount(0);
    await gone.getByRole('button', { name: 'Undo' }).click();
    await expect(gone).toHaveCount(0);
    await expect(page.locator('.group\\/card').first()).toBeVisible();
  });

  test('no message where the page shows the result: settings, theme, a comment, a new playlist', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/settings');
    await page.waitForTimeout(1000);
    await page.getByRole('switch', { name: 'Playback in feeds' }).click();
    await page.getByRole('switch', { name: 'Autoplay' }).click();
    await page.waitForTimeout(500);
    await expect(message(page)).toHaveCount(0);

    await page.goto('/playlists');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'New playlist' }).first().click();
    await expect(page.getByRole('button', { name: /^Create$/ })).toBeDisabled(); // nothing to create yet
    await page.getByPlaceholder('My playlist').fill('Quiet list');
    await page.getByRole('button', { name: /^Create$/ }).click();
    await expect(page.getByRole('link', { name: 'Quiet list' })).toBeVisible();
    await expect(message(page)).toHaveCount(0);
  });

  test('notifications: hiding one is shown in its row, with Undo', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    const panel = page.getByRole('menu').first();
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    await panel.locator('button[aria-label="More actions"]').first().click();
    await page.getByRole('menuitem', { name: 'Hide this notification' }).click();
    await expect(panel.getByRole('status').filter({ hasText: 'Notification hidden' })).toBeVisible();
    await expect(message(page)).toHaveCount(0);
    await panel.getByRole('button', { name: 'Undo' }).click();
    await expect(panel.getByRole('status')).toHaveCount(0);
  });
});
