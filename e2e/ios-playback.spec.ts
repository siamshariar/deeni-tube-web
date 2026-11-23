import { test, expect, devices, Page, Frame } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// iPhone: a tap on a video or a short starts it WITH SOUND (lib/player-host.ts), and swiping to the next short
// keeps the sound. Safari only allows sound when a playing player is unmuted inside the tap, which the fake
// player models (ios: true): a player started on its own stays muted. WebKit with an iPhone profile; runs once
// (in the mobile project).

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
    // Shown once the video is (the shared player shows once YouTube has drawn it at this size), then hidden
    await expect(controls).toHaveCSS('opacity', '1', { timeout: 6000 });
    await expect(controls).toHaveCSS('opacity', '0', { timeout: 6000 });
    await page.getByRole('region', { name: 'Video player' }).tap({ position: { x: box.width / 4, y: box.height / 2 } });
    await expect(controls).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(false);
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
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

  test('a tap on a video watched before goes on from where it was left, with sound', async ({ page }) => {
    await seed(page);
    await page.addInitScript(() => localStorage.setItem('deeni-watch-progress', JSON.stringify({ UugARckPloo: { t: 12, d: 30, at: Date.now() } })));
    await useFakeYouTube(page, { ios: true });
    await page.goto('/');
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(true);
    const card = page.locator('a[href$="/UugARckPloo"]:visible').first();
    await expect(card.locator('[data-watched]')).toHaveAttribute('data-watched', '40');
    await card.tap();
    await expect.poll(() => frame.evaluate(() => (window as unknown as { __player: () => FakeState & { time: number } }).__player()))
      .toMatchObject({ playing: true, muted: false, videoId: 'UugARckPloo', time: 12 });
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

const FIRST_SHORT = 'MBxDbbkk0gQ';
const SECOND_SHORT = 'goHfO28fE-A';
const THIRD_SHORT = '8YfQCDjlQsc';

// The shared player covers the short on screen: its box exactly, with the 9:16 video filling it (no side bars)
async function expectHostOver(page: Page, index: number) {
  const box = page.locator('.shorts-player-box').nth(index);
  const host = page.locator('[data-player-host]');
  await expect(host).toHaveCSS('opacity', '1');
  await expect.poll(async () => {
    const [b, h] = [(await box.boundingBox())!, (await host.boundingBox())!];
    return Math.max(Math.abs(b.x - h.x), Math.abs(b.y - h.y), Math.abs(b.width - h.width), Math.abs(b.height - h.height));
  }).toBeLessThan(1);
  const b = (await box.boundingBox())!;
  const f = (await page.locator('[data-player-host] iframe').boundingBox())!;
  // The frame is the video plus YouTube's bars above and below it (120px each), which fall outside the box
  const video = { x: f.x, y: f.y + 120, width: f.width, height: f.height - 240 };
  expect(video.width / video.height).toBeCloseTo(9 / 16, 2);
  expect(video.x).toBeLessThanOrEqual(b.x + 0.5);
  expect(video.x + video.width).toBeGreaterThanOrEqual(b.x + b.width - 0.5);
  expect(video.y).toBeLessThanOrEqual(b.y + 0.5);
  expect(video.y + video.height).toBeGreaterThanOrEqual(b.y + b.height - 0.5);
}

test.describe('iPhone: Shorts with sound', () => {
  test('a tap on Shorts plays the first short with sound in the shared player; the next short keeps the sound', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto('/');
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: true, videoId: PLACEHOLDER });

    // Record when the shared player is laid out (display) and shown (opacity)
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>('[data-player-host]')!;
      const log: [number, string, string, boolean][] = [];
      (window as unknown as { __hostLog: typeof log }).__hostLog = log;
      new MutationObserver(() => log.push([performance.now(), host.style.display, host.style.opacity, !!document.querySelector('.shorts-player-box')]))
        .observe(host, { attributes: true, attributeFilter: ['style'] });
    });
    await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Shorts' }).tap();
    await expect(page).toHaveURL(/\/shorts$/);
    const sent = await log(frame);
    const load = sent.lastIndexOf(`loadVideoById:${FIRST_SHORT}`);
    expect(load).toBeGreaterThan(-1);
    expect(sent.slice(load, load + 3)).toEqual([`loadVideoById:${FIRST_SHORT}`, 'unMute', 'playVideo']);
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: FIRST_SHORT });
    await expect(page.getByRole('button', { name: /to unmute/ })).toHaveCount(0);
    // One player for the whole feed, over the short on screen
    await expect(page.locator('iframe')).toHaveCount(1);
    await expectHostOver(page, 0);
    // Not shown the moment it's laid out at the short's size, but once YouTube has had time to redraw it there
    // (otherwise the video shows small, then zooms to fill the screen)
    const hostLog = await page.evaluate(() => (window as unknown as { __hostLog: [number, string, string, boolean][] }).__hostLog);
    // Laid out at the short's size in the tap itself, before the Shorts page exists (YouTube redraws it meanwhile)
    const first = hostLog.find(([, display]) => display === 'block')!;
    expect(first[3]).toBe(false);
    const laidOut = first[0];
    const shown = hostLog.find(([t, display, opacity]) => t >= laidOut && display === 'block' && opacity === '1')![0];
    // (400ms in the player; the observer sees the first change only after the page's mount work, ~80ms late.
    // Shown at once, the gap would be near 0)
    expect(shown - laidOut).toBeGreaterThanOrEqual(250);

    // Next short: the same player loads it, still with sound
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: SECOND_SHORT });
    await expect(page.locator('iframe')).toHaveCount(1);
    await expectHostOver(page, 1);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: THIRD_SHORT });
    await expect(page.getByRole('button', { name: /to unmute/ })).toHaveCount(0);

    // Leaving Shorts: hidden, and back to the muted placeholder
    await page.goto('/');
    await expect(page.locator('[data-player-host]')).toBeHidden();
  });

  test('a tap on a short card plays that short with sound', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto('/channels/monzur');
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame).then((s) => s.playing)).toBe(true);
    await page.getByRole('tab', { name: 'Shorts' }).tap();
    const card = page.locator('a[href^="/shorts?v="]:visible').first();
    const id = new URL((await card.getAttribute('href'))!, 'http://x').searchParams.get('v')!;
    await card.tap();
    await expect(page).toHaveURL(new RegExp(`/shorts\\?v=${id}`));
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: id });
    await expect(page.getByRole('button', { name: /to unmute/ })).toHaveCount(0);
  });

  test('opened from a link (no tap in the app): muted with "Tap to unmute"; after that tap, swiping keeps the sound', async ({ page }) => {
    await seed(page);
    await useFakeYouTube(page, { ios: true });
    await page.goto(`/shorts?v=${SECOND_SHORT}`);
    const frame = await hostFrame(page);
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: true, videoId: SECOND_SHORT });
    const unmute = page.getByRole('button', { name: /to unmute/ });
    await expect(unmute).toBeVisible();
    await unmute.tap();
    await expect.poll(() => fake(frame).then((s) => s.muted)).toBe(false);
    await expect(unmute).toHaveCount(0);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => fake(frame)).toMatchObject({ playing: true, muted: false, videoId: THIRD_SHORT });
    await expect(unmute).toHaveCount(0);
  });
});
