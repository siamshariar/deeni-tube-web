import { test, expect, type Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// Every screen size: phones held sideways, foldables and the narrowest phones, tablets, larger text, notches.
// One browser is enough: the sizes are set here.
test.beforeEach(({}, info) => test.skip(info.project.name !== 'chromium', 'sets its own sizes'));
test.use({ hasTouch: true });

const VIDEO = '/videos/islamic-halaka-shesh-jamanar-fitna-prof-dr-mohammad-monzur-e/XVscS6piz9A';

async function open(page: Page, url: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.addInitScript(() => {
    if (window.top !== window) return;
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
    localStorage.setItem('deeni-feed-playback', 'false');
  });
  await fakeYouTube(page);
  await page.goto(url);
}

/** Buttons and links that are partly outside the screen (those in a list that scrolls sideways are fine) */
const outside = (page: Page) =>
  page.evaluate(() => {
    const w = document.documentElement.clientWidth;
    const scrolls = (e: Element) => {
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return true;
      return false;
    };
    const bad = [...document.querySelectorAll('main button, main a, main h1, main h2, main input, header button, header a')]
      .filter((e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !e.closest('.sr-only') && !scrolls(e))
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 1 && (r.left < -1 || r.right > w + 1);
      })
      .map((e) => (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30));
    return { over: Math.max(0, document.documentElement.scrollWidth - w), bad };
  });

const PAGES = ['/', VIDEO, '/channels', '/channels/monzur', '/scholars/monzur/about', '/categories', '/playlists', '/history', '/watch-later', '/search?q=allah', '/you', '/settings', '/more/rate', '/donate', '/signin'];

for (const [width, height] of [[280, 653], [320, 568], [568, 320], [740, 360], [844, 390], [768, 1024]]) {
  test(`nothing runs off the screen at ${width}x${height}`, async ({ page }) => {
    test.slow();
    for (const url of PAGES) {
      await open(page, url, width, height);
      await expect(page.locator('main h1').first()).toBeAttached();
      await page.waitForTimeout(400);
      expect(await outside(page), url).toEqual({ over: 0, bad: [] });
    }
  });
}

test('larger text (the browser\'s 150%) still fits on a phone', async ({ page }) => {
  test.slow();
  await page.addInitScript(() => {
    const add = () => document.documentElement.appendChild(Object.assign(document.createElement('style'), { textContent: 'html{font-size:24px !important}' }));
    if (document.documentElement) add();
    else document.addEventListener('readystatechange', add, { once: true });
  });
  for (const url of ['/', '/channels', '/playlists', '/more/rate', '/you', '/settings']) {
    await open(page, url, 360, 740);
    await expect(page.locator('main h1').first()).toBeAttached();
    await page.waitForTimeout(400);
    expect(await outside(page), url).toEqual({ over: 0, bad: [] });
  }
});

