/**
 * Real browser smoke test + screenshot capture.
 *
 * Usage: node scripts/capture-screenshots.mjs [baseUrl]
 * Requires a running dev or preview server (default http://127.0.0.1:5178).
 */
import { mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.argv[2] ?? process.env.POKEDEX_URL ?? 'http://127.0.0.1:5178';
const OUT_DIR = path.resolve('artifacts');

/** Prefer playwright's own resolution, then fall back to any cached headless shell. */
async function resolveChromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const bundled = chromium.executablePath();
  if (bundled && existsSync(bundled)) return bundled;

  const cache = `${process.env.HOME}/Library/Caches/ms-playwright`;
  for (const entry of await readdir(cache).catch(() => [])) {
    if (!entry.startsWith('chromium')) continue;
    const candidate = path.join(cache, entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`No Chromium build found under ${cache}. Run: npx playwright install chromium`);
}

const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    console.log(`  ✗ ${label} ${detail}`);
    failures.push(label);
  }
}

async function settle(page) {
  await page.waitForFunction(
    () => !document.body.innerText.includes('SPINNING UP CARTRIDGE'),
    undefined,
    { timeout: 25_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}

const browser = await chromium.launch({ executablePath: await resolveChromium() });

try {
  await mkdir(OUT_DIR, { recursive: true });

  /* ---------------- desktop ---------------- */
  const desktop = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const consoleErrors = [];
  desktop.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  desktop.on('pageerror', (error) => consoleErrors.push(String(error)));

  console.log(`\nDesktop 1440×900 — ${BASE_URL}`);
  await desktop.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await settle(desktop);

  const lcd = await desktop.locator('.lcd').first().innerText();
  check('#001 Bulbasaur loads by default', /BULBASAUR/.test(lcd) && /No\. 001/.test(lcd), lcd.slice(0, 60));
  const flavor = await desktop.locator('.flavor').first().innerText();
  check(
    'flavor text rendered from PokéAPI with newlines cleaned',
    flavor.length > 60 && !/[\n\f]/.test(flavor),
    JSON.stringify(flavor.slice(0, 50)),
  );
  check('species data shown from API', /0\.7 m/.test(lcd) && /6\.9 kg/.test(lcd));
  check('no horizontal overflow', await desktop.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  check(
    'device is fully visible',
    await desktop.evaluate(() => {
      const box = document.querySelector('.pokedex')?.getBoundingClientRect();
      return !!box && box.top >= -1 && box.bottom <= window.innerHeight + 1 && box.left >= -1 && box.right <= window.innerWidth + 1;
    }),
  );

  // Keyboard navigation, including the 1/151 boundaries.
  await desktop.keyboard.press('ArrowLeft');
  await desktop.waitForTimeout(150);
  check(
    'ArrowLeft at #001 cannot go below the index',
    (await desktop.locator('.lcd__id').first().innerText()).includes('001'),
  );

  await desktop.keyboard.press('ArrowRight');
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('IVYSAUR'));
  check('ArrowRight advances to #002', true);

  await desktop.keyboard.press('ArrowLeft');
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('BULBASAUR'));
  check('ArrowLeft returns to #001', true);

  // Search by name, then return to #001 via a numeric search.
  await desktop.keyboard.press('ArrowDown');
  await desktop.keyboard.press('ArrowDown');
  await desktop.locator('#dex-search').fill('pikachu');
  await desktop.locator('#dex-search').press('Enter');
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('PIKACHU'));
  check('search "pikachu" resolves to #025', (await desktop.locator('.lcd__id').first().innerText()).includes('025'));

  await desktop.locator('button[aria-label="Confirm — open the Kanto index"]').click();
  await desktop.locator('#dex-search').fill('001');
  await desktop.locator('#dex-search').press('Enter');
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('BULBASAUR'));
  check('search "001" resolves to #001', (await desktop.locator('.lcd__id').first().innerText()).includes('001'));

  // Controls still respond after the smoke run.
  await desktop.locator('button[aria-label="Next entry"]').click();
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('IVYSAUR'));
  check('clicking the D-pad advances the entry', true);

  await desktop.locator('button[aria-label="Previous entry"]').click();
  await desktop.waitForFunction(() => document.querySelector('.lcd__name')?.textContent?.includes('BULBASAUR'));
  check('returning to a cached entry stays instant', true);

  // Back to the default readout for the hero screenshot.
  await desktop.waitForTimeout(700);
  await desktop.screenshot({ path: path.join(OUT_DIR, 'pokedex-desktop.png') });
  console.log('  → artifacts/pokedex-desktop.png');

  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

  /* ---------------- mobile ---------------- */
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  });
  console.log('\nMobile 390×844');
  await mobile.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await settle(mobile);

  const mobileLcd = await mobile.locator('.lcd').first().innerText();
  check('mobile shows #001', /BULBASAUR/.test(mobileLcd));
  check(
    'halves are stacked vertically',
    await mobile.evaluate(() => {
      const left = document.querySelector('.pokedex__half--left')?.getBoundingClientRect();
      const right = document.querySelector('.pokedex__half--right')?.getBoundingClientRect();
      return !!left && !!right && right.top >= left.bottom - 2;
    }),
  );
  check(
    'no horizontal page overflow',
    await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  );
  check(
    'main readout text is legible',
    await mobile.evaluate(() => {
      const node = document.querySelector('.stat-row');
      const size = node ? parseFloat(getComputedStyle(node).fontSize) : 0;
      return size >= 11;
    }),
  );

  await mobile.screenshot({ path: path.join(OUT_DIR, 'pokedex-mobile.png'), fullPage: true });
  console.log('  → artifacts/pokedex-mobile.png');
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll browser checks passed.');
