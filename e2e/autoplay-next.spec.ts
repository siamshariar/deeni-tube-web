import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// At the end of a video the next one plays by itself, as on YouTube (youtube-player.tsx): also when a play command gets
// lost, its stream stalls or YouTube can't play it, in full screen, and once Autoplay is switched on at the end.

const V2 = 'UugARckPloo'; // /videos/x/v2
const V3 = 'gZ3C_UO_tZM'; // the one after it
const V4 = 'rPEGK8WV1v4';

const seed = (page: Page, autoplay = true) =>
  page.addInitScript((autoplay) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    localStorage.setItem('deeni-feed-playback', 'false');
    if (!sessionStorage.getItem('seeded') && !autoplay) localStorage.setItem('deeni-autoplay', 'false');
    sessionStorage.setItem('seeded', '1');
  }, autoplay);
const frame = async (page: Page, id: string) => {
  const iframe = page.locator(`iframe[src*="/embed/${id}"]`);
  await expect(iframe).toHaveCount(1, { timeout: 15_000 });
  return (await (await iframe.elementHandle())!.contentFrame())!;
};
const playing = (page: Page, id: string) => async () =>
  (await frame(page, id)).evaluate(() => (window as unknown as { __player: () => { playing: boolean } }).__player().playing).catch(() => false);
const end = async (page: Page, id: string) => (await frame(page, id)).evaluate(() => (window as unknown as { __end: () => void }).__end());
const upNext = (page: Page) => page.getByText(/^Up next in \d$/);
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });

async function open(page: Page) {
  await page.goto('/videos/x/v2');
  await expect.poll(playing(page, V2), { timeout: 15_000 }).toBe(true);
}

