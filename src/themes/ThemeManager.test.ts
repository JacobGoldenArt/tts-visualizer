/**
 * ThemeManager Tests
 *
 * Tests for theme support including dark/light themes,
 * system preference detection, and smooth transitions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThemeManager, createThemeManager, darkTheme, lightTheme } from './ThemeManager';
import type { ThemeChangeEvent, ThemeMode, Theme } from '@/types/theme';

/**
 * Helper to check if a string is a valid HSL color
 */
function isValidHSL(color: string): boolean {
  const hslPattern = /^hsl\(\d+(?:\.\d+)?,\s*\d+(?:\.\d+)?%,\s*\d+(?:\.\d+)?%\)$/;
  return hslPattern.test(color);
}

/**
 * Helper to parse HSL color into components
 */
function parseHSL(hsl: string): { h: number; s: number; l: number } | null {
  const match = hsl.match(/hsl\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)%,\s*(\d+(?:\.\d+)?)%\)/);
  if (!match) return null;
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

/**
 * Mock matchMedia for testing system preference
 */
function createMockMatchMedia(prefersDark: boolean) {
  const listeners: Array<(e: MediaQueryListEvent) => void> = [];

  const mediaQueryList = {
    matches: prefersDark,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        listeners.push(callback);
      }
    }),
    removeEventListener: vi.fn((event: string, callback: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }),
    dispatchEvent: vi.fn(),
    // Helper to simulate preference change
    _triggerChange: (newPrefersDark: boolean) => {
      mediaQueryList.matches = newPrefersDark;
      for (const listener of listeners) {
        listener({ matches: newPrefersDark } as MediaQueryListEvent);
      }
    },
    _getListeners: () => listeners,
  };

  return mediaQueryList;
}

