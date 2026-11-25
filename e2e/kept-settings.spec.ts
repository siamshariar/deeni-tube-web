import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// What must not get lost or stay behind: volume, mute and speed on the next video; the sleep timer between videos; theater
// mode in two tabs; the player's settings closing; damaged or blocked storage. And Share: every site, with the right link.

const V1 = 'T9oT-oOaTNU';
const V2 = 'XVscS6piz9A';
const PLAYER = '[aria-label="Video player"]';
const seed = (page: Page) =>
  page.addInitScript(() => {
    if (top !== window) return;
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
  });
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });
const plays = (page: Page) => expect(page.locator(`${PLAYER} iframe`)).toHaveCSS('opacity', '1', { timeout: 15_000 });
const log = (page: Page, id: string) =>
  page.frameLocator(`iframe[src*="/embed/${id}"]`).locator('body').evaluate(() => (window as unknown as { __log: [string, unknown[]][] }).__log.map(([f, a]) => `${f}:${a?.[0] ?? ''}`));
const open = async (page: Page, url: string) => {
  await seed(page);
  await fakeYouTube(page);
  await page.goto(url);
};
const settings = async (page: Page, isMobile: boolean) => {
  const box = (await player(page).boundingBox())!;
  if (!isMobile) await page.mouse.move(box.x + 200 + Math.random() * 40, box.y + 120);
  else if (!(await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').count())) await page.touchscreen.tap(box.x + 30, box.y + 110);
  await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
  await expect(player(page).getByRole('menu')).toBeVisible();
};

test.describe('Volume, mute and speed (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'phones have no volume button');

  test('stay for the next video, after a reload and on Shorts', async ({ page, isMobile }) => {
    await open(page, `/videos/x/${V1}`);
    await plays(page);
    const box = (await player(page).boundingBox())!;
    await page.mouse.move(box.x + 300, box.y + 150);
    await player(page).getByRole('button', { name: /^Mute/ }).hover(); // opens the slider
    await player(page).getByRole('slider', { name: 'Volume' }).fill('30');
    await settings(page, !!isMobile);
    await player(page).getByRole('menuitem', { name: /Playback speed/ }).click();
    await player(page).getByRole('menuitemradio', { name: '1.5', exact: true }).click();
    await page.keyboard.press('m');
    const next = page.locator('[aria-labelledby^="related"] a:has(h3)').locator('visible=true').first();
    const id = (await next.getAttribute('href'))!.split('/').pop()!;
    await next.click();
    await expect.poll(() => log(page, id)).toEqual(expect.arrayContaining(['setVolume:30', 'mute:', 'setPlaybackRate:1.5']));
    await plays(page);
    await expect(player(page).getByRole('button', { name: 'Click to unmute' })).toHaveCount(0); // muted on purpose
    await page.reload();
    await expect.poll(() => log(page, id)).toEqual(expect.arrayContaining(['setVolume:30', 'mute:', 'setPlaybackRate:1.5']));
    // Sound on again stays on too
    await plays(page);
    await page.keyboard.press('m');
    await page.goto('/shorts');
    const first = page.locator('iframe.shorts-video-iframe').first();
    const src = (await first.getAttribute('src'))!.match(/embed\/([\w-]{11})/)![1];
    await expect.poll(() => log(page, src)).toEqual(expect.arrayContaining(['setVolume:30', 'unMute:']));
  });

  test('Shorts: Unmute at volume 0 brings the sound back', async ({ page }) => {
    await open(page, '/shorts');
    await page.evaluate(() => localStorage.setItem('deeni-volume', '{"volume":0,"muted":true}'));
    await page.reload();
    const unmute = page.locator('[data-mute-toggle]').locator('visible=true').first();
    await expect(unmute).toHaveAttribute('aria-label', 'Unmute');
    const box = (await page.locator('.shorts-player-box').first().boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await unmute.click();
    await expect(unmute).toHaveAttribute('aria-label', 'Mute');
    expect(await page.evaluate(() => localStorage.getItem('deeni-volume'))).toBe('{"volume":50,"muted":false}');
  });
});

test.describe('Sleep timer', () => {
  const set = async (page: Page, isMobile: boolean, choice: string) => {
    await settings(page, isMobile);
    await player(page).getByRole('menuitem', { name: /Sleep timer/ }).click();
    await player(page).getByRole('menuitemradio', { name: choice }).click();
  };

  test('over on a page without a video: the next one opened plays', async ({ page, isMobile }) => {
    await page.clock.install();
    await open(page, `/videos/x/${V1}`);
    await page.clock.runFor(2000);
    await plays(page);
    await set(page, !!isMobile, '10 minutes');
    await page.locator('a[href="/"]').locator('visible=true').first().click();
    await page.waitForURL((u) => u.pathname === '/');
    await page.clock.runFor(11 * 60_000);
    await page.locator('main a[href^="/videos/"]').locator('visible=true').first().click();
    await page.waitForURL(/\/videos\//);
    await page.clock.runFor(3000);
    await plays(page);
    await expect(page.getByText(/Sleep timer ended/)).toHaveCount(0);
    const id = page.url().split('/').pop()!;
    expect(await log(page, id)).not.toContain('pauseVideo:');
  });

  test('stops the countdown to the next video', async ({ page, isMobile }) => {
    await page.clock.install();
    await open(page, `/videos/x/${V1}`);
    await page.clock.runFor(2000);
    await plays(page);
    await set(page, !!isMobile, '10 minutes');
    await page.clock.runFor(10 * 60_000 - 4000);
    const frame = (await (await page.locator(`${PLAYER} iframe`).elementHandle())!.contentFrame())!;
    await frame.evaluate(() => (window as unknown as { __end: () => void }).__end());
    await expect(player(page).getByText(/Up next in/)).toBeVisible();
    await page.clock.runFor(30_000);
    await expect(player(page).getByText(/Up next in/)).toHaveCount(0);
    expect(page.url()).toContain(V1);
  });
});

test('theater mode switched in another tab: this one follows', async ({ page, context, isMobile }) => {
  test.skip(!!isMobile, 'mouse only');
  await open(page, `/videos/x/${V1}`);
  await plays(page);
  const other = await context.newPage();
  await open(other, `/videos/x/${V2}`);
  await plays(other);
  await other.keyboard.press('t');
  await expect(other.locator('html[data-theater]')).toHaveCount(1);
  await expect(page.locator('html[data-theater]')).toHaveCount(1);
});

test.describe('The player\'s settings close', () => {
  const menu = (page: Page) => player(page).getByRole('menu');
  const press = (page: Page, isMobile: boolean, x: number, y: number) => (isMobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));

  test('with a press on the page, and on the video without pausing it', async ({ page, isMobile }) => {
    await open(page, `/videos/x/${V1}`);
    await plays(page);
    const box = (await player(page).boundingBox())!;
    // Beside the player, on its title under it
    await settings(page, !!isMobile);
    const title = (await page.locator('h1').locator('visible=true').last().boundingBox())!;
    await press(page, !!isMobile, title.x + 20, title.y + 8);
    await expect(menu(page)).toHaveCount(0);
    // On the video
    await settings(page, !!isMobile);
    await press(page, !!isMobile, box.x + 25, box.y + 60);
    await expect(menu(page)).toHaveCount(0);
    expect(await log(page, V1)).not.toContain('pauseVideo:');
    // In one of its pages, too
    await settings(page, !!isMobile);
    await player(page).getByRole('menuitem', { name: /Playback speed/ }).click();
    await expect(menu(page).getByText('Normal')).toBeVisible();
    await press(page, !!isMobile, box.x + 25, box.y + 60);
    await expect(menu(page)).toHaveCount(0);
    // A press in it doesn't
    await settings(page, !!isMobile);
    await player(page).getByRole('menuitem', { name: /Sleep timer/ }).click();
    await expect(menu(page).getByText('10 minutes')).toBeVisible();
    // The button itself closes it
    if (!isMobile) {
      await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
      await expect(menu(page)).toHaveCount(0);
    }
  });

  test('with Escape, with other controls, and when a search starts', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'keyboard and mouse');
    await open(page, `/videos/x/${V1}`);
    await plays(page);
    await settings(page, false);
    await page.keyboard.press('Escape');
    await expect(menu(page)).toHaveCount(0);
    await settings(page, false);
    await player(page).getByRole('button', { name: /^Mute/ }).click(); // also does what it does
    await expect(menu(page)).toHaveCount(0);
    expect(await log(page, V1)).toContain('mute:');
    await settings(page, false);
    await page.getByPlaceholder('Search').first().click();
    await expect(menu(page)).toHaveCount(0);
  });
});