test.describe('The next video plays by itself', () => {
  test("counts down from 8 to 1, then the next one plays; nothing else shows in between", async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await open(page);
    await end(page, V2);
    await expect(upNext(page)).toHaveText('Up next in 8');
    const seen = new Set<string>();
    await expect(async () => {
      for (let k = 0; k < 40 && page.url().includes(V2); k++) {
        const text = await player(page).innerText().catch(() => '');
        for (const t of [/Up next in \d/.exec(text)?.[0], /^Replay$/m.exec(text)?.[0]]) if (t) seen.add(t);
        await page.waitForTimeout(100);
      }
      expect(page.url()).toContain(V3);
    }).toPass({ timeout: 15_000 });
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8].map((n) => `Up next in ${n}`));
    await expect.poll(playing(page, V3)).toBe(true);
    // …and so on
    await end(page, V3);
    await page.getByRole('button', { name: 'Play now' }).click();
    await expect.poll(playing(page, V4), { timeout: 15_000 }).toBe(true);
    expect(page.url()).toContain(V4);
  });

  test('a lost play command: asked again', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page, { dropFirstPlay: true });
    await open(page);
    await end(page, V2);
    await page.getByRole('button', { name: 'Play now' }).click();
    await expect.poll(playing(page, V3), { timeout: 10_000 }).toBe(true);
    // Paused by the visitor, it stays paused
    await page.keyboard.press('k');
    await page.waitForTimeout(2500);
    expect(await playing(page, V3)()).toBe(false);
  });

  test("a player that doesn't start: loaded again by itself, then it plays", async ({ page }) => {
    test.setTimeout(60_000);
    let loads = 0;
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => (id === V3 && ++loads <= 1 ? 'deaf' : undefined) });
    await open(page);
    await end(page, V2);
    await page.getByRole('button', { name: 'Play now' }).click();
    await expect(page).toHaveURL(new RegExp(V3));
    await expect.poll(playing(page, V3), { timeout: 30_000 }).toBe(true);
    expect(loads).toBe(2);
    await expect(page.getByRole('alert').filter({ hasText: 'This video' })).toHaveCount(0);
  });

  test('a stream that breaks off in the middle: loaded again, and it goes on from there', async ({ page }) => {
    test.setTimeout(60_000);
    let loads = 0;
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => { if (id === V2) loads++; return undefined; } });
    await open(page);
    await (await frame(page, V2)).evaluate(() => (window as unknown as { __break: (t: number) => void }).__break(12));
    await expect.poll(() => loads, { timeout: 12_000 }).toBe(2);
    await expect.poll(playing(page, V2), { timeout: 10_000 }).toBe(true);
    const at = await (await frame(page, V2)).evaluate(() => (window as unknown as { __player: () => { time: number } }).__player().time);
    expect(at).toBeGreaterThanOrEqual(11);
    expect(page.url()).toContain(V2);
  });

  test("stuck in its last seconds (YouTube's stream breaks off after a jump to the end): the next video plays", async ({ page }) => {
    test.setTimeout(60_000);
    await seed(page);
    await fakeYouTube(page);
    await open(page);
    await (await frame(page, V2)).evaluate(() => (window as unknown as { __break: (t: number, giveUp: boolean) => void }).__break(26, false));
    await expect(upNext(page)).toBeVisible({ timeout: 12_000 });
    await expect.poll(playing(page, V3), { timeout: 20_000 }).toBe(true);
    // Paused there by the visitor, it isn't: it waits
    await (await frame(page, V3)).evaluate(() => window.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [26, true] }), '*'));
    await page.keyboard.press('k');
    await expect.poll(playing(page, V3)).toBe(false);
    await page.waitForTimeout(10_000);
    await expect(upNext(page)).toHaveCount(0);
    expect(page.url()).toContain(V3);
  });

  test("a player that never plays says so: Try again and Next video", async ({ page }) => {
    test.setTimeout(90_000);
    let broken = true;
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => (id === V3 && broken ? 'deaf' : undefined) });
    await page.goto('/videos/x/v3');
    const message = page.getByRole('alert').filter({ hasText: "This video isn't playing" });
    await expect(message).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: 'Next video' })).toBeVisible();
    broken = false;
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect.poll(playing(page, V3), { timeout: 10_000 }).toBe(true);
    await expect(message).toHaveCount(0);
  });

  test("a video YouTube can't play: Autoplay goes on to the one after it; opened by the visitor it only says so", async ({ page }) => {
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => (id === V3 ? 'unavailable' : undefined) });
    await open(page);
    await end(page, V2);
    await expect(page).toHaveURL(new RegExp(V3), { timeout: 15_000 });
    const message = page.getByRole('alert').filter({ hasText: "This video isn't available" });
    await expect(message).toBeVisible();
    await expect(upNext(page)).toBeVisible();
    await expect.poll(playing(page, V4), { timeout: 15_000 }).toBe(true);
    expect(page.url()).toContain(V4);

    await page.goto('/videos/x/v3');
    await expect(message).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(upNext(page)).toHaveCount(0);
    await page.getByRole('button', { name: 'Next video' }).click();
    await expect.poll(playing(page, V4), { timeout: 10_000 }).toBe(true);
  });

  test("several in a row that YouTube can't play: it stops instead of going through the whole list", async ({ page }) => {
    test.setTimeout(90_000);
    await seed(page);
    await fakeYouTube(page, { trouble: (id) => (id === V2 ? undefined : 'unavailable') });
    await open(page);
    await end(page, V2);
    const message = page.getByRole('alert').filter({ hasText: "This video isn't available" });
    for (let k = 0; k < 3; k++) {
      const url = page.url();
      await expect(upNext(page)).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: 'Play now' }).click({ trial: true });
      await expect(page).not.toHaveURL(url, { timeout: 15_000 });
    }
    const url = page.url();
    await expect(message).toBeVisible();
    // The third in a row still counts down, the fourth doesn't
    await expect(page).not.toHaveURL(url, { timeout: 15_000 });
    await expect(message).toBeVisible();
    await page.waitForTimeout(1500);
    await expect(upNext(page)).toHaveCount(0);
  });

  test('Autoplay off: it stops at the end; the switch is still there, and turning it on goes on', async ({ page }) => {
    await seed(page, false);
    await fakeYouTube(page);
    await open(page);
    await end(page, V2);
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toBeVisible();
    await expect(upNext(page)).toHaveCount(0);
    const autoplay = player(page).getByRole('switch', { name: /^Autoplay is/ }).locator('visible=true');
    await expect(autoplay).toHaveAttribute('aria-checked', 'false');
    await autoplay.click();
    await expect(upNext(page)).toHaveText('Up next in 8');
    // Off again stops it
    await autoplay.click();
    await expect(upNext(page)).toHaveCount(0);
    await autoplay.click();
    await expect.poll(playing(page, V3), { timeout: 20_000 }).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('deeni-autoplay'))).toBe('true');
  });

  test('the controls at the end: Replay (k), and the bar to go back into the video', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse: on phones only the switches stay');
    await seed(page, false);
    await fakeYouTube(page);
    await open(page);
    await end(page, V2);
    await player(page).getByRole('button', { name: 'Replay (k)' }).click();
    await expect.poll(playing(page, V2)).toBe(true);
    await end(page, V2);
    const bar = (await page.getByRole('slider', { name: 'Seek' }).boundingBox())!;
    await page.mouse.click(bar.x + bar.width / 2, bar.y + 13);
    await expect(page.getByRole('button', { name: 'Replay', exact: true })).toHaveCount(0);
    await expect.poll(playing(page, V2)).toBe(true);
  });

  test("phones: the end screen's buttons and the switches don't overlap, down to 320px", async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones');
    await page.setViewportSize({ width: 320, height: 568 });
    for (const autoplay of [true, false]) {
      await page.goto('about:blank');
      await page.context().clearCookies();
      await page.addInitScript((on) => { if (location.protocol.startsWith('http')) { localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn'], hasSelected: true, isGuest: true })); localStorage.setItem('deeni-autoplay', String(on)); } }, autoplay);
      await fakeYouTube(page);
      await open(page);
      await end(page, V2);
      const button = page.getByRole('button', { name: autoplay ? 'Play now' : 'Replay', exact: true });
      await expect(button).toBeVisible();
      const b = (await button.boundingBox())!;
      const group = (await player(page).getByRole('switch', { name: /^Autoplay is/ }).locator('visible=true').locator('xpath=..').boundingBox())!;
      const p = (await player(page).boundingBox())!;
      expect(b.y).toBeGreaterThanOrEqual(group.y + group.height);
      expect(b.y + b.height).toBeLessThanOrEqual(p.y + p.height);
      await button.click({ trial: true });
      await expect(player(page).getByRole('button', { name: 'Full screen', exact: true })).toBeHidden();
    }
  });
});

