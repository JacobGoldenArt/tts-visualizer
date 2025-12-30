/**
 * MoodMapper - Translates semantic analysis output into visual parameters
 *
 * Maps mood/sentiment from the SemanticPipeline to color palettes and
 * intensity modifiers for the visualizer. Provides smooth interpolation
 * between mood changes to avoid jarring visual shifts.
 */

import type { Emotion, MoodObject } from '@/types/semantic';
import type {
  ColorPalette,
  VisualParams,
  PrimitiveWeights,
  MapperConfig,
  IMoodMapper,
  MapperEventCallback,
  MapperUpdatedEvent,
} from '@/types/visual';

/**
 * Default color palettes for each emotion
 * Uses HSL color space for easier manipulation
 */
const DEFAULT_EMOTION_PALETTES: Record<Emotion, ColorPalette> = {
  joy: {
    primary: 'hsl(45, 85%, 55%)', // Warm yellow
    secondary: 'hsl(30, 80%, 50%)', // Orange
    accent: 'hsl(60, 90%, 60%)', // Bright yellow
  },
  sadness: {
    primary: 'hsl(220, 45%, 40%)', // Deep blue
    secondary: 'hsl(260, 35%, 45%)', // Muted purple
    accent: 'hsl(200, 40%, 50%)', // Soft cyan
  },
  anger: {
    primary: 'hsl(0, 75%, 45%)', // Red
    secondary: 'hsl(20, 70%, 40%)', // Dark orange
    accent: 'hsl(350, 80%, 50%)', // Crimson
  },
  fear: {
    primary: 'hsl(280, 40%, 35%)', // Dark purple
    secondary: 'hsl(250, 30%, 30%)', // Deep violet
    accent: 'hsl(300, 35%, 40%)', // Muted magenta
  },
  surprise: {
    primary: 'hsl(180, 70%, 50%)', // Bright cyan
    secondary: 'hsl(320, 65%, 55%)', // Pink
    accent: 'hsl(160, 75%, 55%)', // Teal
  },
  neutral: {
    primary: 'hsl(220, 15%, 50%)', // Soft gray-blue
    secondary: 'hsl(200, 10%, 55%)', // Muted gray
    accent: 'hsl(240, 12%, 60%)', // Light slate
  },
};

/**
 * Default neutral visual parameters
 */
