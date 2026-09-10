/** Type → swatch colours for the LCD type chips (presentation only, not data). */

const TYPE_COLORS: Record<string, string> = {
  NORMAL: '#8a8578',
  FIRE: '#d4562a',
  WATER: '#2f6fd0',
  ELECTRIC: '#c9a227',
  GRASS: '#4a8c3a',
  ICE: '#4f9fb0',
  FIGHTING: '#a63a2a',
  POISON: '#8a4a9c',
  GROUND: '#a9863f',
  FLYING: '#6f7fc4',
  PSYCHIC: '#c04a7a',
  BUG: '#7a8f2a',
  ROCK: '#8a7434',
  GHOST: '#5c4a8c',
  DRAGON: '#5a4ab0',
  DARK: '#4a4038',
  STEEL: '#6f7c86',
  FAIRY: '#c06a9c',
}

export function typeColor(label: string): string {
  return TYPE_COLORS[label.toUpperCase()] ?? '#4a6b3c'
}

export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  if (!Number.isFinite(int)) return `rgba(74, 107, 60, ${alpha})`
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