test.describe('phones held sideways', () => {
  for (const [width, height] of [[568, 320], [740, 360], [844, 390], [932, 430]]) {
    test(`Shorts: the buttons are beside the video, none on another (${width}x${height})`, async ({ page }) => {
      await open(page, '/shorts', width, height);
      await expect(page.locator('button[aria-label="More options"]').first()).toBeVisible();
      await page.waitForTimeout(800);
      const r = await page.evaluate(() => {
        const section = document.querySelector('section')!;
        const box = section.querySelector('.shorts-player-box')!.getBoundingClientRect();
        const buttons = [...section.querySelectorAll('button')]
          .filter((b) => b.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && b.getBoundingClientRect().width > 0 && !b.hasAttribute('data-mute-toggle'))
          .map((b) => ({ name: b.getAttribute('aria-label') || b.textContent!.trim(), r: b.getBoundingClientRect() }));
        const clashes: string[] = [];
        buttons.forEach((a, i) =>
          buttons.slice(i + 1).forEach((b) => {
            const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
            const y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
            if (x > 2 && y > 2) clashes.push(`${a.name} × ${b.name}`);
          })
        );
        const rail = [...section.querySelectorAll('button[aria-label^="Like"], button[aria-label^="Unlike"], button[aria-label="More options"]')].map((b) => b.getBoundingClientRect());
        return {
          ratio: Math.round((box.height / box.width) * 100) / 100,
          onScreen: box.top >= 0 && box.bottom <= innerHeight,
          beside: rail.every((b) => b.left >= box.right),
          reachable: buttons.every((b) => b.r.left >= 0 && b.r.right <= innerWidth && b.r.top >= 0 && b.r.bottom <= innerHeight),
          clashes,
        };
      });
      expect(r).toEqual({ ratio: 1.78, onScreen: true, beside: true, reachable: true, clashes: [] });
    });

    test(`the whole player shows, its bar included, and its menu (${width}x${height})`, async ({ page }) => {
      await open(page, VIDEO, width, height);
      const player = page.getByRole('region', { name: 'Video player' });
      await expect(player).toBeVisible();
      const box = (await player.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(height + 0.5);
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
      // A tap shows the controls (or hides them: they are up at the start)
      const settings = player.getByRole('button', { name: 'Settings' }).locator('visible=true');
      await expect(async () => {
        if (!(await settings.isVisible())) await player.tap({ position: { x: 30, y: box.height / 2 } });
        await settings.tap({ timeout: 1000 });
      }).toPass();
      const menu = (await page.getByRole('menu', { name: 'Settings' }).boundingBox())!;
      expect(menu.y).toBeGreaterThanOrEqual(0);
      expect(menu.y + menu.height).toBeLessThanOrEqual(height);
    });
  }

  test('the app bar scrolls away with the page', async ({ page }) => {
    await open(page, '/channels/monzur', 740, 360);
    await page.evaluate(() => window.scrollTo(0, 600));
    const bar = (await page.locator('[data-page-bar]').boundingBox())!;
    expect(bar.y + bar.height).toBeLessThanOrEqual(0);
    expect((await page.getByRole('tablist').boundingBox())!.y).toBeCloseTo(56, 0);
  });

  test('menus and sheets fit, and every row can be reached', async ({ page }) => {
    await open(page, '/shorts', 932, 430);
    await page.locator('button[aria-label="More options"]').first().tap();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(430);
    await page.locator('[data-action="feedback"]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-action="feedback"]')).toBeInViewport();

    await open(page, '/', 568, 320);
    await page.locator('main button[aria-label="More actions"]').locator('visible=true').first().tap();
    await page.locator('[data-action="playlist"]').tap();
    await page.getByRole('button', { name: 'New playlist' }).tap();
    await page.getByRole('button', { name: 'Create' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Create' })).toBeInViewport();
  });
});

// (the Comment button is switched off, see app/shorts/page.tsx)
test('Shorts have no Comment button', async ({ page }) => {
  await open(page, '/shorts', 390, 844);
  await expect(page.locator('button[aria-label^="Like"], button[aria-label^="Unlike"]').first()).toBeVisible();
  await expect(page.locator('button[aria-label^="Comments"]')).toHaveCount(0);
});

test.describe.skip('Shorts comments', () => {
  for (const [width, height, sheet] of [[390, 844, true], [768, 1024, true], [844, 390, true], [1024, 768, false], [1280, 720, false], [1280, 1024, false]] as const) {
    test(`${sheet ? 'a sheet over' : 'a panel beside'} the video, which stays whole (${width}x${height})`, async ({ page }) => {
      await open(page, '/shorts', width, height);
      await page.locator('button[aria-label^="Comments"]').first().tap();
      await expect(page.getByText('Add a comment...').or(page.getByPlaceholder('Add a comment...')).first()).toBeVisible();
      await page.waitForTimeout(700);
      const box = (await page.locator('.shorts-player-box').first().boundingBox())!;
      const left = width >= 768 ? 240 : 0;
      expect(box.x).toBeGreaterThanOrEqual(left);
      if (sheet) {
        await expect(page.getByRole('dialog', { name: 'Comments' })).toBeVisible();
        expect(box.x + box.width).toBeLessThanOrEqual(width);
        await page.getByRole('button', { name: 'Close' }).tap();
        await expect(page.getByRole('dialog')).toHaveCount(0);
      } else {
        const panel = (await page.getByRole('heading', { name: 'Comments' }).boundingBox())!;
        const like = (await page.locator('button[aria-label^="Like"], button[aria-label^="Unlike"]').first().boundingBox())!;
        expect(like.x + like.width).toBeLessThanOrEqual(panel.x);
        expect(box.height / box.width).toBeCloseTo(16 / 9, 1);
      }
    });
  }
});

test.describe('a phone with a notch, held sideways', () => {
  test('nothing is under it', async ({ page, context }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride' as never, { insets: { left: 47, leftMax: 47, right: 47, rightMax: 47, bottom: 21, bottomMax: 21 } } as never);
    for (const url of ['/', '/channels/monzur', '/shorts', '/settings']) {
      await open(page, url, 844, 390);
      await expect(page.locator('main h1').first()).toBeAttached();
      await page.waitForTimeout(600);
      const under = await page.evaluate(() =>
        [...document.querySelectorAll('header button, header a, aside a, main button, main h1, main h2, main h3')]
          .filter((e) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && !e.closest('.sr-only'))
          .filter((e) => {
            for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowX)) return false;
            const r = e.getBoundingClientRect();
            return r.width > 1 && (r.left < 46 || r.right > innerWidth - 46);
          })
          .map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30))
      );
      expect(under, url).toEqual([]);
    }
  });
});

