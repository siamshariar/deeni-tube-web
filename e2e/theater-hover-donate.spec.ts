import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// Theater mode and the sleep timer, hover effects (all measured on youtube.com), Shorts' speed, the donation's thanks.

const seed = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
  });
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });
const rect = async (page: Page, css: string) => page.locator(css).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top + scrollY, r.width, r.height].map(Math.round); });
const PLAYER = '[aria-label="Video player"]';
const commands = (page: Page) => page.frameLocator('iframe[src*="/embed/"]').first().locator('body').evaluate(() => (window as unknown as { __log: [string, unknown[]][] }).__log.map(([f, a]) => `${f}:${a?.[0] ?? ''}`));

test.describe('Theater mode (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');
  test.use({ viewport: { width: 1440, height: 900 } });
  const open = async (page: Page, url = '/videos/x/T9oT-oOaTNU') => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto(url);
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
  };

  for (const url of ['/videos/x/T9oT-oOaTNU', '/playlists/monzur-lectures/pl-islamic-1']) test(`as on YouTube, in the same player, kept after a reload, and back: ${url.split('/')[1]}`, async ({ page }) => {
    await open(page, url);
    expect(await rect(page, PLAYER)).toEqual([16, 68, 996, 560]);
    await page.locator(`${PLAYER} iframe`).evaluate((e) => { e.dataset.same = ''; });
    await page.mouse.move(400, 300);
    await player(page).getByRole('button', { name: 'Theater mode (t)' }).click();
    await expect.poll(() => rect(page, PLAYER)).toEqual([0, 56, 1440, 731]);
    expect((await rect(page, '.watch-side'))[1]).toBe(811);
    const frame = await rect(page, `${PLAYER} iframe`);
    expect([frame[0], frame[2]]).toEqual([70, 1300]); // no wider than the video
    await expect(page.locator(`${PLAYER} iframe`)).toHaveAttribute('data-same', '');
    await page.reload();
    await expect.poll(() => rect(page, PLAYER)).toEqual([0, 56, 1440, 731]);
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await page.mouse.move(420, 320);
    await expect(player(page).getByRole('button', { name: 'Default view (t)' })).toBeVisible();
    await page.keyboard.press('t');
    await expect.poll(() => rect(page, PLAYER)).toEqual([16, 68, 996, 560]);
  });

  test('never under 480px high, no sideways scrolling; full screen still fills the screen', async ({ page }) => {
    await open(page);
    await page.keyboard.press('t');
    await page.setViewportSize({ width: 1100, height: 600 });
    await expect.poll(() => rect(page, PLAYER)).toEqual([0, 56, 1100, 480]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
    await page.keyboard.press('f');
    await expect.poll(async () => (await rect(page, PLAYER)).slice(2)).toEqual([1100, 600]);
    await page.mouse.move(400, 300);
    await expect(player(page).getByRole('button', { name: /view|Theater/ })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await page.evaluate(() => document.exitFullscreen());
    await expect.poll(() => rect(page, PLAYER)).toEqual([0, 56, 1100, 480]);
  });
});

