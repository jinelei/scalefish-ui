export const CATEGORY_COLOR_PALETTE = [
  '#3b82f6',
  '#8b5cf6',
  '#10b981',
  '#f43f5e',
  '#f59e0b',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
] as const

export const DEFAULT_CATEGORY_COLOR = '#3b82f6'

export function randomCategoryColor(): string {
  return CATEGORY_COLOR_PALETTE[Math.floor(Math.random() * CATEGORY_COLOR_PALETTE.length)]
}

export function isValidHexColor(color?: string | null): color is string {
  return !!color && /^#[0-9a-fA-F]{6}$/.test(color)
}

export function categoryColor(color?: string | null): string {
  return isValidHexColor(color) ? color : DEFAULT_CATEGORY_COLOR
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace('#', '')
  return [
    parseInt(v.slice(0, 2), 16),
    parseInt(v.slice(2, 4), 16),
    parseInt(v.slice(4, 6), 16),
  ]
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function blockBackground(hex: string): string {
  return `linear-gradient(160deg, ${withAlpha(hex, 0.10)}, ${withAlpha(hex, 0.03)} 55%, transparent)`
}

export function cardBackground(hex: string): string {
  return `linear-gradient(145deg, ${withAlpha(hex, 0.16)}, ${withAlpha(hex, 0.05)} 55%, transparent)`
}

export function cardHoverBackground(hex: string): string {
  return `linear-gradient(145deg, ${withAlpha(hex, 0.28)}, ${withAlpha(hex, 0.12)} 55%, transparent)`
}
