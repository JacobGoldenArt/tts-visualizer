/**
 * CanvasRenderer
 *
 * Core 2D canvas rendering system with utilities for lo-fi, sketchy aesthetic.
 * Supports layer compositing, high-DPI displays, and global effects.
 */

import type {
  CanvasRendererConfig,
  DrawLineOptions,
  DrawBlobOptions,
  DrawTextOptions,
  GlobalEffects,
  Layer,
  FrameCallback,
  ICanvasRenderer,
} from '@/types/canvas';
import { applyGrain, applyChromaticAberration } from './effects';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<CanvasRendererConfig> = {
  width: 800,
  height: 600,
  responsive: false,
  pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
};

/**
 * Layer order for compositing (bottom to top)
 */
const LAYER_ORDER: Layer[] = ['background', 'midground', 'foreground'];

/**
 * CanvasRenderer class
 *
 * Provides a 2D canvas rendering system with sketchy/lo-fi aesthetic support.
 */
export class CanvasRenderer implements ICanvasRenderer {
  private config: Required<CanvasRendererConfig>;
  private container: HTMLElement | null = null;
  private canvases: Map<Layer, HTMLCanvasElement> = new Map();
  private contexts: Map<Layer, CanvasRenderingContext2D> = new Map();
  private currentLayer: Layer = 'midground';
  private frameCallbacks: Set<FrameCallback> = new Set();
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;
  private effects: GlobalEffects = {};
  private mounted = false;
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Create a new CanvasRenderer
   */
  constructor(config: CanvasRendererConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get current width in CSS pixels
   */
  get width(): number {
    return this.config.width;
  }

  /**
   * Get current height in CSS pixels
   */
  get height(): number {
    return this.config.height;
  }

  /**
   * Mount the renderer into a container element
   */
  mount(container: HTMLElement): void {
    if (this.mounted) {
      this.unmount();
    }

    this.container = container;
    this.mounted = true;

    // Create canvas layers
    for (const layer of LAYER_ORDER) {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = layer === 'foreground' ? 'auto' : 'none';

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(`Failed to get 2D context for ${layer} layer`);
      }

      this.canvases.set(layer, canvas);
      this.contexts.set(layer, ctx);
      container.appendChild(canvas);
    }

    // Set up responsive sizing if enabled
    if (this.config.responsive) {
      this.setupResponsive();
    } else {
      this.updateCanvasSizes();
    }

    // Start animation loop
    this.startAnimationLoop();
  }

  /**
   * Unmount the renderer and clean up resources
   */
  unmount(): void {
    // Stop animation loop
    this.stopAnimationLoop();

    // Clean up resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Remove canvases from DOM
    for (const canvas of this.canvases.values()) {
      canvas.remove();
    }

    // Clear internal state
    this.canvases.clear();
    this.contexts.clear();
    this.container = null;
    this.mounted = false;
    this.frameCallbacks.clear();
  }

  /**
   * Clear the canvas (optionally only a specific layer)
   */
  clear(layer?: Layer): void {
    if (layer) {
      const ctx = this.contexts.get(layer);
      if (ctx) {
        const canvas = this.canvases.get(layer)!;
        ctx.clearRect(0, 0, canvas.width / this.config.pixelRatio, canvas.height / this.config.pixelRatio);
      }
    } else {
      // Clear all layers
      for (const l of LAYER_ORDER) {
        this.clear(l);
      }
    }
  }

