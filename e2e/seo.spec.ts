import { test, expect, Page } from '@playwright/test';
import { useFakeYouTube as fakeYouTube } from './fake-youtube';

// What search engines and shared links get (lib/seo.ts): every page in the sitemap has its own title, description, address,
// picture and structured data; private pages stay out; a shared short has its own address and picture.

const BOT = { 'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' };
const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const pathOf = (url: string) => new URL(url).pathname;

test.describe('Search engines and shared links', () => {
  test.skip(({ isMobile }) => !!isMobile, 'once');
  test.setTimeout(180_000);

  test('every page in the sitemap: title, description, address, picture, structured data', async ({ request, page, baseURL }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.headers()['content-type']).toContain('xml');
    await page.goto('about:blank');
    const { error, urls, videos } = await page.evaluate((x) => {
      const d = new DOMParser().parseFromString(x, 'application/xml');
      return { error: !!d.querySelector('parsererror'), urls: [...d.getElementsByTagName('url')].map((u) => u.getElementsByTagName('loc')[0].textContent!), videos: d.getElementsByTagName('video:video').length };
    }, await sitemap.text());
    expect(error).toBe(false);
    expect(urls.length).toBeGreaterThan(100);
    expect(new Set(urls).size).toBe(urls.length);
    expect(videos).toBe(50);

    const problems: string[] = [];
    const titles = new Map<string, string>();
    const descriptions = new Map<string, string>();
    const pictures = new Set<string>();
    for (const url of urls) {
      const path = pathOf(url);
      const say = (m: string) => problems.push(`${decodeURI(path)}: ${m}`);
      const r = await request.get(path, { headers: BOT, maxRedirects: 0 });
      if (r.status() !== 200) { say(`status ${r.status()}`); continue; }
      const h = await r.text();
      const one = (re: RegExp, name: string) => {
        const all = [...h.matchAll(re)].map((m) => decode(m[1]));
        if (all.length !== 1) say(`${all.length} × ${name}`);
        return all[0] ?? '';
      };
      const title = one(/<title>([^<]*)<\/title>/g, 'title');
      const description = one(/<meta name="description" content="([^"]*)"/g, 'description');
      const length = [...description].length;
      if (length < 50 || length > 165) say(`description of ${length}`);
      if (pathOf(one(/<link rel="canonical" href="([^"]*)"/g, 'canonical')) !== path) say('canonical');
      if (!/^index/.test(one(/<meta name="robots" content="([^"]*)"/g, 'robots'))) say('robots');
      for (const p of ['og:title', 'og:description', 'og:url', 'og:site_name', 'og:type', 'og:image', 'og:image:width', 'og:image:height', 'og:image:alt']) if (!new RegExp(`<meta property="${p}" content="[^"]+`).test(h)) say(`no ${p}`);
      for (const p of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) if (!new RegExp(`<meta name="${p}" content="[^"]+`).test(h)) say(`no ${p}`);
      const picture = decode(h.match(/<meta property="og:image" content="([^"]+)"/)?.[1]);
      if (!/^https?:\/\//.test(picture)) say(`picture ${picture}`);
      else if (!/ytimg/.test(picture)) pictures.add(pathOf(picture));
      for (const [name, map, text] of [['title', titles, title], ['description', descriptions, description]] as const) {
        if (map.has(text)) say(`same ${name} as ${map.get(text)}`);
        map.set(text, path);
      }
      const data = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1]) as Record<string, unknown>[]);
      const types = data.map((d) => d['@type']);
      const need = /^\/(videos|shorts)\/./.test(path) ? ['VideoObject', 'BreadcrumbList'] : /^\/(channels|scholars)\/[^/]+$/.test(path) ? ['ProfilePage', 'BreadcrumbList'] : /^\/(categories|playlists)\/./.test(path) ? ['ItemList', 'BreadcrumbList'] : [];
      for (const n of need) if (!types.includes(n)) say(`no ${n}`);
      const video = data.find((d) => d['@type'] === 'VideoObject');
      if (video) for (const k of ['name', 'description', 'thumbnailUrl', 'uploadDate', 'duration', 'embedUrl']) if (!video[k]) say(`VideoObject without ${k}`);
    }
    expect(problems).toEqual([]);
    for (const p of pictures) {
      const r = await request.get(p);
      expect(r.headers()['content-type'], p).toContain('image/jpeg');
    }
    expect(baseURL).toBeTruthy();
  });

  test('private pages, unknown playlists and missing pages stay out; robots and the app\'s manifest', async ({ request }) => {
    for (const path of ['/you', '/history', '/liked-videos', '/watch-later', '/settings', '/signin', '/search?q=quran', '/playlists/mine/pl-nobody-1', '/no-such-page']) expect(await (await request.get(path)).text(), path).toMatch(/<meta name="robots" content="noindex/);
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/Allow: \//);
    expect(robots).toMatch(/Sitemap: https?:\/\/.+\/sitemap\.xml/);
    const manifest = await (await request.get('/manifest.webmanifest')).json();
    expect(manifest.name).toContain('Deeni.tube');
    for (const icon of manifest.icons) expect((await request.get(icon.src)).headers()['content-type']).toBe('image/png');
    // Old addresses of a video lead to its own
    expect((await request.get('/videos/x/XVscS6piz9A', { maxRedirects: 0 })).status()).toBe(308);
  });

  test('a video\'s and a short\'s link show their own picture, title and player', async ({ request }) => {
    const h = await (await request.get('/videos/new-asking-allah-for-something-you-want-motivational-evening/T9oT-oOaTNU', { headers: BOT })).text();
    expect(h).toContain('<meta property="og:image" content="https://i.ytimg.com/vi/T9oT-oOaTNU/maxresdefault.jpg"');
    expect(h).toMatch(/<meta property="og:title" content="NEW \| Asking Allah/);
    expect(h).toContain('<meta property="og:video" content="https://www.youtube.com/embed/T9oT-oOaTNU"');
    const s = await (await request.get('/shorts/Wgk2Hw5-m7Y', { headers: BOT })).text();
    expect(s).toContain('<meta property="og:image" content="https://i.ytimg.com/vi/Wgk2Hw5-m7Y/maxresdefault.jpg"');
    expect(s).toMatch(/<meta property="og:title" content="The Quran is the Most Untranslatable Book/);
    expect((await request.get('/shorts/nosuchshort')).status()).toBe(404);
  });
});

test.describe('A short at its own address', () => {
  const seed = (page: Page) => page.addInitScript(() => { if (top === window) localStorage.setItem('deeni-lang-prefs', JSON.stringify({ languages: ['bn', 'en'], hasSelected: true, isGuest: false })); });

  test('is the Shorts page, opened at it; Share gives that address', async ({ page, isMobile }) => {
    await seed(page);
    await fakeYouTube(page);
    const look = async (url: string) => {
      await page.goto(url);
      const iframe = page.locator('iframe[src*="/embed/Wgk2Hw5-m7Y"]');
      await expect(iframe).toHaveCSS('opacity', '1', { timeout: 15_000 });
      return page.evaluate(() => {
        const r = (e: Element | null) => { const b = e?.getBoundingClientRect(); return b && [b.left, b.top, b.width, b.height].map(Math.round); };
        return [r(document.querySelector('iframe[src*="/embed/Wgk2Hw5-m7Y"]')), r(document.querySelector('main')), document.querySelectorAll('h1').length, [...document.querySelectorAll('header')].map((h) => Math.round(h.getBoundingClientRect().bottom)), document.documentElement.scrollHeight];
      });
    };
    expect(await look('/shorts/Wgk2Hw5-m7Y')).toEqual(await look('/shorts?v=Wgk2Hw5-m7Y'));
    await page.goto('/shorts/Wgk2Hw5-m7Y');
    await expect(page).toHaveTitle(/The Quran is the Most Untranslatable Book/);
    const section = page.locator('section').filter({ has: page.locator('iframe[src*="/embed/Wgk2Hw5-m7Y"]') });
    await expect(section.locator('iframe')).toHaveCSS('opacity', '1', { timeout: 15_000 });
    await section.getByRole('button', { name: 'More options' }).locator('visible=true').first().click();
    await page.locator('[data-action="share"]').click();
    await expect(page.getByRole('dialog', { name: 'Share' }).getByRole('textbox', { name: 'Link' })).toHaveValue(/\/shorts\/Wgk2Hw5-m7Y$/);
    if (isMobile) await expect(page.locator('nav a[href="/shorts"]').locator('visible=true').first()).toBeVisible();
  });
});
