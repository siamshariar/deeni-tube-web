import { test, expect, Page } from '@playwright/test';

// The header's search, as on youtube.com and m.youtube.com (measured): sizes, the focused box, the list under it, the
// microphone, the phone's search screen and the voice search, at every width; the bell with its badge, and the avatar.

const seed = (page: Page, theme = 'light') =>
  page.addInitScript((t) => {
    localStorage.setItem('theme', t);
    localStorage.setItem('recentSearches', '["quran tilawat","quran sharif","hadith bangla"]');
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false }));
  }, theme);
const bar = (page: Page) => page.locator('.app-bar');
const box = async (page: Page, css: string) => bar(page).locator(css).first().evaluate((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; });
const INPUT = 'div:has(> input)';
const MIC = '[aria-label="Search with your voice"]';

test.describe('Desktop', () => {
  test.skip(({ isMobile }) => !!isMobile, 'desktop header');

  for (const [width, x] of [[1920, 642], [1440, 402], [1280, 322]]) test(`YouTube's sizes and place at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seed(page);
    await page.goto('/help');
    await expect(bar(page).locator('[aria-label="Toggle sidebar"]')).toBeVisible();
    await expect.poll(async () => Math.abs((await box(page, INPUT))[0] - x)).toBeLessThanOrEqual(2);
    expect((await box(page, INPUT)).slice(1)).toEqual([8, 536, 40]);
    expect((await box(page, 'button[type="submit"]')).slice(1)).toEqual([8, 64, 40]);
    expect((await box(page, 'button[type="submit"] svg')).slice(2)).toEqual([24, 24]);
    expect((await box(page, MIC)).slice(1)).toEqual([8, 40, 40]);
    expect((await box(page, `${MIC} svg`)).slice(2)).toEqual([24, 24]);
    // Focused: 32px to the left, the text stays, the list under it
    const text = (await box(page, 'input'))[0];
    const [left] = await box(page, INPUT);
    const button = await box(page, 'button[type="submit"]');
    await bar(page).locator('input').click();
    expect(await box(page, INPUT)).toEqual([left - 32, 8, 568, 40]);
    expect((await box(page, 'input'))[0]).toBe(text);
    expect(await box(page, 'button[type="submit"]')).toEqual(button);
    await expect(bar(page).locator(INPUT)).toHaveCSS('border-top-color', 'rgb(28, 98, 185)');
    await expect(bar(page).locator(`${INPUT} > svg`)).toBeVisible();
    expect((await box(page, 'form > div.absolute')).slice(0, 3)).toEqual([left - 32, 52, 570]);
  });

  test('nothing overlaps or runs off the screen from 768px', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    for (const width of [768, 800, 900, 1024, 1279, 1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 700 });
      const edges = await bar(page).evaluate((b) => ['a[href="/"]', 'form', '[aria-label="Search with your voice"]', '[aria-label^="Notifications"]'].map((s) => { const r = b.querySelector(s)!.getBoundingClientRect(); return [r.left, r.right]; }));
      for (let i = 1; i < edges.length; i++) expect(edges[i][0], `${width}px`).toBeGreaterThanOrEqual(edges[i - 1][1] - 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px`).toBeLessThanOrEqual(0);
      expect((await box(page, 'input'))[2], `${width}px`).toBeGreaterThan(100);
    }
  });

  test('typing narrows the list; clear, remove, Escape and Enter', async ({ page }) => {
    await seed(page);
    await page.goto('/help');
    const input = bar(page).locator('input');
    const list = bar(page).locator('form > div.absolute');
    await expect(async () => { await input.click(); await expect(list).toBeVisible({ timeout: 1000 }); }).toPass();
    await expect(list.getByRole('button', { name: /^Remove/ })).toHaveCount(3);
    await input.fill('QURAN');
    await expect(list.getByRole('button', { name: /^Remove/ })).toHaveCount(2);
    await list.getByRole('button', { name: 'Remove "quran sharif" from recent searches' }).click();
    await expect(list.getByRole('button', { name: /^Remove/ })).toHaveCount(1);
    await expect(input).toBeFocused(); // a press in the list doesn't shrink the box
    await bar(page).getByRole('button', { name: 'Clear search' }).click();
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(list).toHaveCount(0);
    await expect(input).not.toBeFocused();
    await input.click();
    await list.getByRole('button', { name: 'hadith bangla', exact: true }).click();
    await page.waitForURL(/q=hadith/);
    await expect(list).toHaveCount(0);
    await expect(input).not.toBeFocused();
  });

  test('dark theme\'s colours', async ({ page }) => {
    await seed(page, 'dark');
    await page.goto('/help');
    await expect(bar(page).locator(INPUT)).toHaveCSS('background-color', 'rgb(18, 18, 18)');
    await expect(bar(page).locator(INPUT)).toHaveCSS('border-top-color', 'rgb(48, 48, 48)');
    await expect(bar(page).locator('button[type="submit"]')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.08)');
    await expect(bar(page).locator(MIC)).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.1)');
  });
});