test.describe('Share', () => {
  const ALL = ['WhatsApp', 'Facebook', 'X', 'Telegram', 'Email', 'LinkedIn', 'Reddit', 'Pinterest', 'Threads', 'Bluesky', 'Viber', 'LINE', 'Tumblr', 'VK'];
  const HOSTS: Record<string, string> = {
    WhatsApp: 'api.whatsapp.com/send', Facebook: 'www.facebook.com/sharer/sharer.php', X: 'x.com/intent/post', Telegram: 't.me/share/url', LinkedIn: 'www.linkedin.com/sharing/share-offsite/',
    Reddit: 'www.reddit.com/submit', Pinterest: 'www.pinterest.com/pin/create/button/', Threads: 'www.threads.com/intent/post', Bluesky: 'bsky.app/intent/compose', LINE: 'social-plugins.line.me/lineit/share',
    Tumblr: 'www.tumblr.com/widgets/share/tool', VK: 'vk.com/share.php',
  };

  test('every site, each opening its share page with the link and the title', async ({ page, isMobile }) => {
    await page.addInitScript(() => {
      (window as unknown as { __opened: string[] }).__opened = [];
      window.open = ((url: string) => { (window as unknown as { __opened: string[] }).__opened.push(url); return null; }) as typeof window.open;
    });
    await open(page, `/videos/x/${V1}`);
    await page.getByRole('button', { name: 'Share', exact: true }).locator('visible=true').first().click();
    const dialog = page.getByRole('dialog', { name: 'Share' });
    const sites = dialog.getByRole('group', { name: 'Share on' });
    await expect(sites).toBeVisible();
    const names = await sites.getByRole('button').locator('span.text-xs').allTextContents();
    expect(names.filter((n) => n !== 'More')).toEqual(isMobile ? ['WhatsApp', 'Facebook', 'Messenger', ...ALL.slice(2)] : ALL);
    const title = (await page.locator('h1').last().textContent())!.trim();
    for (const name of Object.keys(HOSTS)) await sites.getByRole('button', { name: `Share on ${name}`, exact: true }).click();
    const opened = await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);
    Object.entries(HOSTS).forEach(([name, host], i) => {
      const url = new URL(opened[i]);
      expect(url.host + url.pathname, name).toBe(host);
      const said = decodeURIComponent(url.search);
      expect(said, name).toContain(`/${V1}`);
      expect(said, name).toContain('https://deeni-tube-web.vercel.app/videos/'); // not localhost, which nobody else can open
      if (!['Facebook', 'LinkedIn'].includes(name)) expect(said.replaceAll('+', ' '), name).toContain(title.slice(0, 20));
    });
    expect(new URL(opened[Object.keys(HOSTS).indexOf('Pinterest')]).searchParams.get('media')).toContain(V1);
    // Nothing wider than the dialog
    const box = (await dialog.boundingBox())!;
    expect(await dialog.evaluate((d) => d.scrollWidth - d.clientWidth)).toBeLessThanOrEqual(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
  });

  test('the arrows show the rest (mouse)', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'swiped with a finger');
    await open(page, '/channels/monzur');
    await page.getByRole('button', { name: 'Share', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Share' });
    await expect(dialog.getByRole('button', { name: 'More sites' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Previous' })).toHaveCount(0);
    for (let i = 0; i < 5 && (await dialog.getByRole('button', { name: 'More sites' }).count()); i++) {
      await dialog.getByRole('button', { name: 'More sites' }).click();
      await page.waitForTimeout(600);
    }
    await expect(dialog.getByRole('button', { name: 'Share on VK' })).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: 'More sites' })).toHaveCount(0);
  });

  test('Copy works where the browser has no clipboard for pages', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined });
      document.execCommand = (() => { (window as unknown as { __copied: string }).__copied = (document.activeElement as HTMLTextAreaElement).value; return true; }) as typeof document.execCommand;
    });
    await open(page, '/channels/monzur');
    await page.getByRole('button', { name: 'Share', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Share' });
    await dialog.getByRole('button', { name: 'Copy' }).click();
    await expect(dialog.getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __copied: string }).__copied)).toBe('https://deeni-tube-web.vercel.app/channels/monzur');
  });

  test('an app that isn\'t there says so', async ({ page }) => {
    await page.clock.install();
    await open(page, '/channels/monzur');
    await page.getByRole('button', { name: 'Share', exact: true }).first().click();
    await page.getByRole('dialog', { name: 'Share' }).getByRole('button', { name: 'Share with Viber' }).click();
    await page.clock.runFor(3000);
    await expect(page.getByText("Viber didn't open. You can copy the link")).toBeVisible();
  });
});

