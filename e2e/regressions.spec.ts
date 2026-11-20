import { test, expect, Page } from '@playwright/test';

// Regression tests for bugs found in the Nov 2026 audit.

const seedLanguagePrefs = (page: Page) =>
  page.addInitScript(() => {
    if (!localStorage.getItem('deeni-lang-prefs')) {
      localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    }
  });

test.describe('Regressions', () => {
  test.beforeEach(async ({ page }) => {
    await seedLanguagePrefs(page);
  });

  test('header search submits on Enter even with recent searches', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop header search');
    await page.addInitScript(() => localStorage.setItem('recentSearches', JSON.stringify(['quran'])));
    await page.goto('/');
    const input = page.getByPlaceholder('Search').first();
    await input.click();
    await input.fill('hadith');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/search\?q=hadith/);
    // The recent list was not wiped by the "Clear all" button
    const recent = await page.evaluate(() => JSON.parse(localStorage.getItem('recentSearches') || '[]'));
    expect(recent).toContain('quran');
  });

  test('searching again from /search shows the new results', async ({ page }) => {
    await page.goto('/search?q=zzzznomatch');
    await expect(page.getByText('No results found').locator('visible=true').first()).toBeVisible({ timeout: 10000 });
    await page.goto('/search?q=Menk');
    await expect(page.getByText('No results found').locator('visible=true')).toHaveCount(0, { timeout: 10000 });
  });

  for (const url of ['/videos/nope/does-not-exist', '/channels/does-not-exist', '/scholars/does-not-exist', '/categories/does-not-exist']) {
    test(`unknown id shows the not-found page: ${url}`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
      await expect(page.locator('iframe[src*="/embed/"]')).toHaveCount(0);
    });
  }

  test('pages have their own titles', async ({ page }) => {
    await page.goto('/playlists');
    await expect(page).toHaveTitle('Playlists - Deeni.tube');
    await page.goto('/channels/monzur');
    await expect(page).toHaveTitle(/Monzur.* - Deeni\.tube$/);
  });

  test('watching a video adds it to History, and removal persists', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('deeni-watch-history', '[]'));
    await page.goto('/videos/x/v2');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('deeni-watch-history') || '[]').map((v: { id: string }) => v.id))).toEqual(['v2']);
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: 'Watch history' })).toBeVisible();
    await page.getByRole('button', { name: 'More actions' }).locator('visible=true').first().click();
    // Desktop opens a menu, mobile opens a drawer
    await page.getByText('Remove from History').locator('visible=true').first().click();
    await page.reload();
    await expect(page.getByText('History is empty')).toBeVisible();
  });

  test('liking a short adds it to Liked videos', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('deeni-liked-videos', '[]'));
    await page.goto('/shorts');
    await page.getByRole('button', { name: 'Like' }).locator('visible=true').first().click();
    await page.goto('/liked-videos');
    await expect(page.getByText('Shorts — 1')).toBeVisible();
  });

  test('channel links on video cards open the channel page', async ({ page }) => {
    await page.goto('/');
    const channelLink = page.locator('a[href^="/channels/"]:visible').first();
    await expect(channelLink).toBeVisible({ timeout: 10000 });
    const href = await channelLink.getAttribute('href');
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
  });

  test('saving two videos to Watch Later keeps both', async ({ page, isMobile }) => {
    test.skip(isMobile, 'uses the desktop card menu');
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('deeni-watch-later', '[]'));
    await page.reload();
    const menus = page.getByRole('button', { name: 'More actions' }).locator('visible=true');
    for (const i of [0, 1]) {
      await menus.nth(i).click();
      await page.getByRole('menuitem', { name: /Save to Watch later/i }).click();
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('deeni-watch-later') || '[]'));
    expect(saved).toHaveLength(2);
    await page.goto('/watch-later');
    await expect(page.getByText('Videos — 2')).toBeVisible();
  });

  test('a playlist created on /playlists survives a reload and opens', async ({ page }) => {
    await page.goto('/playlists');
    await page.getByRole('button', { name: 'New playlist' }).first().click();
    await page.getByPlaceholder('My playlist').fill('Regression list');
    await page.getByRole('button', { name: /^Create$/ }).click();
    await page.reload();
    const card = page.getByRole('link', { name: 'Regression list' });
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByText('No videos in this playlist yet')).toBeVisible();
  });

  test('settings page hydrates without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' && /hydrat|did not match/i.test(m.text())) errors.push(m.text()); });
    await page.goto('/settings');
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
