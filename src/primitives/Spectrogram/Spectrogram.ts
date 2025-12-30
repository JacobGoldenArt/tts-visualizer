/**
 * Spectrogram
 *
 * Frequency-reactive visualization that displays audio spectrum data
 * with a sketchy, lo-fi aesthetic. Renders frequency bands as vertical
 * or horizontal bars with configurable wobble/sketchiness.
 */

import type { AnalyzerData } from '@/types/audio';
import type { ColorPalette } from '@/types/visual';
import type { ICanvasRenderer, DrawLineOptions } from '@/types/canvas';

/**
 * Display mode for the visualizer
 */
export type DisplayMode = 'text' | 'visual';

/**
 * Orientation for the spectrogram bars
 */
export type Orientation = 'horizontal' | 'vertical';

/**
 * Configuration options for the Spectrogram
 */
export interface SpectrogramConfig {
  /** Base number of frequency bars (adjusted by intensity). Default: 32 */
  barCount?: number;
  /** Base bar thickness in pixels (adjusted by intensity). Default: 4 */
  barThickness?: number;
  /** Gap between bars in pixels. Default: 2 */
  barGap?: number;
  /** Wobble amount for sketchy effect (0-1). Default: 0.3 */
  wobble?: number;
  /** Display orientation. Default: 'vertical' */
  orientation?: Orientation;
}

/**
 * Full required config with defaults applied
 */
export type RequiredSpectrogramConfig = Required<SpectrogramConfig>;

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: RequiredSpectrogramConfig = {
  barCount: 32,
  barThickness: 4,
  barGap: 2,
  wobble: 0.3,
  orientation: 'vertical',
};

/**
 * Interpolation state for smooth animation
 */
interface InterpolationState {
  /** Previous bar heights for interpolation */
  prevHeights: number[];
  /** Target bar heights */
  targetHeights: number[];
  /** Current interpolated heights */
  currentHeights: number[];
  /** Last update timestamp */
  lastUpdateTime: number;
}

/**
 * Spectrogram class
 *
 * Renders frequency data as sketchy bars that react to audio in real-time.
 */
export class Spectrogram {
  private config: RequiredSpectrogramConfig;
  private renderer: ICanvasRenderer | null = null;
  private palette: ColorPalette;
  private intensity: number = 1.0;
  private motion: number = 0.5;
  private mode: DisplayMode = 'visual';
  private interpolation: InterpolationState;
  private lastFrameTime: number = 0;
  private disposed: boolean = false;

  /**
   * Create a new Spectrogram
   */
  constructor(config?: SpectrogramConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize default neutral palette
    this.palette = {
      primary: 'hsl(220, 15%, 50%)',
      secondary: 'hsl(200, 10%, 55%)',
      accent: 'hsl(240, 12%, 60%)',
    };

    // Initialize interpolation state
    const barCount = this.getEffectiveBarCount();
    this.interpolation = {
      prevHeights: new Array(barCount).fill(0),
      targetHeights: new Array(barCount).fill(0),
      currentHeights: new Array(barCount).fill(0),
      lastUpdateTime: 0,
    };
  }

  /**
   * Get the current configuration (returns a copy)
   */
  getConfig(): RequiredSpectrogramConfig {
    return { ...this.config };
  }