test.describe('Full screen', () => {
  test('stays on for the next video, after a 3 second countdown; Esc and leaving the page end it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse and keyboard');
    await seed(page);
    await fakeYouTube(page);
    await open(page);
    const inFull = () => page.evaluate(() => !!document.fullscreenElement);
    const { width, height } = page.viewportSize()!;
    const fills = async () => {
      const b = (await player(page).boundingBox())!;
      return [b.x, b.y, b.width, b.height].map(Math.round);
    };
    await page.keyboard.press('f');
    await expect.poll(inFull).toBe(true);
    await expect.poll(fills).toEqual([0, 0, width, height]);
    // Over the page's header, and the page behind doesn't scroll
    expect(await player(page).evaluate((r) => r.contains(document.elementFromPoint(40, 28)))).toBe(true);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('hidden');

    await end(page, V2);
    await expect(upNext(page)).toHaveText('Up next in 3');
    await expect.poll(playing(page, V3), { timeout: 10_000 }).toBe(true);
    expect(await inFull()).toBe(true);
    expect(await fills()).toEqual([0, 0, width, height]);
    // …also with Next
    await page.mouse.move(400, 300);
    await player(page).getByRole('button', { name: 'Next', exact: true }).click();
    await expect.poll(playing(page, V4), { timeout: 10_000 }).toBe(true);
    expect(await inFull()).toBe(true);

    await page.evaluate(() => document.exitFullscreen()); // what Esc does
    await expect.poll(fills).not.toEqual([0, 0, width, height]);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY)).toBe('scroll');
    // Leaving for another page ends full screen
    await page.keyboard.press('f');
    await expect.poll(inFull).toBe(true);
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(V3));
    await expect.poll(inFull).toBe(false);
  });

  test('a playlist stays in full screen too', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse and keyboard');
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/playlists/monzur-lectures/pl-islamic-1');
    const title = page.locator('main h1').first();
    const first = await title.innerText();
    const iframe = page.locator('iframe[src*="/embed/"]');
    await expect(iframe).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
    await (await (await iframe.elementHandle())!.contentFrame())!.evaluate(() => (window as unknown as { __end: () => void }).__end());
    await expect(title).not.toHaveText(first);
    await expect(iframe).toHaveCSS('opacity', '1', { timeout: 15_000 });
    expect(await page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  });

  test("phones held sideways: the whole video shows (it isn't cut at the top and bottom)", async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phones');
    await page.setViewportSize({ width: 851, height: 393 });
    await seed(page);
    await fakeYouTube(page);
    await open(page);
    await page.keyboard.press('f');
    await expect.poll(async () => Math.round((await player(page).boundingBox())!.width)).toBe(851);
    const f = (await page.locator('iframe[src*="/embed/"]').boundingBox())!;
    // 16:9 at the screen's height, centred (the 120px above and below are YouTube's own bars, cut off)
    expect(Math.abs(f.width - (393 * 16) / 9)).toBeLessThan(1);
    expect(Math.abs(f.x - (851 - f.width) / 2)).toBeLessThan(1);
    expect([f.y, f.height].map(Math.round)).toEqual([-120, 633]);
  });
});
