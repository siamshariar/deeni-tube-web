import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// The watch player's controls, as on youtube.com and m.youtube.com (sizes measured there): each group on its own dark
// rounded backing.

const seed = (page: Page) =>
  page.addInitScript(() => localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true })));
const open = async (page: Page) => {
  await seed(page);
  await fakeYouTube(page);
  await page.goto('/videos/x/v2');
  await expect(page.locator('iframe[src*="/embed/"]').first()).toHaveCSS('opacity', '1', { timeout: 15_000 });
  const region = page.getByRole('region', { name: 'Video player' });
  return { region, box: (await region.boundingBox())! };
};
const backing = (bg: string) => bg === 'rgba(0, 0, 0, 0.3)';

test.describe('Player controls (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  test('40px groups on a dark backing, 8px above the bottom edge and 12px from the sides', async ({ page }) => {
    const { region, box } = await open(page);
    await page.mouse.move(box.x + 300, box.y + 200);
    for (const name of [/^Pause \(k\)$/, /^(Unm|M)ute \(m\)$/, /^Settings$/]) {
      const group = region.getByRole('button', { name }).locator('xpath=..');
      const g = (await group.boundingBox())!;
      expect(Math.round(g.height)).toBe(40);
      expect(Math.round(box.y + box.height - (g.y + g.height))).toBe(8);
      expect(backing(await group.evaluate((e) => getComputedStyle(e).backgroundColor))).toBe(true);
    }
    const play = (await region.getByRole('button', { name: 'Pause (k)' }).boundingBox())!;
    expect(Math.round(play.x - box.x)).toBe(12);
    const right = (await region.getByRole('button', { name: 'Settings' }).locator('xpath=..').boundingBox())!;
    expect(Math.round(box.x + box.width - (right.x + right.width))).toBe(12);
  });

  test('volume opens its slider on hover; the name and key show; the time switches to the time left', async ({ page }) => {
    const { region, box } = await open(page);
    await page.mouse.move(box.x + 300, box.y + 200);
    const mute = region.getByRole('button', { name: /^(Unm|M)ute \(m\)$/ });
    const slider = region.getByRole('slider', { name: 'Volume' });
    await mute.hover();
    await expect.poll(async () => Math.round((await slider.boundingBox())!.width)).toBe(52);
    await expect(mute.locator('kbd')).toBeVisible();
    const time = region.getByRole('button', { name: /\/ 0:30$/ });
    await time.click();
    await expect(time).toHaveText(/^-0:\d\d \/ 0:30$/);
    await time.click();
    await expect(time).toHaveText(/^0:\d\d \/ 0:30$/);
  });

  test('settings: above the bar, with Autoplay, captions and speed', async ({ page }) => {
    const { region, box } = await open(page);
    await page.mouse.move(box.x + 300, box.y + 200);
    await region.getByRole('button', { name: 'Settings' }).click();
    const menu = region.getByRole('menu', { name: 'Settings' });
    const m = (await menu.boundingBox())!;
    expect(Math.round(box.y + box.height - (m.y + m.height))).toBe(62);
    await menu.getByRole('menuitem', { name: 'Subtitles/CC Off' }).click();
    await menu.getByRole('menuitemradio', { name: 'Bangla (auto-generated)' }).click();
    await region.getByRole('button', { name: 'Settings' }).click();
    await expect(menu.getByRole('menuitem', { name: 'Subtitles/CC Bangla (auto-generated)' })).toBeVisible();
    await menu.getByRole('menuitem', { name: /Playback speed/ }).click();
    await menu.getByRole('menuitemradio', { name: '1.5', exact: true }).click();
    await expect(menu).toHaveCount(0);
    await region.getByRole('button', { name: 'Settings' }).click();
    await expect(region.getByRole('menuitem', { name: 'Playback speed 1.5' })).toBeVisible();
  });
});

test.describe('Player controls (touch)', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch only');

  test('play in the middle, switches at the top right, time and full screen above the bar, each on a backing', async ({ page }) => {
    const { region, box } = await open(page);
    await page.waitForTimeout(3600); // the controls hide
    await page.touchscreen.tap(box.x + box.width * 0.75, box.y + 80);
    const play = region.getByRole('button', { name: 'Pause', exact: true });
    const p = (await play.boundingBox())!;
    expect(Math.round(p.width)).toBe(56);
    expect(Math.abs(p.x + p.width / 2 - (box.x + box.width / 2))).toBeLessThan(1);
    expect(Math.abs(p.y + p.height / 2 - (box.y + box.height / 2))).toBeLessThan(1);
    expect(backing(await play.evaluate((e) => getComputedStyle(e).backgroundColor))).toBe(true);
    const settings = region.getByRole('button', { name: 'Settings' });
    const s = (await settings.boundingBox())!;
    expect(s.y - box.y).toBeLessThan(16);
    expect(backing(await settings.locator('xpath=..').evaluate((e) => getComputedStyle(e).backgroundColor))).toBe(true);
    const line = (await page.locator('[data-seek-line]').boundingBox())!;
    expect(Math.round(box.y + box.height - (line.y + line.height / 2))).toBe(22);
    const full = (await region.getByRole('button', { name: 'Full screen', exact: true }).boundingBox())!;
    expect(full.y + full.height / 2).toBeLessThan(line.y);
    expect(Math.round(line.height)).toBe(3);
    // No volume button: phones have their own keys
    await expect(region.getByRole('button', { name: /mute \(m\)/i })).toHaveCount(0);
    await play.tap();
    await expect(region.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  });
});
