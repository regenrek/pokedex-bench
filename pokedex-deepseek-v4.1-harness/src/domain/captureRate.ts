/**
 * Reference-data helpers for the right-hand LCD, kept out of the component
 * module so hot reloading stays component-only.
 */

/** Capture rate -> a 0-5 "how wide is its range" signal for the RANGE meter. */
export function rangeLevel(captureRate: number): number {
  if (captureRate >= 190) return 5;
  if (captureRate >= 100) return 4;
  if (captureRate >= 45) return 3;
  if (captureRate >= 15) return 2;
  if (captureRate >= 3) return 1;
  return 0;
}

/** Human-readable encounter rarity, derived from the same capture rate. */
export function rarityLabel(captureRate: number): string {
  if (captureRate >= 190) return 'COMMON';
  if (captureRate >= 100) return 'PLENTIFUL';
  if (captureRate >= 45) return 'UNCOMMON';
  if (captureRate >= 15) return 'RARE';
  if (captureRate >= 3) return 'VERY RARE';
  return 'ONE-OFF';
}
