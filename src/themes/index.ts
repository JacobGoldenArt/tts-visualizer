/**
 * Theme Module Exports
 *
 * Exports all theme-related components for the Elyse Speech Visualizer.
 */

// Theme definitions
export { darkTheme } from './dark';
export { lightTheme } from './light';

// Theme manager
export { ThemeManager, createThemeManager } from './ThemeManager';

// Re-export types for convenience
export type {
  Theme,
  ThemeMode,
  ThemeName,
  ThemeConfig,
  ThemeChangeEvent,
  ThemeChangeCallback,
  IThemeManager,
} from '@/types/theme';