test.describe('Phones', () => {
  test.skip(({ isMobile }) => !isMobile, 'phone header');
  const header = (page: Page) => page.locator('header:visible').first();

  for (const width of [280, 320, 390, 480, 600, 767]) test(`the header and the search screen at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await seed(page);
    await page.goto('/help');
    const search = header(page).getByRole('button', { name: 'Search', exact: true });
    expect((await search.locator('svg').boundingBox())!.width).toBe(24);
    expect((await header(page).getByRole('button', { name: /^Notifications/ }).locator('svg').boundingBox())!.width).toBe(24);
    await expect(header(page).getByRole('button', { name: 'Search with your voice' })).toBeVisible({ visible: width >= 480 });
    await expect(async () => { await search.tap(); await expect(page.getByRole('button', { name: 'Close search' })).toBeVisible({ timeout: 1000 }); }).toPass();
    const form = page.getByRole('search').locator('visible=true');
    const input = form.getByRole('textbox');
    await expect(input).toBeFocused();
    const mic = page.getByRole('button', { name: 'Search with your voice' }).locator('visible=true').last();
    const [f, m] = [(await form.boundingBox())!, (await mic.boundingBox())!];
    expect(f.height).toBe(40);
    expect(m.x).toBeGreaterThanOrEqual(f.x + f.width);
    expect(m.x + m.width).toBeLessThanOrEqual(width);
    expect((await mic.locator('svg').boundingBox())!.width).toBe(24);
    // Typing: the microphone makes room, the list narrows
    await input.fill('quran');
    await expect(form.getByRole('button', { name: 'Clear search' })).toBeVisible();
    expect((await form.boundingBox())!.width).toBeGreaterThan(f.width);
    await expect(page.getByRole('button', { name: /^Remove "/ })).toHaveCount(2);
    await form.getByRole('button', { name: 'Clear search' }).tap();
    await expect(input).toHaveValue('');
    await input.fill('quran');
    await form.getByRole('button', { name: 'Search', exact: true }).tap();
    await page.waitForURL(/q=quran/);
    await expect(page.getByRole('button', { name: 'Change the search: quran' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  });
});

test.describe('Voice search', () => {
  type Fake = { onresult: (e: unknown) => void; onerror: (e: unknown) => void; onend: () => void };
  const fake = (page: Page) =>
    page.addInitScript(() => {
      if (!(window as unknown as { __devices?: unknown }).__devices) navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput' }] as unknown as MediaDeviceInfo[];
      class R {
        onend?: () => void;
        onstart?: () => void;
        start() { (window as unknown as { __r: unknown }).__r = this; (window as unknown as { __starts: number }).__starts = ((window as unknown as { __starts?: number }).__starts ?? 0) + 1; setTimeout(() => this.onstart?.(), 10); }
        stop() { this.onend?.(); }
        abort() {}
      }
      Object.assign(window, { SpeechRecognition: R, webkitSpeechRecognition: R });
    });
  const say = (page: Page, text: string, final: boolean) =>
    page.evaluate(([t, f]) => (window as unknown as { __r: Fake }).__r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: t }], { isFinal: f })] }), [text, final] as const);
  const end = (page: Page, error?: string) => page.evaluate((e) => { const r = (window as unknown as { __r: Fake }).__r; if (e) r.onerror({ error: e }); r.onend?.(); }, error);
  const dialog = (page: Page) => page.getByRole('dialog', { name: 'Search with your voice' });
  const open = async (page: Page, isMobile: boolean) => {
    await seed(page);
    await fake(page);
    await page.goto('/help');
    const mic = page.getByRole('button', { name: 'Search with your voice' }).locator('visible=true').last();
    await expect(async () => {
      if (isMobile && !(await mic.count())) await page.getByRole('button', { name: 'Search', exact: true }).locator('visible=true').first().click();
      await mic.click({ timeout: 1000 });
      await expect(dialog(page)).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.waitForTimeout(300); // it fades in
  };
  const place = async (page: Page, of = dialog(page)) => { const b = (await of.boundingBox())!; return [b.x, b.y, b.width, b.height].map(Math.round); };

  test('over the search at the top, YouTube\'s place (a page of its own on phones)', async ({ page, isMobile }) => {
    if (!isMobile) await page.setViewportSize({ width: 1440, height: 800 });
    await open(page, !!isMobile);
    const { width, height } = page.viewportSize()!;
    if (isMobile) {
      expect(await place(page)).toEqual([0, 0, width, height]);
      expect((await place(page, dialog(page).getByRole('button', { name: 'Close' })))).toEqual([28, 28, 40, 40]);
      expect((await place(page, dialog(page).getByText('Listening...')))[1]).toBe(124);
      expect((await place(page, dialog(page).getByRole('button', { name: 'Stop listening' }))).slice(2)).toEqual([80, 80]);
    } else {
      expect(await place(page)).toEqual([424, 8, 592, 440]);
      expect(await place(page, dialog(page).getByRole('button', { name: 'Close' }))).toEqual([968, 16, 40, 40]);
      expect((await place(page, dialog(page).getByText('Listening...'))).slice(0, 2)).toEqual([456, 56]);
      expect(await place(page, dialog(page).getByRole('button', { name: 'Stop listening' }))).toEqual([702, 300, 68, 68]);
    }
  });

  test('what it says: the words, nothing heard, no permission; then it searches', async ({ page, isMobile }) => {
    await open(page, !!isMobile);
    await say(page, 'quran til', false);
    await expect(dialog(page).getByText('quran til')).toBeVisible();
    // One session, started in the press (it started twice on the dev server)
    expect(await page.evaluate(() => (window as unknown as { __starts: number }).__starts)).toBe(1);
    await end(page, 'not-allowed');
    await expect(dialog(page).getByText('To search by voice, go to your browser settings and allow access to microphone')).toBeVisible();
    await expect(dialog(page).getByText('Tap microphone to try again')).toHaveCount(0);
    await dialog(page).getByRole('button', { name: 'Try again' }).click();
    // Nothing said yet: the browser gives up, the card goes on listening; a press on the microphone ends it
    const starts = () => page.evaluate(() => (window as unknown as { __starts: number }).__starts);
    const before = await starts();
    await end(page, 'no-speech');
    await expect.poll(starts).toBe(before + 1);
    await end(page);
    await expect.poll(starts).toBe(before + 2);
    await page.waitForTimeout(1500);
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Stop listening' }).click();
    await expect(dialog(page).getByText("Didn't hear that. Try again.")).toBeVisible();
    await expect(dialog(page).getByText('Tap microphone to try again')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Try again' }).click();
    await say(page, 'quran', true);
    await end(page);
    await page.waitForURL(/q=quran/);
    await expect(dialog(page)).toHaveCount(0);
  });

  test('no microphone: it says so; trying again can be seen; broken off by the browser: once more by itself', async ({ page, isMobile }) => {
    await open(page, !!isMobile);
    await end(page, 'audio-capture');
    await expect(dialog(page).getByText('No microphone found')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Try again' }).click();
    await end(page, 'audio-capture'); // at once
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
    await page.waitForTimeout(400);
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
    await expect(dialog(page).getByText('No microphone found')).toBeVisible();
    await dialog(page).getByRole('button', { name: 'Try again' }).click();
    const before = await page.evaluate(() => (window as unknown as { __starts: number }).__starts);
    await page.evaluate(() => (window as unknown as { __r: Fake }).__r.onerror({ error: 'aborted' }));
    expect(await page.evaluate(() => (window as unknown as { __starts: number }).__starts)).toBe(before + 1);
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
    // Closed, or Back: it stops listening
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toHaveCount(0);
  });

  test('a device without a microphone: it says so at once, and listens when one is connected', async ({ page, isMobile }) => {
    await page.addInitScript(() => {
      const devices = [] as { kind: string }[];
      Object.assign(window, { __devices: devices });
      navigator.mediaDevices.enumerateDevices = async () => devices as unknown as MediaDeviceInfo[];
    });
    await open(page, !!isMobile);
    await expect(dialog(page).getByText('No microphone found')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __starts?: number }).__starts ?? 0)).toBe(0);
    await page.evaluate(() => {
      (window as unknown as { __devices: { kind: string }[] }).__devices.push({ kind: 'audioinput' });
      navigator.mediaDevices.dispatchEvent(new Event('devicechange'));
    });
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __starts?: number }).__starts)).toBe(1);
  });

  test('while the browser asks for the microphone it says so', async ({ page, isMobile }) => {
    await seed(page);
    await page.addInitScript(() => {
      navigator.mediaDevices.enumerateDevices = async () => [{ kind: 'audioinput' }] as unknown as MediaDeviceInfo[];
      Object.assign(window, { SpeechRecognition: class { start() { (window as unknown as { __r: unknown }).__r = this; } stop() {} abort() {} } });
    });
    await page.goto('/help');
    const mic = page.getByRole('button', { name: 'Search with your voice' }).locator('visible=true').last();
    await expect(async () => {
      if (isMobile && !(await mic.count())) await page.getByRole('button', { name: 'Search', exact: true }).locator('visible=true').first().click();
      await mic.click({ timeout: 1000 });
      await expect(dialog(page)).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(dialog(page).getByText('Waiting for permission')).toBeVisible();
    await page.evaluate(() => (window as unknown as { __r: { onstart: () => void } }).__r.onstart());
    await expect(dialog(page).getByText('Listening...')).toBeVisible();
  });

  for (const [width, height] of [[280, 653], [320, 568], [568, 320], [844, 390], [768, 600], [1024, 500]]) test(`all of it shows at ${width}x${height}`, async ({ page, isMobile }) => {
    await page.setViewportSize({ width, height });
    await open(page, !!isMobile || width < 768);
    await end(page, 'network'); // the longest text
    for (const e of [dialog(page).getByRole('button', { name: 'Close' }), dialog(page).getByRole('button', { name: 'Try again' }), dialog(page).getByText('Tap microphone to try again'), dialog(page).getByRole('group')]) await expect(e).toBeInViewport({ ratio: 0.95 });
    expect(await dialog(page).evaluate((e) => [e.scrollWidth - e.clientWidth, e.scrollHeight - e.clientHeight])).toEqual([0, 0]);
  });
});

test('the bell, its badge and the avatar: YouTube\'s sizes', async ({ page, isMobile }) => {
  await seed(page);
  await page.goto('/help');
  const at = async (css: string) => page.locator(css).locator('visible=true').first().evaluate((e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(Math.round); });
  const bell = await at('button[aria-label^="Notifications"]');
  const icon = await at('button[aria-label^="Notifications"] svg');
  const badge = await at('button[aria-label^="Notifications"] span span');
  expect(bell.slice(2)).toEqual(isMobile ? [48, 48] : [40, 40]);
  expect(icon.slice(2)).toEqual([24, 24]);
  expect([badge[0] - icon[0], badge[1] - icon[1], badge[2], badge[3]]).toEqual([12, -4, 20, 20]);
  await expect(page.locator('button[aria-label^="Notifications"] span span').locator('visible=true')).toHaveCSS('background-color', 'rgb(225, 0, 45)');
  const avatar = await at('button[aria-label="Account menu"] > span');
  expect(avatar.slice(2)).toEqual(isMobile ? [24, 24] : [32, 32]);
  // On phones the last one is 12px from the edge, as the page's own space
  if (isMobile) expect(page.viewportSize()!.width - avatar[0] - avatar[2]).toBe(12);
  // They open their panels
  await page.locator('button[aria-label^="Notifications"]').locator('visible=true').click();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('button[aria-label="Account menu"]').locator('visible=true').click();
  await expect(page.getByRole('menu', { name: 'Account menu' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Notifications' })).toHaveCount(0);
});
