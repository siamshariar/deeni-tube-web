import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// Without a connection: the message along the bottom and "Back online", the players (they wait, and go on by themselves),
// pictures, voice search, and opening or reloading a page (public/sw.js, offline.html).

const V1 = 'T9oT-oOaTNU';
const PLAYER = '[aria-label="Video player"]';
const seed = (page: Page) =>
  page.addInitScript(() => {
    if (top !== window) return;
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
  });
const notice = (page: Page) => page.locator('.connection-bar p');
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });

test('"You\'re offline" until the connection is back, then "Back online" for a moment; above the phone\'s bottom nav', async ({ page, context, isMobile }) => {
  await seed(page);
  await page.goto('/help');
  await expect(page.locator('.connection-bar')).toBeAttached();
  await expect(notice(page)).toHaveCount(0);
  await page.waitForTimeout(500);
  await context.setOffline(true);
  await expect(notice(page)).toHaveText("You're offline. Check your connection.");
  await page.waitForTimeout(500); // it slides in
  const box = (await notice(page).boundingBox())!;
  const { width, height } = page.viewportSize()!;
  expect([Math.round(box.x), Math.round(box.width)]).toEqual([0, width]);
  if (isMobile) {
    await page.goto('about:blank').catch(() => {});
    await context.setOffline(false);
    await page.goto('/channels');
    await page.waitForTimeout(800);
    await context.setOffline(true);
    await expect(notice(page)).toBeVisible();
    await page.waitForTimeout(400);
    const nav = (await page.locator('nav').locator('visible=true').last().boundingBox())!;
    const b = (await notice(page).boundingBox())!;
    expect(Math.abs(b.y + b.height - nav.y)).toBeLessThanOrEqual(1);
  } else expect(Math.round(box.y + box.height)).toBe(height);
  await page.waitForTimeout(3500);
  await expect(notice(page)).toBeVisible(); // it stays
  await context.setOffline(false);
  await expect(notice(page)).toHaveText('Back online');
  await expect(notice(page)).toHaveCount(0, { timeout: 5000 });
});

test('links that were loaded ahead still open', async ({ page, context }) => {
  await seed(page);
  await page.goto('/channels');
  await page.waitForTimeout(2500);
  await context.setOffline(true);
  await page.locator('main a[href^="/channels/"]').locator('visible=true').first().click();
  await page.waitForURL(/\/channels\/./);
  await expect(page.locator('h1').locator('visible=true').first()).toBeVisible();
});

test('a playing video that stops: it says so, waits, and goes on by itself', async ({ page, context }) => {
  await seed(page);
  await fakeYouTube(page, { clock: true });
  await page.goto(`/videos/x/${V1}`);
  await expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
  await page.waitForTimeout(1500);
  await context.setOffline(true);
  const frame = (await (await page.locator(`${PLAYER} iframe`).elementHandle())!.contentFrame())!;
  await page.locator(`${PLAYER} iframe`).evaluate((e) => { e.dataset.old = ''; });
  await frame.evaluate(() => (window as unknown as { __break: (t: number) => void }).__break(9));
  await expect(player(page).getByRole('alert')).toContainText("You're offline", { timeout: 8000 });
  await player(page).getByRole('button', { name: 'Try again' }).click(); // nothing to try yet
  await page.waitForTimeout(6500);
  await expect(player(page).getByRole('alert')).toContainText("You're offline"); // (and the player isn't loaded again meanwhile)
  await expect(page.locator(`${PLAYER} iframe`)).toHaveAttribute('data-old', '');
  await context.setOffline(false);
  await expect(player(page).getByRole('alert')).toHaveCount(0);
  await expect(page.locator(`${PLAYER} iframe[data-old]`)).toHaveCount(0);
  const again = (await (await page.locator(`${PLAYER} iframe`).elementHandle())!.contentFrame())!;
  await expect.poll(() => again.evaluate(() => (window as unknown as { __player: () => { playing: boolean } }).__player().playing)).toBe(true);
});

test('a video and a short opened without a connection play once it is back', async ({ page, context }) => {
  let offline = true;
  await seed(page);
  await fakeYouTube(page, { trouble: () => (offline ? 'silent' : undefined) });
  for (const [url, say] of [[`/videos/x/${V1}`, player(page).getByRole('alert')], ['/shorts', page.locator('section [role="alert"]')]] as const) {
    offline = true;
    await page.goto(url);
    await page.waitForTimeout(300);
    await context.setOffline(true);
    await expect(say).toContainText("You're offline", { timeout: 8000 });
    offline = false;
    await context.setOffline(false);
    await expect(say).toHaveCount(0);
    const iframe = page.locator(url === '/shorts' ? 'iframe.shorts-video-iframe' : `${PLAYER} iframe`).first();
    await expect(iframe).toHaveCSS('opacity', '1', { timeout: 10_000 });
  }
});

test('pictures that couldn\'t load aren\'t shown broken, and load when it is back', async ({ page, context }) => {
  await seed(page);
  await page.goto('/help');
  await page.waitForTimeout(800);
  await context.setOffline(true);
  await page.evaluate(() => { const i = document.createElement('img'); i.id = 'late'; i.src = '/logo-header.webp?late=1'; document.querySelector('main')!.append(i); });
  await expect(page.locator('#late')).toHaveCSS('visibility', 'hidden');
  await context.setOffline(false);
  await expect(page.locator('#late')).toHaveCSS('visibility', 'visible');
  expect(await page.locator('#late').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
});

test('voice search says so', async ({ page, context, isMobile }) => {
  await seed(page);
  await page.addInitScript(() => {
    navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput' }] as unknown as MediaDeviceInfo[];
    Object.assign(window, { SpeechRecognition: class { start() {} stop() {} abort() {} } });
  });
  await page.goto('/help');
  await page.waitForTimeout(800);
  if (isMobile) await page.getByRole('button', { name: 'Search', exact: true }).locator('visible=true').first().tap();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Search with your voice' }).locator('visible=true').last().click();
  const dialog = page.getByRole('dialog', { name: 'Search with your voice' });
  await expect(dialog.getByText('Check your connection, then try again')).toBeVisible();
});

test.describe('Opening and reloading a page (the built site)', () => {
  test.use({ serviceWorkers: 'allow' });

  test('"Connect to the internet", then the page itself', async ({ page, context }) => {
    await seed(page);
    await page.goto('/channels');
    await page.waitForTimeout(500);
    const built = await page.evaluate(() => fetch('/_next/static/chunks/webpack.js', { method: 'HEAD' }).then(() => !document.querySelector('nextjs-portal'), () => true));
    test.skip(!built || /:3000/.test(page.url()), 'the dev server has no service worker');
    await page.waitForFunction(() => navigator.serviceWorker.ready.then((r) => !!r.active && !!navigator.serviceWorker.controller), null, { timeout: 20_000 });
    // While online it does nothing: an old address of a video still leads to it (its answer came through broken, a 404)
    await page.goto(`/videos/old-address-${Date.now()}/XVscS6piz9A`);
    await expect(player(page)).toBeVisible();
    await page.goto('/channels');
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Connect to the internet' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.locator('header img:visible')).toHaveJSProperty('complete', true);
    expect(await page.locator('header img:visible').evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
    await page.goto('/history').catch(() => {});
    await expect(page.getByRole('heading', { name: 'Connect to the internet' })).toBeVisible();
    await context.setOffline(false);
    await expect(page).toHaveTitle(/history/i, { timeout: 15_000 }); // by itself
    await expect(page.getByRole('heading', { name: 'Connect to the internet' })).toHaveCount(0);
  });
});
