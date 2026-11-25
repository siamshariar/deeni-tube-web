import { test, expect, Page, Frame } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';
import { captionData } from '../lib/caption-data';
import { storyboards } from '../lib/storyboard-data';
import { videoData } from '../lib/video-data';
import { shortsVideos } from '../lib/shorts-data';

// Captions (lib/captions.ts), as on YouTube: drawn by YouTube inside the visible video, above our controls while those
// show; unavailable where a video has none; the choice is kept. And the buttons beside Play (measured on youtube.com and
// m.youtube.com): Play alone in its circle, Previous and Next only in a playlist with a mouse, always on phones. (iPhone: see
// ios-playback.spec.ts.)

const BANGLA = 'XVscS6piz9A'; // auto-generated Bangla
const ENGLISH = 'T9oT-oOaTNU';
const TWO = 'kVbpcXFFeWQ'; // English and Bangla; a 3:2 video
const NONE = '908GzCFuysY';

const seed = (page: Page, captions?: object, cards?: { captions?: object }) =>
  page.addInitScript(([c, cards]) => {
    localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: true }));
    localStorage.setItem('deeni-feed-playback', cards ? 'true' : 'false');
    if (c && !localStorage.getItem('deeni-captions')) localStorage.setItem('deeni-captions', JSON.stringify(c));
    if (cards?.captions && !localStorage.getItem('deeni-preview-captions')) localStorage.setItem('deeni-preview-captions', JSON.stringify(cards.captions));
  }, [captions, cards] as const);
const player = (page: Page) => page.getByRole('region', { name: 'Video player' });
const frameOf = async (page: Page, id: string): Promise<Frame> => {
  const iframe = page.locator(`iframe[src*="/embed/${id}"]`).first();
  await expect(iframe).toHaveCSS('opacity', '1', { timeout: 15_000 });
  return (await (await iframe.elementHandle())!.contentFrame())!;
};
const open = async (page: Page, id: string, captions?: object) => {
  await seed(page, captions);
  await fakeYouTube(page, { clock: false });
  await page.goto(`/videos/x/${id}`);
  const frame = await frameOf(page, id);
  return { frame, box: (await player(page).boundingBox())! };
};
type Told = { lang: string | null; to: string | null; fontSize: number; frame: [number, number]; box: { left: number; top: number; width: number; height: number; bottom: number } | null };
const told = (frame: Frame, ratio = 16 / 9) => frame.evaluate((r) => (window as unknown as { __captions: (r: number) => Told }).__captions(r), ratio);
/** Where the last line of the captions ends, above the bottom of the player (YouTube: 2% of the captions' box) */
const up = async (page: Page, frame: Frame, id: string, ratio = 16 / 9) => {
  const t = await told(frame, ratio);
  if (!t.box) return null;
  const f = (await page.locator(`iframe[src*="/embed/${id}"]`).first().boundingBox())!;
  const b = (await player(page).boundingBox())!;
  const scale = f.width / t.frame[0];
  return Math.round(b.y + b.height - (f.y + (t.box.bottom - 0.02 * t.box.height) * scale));
};
/** The size YouTube's text gets in the box it was told, as its captions part works it out */
const textSize = (t: Told, ratio = 16 / 9) => {
  const [w, h] = t.frame;
  const { width: cw, height: ch } = t.box!;
  const [pw, ph] = [(cw * w) / Math.min(w, h * ratio), (ch * h) / Math.min(h, w / ratio)];
  return (ch < cw ? (ch / 360) * 16 : (pw / (ph > pw * 1.3 ? 480 : 640)) * 16) * (1 + 0.25 * t.fontSize);
};
const cc = (page: Page) => player(page).getByRole('button', { name: /^Subtitles/ }).locator('visible=true').first();

