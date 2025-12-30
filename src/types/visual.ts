/**
 * Visual types for the Elyse Speech Visualizer
 *
 * Types for mood-to-visual mapping, color palettes, and visual parameters.
 */

import type { Emotion, MoodObject } from './semantic';

/**
 * Color palette for the visualizer
 */
export interface ColorPalette {
  /** Main color (HSL format: "hsl(h, s%, l%)") */
  primary: string;
  /** Supporting color (HSL format) */
  secondary: string;
  /** Highlight/accent color (HSL format) */
  accent: string;
}

/**
 * Weights for visual primitives (which to emphasize)
 */
export interface PrimitiveWeights {
  /** Weight for spectrogram visualization (0 to 1) */
  spectrogram: number;
  /** Weight for typography/text visualization (0 to 1) */
  typography: number;
  /** Weight for blob/ambient visualization (0 to 1) */
  blobs: number;
}

/**
 * Output of the MoodMapper - visual parameters for the renderer
 */
export interface VisualParams {
  /** Color palette for the visualization */
  palette: ColorPalette;
  /** Intensity multiplier (0.5 to 1.5) */
  intensity: number;
  /** Which primitives to emphasize */
  primitiveWeights: PrimitiveWeights;
}

/**
 * Configuration for the MoodMapper
 */
export interface MapperConfig {
  /** Duration for interpolation between mood states in milliseconds (default: 500) */
  interpolationDuration?: number;
  /** Custom palettes for specific emotions */
  customPalettes?: Partial<Record<Emotion, ColorPalette>>;
}

/**
 * Event types emitted by the MoodMapper
 */
export type MapperEventType = 'updated';

/**
 * Event data for 'updated' events
 */
export interface MapperUpdatedEvent {
  type: 'updated';
  params: VisualParams;
  mood: MoodObject;
  timestamp: number;
}

/**
 * Callback type for mapper events
 */
export type MapperEventCallback = (event: MapperUpdatedEvent) => void;

/**
 * Interface for the MoodMapper
 */
export interface IMoodMapper {
  /**
   * Update the mapper with a new mood object
   */
  update(mood: MoodObject): void;

  /**
   * Get current visual parameters
   */
  getParams(): VisualParams;

  /**
   * Get current state (mood + params)
   */
  getState(): { mood: MoodObject | null; params: VisualParams };

  /**
   * Set custom configuration
   */
  setConfig(config: MapperConfig): void;

  /**
   * Register an event listener for 'updated' events
   */
  on(event: 'updated', callback: MapperEventCallback): void;

  /**
   * Remove an event listener
   */
  off(event: 'updated', callback: MapperEventCallback): void;

  /**
   * Clean up resources (stop animation frame loop)
   */
  dispose(): void;
}
