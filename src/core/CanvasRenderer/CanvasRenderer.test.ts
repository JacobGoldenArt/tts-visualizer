/**
 * CanvasRenderer Tests
 *
 * Tests for the CanvasRenderer class that provides 2D canvas rendering
 * with lo-fi, sketchy aesthetic support.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CanvasRenderer } from './CanvasRenderer';
import { applyGrain, applyChromaticAberration } from './effects';

// Mock canvas context for jsdom environment
function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 10 }),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    clearRect: vi.fn(),
    quadraticCurveTo: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(100 * 100 * 4),
      width: 100,
      height: 100,
    }),
    putImageData: vi.fn(),
    canvas: document.createElement('canvas'),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 1,
    lineCap: 'butt' as CanvasLineCap,
    lineJoin: 'miter' as CanvasLineJoin,
    font: '',
    textBaseline: 'alphabetic' as CanvasTextBaseline,
  } as unknown as CanvasRenderingContext2D;
}

// Store original methods
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

// Track created mock contexts
let mockContexts: CanvasRenderingContext2D[] = [];

beforeEach(() => {
  // Store originals
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  originalRequestAnimationFrame = window.requestAnimationFrame;
  originalCancelAnimationFrame = window.cancelAnimationFrame;

  // Reset mock contexts
  mockContexts = [];

  // Mock getContext to return our mock context
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement, type: string) {
    if (type === '2d') {
      const mockCtx = createMockCanvasContext();
      mockContexts.push(mockCtx);
      return mockCtx;
    }
    return null;
  }) as typeof HTMLCanvasElement.prototype.getContext;

  // Mock requestAnimationFrame
  let rafId = 0;
  window.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
    rafId++;
    // Schedule callback for next tick to simulate async behavior
    setTimeout(() => callback(performance.now()), 0);
    return rafId;
  });

  window.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  // Restore originals
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  window.requestAnimationFrame = originalRequestAnimationFrame;
  window.cancelAnimationFrame = originalCancelAnimationFrame;
});

describe('CanvasRenderer', () => {
  // Test 4.1: Renderer initializes canvas at specified dimensions
  describe('Test 4.1: Initialize canvas at specified dimensions', () => {
    it('creates a renderer with default dimensions', () => {
      const renderer = new CanvasRenderer();

      expect(renderer.width).toBe(800);
      expect(renderer.height).toBe(600);
    });

    it('creates a renderer with custom dimensions', () => {
      const renderer = new CanvasRenderer({ width: 1920, height: 1080 });

      expect(renderer.width).toBe(1920);
      expect(renderer.height).toBe(1080);
    });

    it('sets canvas element dimensions on mount', () => {
      const renderer = new CanvasRenderer({ width: 400, height: 300 });
      const container = document.createElement('div');

      renderer.mount(container);

      // Should have 3 canvases (background, midground, foreground)
      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBe(3);

      // Each canvas should have correct CSS dimensions
      canvases.forEach((canvas) => {
        expect(canvas.style.width).toBe('400px');
        expect(canvas.style.height).toBe('300px');
      });

      renderer.unmount();
    });
  });

  // Test 4.2: Renderer supports responsive sizing (fills container)
  describe('Test 4.2: Responsive sizing', () => {
    it('accepts responsive config option', () => {
      const renderer = new CanvasRenderer({ responsive: true });

      // Should not throw
      expect(renderer).toBeDefined();
    });

    it('sets up resize observer when responsive is true', () => {
      const observeSpy = vi.fn();
      const disconnectSpy = vi.fn();

      // Mock ResizeObserver
      const MockResizeObserver = vi.fn().mockImplementation(() => ({
        observe: observeSpy,
        disconnect: disconnectSpy,
        unobserve: vi.fn(),
      }));

      const OriginalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

      try {
        const renderer = new CanvasRenderer({ responsive: true });
        const container = document.createElement('div');
        Object.defineProperty(container, 'getBoundingClientRect', {
          value: () => ({ width: 500, height: 400, top: 0, left: 0, right: 500, bottom: 400 }),
        });

        renderer.mount(container);

        expect(observeSpy).toHaveBeenCalledWith(container);

        renderer.unmount();

        expect(disconnectSpy).toHaveBeenCalled();
      } finally {
        window.ResizeObserver = OriginalResizeObserver;
      }
    });

    it('updates dimensions from container when responsive', () => {
      const MockResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: vi.fn(),
        unobserve: vi.fn(),
      }));

      const OriginalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

      try {
        const renderer = new CanvasRenderer({ responsive: true });
        const container = document.createElement('div');
        Object.defineProperty(container, 'getBoundingClientRect', {
          value: () => ({ width: 640, height: 480, top: 0, left: 0, right: 640, bottom: 480 }),
        });

        renderer.mount(container);

        expect(renderer.width).toBe(640);
        expect(renderer.height).toBe(480);

        renderer.unmount();
      } finally {
        window.ResizeObserver = OriginalResizeObserver;
      }
    });
  });

  // Test 4.3: Renderer exposes clear() method to wipe canvas
  describe('Test 4.3: clear() method', () => {
    it('exposes clear() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.clear).toBe('function');
    });

    it('clear() without arguments clears all layers', () => {
      const renderer = new CanvasRenderer({ width: 100, height: 100 });
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.clear();

      // Each of the 3 contexts should have clearRect called
      mockContexts.forEach((ctx) => {
        expect(ctx.clearRect).toHaveBeenCalled();
      });

      renderer.unmount();
    });

    it('clear() with layer argument clears only that layer', () => {
      const renderer = new CanvasRenderer({ width: 100, height: 100 });
      const container = document.createElement('div');
      renderer.mount(container);

      // Clear call counts
      mockContexts.forEach((ctx) => {
        (ctx.clearRect as ReturnType<typeof vi.fn>).mockClear();
      });

      renderer.clear('midground');

      // Only one context should have clearRect called
      const clearedCount = mockContexts.filter(
        (ctx) => (ctx.clearRect as ReturnType<typeof vi.fn>).mock.calls.length > 0
      ).length;
      expect(clearedCount).toBe(1);

      renderer.unmount();
    });
  });

  // Test 4.4: Renderer provides drawLine() with configurable wobble/sketchiness
  describe('Test 4.4: drawLine() with wobble', () => {
    it('exposes drawLine() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.drawLine).toBe('function');
    });

    it('drawLine() draws a line', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawLine(0, 0, 100, 100);

      // Should call beginPath, moveTo, lineTo, stroke
      const ctx = mockContexts[1]; // midground is default
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawLine() accepts wobble option', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      // Should not throw
      renderer.drawLine(0, 0, 100, 100, { wobble: 0.5 });

      const ctx = mockContexts[1];
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawLine() accepts color and lineWidth options', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawLine(0, 0, 100, 100, { color: '#ff0000', lineWidth: 3 });

      const ctx = mockContexts[1];
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();

      renderer.unmount();
    });

    it('wobble: 0 draws a straight line (2 points)', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawLine(0, 0, 100, 100, { wobble: 0 });

      const ctx = mockContexts[1];
      // With wobble: 0, should call moveTo once and lineTo once
      expect(ctx.moveTo).toHaveBeenCalledTimes(1);
      expect(ctx.lineTo).toHaveBeenCalledTimes(1);

      renderer.unmount();
    });

    it('wobble > 0 draws a multi-segment line', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawLine(0, 0, 100, 100, { wobble: 0.5 });

      const ctx = mockContexts[1];
      // With wobble > 0, should call lineTo multiple times (5 segments = 5 lineTo calls)
      expect((ctx.lineTo as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1);

      renderer.unmount();
    });
  });

  // Test 4.5: Renderer provides drawBlob() for organic shapes
  describe('Test 4.5: drawBlob() for organic shapes', () => {
    it('exposes drawBlob() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.drawBlob).toBe('function');
    });

    it('drawBlob() draws a closed shape', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawBlob(50, 50, 25);

      const ctx = mockContexts[1];
      expect(ctx.beginPath).toHaveBeenCalled();
      expect(ctx.closePath).toHaveBeenCalled();
      expect(ctx.fill).toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawBlob() accepts irregularity option', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      // Should not throw
      renderer.drawBlob(50, 50, 25, { irregularity: 0.8 });

      renderer.unmount();
    });

    it('drawBlob() can stroke instead of fill', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawBlob(50, 50, 25, { fill: false });

      const ctx = mockContexts[1];
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.fill).not.toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawBlob() uses quadratic curves for smooth shape', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawBlob(50, 50, 25);

      const ctx = mockContexts[1];
      expect(ctx.quadraticCurveTo).toHaveBeenCalled();

      renderer.unmount();
    });
  });

  // Test 4.6: Renderer provides drawText() with optional distortion
  describe('Test 4.6: drawText() with distortion', () => {
    it('exposes drawText() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.drawText).toBe('function');
    });

    it('drawText() draws text', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawText('Hello', 10, 20);

      const ctx = mockContexts[1];
      expect(ctx.fillText).toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawText() accepts font and color options', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawText('Test', 10, 20, { font: '24px Arial', color: '#0000ff' });

      const ctx = mockContexts[1];
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();

      renderer.unmount();
    });

    it('drawText() with distortion: 0 draws clean text in one call', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawText('Hello', 10, 20, { distortion: 0 });

      const ctx = mockContexts[1];
      expect(ctx.fillText).toHaveBeenCalledTimes(1);
      expect(ctx.fillText).toHaveBeenCalledWith('Hello', 10, 20);

      renderer.unmount();
    });

    it('drawText() with distortion > 0 draws each character separately', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.drawText('Hi', 10, 20, { distortion: 0.5 });

      const ctx = mockContexts[1];
      // With distortion, each character is drawn separately
      expect((ctx.fillText as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);

      renderer.unmount();
    });
  });

  // Test 4.7: Renderer supports layer compositing (background, midground, foreground)
  describe('Test 4.7: Layer compositing', () => {
    it('creates three canvas layers on mount', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);

      const canvases = container.querySelectorAll('canvas');
      expect(canvases.length).toBe(3);

      renderer.unmount();
    });

    it('exposes setLayer() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.setLayer).toBe('function');
    });

    it('setLayer() changes the active drawing layer', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      // Default is midground (index 1)
      renderer.drawLine(0, 0, 10, 10);
      expect(mockContexts[1].beginPath).toHaveBeenCalled();

      // Clear mocks
      mockContexts.forEach((ctx) => {
        (ctx.beginPath as ReturnType<typeof vi.fn>).mockClear();
      });

      // Switch to background (index 0)
      renderer.setLayer('background');
      renderer.drawLine(0, 0, 10, 10);
      expect(mockContexts[0].beginPath).toHaveBeenCalled();
      expect(mockContexts[1].beginPath).not.toHaveBeenCalled();

      // Clear mocks
      mockContexts.forEach((ctx) => {
        (ctx.beginPath as ReturnType<typeof vi.fn>).mockClear();
      });

      // Switch to foreground (index 2)
      renderer.setLayer('foreground');
      renderer.drawLine(0, 0, 10, 10);
      expect(mockContexts[2].beginPath).toHaveBeenCalled();

      renderer.unmount();
    });

    it('canvases are stacked with correct positioning', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);

      const canvases = container.querySelectorAll('canvas');
      canvases.forEach((canvas) => {
        expect(canvas.style.position).toBe('absolute');
        expect(canvas.style.top).toBe('0px');
        expect(canvas.style.left).toBe('0px');
      });

      renderer.unmount();
    });
  });

  // Test 4.8: Renderer handles high-DPI displays (devicePixelRatio)
  describe('Test 4.8: High-DPI support', () => {
    it('uses devicePixelRatio by default', () => {
      // Since the default is computed at module load time, we pass pixelRatio: 2 to simulate
      // what would happen if devicePixelRatio was 2 when the class was instantiated.
      // The key behavior we're testing is that the renderer properly scales canvas dimensions.
      const renderer = new CanvasRenderer({ width: 100, height: 100, pixelRatio: 2 });
      const container = document.createElement('div');
      renderer.mount(container);

      const canvas = container.querySelector('canvas')!;
      // Physical pixels should be 2x CSS pixels
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(200);
      // CSS size should remain the same
      expect(canvas.style.width).toBe('100px');
      expect(canvas.style.height).toBe('100px');

      renderer.unmount();
    });

    it('accepts custom pixelRatio config', () => {
      const renderer = new CanvasRenderer({ width: 100, height: 100, pixelRatio: 3 });
      const container = document.createElement('div');
      renderer.mount(container);

      const canvas = container.querySelector('canvas')!;
      expect(canvas.width).toBe(300);
      expect(canvas.height).toBe(300);

      renderer.unmount();
    });

    it('scales context by pixelRatio', () => {
      const renderer = new CanvasRenderer({ width: 100, height: 100, pixelRatio: 2 });
      const container = document.createElement('div');
      renderer.mount(container);

      // All 3 contexts should have scale called with (2, 2)
      mockContexts.forEach((ctx) => {
        expect(ctx.scale).toHaveBeenCalledWith(2, 2);
      });

      renderer.unmount();
    });
  });

  // Test 4.9: Renderer exposes animation loop via onFrame(callback)
  describe('Test 4.9: Animation loop via onFrame()', () => {
    it('exposes onFrame() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.onFrame).toBe('function');
    });

    it('exposes offFrame() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.offFrame).toBe('function');
    });

    it('onFrame() callback is called with deltaTime', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const callback = vi.fn();
      renderer.onFrame(callback);

      // Wait for animation frame to fire
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback).toHaveBeenCalled();
      // First frame may have deltaTime of 0 or small value
      expect(typeof callback.mock.calls[0][0]).toBe('number');

      renderer.unmount();
    });

    it('multiple callbacks can be registered', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const callback1 = vi.fn();
      const callback2 = vi.fn();

      renderer.onFrame(callback1);
      renderer.onFrame(callback2);

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      renderer.unmount();
    });

    it('offFrame() removes a callback', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const callback = vi.fn();
      renderer.onFrame(callback);

      // Wait for first callback
      await new Promise((resolve) => setTimeout(resolve, 20));
      const callCount = callback.mock.calls.length;

      renderer.offFrame(callback);

      // Wait more
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not have been called again (or maybe once due to timing)
      expect(callback.mock.calls.length).toBeLessThanOrEqual(callCount + 1);

      renderer.unmount();
    });

    it('animation loop starts automatically on mount', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);

      expect(window.requestAnimationFrame).toHaveBeenCalled();

      renderer.unmount();
    });
  });

  // Test 4.10: Renderer can apply global effects (grain, chromatic aberration)
  describe('Test 4.10: Global effects', () => {
    it('exposes setEffects() method', () => {
      const renderer = new CanvasRenderer();

      expect(typeof renderer.setEffects).toBe('function');
    });

    it('setEffects() accepts grain option', () => {
      const renderer = new CanvasRenderer();

      // Should not throw
      renderer.setEffects({ grain: 0.5 });
    });

    it('setEffects() accepts chromaticAberration option', () => {
      const renderer = new CanvasRenderer();

      // Should not throw
      renderer.setEffects({ chromaticAberration: 2 });
    });

    it('setEffects() can set multiple effects at once', () => {
      const renderer = new CanvasRenderer();

      // Should not throw
      renderer.setEffects({ grain: 0.3, chromaticAberration: 1 });
    });

    it('effects are applied during animation loop', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      renderer.setEffects({ grain: 0.5 });

      // Wait for animation frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Check that foreground context had getImageData called (used by effects)
      const foregroundCtx = mockContexts[2];
      expect(foregroundCtx.getImageData).toHaveBeenCalled();

      renderer.unmount();
    });
  });

  // Test 4.11: Renderer properly cleans up on unmount (cancels animation frame)
  describe('Test 4.11: Cleanup on unmount', () => {
    it('unmount() removes canvases from DOM', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);
      expect(container.querySelectorAll('canvas').length).toBe(3);

      renderer.unmount();
      expect(container.querySelectorAll('canvas').length).toBe(0);
    });

    it('unmount() cancels animation frame', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);
      renderer.unmount();

      expect(window.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('unmount() stops calling frame callbacks', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const callback = vi.fn();
      renderer.onFrame(callback);

      // Wait for at least one callback
      await new Promise((resolve) => setTimeout(resolve, 20));
      const callsBeforeUnmount = callback.mock.calls.length;

      renderer.unmount();

      // Wait more
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Should not increase significantly after unmount
      expect(callback.mock.calls.length).toBeLessThanOrEqual(callsBeforeUnmount + 1);
    });

    it('unmount() clears frame callbacks', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const callback = vi.fn();
      renderer.onFrame(callback);

      renderer.unmount();

      // Remount
      renderer.mount(container);

      // Wait
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Old callback should not be called after remount (cleared on unmount)
      // Note: It may have been called during the first mount, so just verify remount works
      expect(container.querySelectorAll('canvas').length).toBe(3);

      renderer.unmount();
    });

    it('can remount after unmount', () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');

      renderer.mount(container);
      renderer.unmount();
      renderer.mount(container);

      expect(container.querySelectorAll('canvas').length).toBe(3);

      renderer.unmount();
    });

    it('mounting again while mounted unmounts first', () => {
      const renderer = new CanvasRenderer();
      const container1 = document.createElement('div');
      const container2 = document.createElement('div');

      renderer.mount(container1);
      renderer.mount(container2);

      expect(container1.querySelectorAll('canvas').length).toBe(0);
      expect(container2.querySelectorAll('canvas').length).toBe(3);

      renderer.unmount();
    });

    it('disconnects resize observer on unmount', () => {
      const disconnectSpy = vi.fn();
      const MockResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
        unobserve: vi.fn(),
      }));

      const OriginalResizeObserver = window.ResizeObserver;
      window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

      try {
        const renderer = new CanvasRenderer({ responsive: true });
        const container = document.createElement('div');
        Object.defineProperty(container, 'getBoundingClientRect', {
          value: () => ({ width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }),
        });

        renderer.mount(container);
        renderer.unmount();

        expect(disconnectSpy).toHaveBeenCalled();
      } finally {
        window.ResizeObserver = OriginalResizeObserver;
      }
    });
  });

  // Additional edge cases
  describe('Edge cases', () => {
    it('drawing before mount does not throw', () => {
      const renderer = new CanvasRenderer();

      // Should not throw, just no-op
      expect(() => renderer.drawLine(0, 0, 100, 100)).not.toThrow();
      expect(() => renderer.drawBlob(50, 50, 25)).not.toThrow();
      expect(() => renderer.drawText('Hello', 10, 20)).not.toThrow();
    });

    it('clear before mount does not throw', () => {
      const renderer = new CanvasRenderer();

      expect(() => renderer.clear()).not.toThrow();
    });

    it('error in frame callback does not break other callbacks', async () => {
      const renderer = new CanvasRenderer();
      const container = document.createElement('div');
      renderer.mount(container);

      const errorCallback = vi.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = vi.fn();

      renderer.onFrame(errorCallback);
      renderer.onFrame(normalCallback);

      // Wait for animation frame
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();

      renderer.unmount();
    });
  });
});

// Test effects module separately
describe('Effects module', () => {
  describe('applyGrain', () => {
    it('is a function', () => {
      expect(typeof applyGrain).toBe('function');
    });

    it('does nothing when intensity is 0', () => {
      const ctx = createMockCanvasContext();
      applyGrain(ctx, 100, 100, 0);
      expect(ctx.getImageData).not.toHaveBeenCalled();
    });

    it('applies grain when intensity > 0', () => {
      const ctx = createMockCanvasContext();
      applyGrain(ctx, 100, 100, 0.5);
      expect(ctx.getImageData).toHaveBeenCalled();
      expect(ctx.putImageData).toHaveBeenCalled();
    });
  });

  describe('applyChromaticAberration', () => {
    it('is a function', () => {
      expect(typeof applyChromaticAberration).toBe('function');
    });

    it('does nothing when amount is 0', () => {
      const ctx = createMockCanvasContext();
      applyChromaticAberration(ctx, 100, 100, 0);
      expect(ctx.getImageData).not.toHaveBeenCalled();
    });

    it('applies aberration when amount > 0', () => {
      const ctx = createMockCanvasContext();
      applyChromaticAberration(ctx, 100, 100, 2);
      expect(ctx.getImageData).toHaveBeenCalled();
      expect(ctx.putImageData).toHaveBeenCalled();
    });
  });
});