test.describe('The buttons beside Play (mouse)', () => {
  test.skip(({ isMobile }) => !!isMobile, 'mouse only');

  test('a single video: Play alone in its circle, no Previous or Next; Shift+N and Shift+P', async ({ page }) => {
    const { box } = await open(page, BANGLA);
    await page.mouse.move(box.x + 300, box.y + 200);
    const play = player(page).getByRole('button', { name: 'Pause (k)' });
    const group = (await play.locator('xpath=..').boundingBox())!;
    expect([group.x - box.x, group.width, group.height].map(Math.round)).toEqual([12, 40, 40]);
    await expect(play.locator('xpath=..').getByRole('button')).toHaveCount(1);
    const volume = (await player(page).getByRole('button', { name: /mute \(m\)$/i }).locator('xpath=..').boundingBox())!;
    expect(Math.round(volume.x - box.x)).toBe(64);
    for (const name of ['Previous', 'Next']) await expect(player(page).getByRole('button', { name }).locator('visible=true')).toHaveCount(0);
    await page.keyboard.press('n'); // without Shift it's nothing
    await page.waitForTimeout(300);
    await expect(page).toHaveURL(new RegExp(BANGLA));
    await page.keyboard.press('Shift+N');
    await expect(page).not.toHaveURL(new RegExp(BANGLA));
    const next = page.url();
    await page.locator('iframe[src*="/embed/"]').first().waitFor();
    await page.keyboard.press('Shift+P');
    await expect(page).toHaveURL(new RegExp(BANGLA));
    expect(next).toMatch(/\/videos\//);
  });

  test('a playlist: Previous and Next together, 8px after Play; they work', async ({ page }) => {
    await seed(page);
    await fakeYouTube(page);
    await page.goto('/playlists/monzur-lectures/pl-islamic-1');
    const first = await page.locator('iframe[src*="/embed/"]').first().getAttribute('src');
    await expect(page.locator('iframe[src*="/embed/"]').first()).toHaveCSS('opacity', '1', { timeout: 15_000 });
    const box = (await player(page).boundingBox())!;
    const awake = () => page.mouse.move(box.x + 300 + Math.random() * 40, box.y + 200);
    await awake();
    const previous = player(page).getByRole('button', { name: 'Previous (Shift+p)' });
    const next = player(page).getByRole('button', { name: 'Next (Shift+n)' });
    const at = async (l: typeof next) => { const r = (await l.boundingBox())!; return [r.x - box.x, r.width, r.height].map(Math.round); };
    expect(await at(previous)).toEqual([60, 52, 40]);
    expect(await at(next)).toEqual([112, 52, 40]);
    const group = previous.locator('xpath=..');
    await expect(group).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.3)');
    await expect(group.getByRole('button')).toHaveCount(2);
    await expect(previous).toBeDisabled(); // the first one
    await next.click();
    await expect(page.locator('iframe[src*="/embed/"]').first()).not.toHaveAttribute('src', first!);
    await awake();
    await expect(previous).toBeEnabled();
    await previous.click();
    await expect(page.locator('iframe[src*="/embed/"]').first()).toHaveAttribute('src', first!);
  });
});

test.describe('The buttons beside Play (touch)', () => {
  test.skip(({ isMobile }) => !isMobile, 'touch only');

  test('Previous, Play and Next in the middle: Previous dimmed on the first video, then goes back', async ({ page }) => {
    const { box } = await open(page, BANGLA);
    const at = async (name: string) => { const r = (await player(page).getByRole('button', { name, exact: true }).boundingBox())!; return [r.x + r.width / 2 - (box.x + box.width / 2), r.width].map(Math.round); };
    expect(await at('Previous')).toEqual([-86, 48]);
    expect(await at('Pause')).toEqual([0, 56]);
    expect(await at('Next')).toEqual([86, 48]);
    const previous = player(page).getByRole('button', { name: 'Previous', exact: true });
    await expect(previous).toBeDisabled();
    await expect(previous.locator('svg')).toHaveCSS('opacity', '0.4');
    await player(page).getByRole('button', { name: 'Next', exact: true }).tap();
    await expect(page).not.toHaveURL(new RegExp(BANGLA));
    await expect(player(page).getByRole('button', { name: 'Previous', exact: true })).toBeEnabled({ timeout: 10_000 });
    await player(page).getByRole('button', { name: 'Previous', exact: true }).tap();
    await expect(page).toHaveURL(new RegExp(BANGLA));
    await expect(player(page).getByRole('button', { name: 'Previous', exact: true })).toBeDisabled({ timeout: 10_000 });
  });
});

