import { test, expect, Page } from '@playwright/test';

// UI behaviour requested in the YouTube-style redesign.

const seed = (page: Page, { loggedIn = false, collapsed = false } = {}) =>
  page.addInitScript(([li, col]) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: !li }));
    localStorage.setItem('sidebar-collapsed', String(col));
    if (li) localStorage.setItem('deeni-user-data', JSON.stringify({ name: 'Test User', email: 'test@example.com', initials: 'TU' }));
  }, [loggedIn, collapsed] as const);

test.describe('YouTube-style UI', () => {
  test('home grid: 3 columns with the full sidebar, 4 with the mini sidebar', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sidebar');
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const [collapsed, columns] of [[false, 3], [true, 4]] as const) {
      await seed(page, { collapsed });
      await page.goto('/');
      const card = page.locator('.group\\/card').locator('visible=true').first();
      await expect(card).toBeVisible({ timeout: 10_000 });
      const grid = card.locator('..');
      const count = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(count).toBe(columns);
    }
  });

  test('three-dot buttons are visible without hovering', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const button = page.getByRole('button', { name: 'More actions' }).locator('visible=true').first();
    await expect(button).toBeVisible({ timeout: 10_000 });
    expect(await button.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });

  test('three-dot icons are the same size on every page (20px phone, 24px desktop)', async ({ page, isMobile }) => {
    await seed(page);
    // The video page's related list is compact: 20px on desktop too
    for (const [path, desktopSize] of [['/', 24], ['/channels/monzur', 24], ['/search?q=quran', 24], ['/history', 24], ['/watch-later', 24], ['/videos/x/v2', 20]] as const) {
      await page.goto(path);
      const icon = page.locator('svg[data-icon="more-vert"]').locator('visible=true').first();
      await expect(icon, path).toBeVisible({ timeout: 10_000 });
      const size = await icon.evaluate((el) => el.getBoundingClientRect().width);
      expect(size, path).toBe(isMobile ? 20 : desktopSize);
    }
  });

  test('related videos: the three-dot shows on row hover with a mouse, always on phones', async ({ page, isMobile }) => {
    await seed(page);
    await page.goto('/videos/x/v2');
    const list = page.locator(isMobile ? '[aria-labelledby="related-heading-mobile"]' : '[aria-labelledby="related-heading"]');
    const button = list.getByRole('button', { name: 'More actions' }).first();
    await expect(button).toBeAttached({ timeout: 10_000 });
    const opacity = () => button.evaluate((el) => getComputedStyle(el).opacity);
    if (isMobile) {
      expect(await opacity()).toBe('1');
      return;
    }
    expect(await opacity()).toBe('0');
    await button.locator('..').hover();
    await expect.poll(opacity).toBe('1');
  });

  test('history: the remove ✕ shows on row hover on desktop; phones use the ⋮ menu instead', async ({ page, isMobile }) => {
    await seed(page);
    await page.goto('/history');
    await expect(page.getByRole('button', { name: 'More actions' }).locator('visible=true').first()).toBeVisible({ timeout: 10_000 });
    const remove = page.getByRole('button', { name: /from history$/ });
    if (isMobile) {
      await expect(remove.locator('visible=true')).toHaveCount(0);
      return;
    }
    const first = remove.first();
    const opacity = () => first.evaluate((el) => getComputedStyle(el).opacity);
    expect(await opacity()).toBe('0');
    await first.locator('xpath=ancestor::div[contains(concat(" ", @class, " "), " group ")][1]').hover();
    await expect.poll(opacity).toBe('1');
  });

  test('shorts on phones: the feed only scrolls up and down, and each short fills it', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout');
    await page.goto('/shorts');
    const feed = page.locator('section').first().locator('..');
    await expect(feed).toBeVisible({ timeout: 10_000 });
    const m = await feed.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      width: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
      height: el.clientHeight,
      shortHeight: el.querySelector('section')!.getBoundingClientRect().height,
      pageOverflow: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(m.scrollWidth).toBe(m.width);
    expect(m.overflowX).toBe('hidden');
    expect(m.shortHeight).toBe(m.height);
    expect(m.pageOverflow).toBeLessThanOrEqual(0);
    // The player covers the whole short (no black bars at the sides)
    const cover = await page.locator('.shorts-video-iframe').first().evaluate((f) => {
      const r = f.getBoundingClientRect(), b = f.parentElement!.getBoundingClientRect();
      return r.left <= b.left + 0.5 && r.right >= b.right - 0.5 && r.top <= b.top + 0.5 && r.bottom >= b.bottom - 0.5;
    });
    expect(cover).toBe(true);
  });

  test('shorts description wraps long links inside the screen', async ({ page }) => {
    await page.goto('/shorts');
    const description = page.locator('[data-action="description"]'); // a sheet's row on phones, a menu's on desktop
    // A click before the page is ready (hydrated) does nothing: click until the menu opens
    await expect(async () => {
      await page.getByRole('button', { name: 'More options' }).locator('visible=true').first().click({ timeout: 5000 });
      await expect(description).toBeVisible({ timeout: 1500 });
    }).toPass({ timeout: 20_000 });
    await description.click();
    const link = page.locator('a[href^="https://www.youtube.com/@"]').locator('visible=true').first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    const fits = await link.evaluate((a) => {
      const scroller = a.closest('.overflow-y-auto')!;
      return a.getBoundingClientRect().right <= window.innerWidth && scroller.scrollWidth <= scroller.clientWidth;
    });
    expect(fits).toBe(true);
  });

  test('notifications panel opens at its full height (no growing after loading)', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    const panel = page.getByRole('menu');
    await expect(page.getByLabel('Loading notifications')).toBeVisible();
    // Layout height (ignores the open animation's scale)
    const loadingHeight = await panel.evaluate((el) => (el as HTMLElement).offsetHeight);
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    const loadedHeight = await panel.evaluate((el) => (el as HTMLElement).offsetHeight);
    expect(Math.abs(loadedHeight - loadingHeight)).toBeLessThan(2);
  });

  test('clicking a notification opens it and closes the panel', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    await page.getByRole('menu').getByRole('link').first().click();
    await expect(page).toHaveURL(/\/videos\//);
    await expect(page.getByRole('menu')).toHaveCount(0);
  });

  test('account menu: Appearance opens in place and changes the theme', async ({ page }) => {
    await seed(page, { loggedIn: true });
    await page.goto('/help');
    await page.getByRole('button', { name: 'Account menu' }).locator('visible=true').click();
    await expect(page.getByText('View your account')).toBeVisible();
    await page.getByRole('menuitem', { name: /Appearance/ }).click();
    await page.getByRole('menuitemradio', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    // Back on the main page of the menu, showing the new setting
    await expect(page.getByRole('menuitem', { name: 'Appearance: Dark theme' })).toBeVisible();
  });

  test('notifications list uses the thin YouTube scrollbar', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    const list = page.getByRole('menu').locator('.yt-scrollbar');
    await expect(list).toBeVisible();
    expect(await list.evaluate((el) => getComputedStyle(el).scrollbarWidth)).toBe('thin');
  });

  test('scholar About tab opens the About page at once (no page load), and Back returns to the profile', async ({ page }) => {
    await seed(page);
    await page.goto('/scholars/monzur');
    const requests: string[] = [];
    page.on('request', (r) => { if (new URL(r.url()).pathname.startsWith('/scholars/')) requests.push(r.url()); });
    // Retry until the page has hydrated and the click switches the page
    await expect(async () => {
      await page.getByRole('tab', { name: 'About' }).click();
      await expect(page).toHaveURL(/\/scholars\/monzur\/about$/, { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Recent videos' })).toBeVisible({ timeout: 1_000 });
    expect(requests).toEqual([]);

    await page.goBack();
    await expect(page).toHaveURL(/\/scholars\/monzur$/);
    await expect(page.getByRole('tab', { name: 'Videos' })).toBeVisible();
  });

  test('playlist dialogs keep their width on desktop', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop width');
    await seed(page);
    await page.goto('/playlists');
    await page.getByRole('button', { name: 'New playlist' }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect((await dialog.boundingBox())!.width).toBeLessThanOrEqual(448);
  });

  test('voice search: the mic listens and searches what was said', async ({ page, isMobile }) => {
    await seed(page);
    // Fake recogniser that "hears" a word (headless browsers have no microphone)
    await page.addInitScript(() => {
      class FakeRecognition {
        lang = ''; onresult: ((e: unknown) => void) | null = null; onerror = null; onend: (() => void) | null = null;
        start() {
          setTimeout(() => {
            this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'quran' }], { isFinal: true })] });
            this.onend?.();
          }, 300);
        }
        stop() {}
        abort() {}
      }
      Object.assign(window, { SpeechRecognition: FakeRecognition, webkitSpeechRecognition: FakeRecognition });
    });
    await page.goto('/help');
    if (isMobile) await page.getByRole('button', { name: 'Search', exact: true }).locator('visible=true').click();
    // Retry until the page has hydrated and the click opens the voice dialog
    await expect(async () => {
      await page.getByRole('button', { name: 'Search with your voice' }).locator('visible=true').click();
      await expect(page.getByRole('dialog', { name: 'Search with your voice' })).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/search\?q=quran/, { timeout: 10_000 });
  });

  test('video links are readable: /videos/<title in Latin letters>/<id>, with no spaces or %-codes', async ({ page }) => {
    await seed(page);
    await page.goto('/');
    const links = page.locator('a[href^="/videos/"]');
    await expect(links.first()).toBeAttached({ timeout: 10_000 });
    const hrefs = await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')!));
    for (const href of hrefs) expect(href).toMatch(/^\/videos\/[a-z0-9-]+\/[A-Za-z0-9_-]{11}$/);
  });

  test("sidebar and notification headings use YouTube's type", async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop sidebar');
    await seed(page);
    await page.goto('/help');
    const font = (el: Element) => { const c = getComputedStyle(el); return `${c.fontFamily.split(',')[0]} ${c.fontSize} ${c.fontWeight}`; };
    // Entries: Roboto 14px regular; section headings: 16px medium
    await expect(page.getByRole('link', { name: 'Channels' }).locator('span').last()).toBeVisible();
    expect(await page.getByRole('link', { name: 'Channels' }).locator('span').last().evaluate(font)).toBe('Roboto 14px 400');
    expect(await page.getByRole('heading', { name: 'Explore' }).evaluate(font)).toBe('Roboto 16px 500');
    // The notifications title matches its section headings: 16px medium
    await page.getByRole('button', { name: /^Notifications/ }).locator('visible=true').click();
    await expect(page.getByRole('heading', { name: 'Important' })).toBeVisible();
    expect(await page.getByRole('menu').getByRole('heading', { name: 'Notifications', exact: true }).evaluate(font)).toBe('Roboto 16px 500');
  });
});
