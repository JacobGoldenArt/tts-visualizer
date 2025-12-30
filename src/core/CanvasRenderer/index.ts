/**
 * CanvasRenderer Module
 *
 * Core 2D canvas rendering system with utilities for lo-fi, sketchy aesthetic.
 */

export { CanvasRenderer } from './CanvasRenderer';
export { applyGrain, applyChromaticAberration } from './effects';
export type {
  CanvasRendererConfig,
  DrawLineOptions,
  DrawBlobOptions,
  DrawTextOptions,
  GlobalEffects,
  Layer,
  FrameCallback,
  ICanvasRenderer,
} from '@/types/canvas';
