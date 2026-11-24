import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// Home's category chips: the logo, a Home link or a reload brings the feed back to "All", from the top.

const chips = (page: Page) => page.locator('main button[aria-pressed]');
const selected = (page: Page) => page.locator('main button[aria-pressed="true"]');
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const rowLeft = (page: Page) => chips(page).first().evaluate((b) => Math.round(b.parentElement!.parentElement!.scrollLeft));
const logo = (page: Page) => page.locator('header a[href="/"]:visible');

async function openHome(page: Page) {
  await page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));
  await fakeYouTube(page);
  await page.goto('/');
  await feedShown(page);
}
const feedShown = (page: Page) => expect(page.locator('main a[href^="/videos/"]:visible').first()).toBeVisible({ timeout: 15_000 });

/** Chooses the category with the most videos, then scrolls down with the chips still showing (a little up again) */
async function chooseAndScroll(page: Page) {
  const chip = page.getByRole('button', { name: 'Islamic Lecture', exact: true });
  await chip.click();
  await expect(selected(page)).toHaveText('Islamic Lecture');
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.scrollTo(0, 500));
  await expect.poll(() => scrollY(page)).toBe(500);
  await expect(chip).toBeInViewport();
}
async function expectStartOver(page: Page) {
  await expect(selected(page)).toHaveText('All');
  await expect(selected(page)).toHaveCount(1);
  await expect(selected(page)).toBeInViewport({ ratio: 1 });
  await expect.poll(() => scrollY(page)).toBe(0);
  expect(await rowLeft(page)).toBe(0);
  await page.waitForTimeout(1000); // nothing moves it later
  expect(await scrollY(page)).toBe(0);
}

test.describe("Home's category chips", () => {
  test('the logo goes back to All, from the top', async ({ page }) => {
    await openHome(page);
    await chooseAndScroll(page);
    await logo(page).click();
    await expectStartOver(page);
    await expect(page).toHaveURL('/');

    // Also from the last chip, with the row swiped to its end and no videos below
    await chips(page).last().click();
    await expect(selected(page)).toHaveText('Health');
    expect(await rowLeft(page)).toBeGreaterThan(100);
    await logo(page).click();
    await expectStartOver(page);
    await feedShown(page);
  });

  test('so does Home in the sidebar (phones: in the bottom bar), also with the header hidden', async ({ page, isMobile }) => {
    await openHome(page);
    const home = isMobile
      ? page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Home' })
      : page.locator('aside a[href="/"]:visible');
    const press = () => home.click({ position: { x: 60, y: 6 } }); // on phones, clear of Next.js's badge (dev server)
    await chooseAndScroll(page);
    await press();
    await expectStartOver(page);

    await chooseAndScroll(page);
    await page.evaluate(() => window.scrollTo(0, 650)); // down: the header and chips hide
    await expect(page.locator('header:visible').first()).not.toBeInViewport();
    await press();
    await expectStartOver(page);
  });

  test('a logo opened in a new tab leaves this one as it is', async ({ page, context, isMobile }) => {
    test.skip(isMobile, 'mouse and keyboard only');
    await openHome(page);
    await chooseAndScroll(page);
    const tab = context.waitForEvent('page');
    await logo(page).click({ modifiers: ['ControlOrMeta'] });
    await (await tab).close();
    await expect(selected(page)).toHaveText('Islamic Lecture');
    expect(await scrollY(page)).toBe(500);
  });

  test('a reload goes back to All, from the top', async ({ page }) => {
    await openHome(page);
    for (let k = 0; k < 2; k++) {
      await chooseAndScroll(page);
      await page.reload();
      await feedShown(page);
      await expectStartOver(page);
    }
  });

  test("a reload doesn't hold back the visitor's own scrolling", async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse wheel only');
    await openHome(page);
    await chooseAndScroll(page);
    // The page is still loading when the wheel turns
    let release = () => {};
    const slow = new Promise<void>((r) => (release = r));
    await page.route('**/logo-header*', async (route) => { await slow; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await feedShown(page);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(200);
    const y = await scrollY(page);
    release();
    await page.waitForLoadState('load');
    await page.waitForTimeout(600);
    expect(await scrollY(page)).toBeGreaterThanOrEqual(y);
  });

  test('Back from a video still returns to its place on Home, also after a reload', async ({ page, isMobile }) => {
    test.skip(isMobile, "phones' loading placeholders are shorter than the feed");
    await openHome(page);
    await page.reload();
    await feedShown(page);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(300);
    await page.locator('main a[href^="/videos/"]:visible').nth(12).evaluate((a) => (a as HTMLElement).click());
    await expect(page).toHaveURL(/\/videos\//);
    await page.goBack();
    await feedShown(page);
    await expect.poll(() => scrollY(page)).toBe(600);
  });
});