const DEFAULT_PARAMS: VisualParams = {
  palette: { ...DEFAULT_EMOTION_PALETTES.neutral },
  intensity: 1.0,
  primitiveWeights: {
    spectrogram: 0.5,
    typography: 0.5,
    blobs: 0.5,
  },
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
 * Interpolate between two primitive weights
 */
function interpolateWeights(
  from: PrimitiveWeights,
  to: PrimitiveWeights,
  t: number
): PrimitiveWeights {
  return {
    spectrogram: from.spectrogram + (to.spectrogram - from.spectrogram) * t,
    typography: from.typography + (to.typography - from.typography) * t,
    blobs: from.blobs + (to.blobs - from.blobs) * t,
  };
}

/**
 * Easing function for smooth transitions (ease-out cubic)
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Frame interval for animation (approx 60fps)
 */
const FRAME_INTERVAL = 16;

/**
 * MoodMapper class
 */
export class MoodMapper implements IMoodMapper {
  private _config: Required<MapperConfig>;
  private _currentParams: VisualParams;
  private _targetParams: VisualParams;
  private _currentMood: MoodObject | null = null;
  private _listeners: Set<MapperEventCallback> = new Set();

  // Interpolation state
  private _interpolationStartTime: number = 0;
  private _interpolationStartParams: VisualParams;
  private _isInterpolating: boolean = false;
  private _timerId: ReturnType<typeof setTimeout> | null = null;
  private _disposed: boolean = false;

  constructor(config?: MapperConfig) {
    this._config = {
      interpolationDuration: config?.interpolationDuration ?? 500,
      customPalettes: config?.customPalettes ?? {},
    };

    // Initialize with default params
    this._currentParams = this.deepCopyParams(DEFAULT_PARAMS);
    this._targetParams = this.deepCopyParams(DEFAULT_PARAMS);
    this._interpolationStartParams = this.deepCopyParams(DEFAULT_PARAMS);
  }

  /**
   * Update the mapper with a new mood object
   * Calculates target visual params and starts interpolation
   */
  update(mood: MoodObject): void {
    if (this._disposed) return;

    this._currentMood = { ...mood, keywords: [...mood.keywords] };

    // Calculate target params from mood
    this._targetParams = this.calculateParams(mood);

    // Start interpolation
    this._interpolationStartParams = this.deepCopyParams(this._currentParams);
    this._interpolationStartTime = Date.now();
    this._isInterpolating = true;

    // Start animation loop if not running
    if (this._timerId === null) {
      this.startAnimationLoop();
    }
  }

  /**
   * Get current visual parameters (returns a copy)
   */
  getParams(): VisualParams {
    return this.deepCopyParams(this._currentParams);
  }

  /**
   * Get current state (mood + params)
   */
  getState(): { mood: MoodObject | null; params: VisualParams } {
    return {
      mood: this._currentMood
        ? { ...this._currentMood, keywords: [...this._currentMood.keywords] }
        : null,
      params: this.getParams(),
    };
  }

  /**
   * Set custom configuration
   */
  setConfig(config: MapperConfig): void {
    if (config.interpolationDuration !== undefined) {
      this._config.interpolationDuration = config.interpolationDuration;
    }
    if (config.customPalettes !== undefined) {
      this._config.customPalettes = { ...config.customPalettes };
    }
  }

  /**
   * Register an event listener for 'updated' events
   */
  on(event: 'updated', callback: MapperEventCallback): void {
    if (event === 'updated') {
      this._listeners.add(callback);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: 'updated', callback: MapperEventCallback): void {
    if (event === 'updated') {
      this._listeners.delete(callback);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this._disposed = true;
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
    this._isInterpolating = false;
    this._listeners.clear();
  }

  /**
   * Calculate visual parameters from mood object
   */
  private calculateParams(mood: MoodObject): VisualParams {
    // Get base palette for emotion
    const basePalette = this.getPaletteForEmotion(mood.emotion);

    // Adjust palette based on sentiment and energy
    const adjustedPalette = this.adjustPaletteForMood(basePalette, mood);

    // Calculate intensity from energy (maps 0-1 to 0.5-1.5)
    const intensity = clamp(0.5 + mood.energy, 0.5, 1.5);

    // Calculate primitive weights based on mood
    const primitiveWeights = this.calculatePrimitiveWeights(mood);

    return {
      palette: adjustedPalette,
      intensity,
      primitiveWeights,
    };
  }

  /**
   * Get the color palette for a given emotion
   */
  private getPaletteForEmotion(emotion: Emotion): ColorPalette {
    // Check custom palettes first
    const customPalette = this._config.customPalettes[emotion];
    if (customPalette) {
      return { ...customPalette };
    }
    return { ...DEFAULT_EMOTION_PALETTES[emotion] };
  }

  /**
   * Adjust palette based on sentiment and energy
   * - Positive sentiment: warmer, brighter
   * - Negative sentiment: cooler, more muted
   * - High energy: more saturated
   */
  private adjustPaletteForMood(basePalette: ColorPalette, mood: MoodObject): ColorPalette {
    const adjustColor = (color: string): string => {
      const hsl = parseHSL(color);

      // Adjust saturation based on energy (high energy = more vibrant)
      const saturationBoost = mood.energy * 15;
      let newSaturation = clamp(hsl.s + saturationBoost, 0, 100);

      // Adjust lightness based on sentiment
      // Positive = brighter, negative = darker
      const lightnessAdjust = mood.sentiment * 10;
      let newLightness = clamp(hsl.l + lightnessAdjust, 20, 80);

      // For positive sentiment, shift hue slightly toward warm (yellow/orange)
      // For negative sentiment, shift slightly toward cool (blue)
      let hueShift = mood.sentiment * 15;
      let newHue = (hsl.h + hueShift + 360) % 360;

      // If negative sentiment, desaturate slightly
      if (mood.sentiment < 0) {
        newSaturation = clamp(newSaturation + mood.sentiment * 10, 0, 100);
      }

      return formatHSL(newHue, newSaturation, newLightness);
    };

    return {
      primary: adjustColor(basePalette.primary),
      secondary: adjustColor(basePalette.secondary),
      accent: adjustColor(basePalette.accent),
    };
  }

  /**
   * Calculate primitive weights based on mood
   * - High energy + positive: more spectrogram
   * - Emotional + keywords: more typography
   * - Calm + neutral: more blobs
   */
  private calculatePrimitiveWeights(mood: MoodObject): PrimitiveWeights {
    const { sentiment, energy, keywords, emotion } = mood;

    // Base weights
    let spectrogram = 0.5;
    let typography = 0.5;
    let blobs = 0.5;

    // High energy + positive sentiment favors spectrogram
    if (energy > 0.5 && sentiment > 0) {
      spectrogram = 0.5 + (energy - 0.5) * 0.8 + sentiment * 0.3;
    }

    // Keywords present + emotional content favors typography
    if (keywords.length > 0 && emotion !== 'neutral') {
      typography = 0.5 + keywords.length * 0.1;
    }

    // Calm + neutral favors blobs/ambient
    if (energy < 0.5 && emotion === 'neutral') {
      blobs = 0.5 + (0.5 - energy) * 0.8;
    }

    // Also increase blobs for calm emotional content
    if (energy < 0.4) {
      blobs = Math.max(blobs, 0.6 + (0.4 - energy));
    }

    // Normalize to 0-1 range
    return {
      spectrogram: clamp(spectrogram, 0, 1),
      typography: clamp(typography, 0, 1),
      blobs: clamp(blobs, 0, 1),
    };
  }

  /**
   * Start the animation loop for interpolation
   * Uses setTimeout instead of requestAnimationFrame for better testability
   */
  private startAnimationLoop(): void {
    const tick = (): void => {
      if (!this._isInterpolating || this._disposed) {
        this._timerId = null;
        return;
      }

      const elapsed = Date.now() - this._interpolationStartTime;
      const duration = this._config.interpolationDuration;
      const rawProgress = Math.min(elapsed / duration, 1);
      const progress = easeOutCubic(rawProgress);

      // Interpolate all params
      this._currentParams = {
        palette: interpolatePalette(
          this._interpolationStartParams.palette,
          this._targetParams.palette,
          progress
        ),
        intensity:
          this._interpolationStartParams.intensity +
          (this._targetParams.intensity - this._interpolationStartParams.intensity) * progress,
        primitiveWeights: interpolateWeights(
          this._interpolationStartParams.primitiveWeights,
          this._targetParams.primitiveWeights,
          progress
        ),
      };

      // Emit update event
      this.emit();

      // Check if interpolation is complete
      if (rawProgress >= 1) {
        this._isInterpolating = false;
        this._timerId = null;
        return;
      }

      // Continue loop
      this._timerId = setTimeout(tick, FRAME_INTERVAL);
    };

    this._timerId = setTimeout(tick, FRAME_INTERVAL);
  }

  /**
   * Emit an 'updated' event to all listeners
   */
  private emit(): void {
    if (!this._currentMood) return;

    const event: MapperUpdatedEvent = {
      type: 'updated',
      params: this.getParams(),
      mood: { ...this._currentMood, keywords: [...this._currentMood.keywords] },
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
   * Deep copy visual params to prevent mutation
   */
  private deepCopyParams(params: VisualParams): VisualParams {
    return {
      palette: { ...params.palette },
      intensity: params.intensity,
      primitiveWeights: { ...params.primitiveWeights },
    };
  }
}

/**
 * Create a new MoodMapper instance
 */
export function createMoodMapper(config?: MapperConfig): MoodMapper {
  return new MoodMapper(config);
}

/**
 * Export default emotion palettes for external use
 */
export const EMOTION_PALETTES = DEFAULT_EMOTION_PALETTES;