test.describe('Sleep timer', () => {
  const settings = async (page: Page, isMobile: boolean) => {
    const box = (await player(page).boundingBox())!;
    if (!isMobile) await page.mouse.move(box.x + 200 + Math.random() * 40, box.y + 120);
    // (they hide a moment after it starts: a tap shows them)
    else if (!(await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').count())) await page.touchscreen.tap(box.x + 30, box.y + 110);
    await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
  };

  test('after 10 minutes the video pauses and says so', async ({ page, isMobile }) => {
    await page.clock.install();
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/T9oT-oOaTNU');
    await page.clock.runFor(2000);
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await settings(page, isMobile);
    await player(page).getByRole('menuitem', { name: 'Sleep timer Off' }).click();
    await player(page).getByRole('menuitemradio', { name: '10 minutes' }).click();
    await settings(page, isMobile);
    await expect(player(page).getByRole('menuitem', { name: 'Sleep timer 10 min left' })).toBeVisible();
    await page.clock.runFor(9.5 * 60_000);
    expect(await commands(page)).not.toContain('pauseVideo:');
    await page.clock.runFor(31_000);
    expect(await commands(page)).toContain('pauseVideo:');
    await expect(page.getByText('Sleep timer ended. Video paused')).toBeVisible();
  });

  test('"End of video": the next one doesn\'t start by itself', async ({ page, isMobile }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/videos/x/T9oT-oOaTNU');
    await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await settings(page, isMobile);
    await player(page).getByRole('menuitem', { name: 'Sleep timer Off' }).click();
    await player(page).getByRole('menuitemradio', { name: 'End of video' }).click();
    const frame = (await (await page.locator(`${PLAYER} iframe`).elementHandle())!.contentFrame())!;
    await frame.evaluate(() => (window as unknown as { __end: () => void }).__end());
    await expect(player(page).getByRole('button', { name: 'Replay' }).locator('visible=true').last()).toBeVisible();
    await expect(page.getByText('Sleep timer ended')).toBeVisible();
    await expect(player(page).getByText(/Up next in/)).toHaveCount(0);
  });
});

test.describe('Hover (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  for (const [theme, strength] of [['light', '0.13'], ['dark', '0.17']] as const) test(`cards and rows take their thumbnail's colour (${theme})`, async ({ page }) => {
    await seed(page);
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme);
    await fakeYouTube(page);
    for (const [url, css, out, corner] of [['/', '.group\\/card', 12, '16px'], ['/history', 'main [data-tint]', 8, '8px'], ['/watch-later', 'main [data-tint]', 8, '8px'], ['/liked-videos', 'main [data-tint]', 8, '8px'], ['/playlists', 'main [data-tint]', 12, '16px']] as const) {
      await page.mouse.move(2, 2);
      await page.goto(url);
      const card = css.includes('tint') ? page.locator(css).locator('visible=true').first().locator('xpath=..') : page.locator(css).locator('visible=true').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      const tint = card.locator('> [data-tint]');
      await expect(tint).toHaveCSS('opacity', '0');
      await card.hover({ position: { x: 60, y: 8 } });
      await expect(tint).toHaveCSS('opacity', '1');
      const look = await tint.evaluate((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(), p = e.parentElement!.getBoundingClientRect(); return { bg: c.backgroundColor, corner: c.borderRadius, out: Math.round(p.left - r.left) }; });
      expect(look.bg, url).toMatch(new RegExp(`, ${strength.replace('.', '\\.')}\\)$`));
      expect([url, look.out, look.corner]).toEqual([url, out, corner]);
    }
  });

  test('History, Watch later and Liked: the thumbnail moves on hover', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    // 1×1 pictures for the storyboard sheets
    await page.route('**/sb/**', (r) => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }));
    for (const url of ['/history', '/watch-later', '/liked-videos']) {
      await page.goto(url);
      const row = page.locator('main [data-tint]').locator('visible=true').first().locator('xpath=..');
      await expect(row).toBeVisible({ timeout: 10_000 });
      await expect(row.locator('[data-moving]')).toHaveCount(0);
      await row.hover({ position: { x: 300, y: 10 } });
      await expect(row.locator('[data-moving]').first()).toBeAttached({ timeout: 8000 });
      await page.mouse.move(2, 2);
      await expect(row.locator('[data-moving]')).toHaveCount(0);
    }
  });
});

test('Shorts: playback speed in the menu, kept for the next short', async ({ page }) => {
  await seed(page);
  await fakeYouTube(page);
  await page.goto('/shorts?v=MBxDbbkk0gQ');
  const section = page.locator('section').first();
  await expect(section.locator('iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
  await section.getByRole('button', { name: 'More options' }).click();
  await expect(page.locator('[data-action="speed"]')).toContainText('Normal');
  await page.locator('[data-action="speed"]').click();
  await page.getByRole('radio', { name: '1.5', exact: true }).click();
  await expect(page.getByRole('radio', { name: '1.5', exact: true })).toHaveCount(0);
  await expect.poll(() => commands(page)).toContain('setPlaybackRate:1.5');
  await page.keyboard.press('ArrowDown');
  const second = page.locator('section').nth(1);
  await expect(second.locator('iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
  await expect.poll(async () => {
    const f = (await (await second.locator('iframe').elementHandle())!.contentFrame())!;
    return f.evaluate(() => (window as unknown as { __log: [string, unknown[]][] }).__log.some(([c, a]) => c === 'setPlaybackRate' && a[0] === 1.5));
  }).toBe(true);
});

test('Donate: once confirmed, JazakAllahu khairan, until the visitor goes on', async ({ page }) => {
  await seed(page);
  await page.goto('/donate');
  await expect(page.getByRole('button', { name: 'Donate now' })).toBeDisabled();
  await page.getByRole('radio', { name: /Monthly partner/ }).click();
  await page.getByRole('button', { name: /^Donate \$10/ }).click();
  const thanks = page.getByRole('status').filter({ hasText: 'JazakAllahu khairan' });
  await expect(thanks).toBeInViewport();
  await expect(thanks).toContainText('Monthly partner');
  await page.waitForTimeout(2500);
  await expect(thanks).toBeVisible(); // it stays
  await page.getByRole('button', { name: 'Donate again' }).click();
  await expect(page.getByRole('button', { name: 'Donate now' })).toBeDisabled();
});
