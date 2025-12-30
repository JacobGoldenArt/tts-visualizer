/**
 * Dark Theme Definition
 *
 * Dark theme for the Elyse Speech Visualizer.
 * Features a near-black background with light accents,
 * maintaining the lo-fi, warm aesthetic.
 */

import type { Theme } from '@/types/theme';

/**
 * Dark theme configuration
 *
 * - Near-black background for visual depth
 * - Light foreground for contrast
 * - Muted, warm base palette that mood can enhance
 */
export const darkTheme: Theme = {
  name: 'dark',
  // Near-black with slight warmth
  background: 'hsl(220, 15%, 8%)',
  // Off-white with warmth
  foreground: 'hsl(40, 10%, 90%)',
  // Muted warm palette as base (mood will enhance)
  basePalette: {
    primary: 'hsl(220, 20%, 65%)',
    secondary: 'hsl(200, 15%, 55%)',
    accent: 'hsl(30, 40%, 60%)',
  },
};

export default darkTheme;
