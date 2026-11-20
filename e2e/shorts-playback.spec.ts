import { test, expect, Page, Frame } from '@playwright/test';
import { useFakeYouTube } from './fake-youtube';

// Shorts playback with a fake YouTube player (see fake-youtube.ts), so autoplay rules and lost commands can
// be tested exactly.

async function activePlayer(page: Page): Promise<Frame> {
  const feed = page.locator('section').first().locator('..');
  const index = await feed.evaluate((c) => Math.round(c.scrollTop / (c.firstElementChild as HTMLElement).offsetHeight));
  const handle = await page.locator('section').nth(index).locator('iframe').elementHandle();
  return (await handle!.contentFrame())!;
}

const playerState = async (page: Page) => (await activePlayer(page)).evaluate(() => (window as unknown as { __player: () => { playing: boolean; muted: boolean } }).__player());

test.describe('Shorts playback', () => {
  test('blocked sound: plays muted with "Tap to unmute"; a tap brings the sound back without pausing, and it stays on', async ({ page }) => {
    let allowSound = false;
    await useFakeYouTube(page, { allowSound: () => allowSound });
    await page.goto('/shorts');

    // Plays at once, muted, instead of sitting paused
    const unmutePill = page.getByRole('button', { name: /(Tap|Click) to unmute/ }).locator('visible=true');
    await expect(unmutePill).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => playerState(page)).toEqual({ playing: true, muted: true });

    // The visitor taps the video: sound is now allowed (in every player, as in a real browser)
    allowSound = true;
    for (const f of page.frames()) await f.evaluate(() => { (window as unknown as { __allowSound: boolean }).__allowSound = true; }).catch(() => {});
    const box = (await page.locator('.shorts-player-box').first().boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(unmutePill).toHaveCount(0);
    await expect.poll(() => playerState(page)).toEqual({ playing: true, muted: false }); // unmuted, not paused

    // Next shorts keep the sound
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => playerState(page), { timeout: 10_000 }).toEqual({ playing: true, muted: false });
    }
    // The active short's mute button shows the sound is on
    await expect(page.locator('section').nth(2).getByRole('button', { name: 'Mute' })).toHaveCount(1);
  });

  test('a play command the player drops is sent again, so the short does not stay paused', async ({ page }) => {
    await useFakeYouTube(page, { dropFirstPlay: true });
    await page.goto('/shorts');
    await expect.poll(() => playerState(page), { timeout: 15_000 }).toEqual({ playing: true, muted: false });
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => playerState(page), { timeout: 10_000 }).toEqual({ playing: true, muted: false });
  });
});
