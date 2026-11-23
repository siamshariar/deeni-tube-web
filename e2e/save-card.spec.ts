import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// YouTube's "Save to..." card (components/save-card.tsx): opens at the pressed button (a bottom sheet on phones), a
// choice saves or removes and closes it, and the message at the bottom left has the video's picture and Change or Undo.

const seed = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('deeni-watch-later', '[]');
  });
const message = (page: Page) => page.locator('[data-sonner-toast]:not([data-removed="true"])');
const savedIds = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('deeni-watch-later') || '[]').map((v: { id: string }) => v.id));
const card = (page: Page) => page.getByRole('dialog', { name: 'Save to...' });
const openFromPill = async (page: Page) => {
  // Retry until the page has hydrated and the click opens the card
  await expect(async () => {
    if (!(await card(page).isVisible())) await page.getByRole('button', { name: 'Save', exact: true }).locator('visible=true').first().click({ timeout: 2000 });
    await expect(card(page)).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
};

test.describe('Save card', () => {
  test('a choice saves and closes it; the message has the picture and Change; choosing again removes, with Undo', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/v2');
    await openFromPill(page);
    const watchLater = card(page).getByRole('checkbox', { name: /Watch later/ });
    await expect(watchLater).not.toBeChecked();
    await watchLater.click();
    await expect(card(page)).toBeHidden();
    await expect.poll(() => savedIds(page)).toEqual(['v2']);
    await expect(message(page)).toContainText('Saved to Watch later');
    await expect(message(page).locator('img')).toBeVisible();

    await message(page).getByRole('button', { name: 'Change' }).click();
    await expect(card(page)).toBeVisible();
    await expect(watchLater).toBeChecked();
    await watchLater.click();
    await expect(card(page)).toBeHidden();
    await expect.poll(() => savedIds(page)).toEqual([]);
    await expect(message(page)).toContainText('Removed from Watch later');
    await message(page).getByRole('button', { name: 'Undo' }).click();
    await expect.poll(() => savedIds(page)).toEqual(['v2']);
  });

  test('a new playlist: its name and privacy, made and saved to', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/v2');
    await openFromPill(page);
    await card(page).getByRole('button', { name: 'New playlist' }).click();
    await expect(card(page).getByRole('button', { name: 'Create', exact: true })).toBeDisabled();
    await card(page).getByLabel('Name').fill('Voice test list');
    await card(page).getByRole('button', { name: 'Privacy: Private' }).click();
    await page.getByRole('menuitemradio', { name: /Public/ }).click();
    await expect(card(page).getByRole('button', { name: 'Privacy: Public' })).toBeVisible();
    await card(page).getByRole('button', { name: 'Create', exact: true }).click();
    await expect(card(page)).toBeHidden();
    await expect(message(page)).toContainText('Saved to Voice test list');
    const created = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('deeni-playlists') || '[]').find((p: { name: string }) => p.name === 'Voice test list'));
    expect(created).toMatchObject({ isPublic: true, videoIds: ['v2'] });
  });

  test("Share buttons have YouTube's curved arrow", async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/v2');
    const share = page.getByRole('button', { name: 'Share', exact: true }).locator('visible=true').first();
    await expect(share.locator('svg path')).toHaveAttribute('d', /^M10 3\.158V7\.51/);
    await expect(page.getByRole('button', { name: 'Save', exact: true }).locator('visible=true').first().locator('svg path')).toHaveAttribute('d', /^M19 2H5a2 2 0 00-2 2/);
  });
});

test.describe('Save card: desktop', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop only');

  test('it opens at its button, left edges in line; scrolling or a click outside closes it', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/videos/x/v2');
    await openFromPill(page);
    const pill = (await page.getByRole('button', { name: 'Save', exact: true }).first().boundingBox())!;
    await expect.poll(async () => Math.round((await card(page).boundingBox())!.x)).toBe(Math.round(pill.x));
    const c = (await card(page).boundingBox())!;
    expect(Math.round(c.width)).toBe(300);
    // Right above or below the button
    const gap = c.y > pill.y ? c.y - (pill.y + pill.height) : pill.y - (c.y + c.height);
    expect(Math.round(gap)).toBe(4);
    // A row: cover, name, privacy, and an outlined bookmark
    const row = card(page).getByRole('checkbox').first();
    await expect(row).toContainText('Watch later');
    await expect(row).toContainText('Private');

    const url = page.url();
    await page.mouse.click(300, 300); // on the video: only closes the card
    await expect(card(page)).toHaveCount(0);
    expect(page.url()).toBe(url);

    await page.setViewportSize({ width: 1440, height: 640 });
    await openFromPill(page);
    await page.mouse.move(120, 600);
    for (let i = 0; i < 4; i++) {
      await page.mouse.wheel(0, 60);
      await page.waitForTimeout(50);
    }
    await expect(card(page)).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(30);
  });

  test('from a 3-dot menu it opens at the 3 dots', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForTimeout(1000);
    const dots = page.locator('.group\\/card button[aria-label="More actions"]').first();
    await dots.click();
    await page.getByRole('menuitem', { name: 'Save to playlist' }).click();
    await expect(card(page)).toBeVisible();
    const d = (await dots.boundingBox())!;
    await page.waitForTimeout(300);
    const c = (await card(page).boundingBox())!;
    expect(Math.abs(c.x - d.x)).toBeLessThan(2);
    expect(Math.min(Math.abs(c.y - (d.y + d.height)), Math.abs(d.y - (c.y + c.height)))).toBeLessThan(6);
    await page.keyboard.press('Escape');
    await expect(card(page)).toHaveCount(0);
  });

  test("the message is at the bottom left, as YouTube's: 16px in, 30px up", async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/videos/x/v2');
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: 'Watch later' }).first().click();
    const box = message(page).locator('> div').first();
    await expect.poll(async () => Math.round(900 - ((await box.boundingBox())!.y + (await box.boundingBox())!.height))).toBe(30);
    const b = (await box.boundingBox())!;
    expect(Math.round(b.x)).toBe(16);
    expect(b.width).toBeLessThanOrEqual(416);
    expect(Math.round(b.height)).toBe(56); // with a picture; 48 without
    await expect(box).toHaveCSS('background-color', 'rgb(15, 15, 15)');
  });
});

test.describe('Save card: phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'phones only');

  test('it is a sheet along the bottom edge', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/v2');
    await openFromPill(page);
    await page.waitForTimeout(700);
    const c = (await card(page).boundingBox())!;
    const view = page.viewportSize()!;
    expect(Math.round(c.width)).toBe(view.width);
    expect(Math.round(c.y + c.height)).toBe(view.height);
  });
});