  /**
   * Set the canvas renderer to use for drawing
   */
  setRenderer(renderer: ICanvasRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Set the color palette from mood mapper
   */
  setPalette(palette: ColorPalette): void {
    this.palette = { ...palette };
  }

  /**
   * Get the current palette
   */
  getPalette(): ColorPalette {
    return { ...this.palette };
  }

  /**
   * Set the intensity level (0-1)
   * Affects bar count and thickness
   */
  setIntensity(intensity: number): void {
    const oldBarCount = this.getEffectiveBarCount();
    this.intensity = Math.max(0, Math.min(1, intensity));
    const newBarCount = this.getEffectiveBarCount();

    // Resize interpolation arrays if bar count changed
    if (newBarCount !== oldBarCount) {
      this.resizeInterpolationArrays(newBarCount);
    }
  }

  /**
   * Get the current intensity
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * Set the motion level (0-1)
   * Affects animation smoothness/speed
   */
  setMotion(motion: number): void {
    this.motion = Math.max(0, Math.min(1, motion));
  }

  /**
   * Get the current motion level
   */
  getMotion(): number {
    return this.motion;
  }

  /**
   * Set the display mode (text/visual)
   * Affects opacity/prominence
   */
  setMode(mode: DisplayMode): void {
    this.mode = mode;
  }

  /**
   * Get the current display mode
   */
  getMode(): DisplayMode {
    return this.mode;
  }

  /**
   * Set the orientation (horizontal/vertical)
   */
  setOrientation(orientation: Orientation): void {
    this.config.orientation = orientation;
  }

  /**
   * Get the current orientation
   */
  getOrientation(): Orientation {
    return this.config.orientation;
  }

  /**
   * Update the spectrogram with new analyzer data
   * Call this method with each frame of audio data
   */
  update(data: AnalyzerData | null, timestamp: number = Date.now()): void {
    if (this.disposed) return;

    const barCount = this.getEffectiveBarCount();

    // Store previous heights for interpolation
    this.interpolation.prevHeights = [...this.interpolation.currentHeights];

    if (!data || !data.frequencyData || data.frequencyData.length === 0) {
      // No audio - target flat/minimal state
      this.interpolation.targetHeights = new Array(barCount).fill(0);
    } else {
      // Map frequency data to bar heights
      this.interpolation.targetHeights = this.mapFrequencyToHeights(data.frequencyData, barCount);
    }

    this.interpolation.lastUpdateTime = timestamp;
  }

  /**
   * Render the spectrogram to the canvas
   * Should be called from the animation loop
   */
  render(deltaTime: number = 16): void {
    if (this.disposed || !this.renderer) return;

    // Interpolate heights based on motion setting
    this.interpolateHeights(deltaTime);

    // Calculate opacity based on mode
    const opacity = this.mode === 'visual' ? 1.0 : 0.3;

    // Render bars
    this.renderBars(opacity);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.disposed = true;
    this.renderer = null;
    this.interpolation.prevHeights = [];
    this.interpolation.targetHeights = [];
    this.interpolation.currentHeights = [];
  }

  /**
   * Check if the spectrogram has been disposed
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  // Private methods

  /**
   * Get the effective bar count based on intensity
   * Intensity 0 = 50% of base count, Intensity 1 = 150% of base count
   */
  private getEffectiveBarCount(): number {
    const multiplier = 0.5 + this.intensity;
    return Math.max(4, Math.round(this.config.barCount * multiplier));
  }

  /**
   * Get the effective bar thickness based on intensity
   */
  private getEffectiveBarThickness(): number {
    const multiplier = 0.5 + this.intensity * 0.5;
    return Math.max(1, Math.round(this.config.barThickness * multiplier));
  }

  /**
   * Resize interpolation arrays when bar count changes
   */
  private resizeInterpolationArrays(newSize: number): void {
    const currentSize = this.interpolation.currentHeights.length;

    if (newSize === currentSize) return;

    if (newSize > currentSize) {
      // Extend arrays with zeros
      this.interpolation.prevHeights = [
        ...this.interpolation.prevHeights,
        ...new Array(newSize - currentSize).fill(0),
      ];
      this.interpolation.targetHeights = [
        ...this.interpolation.targetHeights,
        ...new Array(newSize - currentSize).fill(0),
      ];
      this.interpolation.currentHeights = [
        ...this.interpolation.currentHeights,
        ...new Array(newSize - currentSize).fill(0),
      ];
    } else {
      // Truncate arrays
      this.interpolation.prevHeights = this.interpolation.prevHeights.slice(0, newSize);
      this.interpolation.targetHeights = this.interpolation.targetHeights.slice(0, newSize);
      this.interpolation.currentHeights = this.interpolation.currentHeights.slice(0, newSize);
    }
  }

  /**
   * Map frequency data to bar heights
   * Frequency data comes as Float32Array with dB values (typically -100 to 0)
   */
  private mapFrequencyToHeights(frequencyData: Float32Array, barCount: number): number[] {
    const heights: number[] = [];
    const binCount = frequencyData.length;
    const binsPerBar = Math.max(1, Math.floor(binCount / barCount));

    for (let i = 0; i < barCount; i++) {
      const startBin = i * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, binCount);

      // Average the bins for this bar
      let sum = 0;
      let count = 0;
      for (let j = startBin; j < endBin; j++) {
        sum += frequencyData[j];
        count++;
      }

      // Convert from dB (typically -100 to 0) to normalized height (0-1)
      // Add 100 to shift range to 0-100, then divide by 100
      const avgDb = count > 0 ? sum / count : -100;
      const normalizedHeight = Math.max(0, Math.min(1, (avgDb + 100) / 100));

      heights.push(normalizedHeight);
    }

    return heights;
  }

