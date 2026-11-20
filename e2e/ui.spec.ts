import { test, expect, Page } from '@playwright/test';

// UI behaviour requested in the YouTube-style redesign.

const seed = (page: Page, { loggedIn = false, collapsed = false } = {}) =>
  page.addInitScript(([li, col]) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: !li }));
    localStorage.setItem('sidebar-collapsed', String(col));
    if (li) localStorage.setItem('deeni-user-data', JSON.stringify({ name: 'Test User', email: 'test@example.com', initials: 'TU' }));
  }, [loggedIn, collapsed] as const);

test.describe('YouTube-style UI', () => {
  test('home grid: 3 columns with the full sidebar, 4 with the mini sidebar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sidebar');
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [collapsed, columns] of [[false, 3], [true, 4]] as const) {
      await seed(page, { collapsed });
      await page.goto('/');
      const card = page.locator('.group\\/card').locator('visible=true').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      const grid = card.locator('..');
      const count = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(count).toBe(columns);
    }
  });

  test('three-dot buttons are visible without hovering', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const button = page.getByRole('button', { name: 'More actions' }).locator('visible=true').first();
    await expect(button).toBeVisible({ timeout: 10_000 });
    expect(await button.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('three-dot icons are the same size on every page (20px phone, 24px desktop)', async ({ page, isMobile }) => {
    await seed(page);
    for (const path of ['/', '/channels/monzur', '/search?q=quran', '/history', '/watch-later', '/videos/x/v2']) {
      await page.goto(path);
      const icon = page.locator('svg[data-icon="more-vert"]').locator('visible=true').first();
      await expect(icon, path).toBeVisible({ timeout: 10_000 });
      const size = await icon.evaluate((el) => el.getBoundingClientRect().width);
      expect(size, path).toBe(isMobile ? 20 : 24);
    }
  });

  test('history remove buttons are visible without hovering', async ({ page }) => {
    await seed(page);
    await page.goto('/history');
    const remove = page.getByRole('button', { name: /from history$/ }).first();
    await expect(remove).toBeVisible({ timeout: 10_000 });
    expect(await remove.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('notifications panel opens at its full height (no growing after loading)', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    const panel = page.getByRole('menu');
    await expect(page.getByLabel('Loading notifications')).toBeVisible();
    // Layout height (ignores the open animation's scale)
    const loadingHeight = await panel.evaluate((el) => (el as HTMLElement).offsetHeight);
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    const loadedHeight = await panel.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(Math.abs(loadedHeight - loadingHeight)).toBeLessThan(2);
  });

  test('clicking a notification opens it and closes the panel', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    await page.getByRole('menu').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\//);
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('account menu: Appearance opens in place and changes the theme', async ({ page }) => {
    await seed(page, { loggedIn: true });
    await page.goto('/help');
    await page.getByRole('button', { name: 'Account menu' }).locator('visible=true').click();
    await expect(page.getByText('View your account')).toBeVisible();
    await page.getByRole('menuitem', { name: /Appearance/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // Back on the main page of the menu, showing the new setting
    await expect(page.getByRole('menuitem', { name: 'Appearance: Dark theme' })).toBeVisible();
  });
});
