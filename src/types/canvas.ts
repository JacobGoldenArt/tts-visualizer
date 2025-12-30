/**
 * Canvas types for the Elyse Speech Visualizer
 *
 * Types for the Canvas Renderer with lo-fi, sketchy aesthetic support.
 */

/**
 * Configuration for the CanvasRenderer
 */
export interface CanvasRendererConfig {
  /** Canvas width in CSS pixels (optional if responsive) */
  width?: number;
  /** Canvas height in CSS pixels (optional if responsive) */
  height?: number;
  /** Whether to fill the container (overrides width/height) */
  responsive?: boolean;
  /** Pixel ratio for high-DPI support (auto-detects if not set) */
  pixelRatio?: number;
}

/**
 * Options for drawing lines with sketchy/wobble effect
 */
export interface DrawLineOptions {
  /** Wobble amount: 0 = straight line, 1 = maximum wobble */
  wobble?: number;
  /** Line color (CSS color string) */
  color?: string;
  /** Line width in pixels */
  lineWidth?: number;
}

/**
 * Options for drawing organic blob shapes
 */
export interface DrawBlobOptions {
  /** Shape irregularity: 0 = perfect circle, 1 = very irregular */
  irregularity?: number;
  /** Fill/stroke color (CSS color string) */
  color?: string;
  /** Whether to fill the shape (true) or just stroke (false) */
  fill?: boolean;
}

/**
 * Options for drawing text with distortion
 */
export interface DrawTextOptions {
  /** Distortion amount: 0 = clean text, 1 = maximum distortion */
  distortion?: number;
  /** Font specification (CSS font string) */
  font?: string;
  /** Text color (CSS color string) */
  color?: string;
}

/**
 * Global effects that can be applied to the canvas
 */
export interface GlobalEffects {
  /** Grain intensity: 0 = none, 1 = heavy grain */
  grain?: number;
  /** Chromatic aberration amount: 0 = none, positive = offset in pixels */
  chromaticAberration?: number;
}

/**
 * Layer for compositing: background (bottom) -> midground -> foreground (top)
 */
export type Layer = 'background' | 'midground' | 'foreground';

/**
 * Frame callback type for animation loop
 */
export type FrameCallback = (deltaTime: number) => void;

/**
 * Interface for the CanvasRenderer
 */
export interface ICanvasRenderer {
  // Lifecycle
  /** Mount the renderer into a container element */
  mount(container: HTMLElement): void;
  /** Unmount the renderer and clean up resources */
  unmount(): void;

  // Drawing primitives
  /** Clear the canvas (optionally only a specific layer) */
  clear(layer?: Layer): void;
  /** Draw a line with optional wobble/sketchiness */
  drawLine(x1: number, y1: number, x2: number, y2: number, options?: DrawLineOptions): void;
  /** Draw an organic blob shape */
  drawBlob(x: number, y: number, radius: number, options?: DrawBlobOptions): void;
  /** Draw text with optional distortion */
  drawText(text: string, x: number, y: number, options?: DrawTextOptions): void;

  // Layer management
  /** Set the current drawing layer */
  setLayer(layer: Layer): void;

  // Animation
  /** Register a frame callback for the animation loop */
  onFrame(callback: FrameCallback): void;
  /** Remove a frame callback */
  offFrame(callback: FrameCallback): void;

  // Effects
  /** Set global effects (grain, chromatic aberration) */
  setEffects(effects: GlobalEffects): void;

  // Dimensions (readonly)
  /** Current canvas width in CSS pixels */
  readonly width: number;
  /** Current canvas height in CSS pixels */
  readonly height: number;
}
