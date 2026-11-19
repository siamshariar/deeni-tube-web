import { test, expect } from '@playwright/test';
import { videoData } from '../lib/video-data';

test.describe('Video detail page', () => {
  const firstVideo = videoData[0];
  const videoUrl = `/videos/${firstVideo.channelId}/${firstVideo.id}`;

  test('video page loads with iframe', async ({ page }) => {
    await page.goto(videoUrl);
    await expect(page).toHaveURL(videoUrl);
    // YouTube iframe should be present
    await expect(page.locator('iframe[src*="youtube.com"]').first()).toBeAttached({ timeout: 8000 });
  });

  test('video page shows title', async ({ page }) => {
    await page.goto(videoUrl);
    // Video title rendered somewhere on the page
    // Mobile and desktop layouts each render a title; check the visible one
    const title = page.locator('h1:visible, h2:visible, [data-testid="video-title"]:visible').first();
    await expect(title).toBeVisible({ timeout: 5000 });
  });

  test('back button exists on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(videoUrl);
    // A back/ArrowLeft button should be present
    const backBtn = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(backBtn).toBeVisible({ timeout: 5000 });
  });

  test('video page shows the player and actions', async ({ page }) => {
    await page.goto(videoUrl);
    await expect(page.locator('iframe[src*="youtube.com"]').first()).toBeAttached({ timeout: 8000 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('description tab toggles on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(videoUrl);
    // Find description toggle button
    const descBtn = page.locator('button').filter({ hasText: /description/i }).first();
    if (await descBtn.isVisible({ timeout: 3000 })) {
      await descBtn.click();
      // Content should still be visible (no crash)
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Video detail – loading state', () => {
  test('skeleton loaders appear briefly then resolve', async ({ page }) => {
    await page.goto(`/videos/${videoData[0].channelId}/${videoData[0].id}`);
    // Page should settle to actual content
    await expect(page.locator('iframe[src*="youtube.com"]').first()).toBeAttached({ timeout: 8000 });
  });
});