  /**
   * Interpolate heights based on motion setting and delta time
   * Higher motion = faster response (less smoothing)
   * Lower motion = slower response (more smoothing)
   */
  private interpolateHeights(deltaTime: number): void {
    const barCount = this.getEffectiveBarCount();

    // Ensure arrays are correct size
    if (this.interpolation.currentHeights.length !== barCount) {
      this.resizeInterpolationArrays(barCount);
    }

    // Calculate interpolation factor based on motion and delta time
    // Motion 0 = very slow (0.02 per frame), Motion 1 = instant (1.0)
    const baseSpeed = 0.02 + this.motion * 0.98;
    const speedFactor = baseSpeed * (deltaTime / 16); // Normalize to 60fps
    const factor = Math.min(1, speedFactor);

    // Interpolate each bar height
    for (let i = 0; i < barCount; i++) {
      const target = this.interpolation.targetHeights[i] || 0;
      const current = this.interpolation.currentHeights[i] || 0;
      this.interpolation.currentHeights[i] = current + (target - current) * factor;
    }
  }

  /**
   * Render the frequency bars
   */
  private renderBars(opacity: number): void {
    if (!this.renderer) return;

    const barCount = this.getEffectiveBarCount();
    const barThickness = this.getEffectiveBarThickness();
    const barGap = this.config.barGap;
    const wobble = this.config.wobble;
    const orientation = this.config.orientation;

    const canvasWidth = this.renderer.width;
    const canvasHeight = this.renderer.height;

    // Calculate total width needed for all bars
    const totalBarSpace = (barThickness + barGap) * barCount - barGap;

    // Center the bars
    let startX: number;
    let startY: number;
    let maxBarLength: number;

    if (orientation === 'vertical') {
      // Bars grow upward from bottom
      startX = (canvasWidth - totalBarSpace) / 2;
      startY = canvasHeight;
      maxBarLength = canvasHeight * 0.8; // Leave 20% margin
    } else {
      // Bars grow rightward from left
      startX = 0;
      startY = (canvasHeight - totalBarSpace) / 2;
      maxBarLength = canvasWidth * 0.8;
    }

    // Set up drawing options
    const lineOptions: DrawLineOptions = {
      wobble: wobble,
      lineWidth: barThickness,
    };

    // Draw each bar
    for (let i = 0; i < barCount; i++) {
      const height = this.interpolation.currentHeights[i] || 0;
      const barLength = Math.max(2, height * maxBarLength); // Minimum 2px height

      // Determine color based on position
      // Use primary for most bars, accent for peaks
      const isPeak = height > 0.7;
      const color = this.applyOpacity(
        isPeak ? this.palette.accent : this.palette.primary,
        opacity
      );

      lineOptions.color = color;

      let x1: number, y1: number, x2: number, y2: number;

      if (orientation === 'vertical') {
        // Vertical bars grow upward
        x1 = startX + i * (barThickness + barGap) + barThickness / 2;
        y1 = startY;
        x2 = x1;
        y2 = startY - barLength;
      } else {
        // Horizontal bars grow rightward
        x1 = startX;
        y1 = startY + i * (barThickness + barGap) + barThickness / 2;
        x2 = startX + barLength;
        y2 = y1;
      }

      this.renderer.drawLine(x1, y1, x2, y2, lineOptions);
    }
  }

  /**
   * Apply opacity to an HSL color string
   */
  private applyOpacity(hslColor: string, opacity: number): string {
    // Convert hsl() to hsla()
    const match = hslColor.match(/hsl\(([^)]+)\)/);
    if (match) {
      return `hsla(${match[1]}, ${opacity})`;
    }
    return hslColor;
  }
}

/**
 * Create a new Spectrogram instance
 */
export function createSpectrogram(config?: SpectrogramConfig): Spectrogram {
  return new Spectrogram(config);
}
