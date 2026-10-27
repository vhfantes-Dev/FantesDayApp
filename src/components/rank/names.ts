// "Marina Costa Lima" → "Marina L."
export function shortName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? '';
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// Cores das 3 primeiras posições (ouro, prata, bronze).
export const PLACE_COLORS = ['#F2C94C', '#C4CCD8', '#D08A5A'] as const;
export const PLACE_BG = '#221D10';
export const PLACE_BORDER = '#5A4718';
