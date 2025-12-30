/**
 * Light Theme Definition
 *
 * Light theme for the Elyse Speech Visualizer.
 * Features an off-white background with dark accents,
 * maintaining the lo-fi, warm aesthetic.
 */

import type { Theme } from '@/types/theme';

/**
 * Light theme configuration
 *
 * - Off-white/cream background for a warm, paper-like feel
 * - Dark foreground for contrast
 * - Deeper, richer base palette that mood can enhance
 */
export const lightTheme: Theme = {
  name: 'light',
  // Warm off-white (cream)
  background: 'hsl(40, 20%, 95%)',
  // Near-black with warmth
  foreground: 'hsl(220, 15%, 15%)',
  // Deeper palette for contrast on light background
  basePalette: {
    primary: 'hsl(220, 35%, 40%)',
    secondary: 'hsl(200, 30%, 45%)',
    accent: 'hsl(30, 55%, 45%)',
  },
};

export default lightTheme;