test.describe('Shorts: captions and their translation', () => {
  // A short with Bangla captions
  const ID = 'ihdO_G6Yk0E';

  test('the menu has YouTube\'s: off, the languages, Auto-translate', async ({ page }) => {
    await open(page, `/shorts?v=${ID}`);
    const told = () => page.frameLocator(`iframe[src*="/embed/${ID}"]`).locator('body').evaluate(() => { const c = (window as unknown as { __captions: () => { lang: string | null; to: string | null } }).__captions(); return [c.lang, c.to]; });
    const openCaptions = async () => {
      await page.locator('section').filter({ has: page.locator(`iframe[src*="/embed/${ID}"]`) }).getByRole('button', { name: 'More options' }).locator('visible=true').first().click();
      await page.locator('[data-action="captions"]').click();
      await expect(page.getByRole('dialog', { name: 'Captions' })).toBeVisible();
    };
    await openCaptions();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true');
    await dialog.getByRole('radio', { name: 'Bangla (auto-generated)' }).click();
    await expect.poll(told).toEqual(['bn', null]);
    await openCaptions();
    await dialog.getByRole('button', { name: /Auto-translate/ }).click();
    expect(await dialog.getByRole('radio').count()).toBe(155); // YouTube's 156 but the one it is in
    await expect(dialog.getByRole('radio').first()).toHaveText('English');
    await dialog.getByRole('radio', { name: 'English', exact: true }).click();
    await expect.poll(told).toEqual(['bn', 'en']);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await openCaptions();
    await expect(dialog.getByRole('button', { name: /Auto-translate English/ })).toBeVisible();
    await dialog.getByRole('radio', { name: 'Off' }).click();
    await expect.poll(told).toEqual([null, null]);
  });
});