test.describe('Captions on the watch page', () => {
  test('on: the video\'s own captions, inside the video; the frame stays cropped', async ({ page, isMobile }) => {
    const { frame, box } = await open(page, BANGLA);
    expect((await told(frame)).lang).toBe(null); // off until asked
    if (!isMobile) await page.mouse.move(box.x + 300, box.y + 200);
    await cc(page).click();
    await expect(cc(page)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await told(frame)).lang).toBe('bn');
    // YouTube's title, "More videos" and logo stay out of the box: 120px of the frame above and below it
    const f = (await page.locator(`iframe[src*="/embed/${BANGLA}"]`).first().boundingBox())!;
    expect(Math.round(box.y - f.y)).toBe(120);
    expect(Math.round(f.y + f.height - (box.y + box.height))).toBe(120);
    // Off again
    if (!isMobile) await page.mouse.move(box.x + 310, box.y + 210);
    await cc(page).click();
    await expect.poll(async () => (await told(frame)).lang).toBe(null);
  });

  test('mouse: 11px above the bottom, 81px while the controls show, as on YouTube; the same text size', async ({ page, isMobile }) => {
    test.skip(isMobile, 'mouse only');
    await page.setViewportSize({ width: 1440, height: 900 });
    const { frame, box } = await open(page, BANGLA, { on: true });
    expect([box.width, box.height].map(Math.round)).toEqual([996, 560]);
    await page.mouse.move(box.x + 300, box.y + 200);
    await expect.poll(() => up(page, frame, BANGLA)).toBe(81);
    await page.mouse.move(5, 5);
    await expect.poll(() => up(page, frame, BANGLA), { timeout: 8000 }).toBe(11);
    const t = await told(frame);
    expect([t.box!.left, t.box!.top - 120, t.box!.width, t.box!.height].map(Math.round)).toEqual([0, 0, 996, 560]); // the visible video
    expect(t.fontSize).toBe(0); // YouTube's own size
    // Paused, the controls show: above them
    await page.keyboard.press('k');
    await expect.poll(() => up(page, frame, BANGLA)).toBe(81);
    // Full screen: at its bottom
    await page.keyboard.press('k');
    await page.keyboard.press('f');
    await page.mouse.move(700, 5);
    await expect.poll(async () => { const b = await player(page).boundingBox(); return Math.round(b!.width); }).toBe(1440);
    await expect.poll(() => up(page, frame, BANGLA), { timeout: 10_000 }).toBeLessThan(20);
  });

  test('phone: as on m.youtube.com: 1.5 times the text, 28px up, 48px free at the right; the controls do not move them', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'touch only');
    const { frame, box } = await open(page, BANGLA, { on: true });
    await expect.poll(async () => (await told(frame)).lang).toBe('bn');
    const text = (box.height / 360) * 24;
    // YouTube's note ("Click ⚙ for settings") is far above the video while it may show
    const first = await told(frame);
    expect(textSize(first)).toBeCloseTo(text, 0);
    expect(first.box!.top).toBeLessThan(60); // (the video begins at 120)
    // …and no wider than the place captions have: long ones stay in the player
    expect(first.box!.left).toBeGreaterThanOrEqual(7);
    expect(first.box!.left + first.box!.width).toBeLessThanOrEqual(box.width - 48);
    expect(await up(page, frame, BANGLA)).toBe(Math.round(24 + 0.02 * box.height));
    await expect.poll(async () => Math.round((await told(frame)).box!.left), { timeout: 9000 }).toBe(8);
    const t = await told(frame);
    expect(textSize(t)).toBeCloseTo(text, 1);
    expect([t.box!.left, t.box!.width].map(Math.round)).toEqual([8, Math.round(box.width) - 64]);
    expect(await up(page, frame, BANGLA)).toBe(Math.round(24 + 0.02 * box.height));
    // With the controls showing they stay
    await player(page).tap({ position: { x: 40, y: 60 } });
    await expect(player(page).getByRole('button', { name: /^(Pause|Play)$/ }).first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(await up(page, frame, BANGLA)).toBe(Math.round(24 + 0.02 * box.height));
  });

  test('the CC button: another icon, nothing else', async ({ page, isMobile }) => {
    const { box } = await open(page, BANGLA);
    if (!isMobile) await page.mouse.move(box.x + 300, box.y + 200);
    const look = () => cc(page).evaluate((b) => ({ html: b.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, ''), bg: getComputedStyle(b).backgroundColor, parent: getComputedStyle(b.parentElement!).backgroundColor }));
    const off = await look();
    await cc(page).click();
    await expect(cc(page)).toHaveAttribute('aria-pressed', 'true');
    if (!isMobile) await page.mouse.move(box.x + 310, box.y + 210);
    expect(await look()).toEqual(off);
  });

  test('a video without captions says so: the button is dimmed and no row in Settings', async ({ page, isMobile }) => {
    const { frame, box } = await open(page, NONE, { on: true });
    if (!isMobile) await page.mouse.move(box.x + 300, box.y + 200);
    const button = cc(page);
    await expect(button).toHaveAttribute('aria-label', 'Subtitles/closed captions unavailable');
    await expect(button).toBeDisabled();
    await page.keyboard.press('c');
    await page.waitForTimeout(300);
    expect((await told(frame)).lang).toBe(null);
    await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
    await expect(player(page).getByRole('menuitem', { name: /Playback speed/ })).toBeVisible();
    await expect(player(page).getByRole('menuitem', { name: /Subtitles/ })).toHaveCount(0);
  });

  test('Settings: Off, the languages, Auto-translate; kept for the next video and the next visit', async ({ page, isMobile }) => {
    const { frame, box } = await open(page, TWO);
    const settings = async () => {
      if (!isMobile) await page.mouse.move(box.x + 300 + Math.random() * 40, box.y + 200);
      await player(page).getByRole('button', { name: 'Settings' }).locator('visible=true').click();
    };
    const menu = player(page).getByRole('menu', { name: 'Settings' });
    await settings();
    await menu.getByRole('menuitem', { name: 'Subtitles/CC Off' }).click();
    expect(await menu.getByRole('menuitemradio').allInnerTexts()).toEqual(['Off', 'English (auto-generated)', 'Bangla (auto-generated)']);
    await expect(menu.getByRole('menuitemradio', { name: 'Off' })).toHaveAttribute('aria-checked', 'true');
    await menu.getByRole('menuitemradio', { name: 'Bangla (auto-generated)' }).click();
    await expect.poll(async () => (await told(frame, 1.5)).lang).toBe('bn');
    await settings();
    await menu.getByRole('menuitem', { name: 'Subtitles/CC Bangla (auto-generated)' }).click();
    await menu.getByRole('menuitemradio', { name: 'Auto-translate' }).click();
    await expect(menu.getByRole('menuitemradio', { name: 'Bangla', exact: true })).toHaveCount(0); // its own language
    expect(await menu.evaluate((e) => e.scrollTop)).toBe(0);
    await menu.getByRole('menuitemradio', { name: 'Urdu', exact: true }).click();
    await expect.poll(async () => { const t = await told(frame, 1.5); return [t.lang, t.to]; }).toEqual(['bn', 'ur']);
    // The next video: its own captions, translated the same way (video 1 of the catalogue has only Bangla)
    await page.goto(`/videos/x/${BANGLA}`);
    const next = await frameOf(page, BANGLA);
    await expect.poll(async () => { const t = await told(next); return [t.lang, t.to]; }).toEqual(['bn', 'ur']);
    // A video that has that language shows it untranslated
    await page.evaluate(() => localStorage.setItem('deeni-captions', JSON.stringify({ on: true, lang: 'en', translate: true })));
    await page.goto(`/videos/x/${ENGLISH}`);
    const english = await frameOf(page, ENGLISH);
    await expect.poll(async () => { const t = await told(english); return [t.lang, t.to]; }).toEqual(['en', null]);
    // Without Auto-translate, a video that hasn't got the language shows its own
    await page.evaluate(() => localStorage.setItem('deeni-captions', JSON.stringify({ on: true, lang: 'en' })));
    await page.goto(`/videos/x/${BANGLA}`);
    const own = await frameOf(page, BANGLA);
    await expect.poll(async () => { const t = await told(own); return [t.lang, t.to]; }).toEqual(['bn', null]);
  });

  test('a video narrower than 16:9 shows whole, with black at its sides', async ({ page }) => {
    const { box } = await open(page, TWO);
    const f = (await page.locator(`iframe[src*="/embed/${TWO}"]`).first().boundingBox())!;
    expect(f.width / box.height).toBeCloseTo(1.5, 1);
    expect(Math.abs(f.x + f.width / 2 - (box.x + box.width / 2))).toBeLessThan(1);
  });
});

