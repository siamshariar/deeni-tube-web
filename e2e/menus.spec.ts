import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// Every menu: the page (and any list in it) scrolls while it's open, and scrolling closes it; a click outside only
// closes it (hooks/use-menu-dismiss.ts). Popups of the fixed header stay open.

const seed = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false })));
const wheel = async (page: Page, x: number, y: number) => {
  await page.mouse.move(x, y);
  for (let i = 0; i < 4; i++) {
    await page.mouse.wheel(0, 60);
    await page.waitForTimeout(50);
  }
};

test.describe('Menus', () => {
  test.skip(({ isMobile }) => !!isMobile, 'the dropdown menus (phones use bottom sheets)');

  for (const [name, path, trigger] of [
    ['home cards', '/', '.group\\/card button[aria-label="More actions"]'],
    ['History', '/history', 'main button[aria-label="More actions"]'],
    ['a channel page', '/channels/monzur', 'main button[aria-label="More actions"]'],
    ['playlists', '/playlists', 'main button[aria-label^="More actions"]'],
  ] as const)
    test(`${name}: scrolling works and closes the menu`, async ({ page }) => {
      await seed(page);
      await useFakeYouTube(page);
      await page.setViewportSize({ width: 1280, height: 600 });
      await page.goto(path);
      const menu = page.getByRole('menu');
      await expect(async () => {
        if (!(await menu.isVisible())) await page.locator(trigger).locator('visible=true').nth(1).click({ timeout: 3000 });
        await expect(menu).toBeVisible({ timeout: 1000 });
      }).toPass({ timeout: 15_000 });
      await wheel(page, 700, 450);
      await expect(menu).toHaveCount(0);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
    });

  test('related videos: the list and the page scroll while a menu is open, and that closes it', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.setViewportSize({ width: 1440, height: 640 });
    await page.goto('/videos/x/v2');
    const row = page.locator('.group\\/rel').nth(1);
    const open = async () => {
      await row.hover();
      await row.locator('button[aria-label="More actions"]').click();
      await expect(page.getByRole('menu')).toBeVisible();
    };
    await open();
    const b = (await row.boundingBox())!;
    await wheel(page, b.x + 60, b.y + 200);
    await expect(page.getByRole('menu')).toHaveCount(0);
    const list = () => page.locator('aside .yt-scrollbar').first().evaluate((e) => e.scrollTop);
    expect(await list()).toBeGreaterThan(100);
    await page.locator('aside .yt-scrollbar').first().evaluate((e) => e.scrollTo(0, 0));
    await open();
    await wheel(page, 300, 560);
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
  });

  test('a click outside only closes the menu; its own button toggles it; another button switches', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const dots = page.locator('.group\\/card button[aria-label="More actions"]');
    await page.waitForTimeout(1000);
    await dots.nth(1).click();
    await expect(page.getByRole('menu')).toBeVisible();
    const card = (await page.locator('.group\\/card').first().locator('a').first().boundingBox())!;
    await page.mouse.click(card.x + 60, card.y + 60);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await page.waitForTimeout(600);
    expect(new URL(page.url()).pathname).toBe('/');
    // The next click works as usual
    await dots.nth(1).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await dots.nth(1).click();
    await expect(page.getByRole('menu')).toHaveCount(0);
    await dots.nth(1).click();
    await dots.nth(2).click();
    await expect(page.getByRole('menu')).toHaveCount(1);
  });

  test('the notifications panel stays open while the page scrolls', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    await wheel(page, 300, 500);
    await expect(page.getByRole('menu')).toBeVisible();
  });
});
