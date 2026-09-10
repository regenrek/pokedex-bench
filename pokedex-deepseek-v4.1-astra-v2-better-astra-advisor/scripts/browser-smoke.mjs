/**
 * Real-browser smoke test and screenshot capture.
 *
 * Drives the running application with the locally installed Chrome through
 * playwright-core, exercises the required interactions and writes genuine
 * screenshots to artifacts/.
 *
 * Usage: node scripts/browser-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.argv[2] ?? 'http://localhost:4319/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = path.resolve('artifacts');

const results = [];
const problems = [];

function check(name, condition, detail = '') {
  results.push({ name, ok: Boolean(condition), detail });
  if (!condition) problems.push(`${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });

  try {
    /* ---------------------------------------------------------- desktop */
    const desktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await desktop.newPage();
    const consoleErrors = [];
    const failedRequests = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) =>
      failedRequests.push(`${request.url()} ${request.failure()?.errorText ?? ''}`),
    );
    page.on('response', (response) => {
      if (response.status() >= 400) {
        failedRequests.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // 1. #001 loads by default from PokéAPI.
    await page.waitForSelector('text=Bulbasaur', { timeout: 30000 });
    const dexNo = await page.locator('.main__dexno').innerText();
    check('default record is #001 Bulbasaur', dexNo.includes('001'), dexNo);

    // Wait for the sprite request; a genuinely broken sprite still fails here.
    const spriteLoaded = await page
      .waitForFunction(
        () => {
          const img = document.querySelector('.main__sprite');
          return Boolean(img && img.complete && img.naturalWidth > 0);
        },
        undefined,
        { timeout: 20000 },
      )
      .then(() => true)
      .catch(() => false);
    check('sprite image loaded from PokéAPI', spriteLoaded);

    const deviceBox = await page.locator('.device').boundingBox();
    check(
      'device renders at desktop scale',
      deviceBox && deviceBox.width > 800,
      JSON.stringify(deviceBox),
    );

    await page.screenshot({ path: path.join(OUT_DIR, 'pokedex-desktop.png') });

    // 2. Next / previous through the physical controls.
    await page.getByRole('button', { name: 'Next Pokémon (A)' }).click();
    await page.waitForSelector('text=Ivysaur');
    check(
      'next button advances to #002',
      (await page.locator('.main__dexno').innerText()).includes('002'),
    );

    await page.getByRole('button', { name: 'Previous Pokémon (B)' }).click();
    await page.waitForSelector('text=Bulbasaur');
    check(
      'previous button returns to #001',
      (await page.locator('.main__dexno').innerText()).includes('001'),
    );

    // 3. Boundary: #001 cannot go lower.
    const prevDisabled = await page
      .getByRole('button', { name: 'Previous Pokémon (B)' })
      .isDisabled();
    check('previous control disabled at #001', prevDisabled);

    // 4. Keyboard navigation.
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    await page.keyboard.press('ArrowRight');
    await page.waitForSelector('text=Ivysaur');
    await page.keyboard.press('ArrowLeft');
    await page.waitForSelector('text=Bulbasaur');
    check('keyboard arrows navigate', true);

    // 5. Search by name.
    const search = page.getByLabel('Search Pokémon by name or number');
    await search.fill('pikachu');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForSelector('text=Pikachu');
    const pikachuNo = await page.locator('.main__dexno').innerText();
    check('searching "pikachu" loads #025', pikachuNo.includes('025'), pikachuNo);

    // 6. Search by number.
    await search.fill('025');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForTimeout(150);
    check(
      'searching "025" keeps #025',
      (await page.locator('.main__dexno').innerText()).includes('025'),
    );

    // 7. Invalid search state.
    await search.fill('missingno');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('[data-testid="main-status"]')?.textContent?.includes('MISSINGNO'),
      undefined,
      { timeout: 5000 },
    );
    check('invalid search produces a visible error state', true);

    // 8. Data + stats tabs.
    await page.getByRole('tab', { name: 'STATS' }).click();
    await page.waitForSelector('text=BASE STATS');
    check('stats view renders base stats', true);
    await page.getByRole('tab', { name: 'DATA' }).click();

    // 9. Information sections.
    await page.getByRole('button', { name: /D-pad down/ }).click();
    const section = await page.locator('[data-testid="info-detail"]').innerText();
    check('D-pad changes information section', section.includes('HABITAT'), section);

    // 10. Keypad direct entry.
    await page.getByRole('button', { name: 'Key 1' }).click();
    await page.getByRole('button', { name: 'Key 5' }).click();
    await page.getByRole('button', { name: 'Key 1' }).click();
    await page.getByRole('button', { name: 'Enter number and jump' }).click();
    await page.waitForSelector('text=Mew');
    check(
      'keypad entry jumps to #151',
      (await page.locator('.main__dexno').innerText()).includes('151'),
    );
    const nextDisabled = await page
      .getByRole('button', { name: 'Next Pokémon (A)' })
      .isDisabled();
    check('next control disabled at #151', nextDisabled);

    // 11. Index overlay.
    await page.getByRole('button', { name: /Confirm/ }).click();
    await page.waitForSelector('[role="dialog"][aria-label="Pokémon index"]');
    const options = await page.getByRole('option').count();
    check('index lists the 151 Generation I entries', options === 151, `count=${options}`);
    await page.screenshot({ path: path.join(OUT_DIR, 'pokedex-index.png') });
    await page.getByRole('option', { name: /025\s*Pikachu/i }).click();
    await page.waitForSelector('text=Pikachu');
    check('index selection loads a record', true);

    // 11b. Declared widgets own their keyboard behaviour.
    await page.getByRole('button', { name: /Confirm/ }).click();
    await page.waitForSelector('[role="dialog"][aria-label="Pokémon index"]');
    const focusInDialog = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    );
    check('opening the index moves focus into the dialog', focusInDialog);

    const beforeArrow = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? '',
    );
    await page.keyboard.press('ArrowDown');
    const afterArrow = await page.evaluate(
      () => document.activeElement?.textContent?.trim() ?? '',
    );
    check(
      'arrow keys move through index entries',
      beforeArrow !== afterArrow && afterArrow.length > 0,
      `${beforeArrow} -> ${afterArrow}`,
    );
    const sectionUnchanged = await page
      .locator('[data-testid="info-detail"]')
      .innerText();
    check(
      'index arrows do not change the information section',
      sectionUnchanged.startsWith('HABITAT'),
      sectionUnchanged.split('\n')[0],
    );
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"][aria-label="Pokémon index"]', {
      state: 'detached',
    });
    const focusRestored = await page.evaluate(() =>
      Boolean(document.activeElement?.getAttribute('aria-label')?.includes('Confirm')),
    );
    check('closing the index restores focus to CONFIRM', focusRestored);

    // Tablist follows the WAI-ARIA tabs pattern and does not change Pokémon.
    const idBeforeTabs = await page.locator('.main__dexno').innerText();
    await page.getByRole('tab', { name: 'DATA' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(80);
    const statsSelected = await page
      .getByRole('tab', { name: 'STATS' })
      .getAttribute('aria-selected');
    const idAfterTabs = await page.locator('.main__dexno').innerText();
    check(
      'ArrowRight on the tablist selects STATS without changing Pokémon',
      statsSelected === 'true' && idBeforeTabs === idAfterTabs,
      `${statsSelected} / ${idBeforeTabs} -> ${idAfterTabs}`,
    );
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(80);

    // Long feedback must not push the header controls out of the LCD.
    await page.getByLabel('Search Pokémon by name or number').fill('999');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="main-status"]')
          ?.textContent?.includes('BEYOND KANTO'),
      undefined,
      { timeout: 5000 },
    );
    const desktopContainment = await page.evaluate(() => {
      const lcd = document.querySelector('.lcd--main').getBoundingClientRect();
      const tabs = document.querySelector('.main__tabs').getBoundingClientRect();
      const status = document
        .querySelector('[data-testid="main-status"]')
        .getBoundingClientRect();
      const inside = (r) =>
        r.left >= lcd.left - 1 &&
        r.right <= lcd.right + 1 &&
        r.top >= lcd.top - 1 &&
        r.bottom <= lcd.bottom + 1;
      return { tabs: inside(tabs), status: inside(status) };
    });
    check(
      'long status messages stay inside the desktop LCD with the tabs',
      desktopContainment.tabs && desktopContainment.status,
      JSON.stringify(desktopContainment),
    );
    await page.getByRole('button', { name: 'CANCEL' }).click();

    // 12. Reduced-motion preference must not break the device.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(120);
    check('renders with prefers-reduced-motion', await page.locator('.device').isVisible());
    await page.emulateMedia({ reducedMotion: 'no-preference' });

    // 13. No console errors during the whole desktop session.
    check(
      'no console errors on desktop',
      consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(' | '),
    );
    check(
      'no failed network requests',
      failedRequests.length === 0,
      failedRequests.slice(0, 3).join(' | '),
    );

    // Accessibility spot checks.
    const focusable = await page.locator('.device button:not([disabled])').count();
    check('physical controls are real buttons', focusable > 15, `count=${focusable}`);
    const unlabelled = await page
      .locator('.device button')
      .evaluateAll((nodes) =>
        nodes
          .filter(
            (node) =>
              !(node.getAttribute('aria-label') ?? '').trim() &&
              !(node.textContent ?? '').trim(),
          )
          .map((node) => node.className),
      );
    check('every device button has an accessible name', unlabelled.length === 0, unlabelled.join(','));

    // Screenshot of the STATS view for the review packet.
    await page.getByRole('tab', { name: 'STATS' }).click();
    await page.waitForSelector('text=BASE STATS');
    await page.locator('.device').screenshot({ path: path.join(OUT_DIR, 'pokedex-stats.png') });
    await page.getByRole('tab', { name: 'DATA' }).click();

    /* ----------------------------------------------------------- mobile */
    const mobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobile.newPage();
    const mobileErrors = [];
    mobilePage.on('console', (message) => {
      if (message.type() === 'error') mobileErrors.push(message.text());
    });
    mobilePage.on('pageerror', (error) => mobileErrors.push(`pageerror: ${error.message}`));

    await mobilePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForSelector('text=Bulbasaur', { timeout: 30000 });

    const mobileBox = await mobilePage.locator('.device').boundingBox();
    check(
      'stacked mobile layout fits the viewport width',
      mobileBox && mobileBox.width <= 390,
      JSON.stringify(mobileBox),
    );

    const halvesStacked = await mobilePage.evaluate(() => {
      const left = document.querySelector('.half--left')?.getBoundingClientRect();
      const right = document.querySelector('.half--right')?.getBoundingClientRect();
      if (!left || !right) return false;
      return right.top >= left.bottom - 4;
    });
    check('device halves stack vertically on mobile', halvesStacked);

    const tapTargets = await mobilePage.evaluate(() => {
      const selector =
        '.key, .dpad__key, .btn--pill, .btn--yellow, .btn--search, .info__menu-item, .tab';
      const sizes = [...document.querySelectorAll(selector)].map((node) => ({
        cls: node.className,
        h: node.getBoundingClientRect().height,
      }));
      const smallest = sizes.reduce((a, b) => (a.h <= b.h ? a : b));
      return { min: smallest.h, who: smallest.cls, count: sizes.length };
    });
    check(
      'mobile tap targets stay usable',
      tapTargets.min >= 24,
      JSON.stringify(tapTargets),
    );

    const infoText = await mobilePage.evaluate(() => {
      const menu = document.querySelector('.info__menu-item');
      const detail = document.querySelector('.info__detail');
      return {
        menu: parseFloat(getComputedStyle(menu).fontSize),
        detail: parseFloat(getComputedStyle(detail).fontSize),
      };
    });
    check(
      'mobile information LCD text stays readable',
      infoText.menu >= 11.5 && infoText.detail >= 11,
      JSON.stringify(infoText),
    );

    // Every information section must fit inside the panel without clipping.
    const sections = ['SUMMARY', 'HABITAT', 'BEHAVIOR', 'DIET', 'NOTES'];
    const clipped = [];
    for (const name of sections) {
      await mobilePage
        .getByRole('button', { name: new RegExp(`^${name}$`) })
        .click();
      await mobilePage.waitForTimeout(60);
      const state = await mobilePage.evaluate(() => {
        const detail = document.querySelector('.info__detail');
        const menu = document.querySelector('.info__menu');
        return {
          detailOverflow: detail.scrollHeight - detail.clientHeight,
          menuOverflow: menu.scrollHeight - menu.clientHeight,
        };
      });
      if (state.detailOverflow > 1 || state.menuOverflow > 1) {
        clipped.push(`${name}:${JSON.stringify(state)}`);
      }
    }
    check(
      'all information sections fit the mobile LCD',
      clipped.length === 0,
      clipped.join(' '),
    );
    await mobilePage.getByRole('button', { name: /^SUMMARY$/ }).click();
    await mobilePage.waitForTimeout(80);

    // The main LCD must contain its header when a long error message is shown.
    await mobilePage.screenshot({
      path: path.join(OUT_DIR, 'pokedex-mobile.png'),
      fullPage: true,
    });

    const mobileSearch = mobilePage.getByLabel('Search Pokémon by name or number');
    await mobileSearch.fill('999');
    await mobilePage.getByRole('button', { name: 'Search', exact: true }).click();
    await mobilePage.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="main-status"]')
          ?.textContent?.includes('BEYOND KANTO'),
      undefined,
      { timeout: 5000 },
    );
    const containment = await mobilePage.evaluate(() => {
      const lcd = document.querySelector('.lcd--main').getBoundingClientRect();
      const tabs = document.querySelector('.main__tabs').getBoundingClientRect();
      const status = document.querySelector('[data-testid="main-status"]').getBoundingClientRect();
      const inside = (r) =>
        r.left >= lcd.left - 1 &&
        r.right <= lcd.right + 1 &&
        r.top >= lcd.top - 1 &&
        r.bottom <= lcd.bottom + 1;
      return { tabs: inside(tabs), status: inside(status), statusText: status.width };
    });
    check(
      'long status messages stay inside the mobile LCD with the tabs',
      containment.tabs && containment.status,
      JSON.stringify(containment),
    );
    await mobilePage.screenshot({
      path: path.join(OUT_DIR, 'pokedex-mobile-error-state.png'),
      fullPage: true,
    });

    // A real interaction at phone size.
    await mobilePage.getByRole('button', { name: 'Next Pokémon (A)' }).click();
    await mobilePage.waitForSelector('text=Ivysaur');
    check('mobile navigation works', true);

    check(
      'no console errors on mobile',
      mobileErrors.length === 0,
      mobileErrors.slice(0, 3).join(' | '),
    );

    /* ------------------------------------------- index failure recovery */
    const offline = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const offlinePage = await offline.newPage();
    await offlinePage.route('**/pokemon?limit=151&offset=0', (route) => route.abort());
    await offlinePage.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await offlinePage.waitForSelector('text=Bulbasaur', { timeout: 30000 });
    await offlinePage.getByLabel('Search Pokémon by name or number').fill('pikachu');
    await offlinePage.getByRole('button', { name: 'Search', exact: true }).click();
    await offlinePage.waitForFunction(
      () =>
        document
          .querySelector('[data-testid="main-status"]')
          ?.textContent?.includes('INDEX UNAVAILABLE'),
      undefined,
      { timeout: 5000 },
    );
    check('failed index load reports a recoverable search error', true);

    await offlinePage.unroute('**/pokemon?limit=151&offset=0');
    await offlinePage.getByRole('button', { name: /Confirm/ }).click();
    await offlinePage.waitForSelector('[role="dialog"][aria-label="Pokémon index"]');
    const retryButton = offlinePage.getByRole('button', { name: 'RETRY INDEX' });
    const retryVisible = await retryButton.isVisible().catch(() => false);
    check('index dialog offers a retry after a failed load', retryVisible);
    const errorFocusInside = await offlinePage.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    );
    check(
      'focus enters the index dialog even when the list is empty',
      errorFocusInside,
      await offlinePage.evaluate(() => document.activeElement?.textContent?.trim() ?? ''),
    );
    if (retryVisible) {
      await retryButton.click();
      await offlinePage.waitForFunction(
        () => document.querySelectorAll('.index-list__item').length > 0,
        undefined,
        { timeout: 15000 },
      );
      check('retrying loads the index without a page reload', true);
      await offlinePage.getByRole('option', { name: /025\s*Pikachu/i }).click();
      await offlinePage.waitForSelector('text=Pikachu');
      check('search works after index recovery', true);
    } else {
      check('retrying loads the index without a page reload', false, 'no retry button');
      check('search works after index recovery', false, 'no retry button');
    }
    await offline.close();

    await desktop.close();
    await mobile.close();
  } finally {
    await browser.close();
  }

  const summary = {
    baseUrl: BASE_URL,
    capturedAt: new Date().toISOString(),
    passed: results.filter((r) => r.ok).length,
    failed: problems.length,
    results,
  };
  await writeFile(
    path.join(OUT_DIR, 'smoke-report.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );

  for (const result of results) {
    console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
  }
  console.log(`\n${summary.passed}/${results.length} checks passed`);

  if (problems.length > 0) {
    console.error(`\n${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Smoke test crashed:', error);
  process.exitCode = 1;
});