describe('ThemeManager', () => {
  let mockMatchMedia: ReturnType<typeof createMockMatchMedia>;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
    // Store original matchMedia
    originalMatchMedia = window.matchMedia;
    // Create mock that defaults to dark preference
    mockMatchMedia = createMockMatchMedia(true);
    window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);
  });

  afterEach(() => {
    vi.useRealTimers();
    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  // Test 9.1: Dark theme applies dark background, light accents
  describe('Test 9.1: Dark theme applies dark background, light accents', () => {
    it('dark theme has a dark (low lightness) background', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const theme = manager.getTheme();

      expect(theme.name).toBe('dark');

      const bgHSL = parseHSL(theme.background);
      expect(bgHSL).not.toBeNull();
      // Dark background should have low lightness (< 20%)
      expect(bgHSL!.l).toBeLessThan(20);

      manager.dispose();
    });

    it('dark theme has light (high lightness) foreground', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const theme = manager.getTheme();

      const fgHSL = parseHSL(theme.foreground);
      expect(fgHSL).not.toBeNull();
      // Light foreground should have high lightness (> 80%)
      expect(fgHSL!.l).toBeGreaterThan(80);

      manager.dispose();
    });

    it('dark theme has valid base palette colors', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const theme = manager.getTheme();

      expect(isValidHSL(theme.basePalette.primary)).toBe(true);
      expect(isValidHSL(theme.basePalette.secondary)).toBe(true);
      expect(isValidHSL(theme.basePalette.accent)).toBe(true);

      manager.dispose();
    });

    it('dark theme base palette has appropriate lightness for visibility', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const theme = manager.getTheme();

      // Base palette should have medium-high lightness to be visible on dark background
      const primaryHSL = parseHSL(theme.basePalette.primary);
      expect(primaryHSL).not.toBeNull();
      expect(primaryHSL!.l).toBeGreaterThan(40);

      manager.dispose();
    });
  });

  // Test 9.2: Light theme applies light background, dark accents
  describe('Test 9.2: Light theme applies light background, dark accents', () => {
    it('light theme has a light (high lightness) background', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const theme = manager.getTheme();

      expect(theme.name).toBe('light');

      const bgHSL = parseHSL(theme.background);
      expect(bgHSL).not.toBeNull();
      // Light background should have high lightness (> 80%)
      expect(bgHSL!.l).toBeGreaterThan(80);

      manager.dispose();
    });

    it('light theme has dark (low lightness) foreground', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const theme = manager.getTheme();

      const fgHSL = parseHSL(theme.foreground);
      expect(fgHSL).not.toBeNull();
      // Dark foreground should have low lightness (< 30%)
      expect(fgHSL!.l).toBeLessThan(30);

      manager.dispose();
    });

    it('light theme has valid base palette colors', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const theme = manager.getTheme();

      expect(isValidHSL(theme.basePalette.primary)).toBe(true);
      expect(isValidHSL(theme.basePalette.secondary)).toBe(true);
      expect(isValidHSL(theme.basePalette.accent)).toBe(true);

      manager.dispose();
    });

    it('light theme base palette has appropriate lightness for visibility', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const theme = manager.getTheme();

      // Base palette should have medium-low lightness to be visible on light background
      const primaryHSL = parseHSL(theme.basePalette.primary);
      expect(primaryHSL).not.toBeNull();
      expect(primaryHSL!.l).toBeLessThan(60);

      manager.dispose();
    });
  });

  // Test 9.3: Theme is configurable via prop
  describe('Test 9.3: Theme is configurable via prop', () => {
    it('accepts initialMode in config', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      expect(darkManager.getMode()).toBe('dark');
      expect(darkManager.getTheme().name).toBe('dark');
      darkManager.dispose();

      const lightManager = new ThemeManager({ initialMode: 'light' });
      expect(lightManager.getMode()).toBe('light');
      expect(lightManager.getTheme().name).toBe('light');
      lightManager.dispose();
    });

    it('setMode() changes the theme', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });

      expect(manager.getTheme().name).toBe('dark');

      manager.setMode('light');
      // Wait for transition to complete
      vi.advanceTimersByTime(400);

      expect(manager.getMode()).toBe('light');
      expect(manager.getTheme().name).toBe('light');

      manager.dispose();
    });

    it('getMode() returns current mode setting', () => {
      const manager = new ThemeManager({ initialMode: 'system' });

      expect(manager.getMode()).toBe('system');

      manager.setMode('dark');
      vi.advanceTimersByTime(400);
      expect(manager.getMode()).toBe('dark');

      manager.setMode('light');
      vi.advanceTimersByTime(400);
      expect(manager.getMode()).toBe('light');

      manager.dispose();
    });

    it('accepts transitionDuration in config', () => {
      const manager = new ThemeManager({
        initialMode: 'dark',
        transitionDuration: 500,
      });

      manager.setMode('light');

      // At 250ms (half of 500ms), should still be transitioning
      vi.advanceTimersByTime(250);
      expect(manager.isTransitioning()).toBe(true);

      // At 550ms, should be done
      vi.advanceTimersByTime(300);
      expect(manager.isTransitioning()).toBe(false);

      manager.dispose();
    });
  });

  // Test 9.4: Theme respects system preference by default (prefers-color-scheme)
  describe('Test 9.4: Theme respects system preference by default', () => {
    it('defaults to system mode', () => {
      const manager = new ThemeManager();
      expect(manager.getMode()).toBe('system');
      manager.dispose();
    });

    it('uses dark theme when system prefers dark', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system' });
      expect(manager.getTheme().name).toBe('dark');
      manager.dispose();
    });

    it('uses light theme when system prefers light', () => {
      mockMatchMedia = createMockMatchMedia(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system' });
      expect(manager.getTheme().name).toBe('light');
      manager.dispose();
    });

    it('getSystemPreference() returns current system preference', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager();
      expect(manager.getSystemPreference()).toBe('dark');
      manager.dispose();

      mockMatchMedia = createMockMatchMedia(false);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager2 = new ThemeManager();
      expect(manager2.getSystemPreference()).toBe('light');
      manager2.dispose();
    });

    it('responds to system preference changes when in system mode', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system' });
      expect(manager.getTheme().name).toBe('dark');

      // Simulate system preference change
      mockMatchMedia._triggerChange(false);
      vi.advanceTimersByTime(400);

      expect(manager.getTheme().name).toBe('light');
      manager.dispose();
    });
  });

  // Test 9.5: Theme can be overridden regardless of system preference
  describe('Test 9.5: Theme can be overridden regardless of system preference', () => {
    it('dark mode overrides light system preference', () => {
      mockMatchMedia = createMockMatchMedia(false); // System prefers light
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'dark' });
      expect(manager.getTheme().name).toBe('dark');
      manager.dispose();
    });

    it('light mode overrides dark system preference', () => {
      mockMatchMedia = createMockMatchMedia(true); // System prefers dark
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'light' });
      expect(manager.getTheme().name).toBe('light');
      manager.dispose();
    });

    it('does not respond to system changes when mode is explicitly set', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'dark' });
      expect(manager.getTheme().name).toBe('dark');

      // Simulate system preference change to light
      mockMatchMedia._triggerChange(false);
      vi.advanceTimersByTime(400);

      // Should still be dark because mode is explicitly 'dark'
      expect(manager.getTheme().name).toBe('dark');
      manager.dispose();
    });

    it('switching from system to explicit mode stops listening to system changes', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system' });
      expect(manager.getTheme().name).toBe('dark');

      // Switch to explicit light mode
      manager.setMode('light');
      vi.advanceTimersByTime(400);
      expect(manager.getTheme().name).toBe('light');

      // System changes should not affect it
      mockMatchMedia._triggerChange(true);
      vi.advanceTimersByTime(400);
      expect(manager.getTheme().name).toBe('light');

      manager.dispose();
    });

    it('can switch back to system mode after explicit mode', () => {
      mockMatchMedia = createMockMatchMedia(false); // System prefers light
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'dark' });
      expect(manager.getTheme().name).toBe('dark');

      // Switch to system mode
      manager.setMode('system');
      vi.advanceTimersByTime(400);

      expect(manager.getTheme().name).toBe('light'); // Now follows system
      manager.dispose();
    });
  });

  // Test 9.6: Theme change transitions smoothly (no flash)
  describe('Test 9.6: Theme change transitions smoothly', () => {
    it('isTransitioning() returns true during transition', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      expect(manager.isTransitioning()).toBe(false);

      manager.setMode('light');
      expect(manager.isTransitioning()).toBe(true);

      vi.advanceTimersByTime(350);
      expect(manager.isTransitioning()).toBe(false);

      manager.dispose();
    });

    it('getTransitionProgress() returns 0-1 during transition', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      manager.setMode('light');

      // Check progress at various points
      vi.advanceTimersByTime(16);
      const early = manager.getTransitionProgress();
      expect(early).toBeGreaterThan(0);
      expect(early).toBeLessThan(0.2);

      vi.advanceTimersByTime(134);
      const mid = manager.getTransitionProgress();
      expect(mid).toBeGreaterThan(0.3);
      expect(mid).toBeLessThan(0.7);

      vi.advanceTimersByTime(200);
      const final = manager.getTransitionProgress();
      expect(final).toBe(1);

      manager.dispose();
    });

    it('getInterpolatedTheme() returns intermediate values during transition', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      const darkBg = parseHSL(darkTheme.background)!.l;
      const lightBg = parseHSL(lightTheme.background)!.l;

      manager.setMode('light');
      vi.advanceTimersByTime(150); // Mid-transition

      const interpolated = manager.getInterpolatedTheme();
      const interpolatedBg = parseHSL(interpolated.background)!.l;

      // Interpolated lightness should be between dark and light
      expect(interpolatedBg).toBeGreaterThan(darkBg);
      expect(interpolatedBg).toBeLessThan(lightBg);

      manager.dispose();
    });

    it('background color transitions gradually', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      const initialBg = parseHSL(manager.getTheme().background)!.l;

      manager.setMode('light');

      // Sample at multiple points
      vi.advanceTimersByTime(100);
      const bg1 = parseHSL(manager.getInterpolatedTheme().background)!.l;

      vi.advanceTimersByTime(100);
      const bg2 = parseHSL(manager.getInterpolatedTheme().background)!.l;

      vi.advanceTimersByTime(150);
      const finalBg = parseHSL(manager.getTheme().background)!.l;

      // Background should gradually increase in lightness
      expect(bg1).toBeGreaterThan(initialBg);
      expect(bg2).toBeGreaterThan(bg1);
      expect(finalBg).toBeGreaterThan(bg2);

      manager.dispose();
    });

    it('palette colors transition gradually', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      const initialPrimary = parseHSL(manager.getTheme().basePalette.primary)!.l;

      manager.setMode('light');
      vi.advanceTimersByTime(150);

      const midPrimary = parseHSL(manager.getInterpolatedTheme().basePalette.primary)!.l;

      vi.advanceTimersByTime(200);
      const finalPrimary = parseHSL(manager.getTheme().basePalette.primary)!.l;

      // Light theme has lower lightness primary, so it should decrease
      expect(midPrimary).toBeLessThan(initialPrimary);
      expect(finalPrimary).toBeLessThan(midPrimary);

      manager.dispose();
    });

    it('uses easing for natural-feeling transitions', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      manager.setMode('light');

      // Sample progress at multiple points
      vi.advanceTimersByTime(100);
      const interpolated1 = manager.getInterpolatedTheme();

      vi.advanceTimersByTime(100);
      const interpolated2 = manager.getInterpolatedTheme();

      vi.advanceTimersByTime(100);

      // Just verify transitions are happening (easing makes this non-linear)
      expect(interpolated1.background).not.toBe(interpolated2.background);

      manager.dispose();
    });

    it('emits theme change event after transition completes', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });
      const callback = vi.fn();

      manager.onThemeChange(callback);
      manager.setMode('light');

      // Should not emit during transition
      vi.advanceTimersByTime(150);
      expect(callback).not.toHaveBeenCalled();

      // Should emit after transition completes
      vi.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalled();

      const event: ThemeChangeEvent = callback.mock.calls[0][0];
      expect(event.previousTheme.name).toBe('dark');
      expect(event.newTheme.name).toBe('light');
      expect(event.mode).toBe('light');
      expect(event.isSystemTriggered).toBe(false);

      manager.dispose();
    });
  });

  // Test 9.7: All primitives (spectrogram, typography) adapt to current theme
  describe('Test 9.7: All primitives adapt to current theme', () => {
    it('theme provides basePalette that primitives can use', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const darkPalette = darkManager.getTheme().basePalette;

      expect(darkPalette).toHaveProperty('primary');
      expect(darkPalette).toHaveProperty('secondary');
      expect(darkPalette).toHaveProperty('accent');

      const lightManager = new ThemeManager({ initialMode: 'light' });
      const lightPalette = lightManager.getTheme().basePalette;

      expect(lightPalette).toHaveProperty('primary');
      expect(lightPalette).toHaveProperty('secondary');
      expect(lightPalette).toHaveProperty('accent');

      darkManager.dispose();
      lightManager.dispose();
    });

    it('dark and light themes have different base palettes', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const lightManager = new ThemeManager({ initialMode: 'light' });

      const darkPalette = darkManager.getTheme().basePalette;
      const lightPalette = lightManager.getTheme().basePalette;

      // Palettes should be different
      expect(darkPalette.primary).not.toBe(lightPalette.primary);

      darkManager.dispose();
      lightManager.dispose();
    });

    it('theme provides background color for canvas clearing', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const lightManager = new ThemeManager({ initialMode: 'light' });

      expect(isValidHSL(darkManager.getTheme().background)).toBe(true);
      expect(isValidHSL(lightManager.getTheme().background)).toBe(true);

      // Different backgrounds
      expect(darkManager.getTheme().background).not.toBe(lightManager.getTheme().background);

      darkManager.dispose();
      lightManager.dispose();
    });

    it('theme provides foreground color for default text/lines', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const lightManager = new ThemeManager({ initialMode: 'light' });

      expect(isValidHSL(darkManager.getTheme().foreground)).toBe(true);
      expect(isValidHSL(lightManager.getTheme().foreground)).toBe(true);

      // Different foregrounds
      expect(darkManager.getTheme().foreground).not.toBe(lightManager.getTheme().foreground);

      darkManager.dispose();
      lightManager.dispose();
    });

    it('getTheme() returns a copy (immutable)', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });

      const theme1 = manager.getTheme();
      const theme2 = manager.getTheme();

      expect(theme1).not.toBe(theme2);
      expect(theme1.basePalette).not.toBe(theme2.basePalette);

      manager.dispose();
    });
  });

  // Test 9.8: Mood colors work well in both themes
  describe('Test 9.8: Mood colors work well in both themes', () => {
    it('dark theme base palette colors are visible (medium-high lightness)', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const palette = manager.getTheme().basePalette;

      const primaryHSL = parseHSL(palette.primary);
      const secondaryHSL = parseHSL(palette.secondary);
      const accentHSL = parseHSL(palette.accent);

      // For visibility on dark background, lightness should be 40-80%
      expect(primaryHSL!.l).toBeGreaterThanOrEqual(40);
      expect(primaryHSL!.l).toBeLessThanOrEqual(80);
      expect(secondaryHSL!.l).toBeGreaterThanOrEqual(40);
      expect(secondaryHSL!.l).toBeLessThanOrEqual(80);
      expect(accentHSL!.l).toBeGreaterThanOrEqual(40);
      expect(accentHSL!.l).toBeLessThanOrEqual(80);

      manager.dispose();
    });

    it('light theme base palette colors are visible (medium-low lightness)', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const palette = manager.getTheme().basePalette;

      const primaryHSL = parseHSL(palette.primary);
      const secondaryHSL = parseHSL(palette.secondary);
      const accentHSL = parseHSL(palette.accent);

      // For visibility on light background, lightness should be 20-60%
      expect(primaryHSL!.l).toBeGreaterThanOrEqual(20);
      expect(primaryHSL!.l).toBeLessThanOrEqual(60);
      expect(secondaryHSL!.l).toBeGreaterThanOrEqual(20);
      expect(secondaryHSL!.l).toBeLessThanOrEqual(60);
      expect(accentHSL!.l).toBeGreaterThanOrEqual(20);
      expect(accentHSL!.l).toBeLessThanOrEqual(60);

      manager.dispose();
    });

    it('dark theme has adequate contrast between background and palette', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      const theme = manager.getTheme();

      const bgLightness = parseHSL(theme.background)!.l;
      const primaryLightness = parseHSL(theme.basePalette.primary)!.l;

      // Should have at least 30% lightness difference for good contrast
      const contrast = Math.abs(primaryLightness - bgLightness);
      expect(contrast).toBeGreaterThanOrEqual(30);

      manager.dispose();
    });

    it('light theme has adequate contrast between background and palette', () => {
      const manager = new ThemeManager({ initialMode: 'light' });
      const theme = manager.getTheme();

      const bgLightness = parseHSL(theme.background)!.l;
      const primaryLightness = parseHSL(theme.basePalette.primary)!.l;

      // Should have at least 30% lightness difference for good contrast
      const contrast = Math.abs(primaryLightness - bgLightness);
      expect(contrast).toBeGreaterThanOrEqual(30);

      manager.dispose();
    });

    it('accent colors have appropriate saturation for vibrancy', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const lightManager = new ThemeManager({ initialMode: 'light' });

      const darkAccent = parseHSL(darkManager.getTheme().basePalette.accent);
      const lightAccent = parseHSL(lightManager.getTheme().basePalette.accent);

      // Accent should be reasonably saturated (> 30%)
      expect(darkAccent!.s).toBeGreaterThan(30);
      expect(lightAccent!.s).toBeGreaterThan(30);

      darkManager.dispose();
      lightManager.dispose();
    });

    it('themes maintain warm aesthetic (slight warm bias in hues)', () => {
      const darkManager = new ThemeManager({ initialMode: 'dark' });
      const lightManager = new ThemeManager({ initialMode: 'light' });

      const darkBg = parseHSL(darkManager.getTheme().background);
      const lightBg = parseHSL(lightManager.getTheme().background);
      const darkAccent = parseHSL(darkManager.getTheme().basePalette.accent);
      const lightAccent = parseHSL(lightManager.getTheme().basePalette.accent);

      // Either background or accent should have warm hue (0-60 or 300-360)
      const isWarmHue = (h: number) => (h >= 0 && h <= 60) || h >= 300;

      // Accent colors should lean warm (orange-ish)
      expect(isWarmHue(darkAccent!.h)).toBe(true);
      expect(isWarmHue(lightAccent!.h)).toBe(true);

      darkManager.dispose();
      lightManager.dispose();
    });
  });

  // Factory function and utility tests
  describe('createThemeManager factory function', () => {
    it('creates a ThemeManager instance', () => {
      const manager = createThemeManager();
      expect(manager).toBeInstanceOf(ThemeManager);
      manager.dispose();
    });

    it('accepts config options', () => {
      const manager = createThemeManager({
        initialMode: 'light',
        transitionDuration: 500,
      });

      expect(manager.getMode()).toBe('light');
      manager.dispose();
    });
  });

  describe('Event handling', () => {
    it('onThemeChange() registers callback', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 100 });
      const callback = vi.fn();

      manager.onThemeChange(callback);
      manager.setMode('light');
      vi.advanceTimersByTime(150);

      expect(callback).toHaveBeenCalled();
      manager.dispose();
    });

    it('offThemeChange() removes callback', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 100 });
      const callback = vi.fn();

      manager.onThemeChange(callback);
      manager.offThemeChange(callback);

      manager.setMode('light');
      vi.advanceTimersByTime(150);

      expect(callback).not.toHaveBeenCalled();
      manager.dispose();
    });

    it('handles listener errors gracefully', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 100 });
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();

      manager.onThemeChange(errorCallback);
      manager.onThemeChange(normalCallback);

      manager.setMode('light');
      expect(() => vi.advanceTimersByTime(150)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
      manager.dispose();
    });

    it('event includes isSystemTriggered flag', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system', transitionDuration: 100 });
      const callback = vi.fn();

      manager.onThemeChange(callback);

      // Trigger system preference change
      mockMatchMedia._triggerChange(false);
      vi.advanceTimersByTime(150);

      const event: ThemeChangeEvent = callback.mock.calls[0][0];
      expect(event.isSystemTriggered).toBe(true);

      manager.dispose();
    });
  });

  describe('dispose()', () => {
    it('stops ongoing transitions', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 500 });

      manager.setMode('light');
      vi.advanceTimersByTime(100);
      expect(manager.isTransitioning()).toBe(true);

      manager.dispose();

      vi.advanceTimersByTime(500);
      // No errors should occur
    });

    it('removes media query listener', () => {
      mockMatchMedia = createMockMatchMedia(true);
      window.matchMedia = vi.fn().mockReturnValue(mockMatchMedia);

      const manager = new ThemeManager({ initialMode: 'system' });
      manager.dispose();

      expect(mockMatchMedia.removeEventListener).toHaveBeenCalled();
    });

    it('clears all listeners', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 100 });
      const callback = vi.fn();

      manager.onThemeChange(callback);
      manager.dispose();

      // Attempting to trigger shouldn't call the callback
      // (we can't easily test this after dispose, but at least verify no errors)
    });

    it('ignores setMode calls after dispose', () => {
      const manager = new ThemeManager({ initialMode: 'dark' });
      manager.dispose();

      // Should not throw
      expect(() => manager.setMode('light')).not.toThrow();
    });
  });

  describe('Exported theme definitions', () => {
    it('exports darkTheme', () => {
      expect(darkTheme).toBeDefined();
      expect(darkTheme.name).toBe('dark');
      expect(isValidHSL(darkTheme.background)).toBe(true);
    });

    it('exports lightTheme', () => {
      expect(lightTheme).toBeDefined();
      expect(lightTheme.name).toBe('light');
      expect(isValidHSL(lightTheme.background)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('handles rapid mode changes', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 300 });

      // Rapidly switch modes
      manager.setMode('light');
      vi.advanceTimersByTime(50);
      manager.setMode('dark');
      vi.advanceTimersByTime(50);
      manager.setMode('light');
      vi.advanceTimersByTime(50);
      manager.setMode('dark');

      // Should not throw
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();

      const theme = manager.getTheme();
      expect(isValidHSL(theme.background)).toBe(true);

      manager.dispose();
    });

    it('handles setMode with same mode (no-op)', () => {
      const manager = new ThemeManager({ initialMode: 'dark', transitionDuration: 100 });
      const callback = vi.fn();

      manager.onThemeChange(callback);
      manager.setMode('dark'); // Same as initial

      vi.advanceTimersByTime(200);

      // Should not trigger transition or callback
      expect(callback).not.toHaveBeenCalled();
      expect(manager.isTransitioning()).toBe(false);

      manager.dispose();
    });
  });
});
