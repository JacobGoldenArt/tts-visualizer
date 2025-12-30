/**
 * Theme Types for the Elyse Speech Visualizer
 *
 * Types for dark/light theme support including theme definitions,
 * theme mode, and theme manager interface.
 */

import type { ColorPalette } from './visual';

/**
 * Theme mode options
 * - 'dark': Force dark theme
 * - 'light': Force light theme
 * - 'system': Follow system preference (prefers-color-scheme)
 */
export type ThemeMode = 'dark' | 'light' | 'system';

/**
 * Resolved theme name (what's actually applied)
 */
export type ThemeName = 'dark' | 'light';

/**
 * Theme definition
 */
export interface Theme {
  /** Theme name identifier */
  name: ThemeName;
  /** Background color for the canvas/visualization area */
  background: string;
  /** Default foreground/text color */
  foreground: string;
  /** Base color palette that can be modified by mood */
  basePalette: ColorPalette;
}

/**
 * Theme configuration options
 */
export interface ThemeConfig {
  /** Initial theme mode (default: 'system') */
  initialMode?: ThemeMode;
  /** Duration for theme transition in milliseconds (default: 300) */
  transitionDuration?: number;
}

/**
 * Theme change event data
 */
export interface ThemeChangeEvent {
  /** Previous theme */
  previousTheme: Theme;
  /** New theme */
  newTheme: Theme;
  /** Mode that was set */
  mode: ThemeMode;
  /** Whether this was triggered by system preference change */
  isSystemTriggered: boolean;
  /** Timestamp of the change */
  timestamp: number;
}

/**
 * Callback type for theme change events
 */
export type ThemeChangeCallback = (event: ThemeChangeEvent) => void;

/**
 * Theme manager interface
 */
export interface IThemeManager {
  /**
   * Get the current resolved theme
   */
  getTheme(): Theme;

  /**
   * Get the current theme mode setting
   */
  getMode(): ThemeMode;

  /**
   * Set the theme mode
   * @param mode - 'dark', 'light', or 'system'
   */
  setMode(mode: ThemeMode): void;

  /**
   * Register a callback for theme changes
   */
  onThemeChange(callback: ThemeChangeCallback): void;

  /**
   * Remove a theme change callback
   */
  offThemeChange(callback: ThemeChangeCallback): void;

  /**
   * Get the system's preferred theme
   */
  getSystemPreference(): ThemeName;

  /**
   * Check if currently transitioning between themes
   */
  isTransitioning(): boolean;

  /**
   * Get transition progress (0-1) during theme changes
   */
  getTransitionProgress(): number;

  /**
   * Get interpolated theme values during transition
   */
  getInterpolatedTheme(): Theme;

  /**
   * Clean up resources (event listeners, timers)
   */
  dispose(): void;
}