test.describe('Captions on Shorts', () => {
  const short = async (page: Page, id: string, captions?: object) => {
    await seed(page, captions);
    await fakeYouTube(page);
    await page.goto(`/shorts?v=${id}`);
    const frame = await frameOf(page, id);
    const section = page.locator('section').filter({ has: page.locator(`iframe[src*="/embed/${id}"]`) });
    return { frame, section };
  };

  for (const [id, ratio] of [['MBxDbbkk0gQ', 9 / 16], ['ihdO_G6Yk0E', 1]] as const) test(`YouTube's text in the upper part (${ratio === 1 ? 'a square video' : '9:16'}), for both of its kinds of captions; its note and bars out of sight; nothing else changes`, async ({ page }) => {
    const { frame, section } = await short(page, id);
    const around = () => section.evaluate((s) => [...s.querySelectorAll('[data-short-shade], [data-short-info]')].map((e) => [getComputedStyle(e).opacity, getComputedStyle(e).backgroundImage, getComputedStyle(e, '::before').content]));
    await expect.poll(async () => (await around())[1]?.[0]).toBe('1');
    const before = await around();
    await section.getByRole('button', { name: 'Turn on captions' }).click();
    await expect(section.getByRole('button', { name: 'Turn off captions' })).toBeVisible();
    await expect.poll(async () => (await told(frame, ratio)).lang).toBe('bn');
    const iframe = (await section.locator('iframe').boundingBox())!;
    const box = (await section.locator('.shorts-player-box').boundingBox())!;
    const mute = (await section.locator('[data-mute-toggle]').first().boundingBox())!;
    const text = box.width / 30; // 16px in a short 480px wide
    const ends: number[] = [];
    const look = async () => {
      const t = await told(frame, ratio);
      const scale = iframe.width / t.frame[0];
      expect(textSize(t, ratio) * scale).toBeCloseTo(text, 0);
      expect(Math.abs(iframe.x + (t.box!.left + t.box!.width / 2) * scale - (box.x + box.width / 2))).toBeLessThan(3);
      // Captions at the bottom of their box end here
      ends.push(iframe.y + (t.box!.bottom - 0.02 * t.box!.height) * scale - box.y);
      return { top: iframe.y + t.box!.top * scale, height: t.box!.height * scale };
    };
    // At first the box reaches far above the short (YouTube's note is at its top)
    expect((await look()).top).toBeLessThan(box.y - 60);
    await page.waitForTimeout(6000);
    // Then it's right under the buttons: captions at its top are in sight too, all in the short's upper part
    const near = await look();
    expect(near.top).toBeGreaterThanOrEqual(mute.y + mute.height);
    expect(near.top).toBeLessThan(mute.y + mute.height + 8);
    expect(Math.abs(near.height - text * 11.25)).toBeLessThan(3);
    expect(Math.abs(ends[0] - ends[1])).toBeLessThan(3); // those at the bottom stay where they are
    expect(ends[1] / box.height).toBeLessThan(0.36);
    expect(await around()).toEqual(before);
    // The player reaches 120px past its video at the top and bottom (YouTube's title, logo and buttons)
    const cover = (await section.locator('.shorts-poster').boundingBox())!;
    expect(Math.round(iframe.height - cover.height)).toBe(240);
    expect(Math.round(cover.y - iframe.y)).toBe(120);
    await section.getByRole('button', { name: 'Turn off captions' }).click();
    await expect.poll(async () => (await told(frame, ratio)).lang).toBe(null);
    expect(await around()).toEqual(before);
  });

  test('a short without captions says so; the choice is the watch page\'s', async ({ page }) => {
    const { section } = await short(page, 'hHpoYE-v6og', { on: true });
    await expect(section.getByRole('button', { name: 'Captions unavailable' })).toBeDisabled();
    await section.getByRole('button', { name: 'More options' }).click();
    await expect(page.locator('[data-action="description"]')).toBeVisible();
    await expect(page.locator('[data-action="captions"]')).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.goto('/shorts?v=MBxDbbkk0gQ');
    const frame = await frameOf(page, 'MBxDbbkk0gQ');
    await expect.poll(async () => (await told(frame, 9 / 16)).lang).toBe('bn');
  });
});

