import type { ThemeId } from '../types'

export interface BuiltInTheme {
  id: ThemeId
  name: string
  description: string
  swatches: readonly [string, string, string]
}

export const BUILT_IN_THEMES: readonly BuiltInTheme[] = [
  { id: 'dark', name: 'Carbon', description: 'Original dark console', swatches: ['#090c10', '#171f28', '#58d6c5'] },
  { id: 'polar', name: 'Polar', description: 'Bright, crisp daylight', swatches: ['#edf4f7', '#ffffff', '#087ea4'] },
  { id: 'ocean', name: 'Abyss', description: 'Deep blue operations', swatches: ['#061526', '#0d2940', '#4fc3f7'] },
  { id: 'paper', name: 'Signal Paper', description: 'Warm editorial control', swatches: ['#eee7d8', '#fffaf0', '#d4512c'] },
  { id: 'neon', name: 'Afterglow', description: 'Violet broadcast energy', swatches: ['#130d22', '#25163b', '#dc75ff'] },
  { id: 'high-contrast', name: 'Maximum', description: 'Maximum visual clarity', swatches: ['#000000', '#111111', '#ffe500'] },
] as const

export const THEME_IDS = new Set<ThemeId>(BUILT_IN_THEMES.map((theme) => theme.id))

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_IDS.has(value as ThemeId)
}
