import { test, expect, devices, Page, Frame } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// iPhone: a tap on a video starts it WITH SOUND (lib/player-host.ts). Safari only allows sound when a playing
// player is unmuted inside the tap, which the fake player models (ios: true): a player started on its own
// stays muted. WebKit with an iPhone profile; runs once (in the mobile project).

test.use({ ...devices['iPhone 13'] });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'iPhone tests run once');
});

const PLACEHOLDER = 'p3Mrisem6ek';

const seed = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    // No card previews: only the shared player's frame on the page
    localStorage.setItem('deeni-feed-playback', 'false');
  });

type FakeState = { playing: boolean; muted: boolean; videoId: string };
const hostFrame = async (page: Page): Promise<Frame> => {
  const iframe = page.locator('[data-player-host] iframe');
  await expect(iframe).toHaveCount(1, { timeout: 15_000 });
  return (await (await iframe.elementHandle())!.contentFrame())!;
};
const fake = (frame: Frame) => frame.evaluate(() => (window as unknown as { __player: () => FakeState }).__player());
const log = (frame: Frame) => frame.evaluate(() => (window as unknown as { __log: [string, unknown[]][] }).__log.map(([f, a]) => `${f}${f === 'loadVideoById' ? ':' + (a[0] as { videoId: string }).videoId : ''}`));

test.describe('iPhone: tap to play with sound', () => {
  test('a tap on a video card plays it with sound in the shared player, with no "Tap to unmute"', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto('/');
    const frame = await hostFrame(page);
    // Ready for a tap: the placeholder plays, muted and hidden
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: true, videoId: PLACEHOLDER });
    await expect(page.locator('[data-player-host]')).toBeHidden();

    const card = page.locator('a[href^="/videos/"]:visible').first();
    const id = (await card.getAttribute('href'))!.split('/').pop()!;
    await card.tap();
    await expect(page).toHaveURL(new RegExp(`/videos/.+/${id}$`));

    // The tap itself switched the shared player to this video and unmuted it, in that order
    const sent = await log(frame);
    const load = sent.lastIndexOf(`loadVideoById:${id}`);
    expect(load).toBeGreaterThan(-1);
    expect(sent.slice(load, load + 3)).toEqual([`loadVideoById:${id}`, 'unMute', 'playVideo']);
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: id });
    await expect(page.getByRole('button', { name: /to unmute/ })).toHaveCount(0);

    // One player on the page (the shared one), placed exactly over the video box, under our controls
    await expect(page.locator('iframe')).toHaveCount(1);
    const box = (await page.getByRole('region', { name: 'Video player' }).boundingBox())!;
    const host = page.locator('[data-player-host]');
    await expect(host).toBeVisible();
    const h = (await host.boundingBox())!;
    expect(Math.abs(h.x - box.x)).toBeLessThan(1);
    expect(Math.abs(h.y - box.y)).toBeLessThan(1);
    expect(Math.abs(h.width - box.width)).toBeLessThan(1);
    expect(Math.abs(h.height - box.height)).toBeLessThan(1);

    // Our controls drive it: they hide on their own while it plays, a tap brings them back, Pause pauses it
    const controls = page.locator('[role="slider"][aria-label="Seek"]').locator('xpath=ancestor::div[contains(@class,"transition-opacity")][1]');
    await expect(controls).toHaveCSS('opacity', '0', { timeout: 6000 });
    await page.getByRole('region', { name: 'Video player' }).tap({ position: { x: box.width / 4, y: box.height / 2 } });
    await expect(controls).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'Pause (k)' }).tap();
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(false);
    await page.getByRole('button', { name: 'Play (k)' }).tap();
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(true);

    // The next video (a related one) keeps the sound
    const links = page.locator('main a[href^="/videos/"]:visible');
    const hrefs = await links.evaluateAll((els) => els.map((a) => a.getAttribute('href')!));
    const nextHref = hrefs.find((h) => !h.endsWith(`/${id}`))!;
    const related = page.locator(`main a[href="${nextHref}"]:visible`).first();
    await related.scrollIntoViewIfNeeded();
    const nextId = nextHref.split('/').pop()!;
    await related.tap();
    await expect(page).toHaveURL(new RegExp(`/videos/.+/${nextId}$`));
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: nextId });
    await expect(page.locator('iframe')).toHaveCount(1);

    // Leaving the watch pages: hidden, paused, then back to the muted placeholder for the next tap
    await page.goBack();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('[data-player-host]')).toBeHidden();
    await expect.poll(() => fake(frame), { timeout: 10_000 }).toMatchObject({ playing: true, muted: true, videoId: PLACEHOLDER });
  });

  test('opened from a link (no tap in the app): plays muted, and "Tap to unmute" gives it sound', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto('/videos/x/v2');
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: true });
    const unmute = page.getByRole('button', { name: /to unmute/ });
    await expect(unmute).toBeVisible();
    await unmute.tap();
    await expect.poll(() => fake(frame).then((s) => s.muted)).toBe(false);
    await expect(unmute).toHaveCount(0);
  });

  test('the controls hide by themselves a moment after the video starts', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto('/');
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame).then((s) => s.videoId)).toBe(PLACEHOLDER);
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(true);
    await page.locator('a[href^="/videos/"]:visible').first().tap();
    const time = page.locator('[role="slider"][aria-label="Seek"]');
    await expect.poll(() => fake(frame).then((s) => s.playing && !s.muted)).toBe(true);
    // Hidden (faded out) after about 3 seconds of playing, as in YouTube's app
    await expect(time.locator('xpath=ancestor::div[contains(@class,"transition-opacity")][1]')).toHaveCSS('opacity', '0', { timeout: 6000 });
  });
});