test.describe('before the page\'s script runs', () => {
  test.use({ javaScriptEnabled: false });
  test('phones already show the phone\'s page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    await page.goto(VIDEO);
    await expect(page.locator('section[aria-labelledby="related-heading-mobile"]')).toBeVisible();
    await expect(page.locator('aside[aria-labelledby="related-heading"]')).toBeHidden();
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('section[aria-labelledby="related-heading-mobile"]')).toBeHidden();
    await expect(page.locator('aside[aria-labelledby="related-heading"]')).toBeVisible();
  });
});

// ── Channels, a channel's and a scholar's page ──────────────────────────────────────────────────────────────────────

for (const [width, stacked] of [[320, true], [360, true], [390, true], [412, false], [1280, false]] as const) {
  test(`a channel's page at ${width}px: the picture ${stacked ? 'is above' : 'is beside'} the name`, async ({ page }) => {
    for (const url of ['/channels/monzur', '/scholars/monzur', '/scholars/monzur/about']) {
      await open(page, url, width, 800);
      const name = (await page.locator('main h1').first().boundingBox())!;
      const picture = (await page.locator('main h1').first().locator('xpath=ancestor::div[2]').locator('img, span').first().boundingBox())!;
      if (stacked) {
        expect(picture.y + picture.height, url).toBeLessThanOrEqual(name.y + 1);
        expect(Math.abs(picture.x + picture.width / 2 - width / 2), url).toBeLessThan(2);
      } else {
        expect(picture.x + picture.width, url).toBeLessThanOrEqual(name.x + 1);
      }
    }
  });

  test(`lists at ${width}px: ${stacked ? 'cards, the picture on top' : 'rows'}, and no name is cut`, async ({ page }) => {
    for (const url of ['/channels', '/scholars']) {
      await open(page, url, width, 800);
      await expect(page.locator('main li').first()).toBeVisible();
      const items = await page.locator('main li').evaluateAll((lis) =>
        lis.map((li) => {
          const h = li.querySelector('h3')!;
          const img = li.querySelector('a')!.firstElementChild!.getBoundingClientRect();
          return { name: h.textContent, cut: h.scrollHeight - h.clientHeight > 1, above: img.bottom <= h.getBoundingClientRect().top + 1 };
        })
      );
      expect(items.length).toBeGreaterThan(5);
      expect(items.filter((i) => i.cut).map((i) => i.name), url).toEqual([]);
      expect(items.every((i) => i.above === stacked), url).toBe(true);
    }
  });
}

