/**
 * Generates `src/domain/spriteFrames.ts`.
 *
 * PokéAPI's 96×96 sprites carry wildly different amounts of transparent
 * padding — Bulbasaur's artwork fills only 36% of its canvas while Charizard's
 * fills 83% — so a single CSS size makes some Pokémon look tiny and others
 * look cramped. This script measures the opaque bounding box of all 151 Kanto
 * sprites once and bakes a per-entry zoom factor into the app.
 *
 * Run with: node scripts/generate-sprite-frames.mjs
 * Requires a Chromium build and network access; the generated file is
 * committed so the app itself never needs either.
 */
import { existsSync } from 'node:fs';
import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright-core';

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const LAST_ID = 151;
/** Fraction of the display box the sprite artwork should occupy. */
const TARGET_FILL = 0.92;
const CONCURRENCY = 10;

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
  throw new Error('No Chromium build found. Run: npx playwright install chromium');
}

const browser = await chromium.launch({ executablePath: await resolveChromium() });
const page = await browser.newPage();
await page.goto('about:blank');

const ids = Array.from({ length: LAST_ID }, (_, index) => index + 1);
const zooms = {};

for (let start = 0; start < ids.length; start += CONCURRENCY) {
  const batch = ids.slice(start, start + CONCURRENCY);
  const results = await page.evaluate(
    async ({ base, batch }) => {
      const measure = async (id) => {
        const url = `${base}/${id}.png`;
        try {
          const response = await fetch(url);
          if (!response.ok) return { id, error: `HTTP ${response.status}` };
          const bitmap = await createImageBitmap(await response.blob());
          const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(bitmap, 0, 0);
          const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
          let minX = bitmap.width;
          let minY = bitmap.height;
          let maxX = -1;
          let maxY = -1;
          for (let y = 0; y < bitmap.height; y += 1) {
            for (let x = 0; x < bitmap.width; x += 1) {
              if (data[(y * bitmap.width + x) * 4 + 3] > 20) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          if (maxX < 0) return { id, error: 'fully transparent' };
          const fill = Math.max(maxX - minX + 1, maxY - minY + 1) / bitmap.width;
          return { id, fill };
        } catch (error) {
          return { id, error: String(error) };
        }
      };
      return Promise.all(batch.map(measure));
    },
    { base: SPRITE_BASE, batch },
  );

  for (const result of results) {
    if (result.error) {
      console.warn(`  #${result.id}: ${result.error} — using fallback zoom`);
      zooms[result.id] = 1.5;
    } else {
      zooms[result.id] = Number((TARGET_FILL / result.fill).toFixed(3));
    }
  }
  process.stdout.write(`\r  measured ${Math.min(start + CONCURRENCY, LAST_ID)}/${LAST_ID}`);
}

await browser.close();
console.log('');

const entries = Object.entries(zooms)
  .map(([id, zoom]) => `  ${id}: ${zoom},`)
  .join('\n');

const file = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: node scripts/generate-sprite-frames.mjs
 *
 * Per-entry zoom applied to PokéAPI's 96x96 sprites so that every Pokémon's
 * artwork occupies the same share of the LCD viewport, regardless of how much
 * transparent padding its source PNG carries.
 */
export const SPRITE_ZOOM: Readonly<Record<number, number>> = {
${entries}
};

/** Zoom for a Kanto entry, falling back to a sensible middle value. */
export function spriteZoom(id: number): number {
  return SPRITE_ZOOM[id] ?? 1.5;
}
`;

await writeFile(path.resolve('src/domain/spriteFrames.ts'), file, 'utf8');
console.log(`Wrote src/domain/spriteFrames.ts (${Object.keys(zooms).length} entries)`);
