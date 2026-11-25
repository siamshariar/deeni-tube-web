import { test, expect, type Page } from '@playwright/test';

/** People speak and type phrases: what a search finds is more than the exact phrase (lib/search-match.ts) */
// Only the results' own titles: the sidebar has headings too
const results = (page: Page) => page.locator('main a[href^="/search/"] h3').filter({ visible: true });
const none = (page: Page) => page.getByText(/no results/i).filter({ visible: true }).first();
const open = async (page: Page, q: string) => {
  await page.goto('/search?q=' + encodeURIComponent(q));
  await expect(page.locator('h1').first()).toBeVisible();
  // the results or the empty state, whichever comes
  await expect(results(page).first().or(none(page))).toBeVisible();
};

test('words that say nothing about what to look for do not matter', async ({ page }) => {
  await open(page, 'quran');
  const titles = await results(page).allTextContents();
  expect(titles.length).toBeGreaterThan(3);
  for (const q of ['quran video', 'Quran videos', 'show me quran video', 'Quran ভিডিও']) {
    await open(page, q);
    expect(await results(page).allTextContents(), q).toEqual(titles);
  }
});

test('all words are found, in any order and place', async ({ page }) => {
  await open(page, 'zakir naik');
  const titles = await results(page).allTextContents();
  expect(titles.length).toBeGreaterThan(0);
  for (const q of ['zakir naik video', 'naik zakir', 'video by zakir naik']) {
    await open(page, q);
    expect((await results(page).allTextContents()).sort(), q).toEqual([...titles].sort());
  }
});

test('a name written as it sounds finds the same videos', async ({ page }) => {
  await open(page, 'monzur');
  const titles = (await results(page).allTextContents()).sort();
  for (const q of ['manjur', 'manjur video', 'Monjur', 'মনজুর ভিডিও']) {
    await open(page, q);
    const found = await results(page).allTextContents();
    expect(found.length, q).toBeGreaterThan(0);
    // all of them are Monzur's: nothing else sounds like it
    expect(found.filter((t) => !titles.includes(t)), q).toEqual([]);
  }
});

test('another spelling of a name finds only its own videos, and an extra word does not hide them', async ({ page }) => {
  await open(page, 'zakir naik');
  const titles = await results(page).allTextContents();
  await open(page, 'jakir nayek');
  expect((await results(page).allTextContents()).sort()).toEqual([...titles].sort());
  await open(page, 'zakir naik songs');
  expect((await results(page).allTextContents()).slice(0, titles.length).sort()).toEqual([...titles].sort());
});

test('a name that is written so does not bring the ones that only sound like it', async ({ page }) => {
  await page.goto('/scholars');
  await page.getByPlaceholder(/search/i).filter({ visible: true }).last().fill('zakir');
  await expect(page.getByText('Zakir Naik').filter({ visible: true }).first()).toBeVisible();
  await expect(page.locator('main').getByText(/Zakaria/).filter({ visible: true })).toHaveCount(0);
});

test('nothing is made up', async ({ page }) => {
  for (const q of ['zzzznomatch', 'songs video', '!!!']) {
    await open(page, q);
    await expect(none(page)).toBeVisible();
    expect(await results(page).count(), q).toBe(0);
  }
});