test.describe('Saved data', () => {
  const KEYS = ['sidebar-collapsed', 'deeni-lang-prefs', 'deeni-user-data', 'recentSearches', 'deeni-watch-later', 'deeni-liked-videos', 'deeni-watch-history', 'deeni-playlists', 'deeni-notification-prefs', 'feed-visible-channels',
    'deeni-autoplay', 'deeni-feed-playback', 'deeni-theater', 'deeni-captions', 'deeni-preview-captions', 'deeni-watch-progress', 'deeni-volume', 'shorts_comments', 'shorts_liked_ids', 'shorts_disliked_ids'];
  const PAGES = ['/', `/videos/x/${V1}`, '/search?q=allah', '/shorts', '/playlists', '/history', '/liked-videos', '/watch-later', '/you', '/settings', '/channels/monzur'];
  for (const value of ['null', '{}', '[null]', '"x"', '{x', 'blocked']) {
    test(`${value === 'blocked' ? 'storage blocked' : `damaged: ${value}`}: every page shows, and search works`, async ({ page, isMobile }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript(([keys, v]) => {
        if (top !== window) return;
        if (v === 'blocked') for (const s of ['localStorage', 'sessionStorage']) Object.defineProperty(window, s, { configurable: true, get() { throw new DOMException('denied', 'SecurityError'); } });
        else for (const k of keys as string[]) if (!sessionStorage.getItem('done')) localStorage.setItem(k, v as string);
        try { sessionStorage.setItem('done', '1'); } catch {}
      }, [KEYS, value] as const);
      await fakeYouTube(page);
      for (const url of PAGES) {
        await page.goto(url);
        await page.waitForTimeout(250);
        await expect(page.getByText(/Something went wrong|couldn.t load/), url).toHaveCount(0);
        expect((await page.locator('body').innerText()).length, url).toBeGreaterThan(40);
        expect(errors, url).toEqual([]);
      }
      if (isMobile) return;
      await page.getByPlaceholder('Search').first().click();
      await page.getByPlaceholder('Search').first().fill('quran');
      await page.keyboard.press('Enter');
      await page.waitForURL(/\/search\?q=quran/);
      expect(errors).toEqual([]);
    });
  }
});