test.describe('Captions in the cards', () => {
  const card = async (page: Page, isMobile: boolean, saved?: object) => {
    await seed(page, undefined, { captions: saved });
    await fakeYouTube(page, { clock: false });
    await page.goto('/');
    const preview = page.locator('[data-preview]');
    const thumb = page.locator('.group\\/card').first().locator('a').first();
    await expect(async () => {
      if (!isMobile) { await page.mouse.move(5, 400); await thumb.hover(); }
      await expect(preview.locator('iframe')).toHaveCSS('opacity', '1', { timeout: isMobile ? 12_000 : 4000 });
    }).toPass({ timeout: 25_000 });
    const frame = (await (await preview.locator('iframe').elementHandle())!.contentFrame())!;
    return { preview, frame, box: (await preview.boundingBox())! };
  };

  test('on from the start; YouTube\'s size and place; the button under the volume switches them, for every card', async ({ page, isMobile }) => {
    const { preview, frame, box } = await card(page, isMobile);
    const button = preview.getByRole('button', { name: /^Subtitles/ });
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => (await told(frame)).lang).not.toBe(null);
    expect(textSize(await told(frame))).toBeCloseTo((box.height / 360) * 16 * 1.5, 0);
    // Under the volume, of its size
    const [v, c] = [(await preview.getByRole('button', { name: 'Unmute' }).boundingBox())!, (await button.boundingBox())!];
    expect([c.width, c.height, Math.round(c.x - v.x), Math.round(c.y - v.y)]).toEqual([48, 48, 0, 48]);
    const url = page.url();
    if (isMobile) await button.tap(); else await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await told(frame)).lang).toBe(null);
    expect(page.url()).toBe(url); // the video isn't opened
    expect(await page.evaluate(() => [localStorage.getItem('deeni-preview-captions'), localStorage.getItem('deeni-captions')])).toEqual(['{"on":false}', null]); // the watch page's own switch is another
    if (isMobile) await button.tap(); else await button.click();
    await expect.poll(async () => (await told(frame)).lang).not.toBe(null);
  });

  test('long captions stay in the card, also in the first seconds', async ({ page, isMobile }) => {
    const { preview, frame } = await card(page, isMobile);
    await expect.poll(async () => (await told(frame)).lang).not.toBe(null);
    const iframe = (await preview.locator('iframe').boundingBox())!;
    const box = (await preview.locator('iframe').locator('..').boundingBox())!;
    for (const wait of [0, 6500]) {
      await page.waitForTimeout(wait);
      const t = (await told(frame)).box!;
      // (captions in the middle of their box may be 96% as wide as it)
      expect(iframe.x + t.left + 0.02 * t.width).toBeGreaterThanOrEqual(box.x + 8);
      expect(iframe.x + t.left + 0.98 * t.width).toBeLessThanOrEqual(box.x + box.width - 48);
    }
  });

  test('off stays off', async ({ page, isMobile }) => {
    const { preview, frame } = await card(page, isMobile, { on: false });
    await expect(preview.getByRole('button', { name: 'Subtitles/CC turned off' })).toBeVisible();
    await page.waitForTimeout(800);
    expect((await told(frame)).lang).toBe(null);
  });
});

test.describe('The data', () => {
  test.skip(({ isMobile }) => !!isMobile, 'once');

  test('every video and short is in lib/caption-data.ts (npm run storyboards)', () => {
    const missing = [...videoData, ...shortsVideos].map((v) => v.videoId).filter((id) => !(id in captionData));
    expect(missing).toEqual([]);
  });

  test('a video that isn\'t 16:9 says so (ratio in lib/video-data.ts)', () => {
    for (const v of videoData) {
      const [w, h] = storyboards[v.videoId].split('|')[2].split('#').map(Number);
      expect({ id: v.videoId, ratio: Math.round((v.ratio ?? 16 / 9) * 10) / 10 }).toEqual({ id: v.videoId, ratio: Math.round((w / h) * 10) / 10 });
    }
  });
});