test.describe('the Home feed button', () => {
  for (const url of ['/channels/zakir-naik', '/scholars/zakir-naik'])
    test(`on ${url}: one press adds, the menu hides, with Undo; Channels says the same`, async ({ page }) => {
      await open(page, url, 360, 740);
      const on = page.locator('[data-home-feed="on"]');
      const off = page.locator('[data-home-feed="off"]');
      await expect(on).toHaveText('On Home');
      await expect(async () => {
        if (!(await page.getByRole('menu').isVisible())) await on.tap({ timeout: 1500 });
        await expect(page.getByRole('menuitemradio', { name: /Show on Home/ })).toHaveAttribute('aria-checked', 'true', { timeout: 1500 });
      }).toPass();
      // Choosing what it already is changes nothing
      await page.getByRole('menuitemradio', { name: /Show on Home/ }).tap();
      await expect(on).toBeVisible();
      await on.tap();
      await page.getByRole('menuitemradio', { name: /Hide from Home/ }).tap();
      await expect(off).toHaveText('Add to Home');
      const message = page.locator('[data-sonner-toast]:not([data-removed="true"])').last();
      await expect(message).toContainText('hidden from your Home feed');
      await message.getByRole('button', { name: 'Undo' }).tap();
      await expect(on).toBeVisible();

      await on.tap();
      await page.getByRole('menuitemradio', { name: /Hide from Home/ }).tap();
      await expect(off).toBeVisible();
      const name = (await off.getAttribute('aria-label'))!.split(':')[0];
      await page.goto('/channels');
      await expect(page.getByText('9 of 10 channels show on your Home feed')).toBeVisible();
      await page.getByRole('button', { name: `${name}: Add to Home, hidden from your Home feed` }).tap();
      await expect(page.getByText('All 10 channels show on your Home feed')).toBeVisible();
      await page.goto(url);
      await expect(on).toBeVisible();
    });

  test('with the keyboard: the focus stays on it', async ({ page }) => {
    await open(page, '/channels/zakir-naik', 1280, 800);
    const button = page.locator('[data-home-feed]');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menu')).toBeVisible();
    await page.getByRole('menuitemradio', { name: /Hide from Home/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-home-feed="off"]')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-home-feed="on"]')).toBeFocused();
  });
});

test('small rows show the views and the time in full, and a dot never ends a line', async ({ page }) => {
  for (const url of ['/search?q=allah', '/watch-later', '/history', '/playlists']) {
    await open(page, url, 320, 700);
    await page.waitForTimeout(600);
    const cut = await page.evaluate(() => [...document.querySelectorAll('main .dots > span > span')].filter((e) => e.checkVisibility() && e.scrollWidth - e.clientWidth > 1 && !e.querySelector('a')).map((e) => e.textContent));
    expect(cut, url).toEqual([]);
  }
});

test('turned sideways and back, no page breaks', async ({ page }) => {
  test.slow();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const url of ['/', VIDEO, '/channels/monzur', '/playlists/monzur-lectures/pl-islamic-1', '/search?q=allah', '/watch-later', '/history', '/shorts', '/playlists']) {
    await open(page, url, 360, 716);
    await page.waitForTimeout(1200);
    for (const [w, h] of [[800, 360], [360, 800], [800, 276], [360, 716]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(250);
    }
    await expect(page.getByText('Something went wrong'), url).toHaveCount(0);
    expect(errors, url).toEqual([]);
  }
});

// ── Home's grid everywhere, Shorts' spaces, the search page ─────────────────────────────────────────────────────────

test("a category's, a channel's and a scholar's cards are in Home's grid: 3 columns beside the full sidebar, 4 beside the mini one", async ({ page }) => {
  const columns = () => page.locator('main .md\\:grid').first().evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
  for (const url of ['/', '/categories/islamic-lecture', '/channels/monzur', '/scholars/monzur']) {
    await open(page, url, 1440, 900);
    await expect(page.locator('main .md\\:grid').first()).toBeVisible();
    await expect.poll(columns, url).toBe(3);
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(columns, url).toBe(4);
    await page.reload();
    await expect.poll(columns, `${url} after a reload`).toBe(4);
    await page.getByRole('button', { name: 'Toggle sidebar' }).click();
    await expect.poll(columns, url).toBe(3);
  }
});

for (const [width, height] of [[360, 640], [390, 844], [412, 915]])
  test(`Shorts at ${width}x${height}: the title ends 19px above the bottom and the buttons 27px, as on YouTube`, async ({ page }) => {
    await open(page, '/shorts', width, height);
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const section = document.querySelector('section')!;
      const bottom = section.getBoundingClientRect().bottom;
      const report = [...section.querySelectorAll('button')].find((b) => b.textContent === 'Report')!;
      const title = [...section.querySelectorAll('p')].find((p) => p.className.includes('line-clamp-2'))!;
      return { title: Math.round(bottom - title.closest('button')!.getBoundingClientRect().bottom), actions: Math.round(bottom - report.getBoundingClientRect().bottom), top: Math.round(section.querySelector('button[aria-label^="Like"], button[aria-label^="Unlike"]')!.getBoundingClientRect().top) };
    });
    expect(r.title).toBe(19);
    expect(r.actions).toBe(27);
    expect(r.top).toBeGreaterThan(60); // under the buttons at the top
  });

