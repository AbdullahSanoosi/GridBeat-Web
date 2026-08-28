/**
 * Ported 1:1 from GridBeat (Flutter) lib/core/theme/app_colors.dart and
 * lib/core/constants/app_constants.dart's TeamColors/TyreColors. Keep these
 * two files in sync manually if either app's palette changes.
 */

export const colors = {
  background: '#000000',
  primary: '#B52400',
  onPrimary: '#DF3409',
  secondary: '#5D5F5F',
  onSecondary: '#FFFFFF',
  onBackground: '#1B1B1B',

  surface: '#0D0D0D',
  surfaceElevated: '#1A1A1A',
  border: '#2A2A2A',
  divider: '#1B1B1B',

  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#5D5F5F',

  error: '#D50000',
  success: '#00C853',
  warning: '#FFD600',
  info: '#2979FF',

  sectorPurple: '#BF00FF',
  sectorGreen: '#00CC00',
  sectorYellow: '#FFFF00',
} as const;

/** Substring-match lookup, mirrors TeamColors.forTeam in app_constants.dart. */
const teamColorEntries: [string, string][] = [
  ['mclaren', '#FF8000'],
  ['red bull', '#3671C6'],
  ['ferrari', '#E80020'],
  ['mercedes', '#27F4D2'],
  ['alpine', '#00A1E8'],
  ['rb', '#6692FF'],
  ['aston martin', '#229971'],
  ['williams', '#1868DB'],
  ['sauber', '#52E252'],
  ['haas', '#B6BABD'],
  ['audi', '#8B0000'],
  ['cadillac', '#1F3A7A'],
];

const DEFAULT_TEAM_COLOR = '#B52400';

export function teamColor(teamName: string): string {
  const key = teamName.toLowerCase();
  for (const [needle, hex] of teamColorEntries) {
    if (key.includes(needle)) return hex;
  }
  return DEFAULT_TEAM_COLOR;
}

/** Exact match on the compound name, mirrors TyreColors.forCompound. */
const tyreColorEntries: Record<string, string> = {
  soft: '#DA291C',
  medium: '#FFD700',
  hard: '#E8E8E8',
  intermediate: '#43B02A',
  wet: '#0067FF',
};

const DEFAULT_TYRE_COLOR = '#888888';

export function tyreColor(compound: string): string {
  return tyreColorEntries[compound.toLowerCase()] ?? DEFAULT_TYRE_COLOR;
}