  /**
   * Draw a line with optional wobble/sketchiness
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, options: DrawLineOptions = {}): void {
    const ctx = this.getCurrentContext();
    if (!ctx) return;

    const {
      wobble = 0,
      color = '#000000',
      lineWidth = 1,
    } = options;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (wobble === 0) {
      // Straight line
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else {
      // Sketchy/wobbly line
      const points = this.wobbleLine(x1, y1, x2, y2, wobble * 10);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw an organic blob shape
   */
  drawBlob(x: number, y: number, radius: number, options: DrawBlobOptions = {}): void {
    const ctx = this.getCurrentContext();
    if (!ctx) return;

    const {
      irregularity = 0.3,
      color = '#000000',
      fill = true,
    } = options;

    ctx.save();

    if (fill) {
      ctx.fillStyle = color;
    } else {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
    }

    // Generate organic blob using noise-based radius variation
    const points = this.generateBlobPoints(x, y, radius, irregularity);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    // Use bezier curves for smooth organic shape
    for (let i = 0; i < points.length; i++) {
      const p1 = points[(i + 1) % points.length];
      const p2 = points[(i + 2) % points.length];

      const cx2 = (p1.x + p2.x) / 2;
      const cy2 = (p1.y + p2.y) / 2;

      ctx.quadraticCurveTo(p1.x, p1.y, cx2, cy2);
    }

    ctx.closePath();

    if (fill) {
      ctx.fill();
    } else {
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draw text with optional distortion
   */
  drawText(text: string, x: number, y: number, options: DrawTextOptions = {}): void {
    const ctx = this.getCurrentContext();
    if (!ctx) return;

    const {
      distortion = 0,
      font = '16px sans-serif',
      color = '#000000',
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';

    if (distortion === 0) {
      ctx.fillText(text, x, y);
    } else {
      // Draw each character with slight random offset
      let currentX = x;
      for (const char of text) {
        const offsetX = (Math.random() - 0.5) * distortion * 4;
        const offsetY = (Math.random() - 0.5) * distortion * 4;
        const rotation = (Math.random() - 0.5) * distortion * 0.1;

        ctx.save();
        ctx.translate(currentX + offsetX, y + offsetY);
        ctx.rotate(rotation);
        ctx.fillText(char, 0, 0);
        ctx.restore();

        currentX += ctx.measureText(char).width;
      }
    }

    ctx.restore();
  }

  /**
   * Set the current drawing layer
   */
  setLayer(layer: Layer): void {
    this.currentLayer = layer;
  }

  /**
   * Register a frame callback for the animation loop
   */
  onFrame(callback: FrameCallback): void {
    this.frameCallbacks.add(callback);
  }

  /**
   * Remove a frame callback
   */
  offFrame(callback: FrameCallback): void {
    this.frameCallbacks.delete(callback);
  }

  /**
   * Set global effects (grain, chromatic aberration)
   */
  setEffects(effects: GlobalEffects): void {
    this.effects = { ...this.effects, ...effects };
  }

  /**
   * Apply global effects to the foreground layer
   */
  applyEffects(): void {
    const ctx = this.contexts.get('foreground');
    const canvas = this.canvases.get('foreground');
    if (!ctx || !canvas) return;

    if (this.effects.grain && this.effects.grain > 0) {
      applyGrain(ctx, this.width, this.height, this.effects.grain);
    }

    if (this.effects.chromaticAberration && this.effects.chromaticAberration > 0) {
      applyChromaticAberration(ctx, this.width, this.height, this.effects.chromaticAberration);
    }
  }

  // Private methods

  private getCurrentContext(): CanvasRenderingContext2D | null {
    return this.contexts.get(this.currentLayer) || null;
  }

  private updateCanvasSizes(): void {
    const dpr = this.config.pixelRatio;

    for (const [layer, canvas] of this.canvases) {
      canvas.width = this.config.width * dpr;
      canvas.height = this.config.height * dpr;
      canvas.style.width = `${this.config.width}px`;
      canvas.style.height = `${this.config.height}px`;

      const ctx = this.contexts.get(layer);
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    }
  }

  private setupResponsive(): void {
    if (!this.container) return;

    // Set initial size from container
    this.updateSizeFromContainer();

    // Watch for container resize
    this.resizeObserver = new ResizeObserver(() => {
      this.updateSizeFromContainer();
    });
    this.resizeObserver.observe(this.container);
  }

  private updateSizeFromContainer(): void {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    this.config.width = rect.width;
    this.config.height = rect.height;
    this.updateCanvasSizes();
  }

  private startAnimationLoop(): void {
    const loop = (timestamp: number) => {
      if (!this.mounted) return;

      const deltaTime = this.lastFrameTime ? timestamp - this.lastFrameTime : 0;
      this.lastFrameTime = timestamp;

      // Call all frame callbacks
      for (const callback of this.frameCallbacks) {
        try {
          callback(deltaTime);
        } catch (error) {
          console.error('Error in frame callback:', error);
        }
      }

      // Apply effects after drawing
      if (this.effects.grain || this.effects.chromaticAberration) {
        this.applyEffects();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  private stopAnimationLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastFrameTime = 0;
  }

  /**
   * Generate wobbly line points for sketchy effect
   */
  private wobbleLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    wobbleAmount: number
  ): Array<{ x: number; y: number }> {
    const segments = 5;
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Keep start and end points exact
      const wobble = i === 0 || i === segments ? 0 : wobbleAmount;
      const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobble;
      const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobble;
      points.push({ x, y });
    }

    return points;
  }

  /**
   * Generate organic blob points
   */
  private generateBlobPoints(
    centerX: number,
    centerY: number,
    radius: number,
    irregularity: number
  ): Array<{ x: number; y: number }> {
    const numPoints = 12;
    const points: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radiusVariation = 1 + (Math.random() - 0.5) * irregularity;
      const r = radius * radiusVariation;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      points.push({ x, y });
    }

    return points;
  }
}
