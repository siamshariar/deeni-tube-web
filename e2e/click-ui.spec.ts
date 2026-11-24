import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// Nothing stays behind after a click: no focus border, no 3-dot button that keeps showing, no menu left open under
// the dialog it opened. The focus border is for keyboard users (Tab; html[data-keyboard], app/layout.tsx).

const seed = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));
/** Whether the focused element shows a ring or outline */
const focusBorder = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const c = getComputedStyle(el);
    const ring = c.boxShadow !== 'none' && c.boxShadow.split(/,(?![^(]*\))/).some((s) => !/rgba\(0, 0, 0, 0\)/.test(s) && /[1-9]\d*px/.test(s));
    return ring || (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0);
  });

test.describe('After a click (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  test('related list: the 3-dot button goes when its menu closes, without a border', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const row = page.locator('.group\\/rel').nth(1);
    const dots = row.locator('button[aria-label="More actions"]'); // not by role: an open menu hides the page from it
    await row.hover();
    await expect(dots).toHaveCSS('opacity', '1');
    await dots.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await expect(dots).toHaveCSS('opacity', '1'); // while its menu is open
    await page.mouse.click(300, 700); // elsewhere
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(dots).toHaveCSS('opacity', '0');
    expect(await focusBorder(page)).toBe(false);
  });

  for (const item of ['Save to playlist', 'Report'])
    test(`related list: "${item}" closes the menu and opens its dialog, which leaves nothing behind`, async ({ page }) => {
      await seed(page);
      await useFakeYouTube(page);
      await page.goto('/videos/x/v2');
      const row = page.locator('.group\\/rel').nth(1);
      const dots = row.getByRole('button', { name: 'More actions' });
      await row.hover();
      await dots.click();
      await page.getByRole('menuitem', { name: item }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('menu')).toHaveCount(0);
      expect(await focusBorder(page)).toBe(false);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await page.mouse.move(300, 700);
      await expect(dots).toHaveCSS('opacity', '0');
      expect(await focusBorder(page)).toBe(false);
      // The page takes clicks again
      expect(await page.evaluate(() => document.body.style.pointerEvents)).not.toBe('none');
    });

  test('home card: Share, Save to playlist and Report close the menu first', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/');
    const card = page.locator('.group\\/card').nth(1);
    for (const item of ['Save to playlist', 'Report']) {
      await card.getByRole('button', { name: 'More actions' }).click();
      await page.getByRole('menuitem', { name: item }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('menu')).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
  });

  test('the keyboard still shows where the focus is', async ({ page }) => {
    await seed(page);
    await page.goto('/channels');
    await page.waitForTimeout(1000);
    const pill = page.getByRole('button', { name: /Home/ }).first();
    await pill.click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu')).toHaveCount(0);
    expect(await focusBorder(page)).toBe(false);
    await page.keyboard.press('Tab');
    expect(await focusBorder(page)).toBe(true);
    await page.mouse.click(700, 700);
    expect(await page.evaluate(() => 'keyboard' in document.documentElement.dataset)).toBe(false);
  });
});

test.describe('After a tap (touch)', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch only');

  test('related list: the 3-dot button keeps no grey circle once its sheet closes; no tap highlight', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page);
    await page.goto('/videos/x/v2');
    const dots = page.locator('section[aria-labelledby="related-heading-mobile"]').getByRole('button', { name: 'More actions' }).first();
    // (The list is in the server's page; its buttons work once the page's script has run)
    await expect(async () => {
      await dots.scrollIntoViewIfNeeded({ timeout: 2000 });
      await dots.tap({ timeout: 2000 });
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 1500 });
    }).toPass();
    await page.waitForTimeout(500);
    await page.touchscreen.tap(200, 100);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(dots).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    expect(await focusBorder(page)).toBe(false);
    // No rule gives a hover colour without a mouse
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('-webkit-tap-highlight-color'))).toBe('rgba(0, 0, 0, 0)');
  });
});