test('searching from anywhere opens the search page, with what was searched and its results at once', async ({ page }) => {
  for (const url of ['/', VIDEO, '/channels/monzur', '/settings', '/search?q=quran']) {
    await open(page, url, 390, 844);
    const field = page.locator('.fixed input').locator('visible=true').first();
    await expect(async () => {
      if (!(await field.isVisible())) await page.locator('header button[aria-label="Search"]').locator('visible=true').first().tap({ timeout: 1500 });
      await expect(field).toBeVisible({ timeout: 1000 });
    }).toPass();
    await field.fill('allah');
    await field.press('Enter');
    await page.waitForURL(/\/search\?q=allah/);
    await expect(page.getByRole('button', { name: 'Change the search: allah' })).toBeVisible();
    await expect(page.locator('main h3').locator('visible=true').first()).toBeVisible();
    await expect(page.getByText('Searching')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Change the search: allah' }).tap();
  await expect(page.locator('.fixed input').locator('visible=true').first()).toHaveValue('allah');
});

// ── A video opened from the search page ─────────────────────────────────────────────────────────────────────────────

test.describe('a search result opens in the search page', () => {
  for (const [width, height] of [[390, 844], [1440, 900]] as const)
    test(`the same page and player as a video, at /search/<title>/<id>; its related videos open in the video page (${width}px)`, async ({ page }) => {
      await open(page, '/search?q=allah', width, height);
      const result = page.locator('main a:has(h3)').locator('visible=true').first();
      const title = (await result.textContent())!;
      await expect(result).toHaveAttribute('href', /^\/search\/[a-z0-9-]+\/[\w-]{11}\?q=allah$/);
      await result.click();
      await page.waitForURL(/\/search\/[a-z0-9-]+\/[\w-]{11}\?q=allah$/);
      const id = new URL(page.url()).pathname.split('/').pop()!;
      await expect(page.locator('main h1').locator('visible=true').first()).toHaveText(title);
      await expect(page).toHaveTitle(new RegExp(title.slice(0, 12)));

      // The very same page as under /videos
      const shape = () =>
        page.evaluate(() => {
          const r = document.querySelector('[aria-label="Video player"]')!.getBoundingClientRect();
          return {
            player: [r.left, r.top, r.width, r.height].map(Math.round),
            padding: getComputedStyle(document.querySelector('main')!).paddingLeft,
            bar: document.querySelector('[data-page-bar]')?.checkVisibility() ?? false,
            nav: document.querySelectorAll('nav[aria-label="Mobile navigation"]').length,
            related: [...document.querySelectorAll('section[aria-labelledby^="related"] h3, aside[aria-labelledby^="related"] h3')].filter((e) => e.checkVisibility()).length,
          };
        });
      await page.waitForTimeout(800);
      const inSearch = await shape();
      // What was searched is still there
      if (width >= 768) await expect(page.locator('header input').locator('visible=true').first()).toHaveValue('allah');

      // A related video: in the video page; Back comes back to the search's video, and then to the results
      const related = page.locator('section[aria-labelledby^="related"] a:has(h3), aside[aria-labelledby^="related"] a:has(h3)').locator('visible=true').first();
      await expect(related).toHaveAttribute('href', /^\/videos\/[a-z0-9-]+\/[\w-]{11}$/);
      await related.click();
      await expect(page).toHaveURL(/\/videos\/[a-z0-9-]+\/[\w-]{11}$/);
      await expect(page).not.toHaveURL(new RegExp(id));
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`/search/.+/${id}\\?q=allah$`));
      if (width < 768) await page.locator('[data-page-bar] button').click();
      else await page.goBack();
      await expect(page).toHaveURL(/\/search\?q=allah$/);
      await expect(result).toBeVisible();

      await open(page, `/videos/x/${id}`, width, height);
      await page.waitForURL(/\/videos\//);
      await page.waitForTimeout(800);
      expect(inSearch).toEqual(await shape());
    });

  test('it opens at once, with no request; Back puts the results where they were left; titles follow', async ({ page }) => {
    await open(page, '/search?q=a', 390, 600);
    const results = page.locator('main a:has(h3)').locator('visible=true');
    await expect(results.nth(6)).toBeAttached();
    await results.nth(6).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const y = await page.evaluate(() => window.scrollY);
    expect(y).toBeGreaterThan(100);
    const asked: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      // (The related videos' links, under /videos, are prefetched as on every video page)
      if (u.host === new URL(page.url()).host && u.pathname.startsWith('/search')) asked.push(u.pathname);
    });
    const took = await results.nth(6).evaluate(
      (a) =>
        new Promise<number>((done) => {
          const t0 = performance.now();
          const look = () => (document.querySelector('[aria-label="Video player"]') ? done(performance.now() - t0) : requestAnimationFrame(look));
          (a as HTMLElement).click();
          requestAnimationFrame(look);
        })
    );
    expect(took).toBeLessThan(400);
    await expect(page).toHaveURL(/\/search\/.+\/[\w-]{11}\?q=a$/);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    const title = (await page.locator('main h1').locator('visible=true').first().textContent())!;
    await expect(page).toHaveTitle(`${title} - Deeni.tube`);
    expect(asked).toEqual([]);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?q=a$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    await expect(page).toHaveTitle('Search - Deeni.tube');
    // By way of a related video's page: back to the search's video, and the results still where they were left
    await results.nth(6).click();
    await expect(page).toHaveTitle(`${title} - Deeni.tube`);
    const related = page.locator('section[aria-labelledby^="related"] a:has(h3)').locator('visible=true').first();
    const other = (await related.textContent())!;
    await related.click();
    await expect(page).toHaveURL(/\/videos\//);
    await expect(page).toHaveTitle(`${other} - Deeni.tube`);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\/.+\?q=a$/);
    await expect(page.locator('main h1').locator('visible=true').first()).toHaveText(title);
    await expect(page).toHaveTitle(`${title} - Deeni.tube`);
    await page.goBack();
    await expect(page).toHaveURL(/\/search\?q=a$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(y);
    // Forward again, reloaded there, and on to another page
    await page.goForward();
    await expect(page.getByRole('region', { name: 'Video player' })).toBeVisible();
    await page.reload();
    await expect(page.locator('main h1').locator('visible=true').first()).toHaveText(title);
    await expect(page).toHaveTitle(`${title} - Deeni.tube`);
    await page.locator('header a[href="/"]').locator('visible=true').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveTitle(new RegExp('Search|' + title.slice(0, 8)));
  });

  test('opened straight from its link: the readable address, one for search engines; unknown ones are 404', async ({ page }) => {
    await open(page, '/search/x/XVscS6piz9A', 390, 844);
    await expect(page).toHaveURL(/\/search\/islamic-halaka[a-z0-9-]*\/XVscS6piz9A$/); // any other title goes to the readable one
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/videos\/islamic-halaka[a-z0-9-]*\/XVscS6piz9A$/);
    expect((await page.request.get('/search/x/nothing-here')).status()).toBe(404);
    expect((await page.request.get('/search/only-a-title')).status()).toBe(404);
  });

  test('it plays, is in History and goes on to the next one, in the video page', async ({ page, isMobile }) => {
    await open(page, '/search?q=allah', 1440, 900);
    const result = page.locator('main a:has(h3)').locator('visible=true').first();
    const title = (await result.textContent())!;
    await result.click();
    await page.waitForURL(/\/search\/.+\?q=allah$/);
    const player = page.getByRole('region', { name: 'Video player' });
    await expect(player.getByRole('button', { name: /^Pause/ }).first()).toBeAttached({ timeout: 10_000 });
    if (isMobile) await player.getByRole('button', { name: 'Next' }).locator('visible=true').first().click();
    else await page.keyboard.press('Shift+N'); // with a mouse a single video has no Next, as on YouTube
    await expect(page).toHaveURL(/\/videos\/.+\/[\w-]{11}$/);
    await page.goto('/history');
    await expect(page.getByRole('heading', { name: title }).first()).toBeVisible();
  });
});
