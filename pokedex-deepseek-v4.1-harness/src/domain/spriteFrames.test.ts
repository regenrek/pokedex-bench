import { describe, expect, it } from 'vitest';
import { rangeLevel, rarityLabel } from './captureRate';
import { SPRITE_ZOOM, spriteZoom } from './spriteFrames';
import { DEX_FIRST_ID, DEX_LAST_ID } from './pokemon';

describe('rangeLevel', () => {
  it('maps capture rates onto a five-step meter', () => {
    expect(rangeLevel(255)).toBe(5);
    expect(rangeLevel(190)).toBe(5);
    expect(rangeLevel(120)).toBe(4);
    expect(rangeLevel(45)).toBe(3);
    expect(rangeLevel(20)).toBe(2);
    expect(rangeLevel(3)).toBe(1);
    expect(rangeLevel(0)).toBe(0);
  });

  it('never leaves the 0…5 window', () => {
    for (const rate of [0, 1, 3, 15, 45, 100, 190, 255]) {
      const level = rangeLevel(rate);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(5);
    }
  });
});

describe('rarityLabel', () => {
  it('describes encounter rarity', () => {
    expect(rarityLabel(255)).toBe('COMMON');
    expect(rarityLabel(45)).toBe('UNCOMMON');
    expect(rarityLabel(3)).toBe('VERY RARE');
    expect(rarityLabel(0)).toBe('ONE-OFF');
  });
});

describe('sprite framing table', () => {
  it('covers every entry from #001 to #151', () => {
    for (let id = DEX_FIRST_ID; id <= DEX_LAST_ID; id += 1) {
      expect(SPRITE_ZOOM[id], `missing zoom for #${id}`).toBeTypeOf('number');
    }
    expect(Object.keys(SPRITE_ZOOM)).toHaveLength(DEX_LAST_ID);
  });

  it('keeps every zoom inside a sane range', () => {
    for (const [id, zoom] of Object.entries(SPRITE_ZOOM)) {
      // Slightly below 1 is expected for sprites whose artwork already fills
      // (or bleeds past) the 92% target box, e.g. Zapdos.
      expect(zoom, `#${id}`).toBeGreaterThanOrEqual(0.9);
      expect(zoom, `#${id}`).toBeLessThanOrEqual(3);
    }
  });

  it('falls back for unknown entries', () => {
    expect(spriteZoom(1)).toBe(SPRITE_ZOOM[1]);
    expect(spriteZoom(9999)).toBe(1.5);
  });
});
