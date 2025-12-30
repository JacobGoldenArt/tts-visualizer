/**
 * ThemeManager - Manages dark/light theme state for the visualizer
 *
 * Handles system preference detection, theme switching, and smooth
 * transitions between themes. Provides interpolated values during
 * transitions for smooth visual changes.
 */

import type {
  Theme,
  ThemeMode,
  ThemeName,
  ThemeConfig,
  ThemeChangeEvent,
  ThemeChangeCallback,
  IThemeManager,
} from '@/types/theme';
import type { ColorPalette } from '@/types/visual';
import { darkTheme } from './dark';
import { lightTheme } from './light';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<ThemeConfig> = {
  initialMode: 'system',
  transitionDuration: 300,
};

/**
 * Parse HSL color string into components
 */
function parseHSL(hsl: string): { h: number; s: number; l: number } {
  const match = hsl.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) {
    return { h: 0, s: 50, l: 50 };
  }
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

/**
 * Format HSL components into a color string
 */
function formatHSL(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

/**
 * Interpolate between two HSL colors
 */
function interpolateHSL(from: string, to: string, t: number): string {
  const fromHSL = parseHSL(from);
  const toHSL = parseHSL(to);

  // Handle hue interpolation (circular)
  let hDiff = toHSL.h - fromHSL.h;
  if (hDiff > 180) hDiff -= 360;
  if (hDiff < -180) hDiff += 360;

  const h = (fromHSL.h + hDiff * t + 360) % 360;
  const s = fromHSL.s + (toHSL.s - fromHSL.s) * t;
  const l = fromHSL.l + (toHSL.l - fromHSL.l) * t;

  return formatHSL(h, s, l);
}

/**
 * Interpolate between two palettes
 */
function interpolatePalette(from: ColorPalette, to: ColorPalette, t: number): ColorPalette {
  return {
    primary: interpolateHSL(from.primary, to.primary, t),
    secondary: interpolateHSL(from.secondary, to.secondary, t),
    accent: interpolateHSL(from.accent, to.accent, t),
  };
}

/**
 * Easing function for smooth transitions (ease-out cubic)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Frame interval for animation (approx 60fps)
 */
const FRAME_INTERVAL = 16;

/**
 * ThemeManager class
 */
export class ThemeManager implements IThemeManager {
  private _config: Required<ThemeConfig>;
  private _mode: ThemeMode;
  private _currentTheme: Theme;
  private _targetTheme: Theme;
  private _previousTheme: Theme;
  private _listeners: Set<ThemeChangeCallback> = new Set();
  private _mediaQuery: MediaQueryList | null = null;
  private _mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null;
  private _disposed: boolean = false;

  // Transition state
  private _isTransitioning: boolean = false;
  private _transitionStartTime: number = 0;
  private _transitionProgress: number = 1;
  private _timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: ThemeConfig) {
    this._config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this._mode = this._config.initialMode;

    // Resolve initial theme
    const initialThemeName = this.resolveThemeName(this._mode);
    this._currentTheme = this.getThemeByName(initialThemeName);
    this._targetTheme = this._currentTheme;
    this._previousTheme = this._currentTheme;

    // Set up system preference listener
    this.setupMediaQueryListener();
  }

  /**
   * Get the current resolved theme
   */
  getTheme(): Theme {
    return this.deepCopyTheme(this._currentTheme);
  }

  /**
   * Get the current theme mode setting
   */
  getMode(): ThemeMode {
    return this._mode;
  }

  /**
   * Set the theme mode
   */
  setMode(mode: ThemeMode): void {
    if (this._disposed) return;

    const previousMode = this._mode;
    this._mode = mode;

    const newThemeName = this.resolveThemeName(mode);
    const newTheme = this.getThemeByName(newThemeName);

    // If theme is actually changing, start transition
    if (newTheme.name !== this._currentTheme.name) {
      this.startTransition(newTheme, false);
    }
  }

  /**
   * Register a callback for theme changes
   */
  onThemeChange(callback: ThemeChangeCallback): void {
    this._listeners.add(callback);
  }

  /**
   * Remove a theme change callback
   */
  offThemeChange(callback: ThemeChangeCallback): void {
    this._listeners.delete(callback);
  }

  /**
   * Get the system's preferred theme
   */
  getSystemPreference(): ThemeName {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return 'dark'; // Default fallback
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /**
   * Check if currently transitioning between themes
   */
  isTransitioning(): boolean {
    return this._isTransitioning;
  }

  /**
   * Get transition progress (0-1) during theme changes
   */
  getTransitionProgress(): number {
    return this._transitionProgress;
  }

  /**
   * Get interpolated theme values during transition
   */
  getInterpolatedTheme(): Theme {
    if (!this._isTransitioning || this._transitionProgress >= 1) {
      return this.deepCopyTheme(this._currentTheme);
    }

    const easedProgress = easeOutCubic(this._transitionProgress);

    return {
      name: this._targetTheme.name,
      background: interpolateHSL(
        this._previousTheme.background,
        this._targetTheme.background,
        easedProgress
      ),
      foreground: interpolateHSL(
        this._previousTheme.foreground,
        this._targetTheme.foreground,
        easedProgress
      ),
      basePalette: interpolatePalette(
        this._previousTheme.basePalette,
        this._targetTheme.basePalette,
        easedProgress
      ),
    };
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._disposed = true;

    // Clear transition timer
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }

    // Remove media query listener
    if (this._mediaQuery && this._mediaQueryHandler) {
      this._mediaQuery.removeEventListener('change', this._mediaQueryHandler);
      this._mediaQuery = null;
      this._mediaQueryHandler = null;
    }

    // Clear listeners
    this._listeners.clear();
  }

  // Private methods

  /**
   * Set up system preference media query listener
   */
  private setupMediaQueryListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    this._mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    this._mediaQueryHandler = (e: MediaQueryListEvent) => {
      if (this._disposed) return;

      // Only respond if in 'system' mode
      if (this._mode === 'system') {
        const newThemeName: ThemeName = e.matches ? 'dark' : 'light';
        const newTheme = this.getThemeByName(newThemeName);

        if (newTheme.name !== this._currentTheme.name) {
          this.startTransition(newTheme, true);
        }
      }
    };

    this._mediaQuery.addEventListener('change', this._mediaQueryHandler);
  }

  /**
   * Resolve theme name from mode
   */
  private resolveThemeName(mode: ThemeMode): ThemeName {
    if (mode === 'system') {
      return this.getSystemPreference();
    }
    return mode;
  }

  /**
   * Get theme object by name
   */
  private getThemeByName(name: ThemeName): Theme {
    return name === 'dark' ? darkTheme : lightTheme;
  }

  /**
   * Start theme transition
   */
  private startTransition(newTheme: Theme, isSystemTriggered: boolean): void {
    this._previousTheme = this.deepCopyTheme(this._currentTheme);
    this._targetTheme = newTheme;
    this._transitionStartTime = Date.now();
    this._transitionProgress = 0;
    this._isTransitioning = true;

    // Start animation loop if not running
    if (this._timerId === null) {
      this.runTransitionLoop(isSystemTriggered);
    }
  }

  /**
   * Run the transition animation loop
   */
  private runTransitionLoop(isSystemTriggered: boolean): void {
    const tick = (): void => {
      if (!this._isTransitioning || this._disposed) {
        this._timerId = null;
        return;
      }

      const elapsed = Date.now() - this._transitionStartTime;
      const rawProgress = Math.min(elapsed / this._config.transitionDuration, 1);
      this._transitionProgress = rawProgress;

      // Update current theme with interpolated values
      this._currentTheme = this.getInterpolatedTheme();

      // Check if transition is complete
      if (rawProgress >= 1) {
        this._isTransitioning = false;
        this._currentTheme = this.deepCopyTheme(this._targetTheme);
        this._timerId = null;

        // Emit completion event
        this.emitThemeChange(isSystemTriggered);
        return;
      }

      // Continue loop
      this._timerId = setTimeout(tick, FRAME_INTERVAL);
    };

    this._timerId = setTimeout(tick, FRAME_INTERVAL);
  }

  /**
   * Emit theme change event to listeners
   */
  private emitThemeChange(isSystemTriggered: boolean): void {
    const event: ThemeChangeEvent = {
      previousTheme: this.deepCopyTheme(this._previousTheme),
      newTheme: this.deepCopyTheme(this._currentTheme),
      mode: this._mode,
      isSystemTriggered,
      timestamp: Date.now(),
    };

    for (const callback of this._listeners) {
      try {
        callback(event);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Deep copy a theme object
   */
  private deepCopyTheme(theme: Theme): Theme {
    return {
      name: theme.name,
      background: theme.background,
      foreground: theme.foreground,
      basePalette: { ...theme.basePalette },
    };
  }
}

/**
 * Create a new ThemeManager instance
 */
export function createThemeManager(config?: ThemeConfig): ThemeManager {
  return new ThemeManager(config);
}

/**
 * Export theme definitions for external use
 */
export { darkTheme, lightTheme };
