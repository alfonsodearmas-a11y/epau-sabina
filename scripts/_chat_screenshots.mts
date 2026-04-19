#!/usr/bin/env -S tsx
import { chromium, type Page } from 'playwright';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const BASE = process.env.EPAU_URL ?? 'http://localhost:3000';
const OUT = process.env.SCREENSHOT_DIR ?? '/tmp/epau-screenshots';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

async function waitForTurnComplete(page: Page, timeoutMs = 120_000) {
  await page.waitForFunction(
    () => {
      const el = Array.from(document.querySelectorAll('aside[aria-label="EPAU Copilot"] *'))
        .reverse()
        .find((n) => n.textContent?.includes('Completed in')) ?? null;
      if (el) return true;
      const input = document.getElementById('epau-chat-input') as HTMLTextAreaElement | null;
      return !!input && !input.disabled && !!document.querySelector('aside[aria-label="EPAU Copilot"]');
    },
    { timeout: timeoutMs },
  );
  await page.waitForTimeout(400);
}

async function sendAndWait(page: Page, text: string) {
  const input = await page.locator('#epau-chat-input');
  await input.fill(text);
  await input.press('Enter');
  await page.waitForTimeout(500);
  await waitForTurnComplete(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    // --- Desktop: workbench with panel open, inflation query ---
    {
      const ctx = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 EPAU-Screenshot-Bot',
        extraHTTPHeaders: { 'x-epau-user-resolved': 'alfonso.dearmas@mpua.gov.gy' },
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle' });
      await page.waitForSelector('aside[aria-label="EPAU Copilot"]');

      // Empty state capture (before any turn).
      await page.screenshot({ path: join(OUT, '01_desktop_empty.png'), fullPage: false });
      console.log('wrote 01_desktop_empty.png');

      // Inflation multi-step turn.
      await sendAndWait(page, 'what was inflation in 2023');
      await page.screenshot({ path: join(OUT, '02_desktop_inflation.png'), fullPage: false });
      console.log('wrote 02_desktop_inflation.png');

      // NRF inflows (for the "verify numbers match trace" check).
      await sendAndWait(page, 'NRF inflows in 2024');
      await page.screenshot({ path: join(OUT, '03_desktop_nrf_inflows.png'), fullPage: false });
      console.log('wrote 03_desktop_nrf_inflows.png');

      // Compare GDP vs inflation — expect a chart render.
      await sendAndWait(page, 'compare GDP growth to inflation since 2018');
      // Scroll to make sure the chart is in view.
      await page.locator('aside[aria-label="EPAU Copilot"] [role="figure"]').last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, '04_desktop_chart_render.png'), fullPage: false });
      console.log('wrote 04_desktop_chart_render.png');

      // Gini → flag_unavailable card
      await sendAndWait(page, 'what is Guyana Gini coefficient');
      await page.locator('aside[aria-label="EPAU Copilot"] [role="alert"]').last().scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(OUT, '05_desktop_flag_unavailable.png'), fullPage: false });
      console.log('wrote 05_desktop_flag_unavailable.png');

      await ctx.close();
    }

    // --- Mobile: FAB closed ---
    {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2,
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 EPAU-Screenshot-Bot',
        extraHTTPHeaders: { 'x-epau-user-resolved': 'alfonso.dearmas@mpua.gov.gy' },
      });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/workbench`, { waitUntil: 'networkidle' });
      await page.waitForSelector('button[aria-label="Open EPAU Copilot"]');
      await page.screenshot({ path: join(OUT, '06_mobile_fab.png'), fullPage: false });
      console.log('wrote 06_mobile_fab.png');

      await page.locator('button[aria-label="Open EPAU Copilot"]').click();
      await page.waitForSelector('aside[aria-label="EPAU Copilot"]');
      await page.screenshot({ path: join(OUT, '07_mobile_overlay.png'), fullPage: false });
      console.log('wrote 07_mobile_overlay.png');

      await ctx.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
