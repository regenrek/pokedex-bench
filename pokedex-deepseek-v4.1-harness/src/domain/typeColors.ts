/** Canonical Kanto type palette, tuned to stay legible on the pale-green LCD. */
export const TYPE_COLORS: Record<string, string> = {
  normal: '#9a9179',
  fighting: '#b03a2b',
  flying: '#7d9ec4',
  poison: '#8c4b96',
  ground: '#c09a4a',
  rock: '#a3924f',
  bug: '#7d9b27',
  ghost: '#5f568f',
  steel: '#7d8f9c',
  fire: '#d4592a',
  water: '#3f7dc4',
  grass: '#5a9a3c',
  electric: '#c9a017',
  psychic: '#c2456f',
  ice: '#4fa3ad',
  dragon: '#6b53c0',
  dark: '#5c4a42',
  fairy: '#c76f9e',
  unknown: '#7d8577',
};

export function typeColor(type: string | null | undefined): string {
  if (!type) return TYPE_COLORS.unknown;
  return TYPE_COLORS[type.toLowerCase()] ?? TYPE_COLORS.unknown;
}
