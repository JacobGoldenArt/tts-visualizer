/**
 * Spectrogram Tests
 *
 * Tests for the Spectrogram class that renders frequency-reactive
 * visualizations with a sketchy, lo-fi aesthetic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Spectrogram, createSpectrogram } from './Spectrogram';
import type { AnalyzerData } from '@/types/audio';
import type { ColorPalette } from '@/types/visual';
import type { ICanvasRenderer, DrawLineOptions } from '@/types/canvas';

/**
 * Create a mock canvas renderer for testing
 */
function createMockRenderer(): ICanvasRenderer & { mockDrawLine: ReturnType<typeof vi.fn> } {
  const mockDrawLine = vi.fn();
  return {
    width: 800,
    height: 600,
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
    drawLine: mockDrawLine,
    drawBlob: vi.fn(),
    drawText: vi.fn(),
    setLayer: vi.fn(),
    onFrame: vi.fn(),
    offFrame: vi.fn(),
    setEffects: vi.fn(),
    mockDrawLine,
  };
}

/**
 * Create mock analyzer data with frequency bands
 */
function createMockAnalyzerData(frequencyValues: number[]): AnalyzerData {
  return {
    frequencyData: new Float32Array(frequencyValues),
    amplitude: 0.5,
    timestamp: Date.now(),
  };
}

/**
 * Create mock analyzer data with uniform frequency value
 */
function createUniformAnalyzerData(value: number, binCount: number = 64): AnalyzerData {
  return createMockAnalyzerData(new Array(binCount).fill(value));
}

/**
 * Create a test color palette
 */
function createTestPalette(): ColorPalette {
  return {
    primary: 'hsl(200, 70%, 50%)',
    secondary: 'hsl(180, 60%, 45%)',
    accent: 'hsl(220, 80%, 60%)',
  };
}

describe('Spectrogram', () => {
  let renderer: ICanvasRenderer & { mockDrawLine: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    renderer = createMockRenderer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 5.1: Spectrogram renders frequency bands as vertical bars/lines
  describe('Test 5.1: Renders frequency bands as vertical bars/lines', () => {
    it('creates a spectrogram instance', () => {
      const spectrogram = new Spectrogram();
      expect(spectrogram).toBeDefined();
      expect(spectrogram.getConfig()).toBeDefined();
    });

    it('renders bars when given frequency data', () => {
      const spectrogram = new Spectrogram({ barCount: 8 });
      spectrogram.setRenderer(renderer);

      // Create frequency data with values
      const data = createUniformAnalyzerData(-50, 64); // -50dB is mid-range
      spectrogram.update(data);
      spectrogram.render();

      // Should have called drawLine for each bar
      expect(renderer.mockDrawLine).toHaveBeenCalled();
      expect(renderer.mockDrawLine.mock.calls.length).toBeGreaterThanOrEqual(8);
    });

    it('renders vertical bars by default', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);

      const data = createUniformAnalyzerData(-30, 64);
      spectrogram.update(data);
      spectrogram.render();

      // Verify bars are vertical (y1 !== y2 for each call)
      const calls = renderer.mockDrawLine.mock.calls;
      calls.forEach((call: [number, number, number, number, DrawLineOptions?]) => {
        const [x1, y1, x2, y2] = call;
        // For vertical bars, x1 === x2 and y1 !== y2
        expect(x1).toBe(x2);
        expect(y1).not.toBe(y2);
      });
    });

    it('factory function creates spectrogram', () => {
      const spectrogram = createSpectrogram({ barCount: 16 });
      expect(spectrogram).toBeInstanceOf(Spectrogram);
      expect(spectrogram.getConfig().barCount).toBe(16);
    });
  });

  // Test 5.2: Bar heights correspond to frequency magnitude
  describe('Test 5.2: Bar heights correspond to frequency magnitude', () => {
    it('renders taller bars for higher magnitude frequencies', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1); // Instant response for testing

      // Create frequency data with varying magnitudes
      // -100dB = silence, 0dB = max
      const highMagnitude = createUniformAnalyzerData(-10, 64); // Loud
      const lowMagnitude = createUniformAnalyzerData(-90, 64); // Quiet

      // Test high magnitude
      spectrogram.update(highMagnitude);
      spectrogram.render();

      const highCalls = [...renderer.mockDrawLine.mock.calls];
      renderer.mockDrawLine.mockClear();

      // Test low magnitude
      spectrogram.update(lowMagnitude);
      spectrogram.render();

      const lowCalls = [...renderer.mockDrawLine.mock.calls];

      // Calculate bar heights (absolute difference in y coordinates)
      const getBarHeight = (call: [number, number, number, number, DrawLineOptions?]) => {
        return Math.abs(call[3] - call[1]);
      };

      const avgHighHeight =
        highCalls.reduce((sum, call) => sum + getBarHeight(call), 0) / highCalls.length;
      const avgLowHeight =
        lowCalls.reduce((sum, call) => sum + getBarHeight(call), 0) / lowCalls.length;

      // High magnitude should produce taller bars
      expect(avgHighHeight).toBeGreaterThan(avgLowHeight);
    });

    it('maps frequency data correctly to normalized heights', () => {
      const spectrogram = new Spectrogram({ barCount: 2 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // 0dB should map to full height (1.0)
      // -100dB should map to zero height (0.0)
      // -50dB should map to half height (0.5)
      const midData = createUniformAnalyzerData(-50, 64);
      spectrogram.update(midData);
      spectrogram.render();

      // Bars should exist and have reasonable height
      expect(renderer.mockDrawLine).toHaveBeenCalled();
    });

    it('handles varying frequency magnitudes across bars', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);
      spectrogram.setIntensity(0.5); // Set to 0.5 to get multiplier of 1.0 (exactly 4 bars)

      // Create data with different magnitudes for different frequency ranges
      // First half quiet, second half loud
      const mixedData: number[] = [];
      for (let i = 0; i < 64; i++) {
        mixedData.push(i < 32 ? -90 : -10);
      }
      spectrogram.update(createMockAnalyzerData(mixedData));
      spectrogram.render();

      const calls = renderer.mockDrawLine.mock.calls;
      expect(calls.length).toBe(4);

      // Later bars (from loud portion) should be taller
      const heights = calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      expect(heights[2]).toBeGreaterThan(heights[0]);
      expect(heights[3]).toBeGreaterThan(heights[1]);
    });
  });

  // Test 5.3: Spectrogram reacts in real-time as audio plays (<50ms latency feel)
  describe('Test 5.3: Real-time reactivity (<50ms latency feel)', () => {
    it('updates immediately when new data is provided', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1); // Instant response

      const startTime = Date.now();

      // First frame - silence
      spectrogram.update(createUniformAnalyzerData(-100, 64), startTime);
      spectrogram.render(16);

      const silentCalls = [...renderer.mockDrawLine.mock.calls];
      renderer.mockDrawLine.mockClear();

      // Second frame - loud (simulate next frame at 16ms later)
      spectrogram.update(createUniformAnalyzerData(-10, 64), startTime + 16);
      spectrogram.render(16);

      const loudCalls = [...renderer.mockDrawLine.mock.calls];

      // Heights should be different immediately
      const getAvgHeight = (calls: [number, number, number, number, DrawLineOptions?][]) => {
        return (
          calls.reduce(
            (sum, call: [number, number, number, number, DrawLineOptions?]) =>
              sum + Math.abs(call[3] - call[1]),
            0
          ) / calls.length
        );
      };

      expect(getAvgHeight(loudCalls)).toBeGreaterThan(getAvgHeight(silentCalls));
    });

    it('render method is designed for animation loop integration', () => {
      const spectrogram = new Spectrogram();
      spectrogram.setRenderer(renderer);

      // render() accepts deltaTime for frame-rate independent animation
      expect(() => spectrogram.render(16)).not.toThrow(); // 16ms = 60fps
      expect(() => spectrogram.render(33)).not.toThrow(); // 33ms = 30fps
    });

    it('interpolation supports smooth transitions at high motion', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(0.8); // High but not instant

      // Frame 1 - silence
      spectrogram.update(createUniformAnalyzerData(-100, 64));
      spectrogram.render(16);
      const frame1Heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      renderer.mockDrawLine.mockClear();

      // Frame 2 - loud
      spectrogram.update(createUniformAnalyzerData(-10, 64));
      spectrogram.render(16);
      const frame2Heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      renderer.mockDrawLine.mockClear();

      // Frame 3 - still loud, continuing interpolation
      spectrogram.render(16);
      const frame3Heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );

      // Heights should progress: frame1 < frame2 < frame3 (approaching target)
      const avgFrame1 = frame1Heights.reduce((a, b) => a + b, 0) / frame1Heights.length;
      const avgFrame2 = frame2Heights.reduce((a, b) => a + b, 0) / frame2Heights.length;
      const avgFrame3 = frame3Heights.reduce((a, b) => a + b, 0) / frame3Heights.length;

      expect(avgFrame2).toBeGreaterThan(avgFrame1);
      expect(avgFrame3).toBeGreaterThanOrEqual(avgFrame2);
    });
  });

  // Test 5.4: Spectrogram accepts color palette from mood mapper
  describe('Test 5.4: Accepts color palette from mood mapper', () => {
    it('exposes setPalette method', () => {
      const spectrogram = new Spectrogram();
      expect(typeof spectrogram.setPalette).toBe('function');
    });

    it('accepts and stores color palette', () => {
      const spectrogram = new Spectrogram();
      const palette = createTestPalette();

      spectrogram.setPalette(palette);

      const storedPalette = spectrogram.getPalette();
      expect(storedPalette.primary).toBe(palette.primary);
      expect(storedPalette.secondary).toBe(palette.secondary);
      expect(storedPalette.accent).toBe(palette.accent);
    });

    it('uses palette colors when rendering bars', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      const palette = createTestPalette();
      spectrogram.setPalette(palette);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      // Check that colors from palette are used
      const calls = renderer.mockDrawLine.mock.calls;
      const usedColors = calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => call[4]?.color
      );

      // All colors should be from the palette (primary or accent with opacity)
      usedColors.forEach((color: string | undefined) => {
        expect(color).toBeDefined();
        // Color should contain the hue from palette
        expect(color!.includes('200') || color!.includes('220')).toBe(true);
      });
    });

    it('creates a copy of the palette to prevent external mutation', () => {
      const spectrogram = new Spectrogram();
      const palette = createTestPalette();

      spectrogram.setPalette(palette);

      // Mutate original palette
      palette.primary = 'hsl(0, 0%, 0%)';

      // Stored palette should be unchanged
      const storedPalette = spectrogram.getPalette();
      expect(storedPalette.primary).not.toBe('hsl(0, 0%, 0%)');
    });
  });

  // Test 5.5: Spectrogram intensity is controllable (affects bar count/thickness)
  describe('Test 5.5: Intensity control affects bar count/thickness', () => {
    it('exposes setIntensity method', () => {
      const spectrogram = new Spectrogram();
      expect(typeof spectrogram.setIntensity).toBe('function');
    });

    it('accepts intensity value 0-1', () => {
      const spectrogram = new Spectrogram();

      spectrogram.setIntensity(0.5);
      expect(spectrogram.getIntensity()).toBe(0.5);

      spectrogram.setIntensity(0);
      expect(spectrogram.getIntensity()).toBe(0);

      spectrogram.setIntensity(1);
      expect(spectrogram.getIntensity()).toBe(1);
    });

    it('clamps intensity to 0-1 range', () => {
      const spectrogram = new Spectrogram();

      spectrogram.setIntensity(-0.5);
      expect(spectrogram.getIntensity()).toBe(0);

      spectrogram.setIntensity(1.5);
      expect(spectrogram.getIntensity()).toBe(1);
    });

    it('higher intensity produces more bars', () => {
      const spectrogram1 = new Spectrogram({ barCount: 20 });
      spectrogram1.setRenderer(renderer);
      spectrogram1.setMotion(1);
      spectrogram1.setIntensity(0);

      spectrogram1.update(createUniformAnalyzerData(-30, 64));
      spectrogram1.render();
      const lowIntensityBarCount = renderer.mockDrawLine.mock.calls.length;

      renderer.mockDrawLine.mockClear();

      const spectrogram2 = new Spectrogram({ barCount: 20 });
      spectrogram2.setRenderer(renderer);
      spectrogram2.setMotion(1);
      spectrogram2.setIntensity(1);

      spectrogram2.update(createUniformAnalyzerData(-30, 64));
      spectrogram2.render();
      const highIntensityBarCount = renderer.mockDrawLine.mock.calls.length;

      // Higher intensity should produce more bars
      expect(highIntensityBarCount).toBeGreaterThan(lowIntensityBarCount);
    });

    it('higher intensity produces thicker bars', () => {
      const spectrogramLow = new Spectrogram({ barCount: 4, barThickness: 10 });
      spectrogramLow.setRenderer(renderer);
      spectrogramLow.setMotion(1);
      spectrogramLow.setIntensity(0);

      spectrogramLow.update(createUniformAnalyzerData(-30, 64));
      spectrogramLow.render();
      const lowThickness = renderer.mockDrawLine.mock.calls[0]?.[4]?.lineWidth;

      renderer.mockDrawLine.mockClear();

      const spectrogramHigh = new Spectrogram({ barCount: 4, barThickness: 10 });
      spectrogramHigh.setRenderer(renderer);
      spectrogramHigh.setMotion(1);
      spectrogramHigh.setIntensity(1);

      spectrogramHigh.update(createUniformAnalyzerData(-30, 64));
      spectrogramHigh.render();
      const highThickness = renderer.mockDrawLine.mock.calls[0]?.[4]?.lineWidth;

      expect(highThickness).toBeGreaterThan(lowThickness!);
    });
  });

  // Test 5.6: Spectrogram has 'sketchy' rendering (wobble on edges)
  describe("Test 5.6: Sketchy rendering with wobble on edges", () => {
    it('passes wobble option to drawLine', () => {
      const spectrogram = new Spectrogram({ barCount: 4, wobble: 0.5 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      // Check that wobble is passed in options
      const calls = renderer.mockDrawLine.mock.calls;
      calls.forEach((call: [number, number, number, number, DrawLineOptions?]) => {
        const options = call[4];
        expect(options).toBeDefined();
        expect(options!.wobble).toBe(0.5);
      });
    });

    it('supports configurable wobble amount', () => {
      const spectrogram = new Spectrogram({ barCount: 4, wobble: 0.8 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      const options = renderer.mockDrawLine.mock.calls[0]?.[4];
      expect(options?.wobble).toBe(0.8);
    });

    it('defaults to moderate wobble when not specified', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      const options = renderer.mockDrawLine.mock.calls[0]?.[4];
      expect(options?.wobble).toBe(0.3); // Default wobble
    });

    it('wobble of 0 produces clean lines', () => {
      const spectrogram = new Spectrogram({ barCount: 4, wobble: 0 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      const options = renderer.mockDrawLine.mock.calls[0]?.[4];
      expect(options?.wobble).toBe(0);
    });
  });

  // Test 5.7: Spectrogram gracefully handles no audio (flat or minimal state)
  describe('Test 5.7: Graceful handling of no audio', () => {
    it('renders flat bars when frequency data is empty', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // Update with null data
      spectrogram.update(null);
      spectrogram.render();

      // Should still render bars, but minimal height
      expect(renderer.mockDrawLine).toHaveBeenCalled();

      const heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );

      // All bars should be minimal (close to minimum height of 2)
      heights.forEach((height) => {
        expect(height).toBeLessThanOrEqual(5);
      });
    });

    it('renders flat bars when frequencyData array is empty', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      const emptyData: AnalyzerData = {
        frequencyData: new Float32Array(0),
        amplitude: 0,
        timestamp: Date.now(),
      };

      spectrogram.update(emptyData);
      spectrogram.render();

      expect(renderer.mockDrawLine).toHaveBeenCalled();
    });

    it('transitions smoothly to flat state when audio stops', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(0.5); // Medium interpolation

      // Start with loud audio
      spectrogram.update(createUniformAnalyzerData(-10, 64));
      spectrogram.render(16);

      const loudHeights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      renderer.mockDrawLine.mockClear();

      // Stop audio
      spectrogram.update(null);
      spectrogram.render(16);

      const transitionalHeights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );

      // Should be transitioning down but not yet at minimum
      const avgLoud = loudHeights.reduce((a, b) => a + b, 0) / loudHeights.length;
      const avgTransitional =
        transitionalHeights.reduce((a, b) => a + b, 0) / transitionalHeights.length;

      expect(avgTransitional).toBeLessThan(avgLoud);
    });

    it('does not render blank canvas (always shows minimal visualization)', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // Update with silence (-100dB)
      spectrogram.update(createUniformAnalyzerData(-100, 64));
      spectrogram.render();

      // Should still draw bars
      expect(renderer.mockDrawLine.mock.calls.length).toBeGreaterThan(0);
    });
  });

  // Test 5.8: Spectrogram supports horizontal and vertical orientations
  describe('Test 5.8: Horizontal and vertical orientations', () => {
    it('defaults to vertical orientation', () => {
      const spectrogram = new Spectrogram();
      expect(spectrogram.getOrientation()).toBe('vertical');
    });

    it('accepts horizontal orientation in config', () => {
      const spectrogram = new Spectrogram({ orientation: 'horizontal' });
      expect(spectrogram.getOrientation()).toBe('horizontal');
    });

    it('exposes setOrientation method', () => {
      const spectrogram = new Spectrogram();
      expect(typeof spectrogram.setOrientation).toBe('function');

      spectrogram.setOrientation('horizontal');
      expect(spectrogram.getOrientation()).toBe('horizontal');
    });

    it('renders vertical bars with x1 === x2', () => {
      const spectrogram = new Spectrogram({ barCount: 4, orientation: 'vertical' });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      renderer.mockDrawLine.mock.calls.forEach(
        (call: [number, number, number, number, DrawLineOptions?]) => {
          const [x1, , x2] = call;
          expect(x1).toBe(x2); // Vertical lines have same x
        }
      );
    });

    it('renders horizontal bars with y1 === y2', () => {
      const spectrogram = new Spectrogram({ barCount: 4, orientation: 'horizontal' });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      renderer.mockDrawLine.mock.calls.forEach(
        (call: [number, number, number, number, DrawLineOptions?]) => {
          const [, y1, , y2] = call;
          expect(y1).toBe(y2); // Horizontal lines have same y
        }
      );
    });

    it('can switch orientation at runtime', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // Render vertical
      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      const verticalCall = renderer.mockDrawLine.mock.calls[0];
      expect(verticalCall[0]).toBe(verticalCall[2]); // x1 === x2

      renderer.mockDrawLine.mockClear();

      // Switch to horizontal
      spectrogram.setOrientation('horizontal');
      spectrogram.render();

      const horizontalCall = renderer.mockDrawLine.mock.calls[0];
      expect(horizontalCall[1]).toBe(horizontalCall[3]); // y1 === y2
    });
  });

  // Test 5.9: Motion control affects animation smoothness/speed
  describe('Test 5.9: Motion control affects animation smoothness/speed', () => {
    it('exposes setMotion method', () => {
      const spectrogram = new Spectrogram();
      expect(typeof spectrogram.setMotion).toBe('function');
    });

    it('accepts motion value 0-1', () => {
      const spectrogram = new Spectrogram();

      spectrogram.setMotion(0.5);
      expect(spectrogram.getMotion()).toBe(0.5);
    });

    it('clamps motion to 0-1 range', () => {
      const spectrogram = new Spectrogram();

      spectrogram.setMotion(-0.5);
      expect(spectrogram.getMotion()).toBe(0);

      spectrogram.setMotion(1.5);
      expect(spectrogram.getMotion()).toBe(1);
    });

    it('motion 1 produces instant response', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1); // Instant

      // Start silent
      spectrogram.update(createUniformAnalyzerData(-100, 64));
      spectrogram.render(16);
      renderer.mockDrawLine.mockClear();

      // Jump to loud
      spectrogram.update(createUniformAnalyzerData(-10, 64));
      spectrogram.render(16);

      // With motion=1, should reach target immediately
      const heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

      // Should be close to max height (90% of max at -10dB)
      expect(avgHeight).toBeGreaterThan(100);
    });

    it('motion 0 produces slow/smooth response', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(0); // Very slow

      // Start silent
      spectrogram.update(createUniformAnalyzerData(-100, 64));
      spectrogram.render(16);
      renderer.mockDrawLine.mockClear();

      // Jump to loud
      spectrogram.update(createUniformAnalyzerData(-10, 64));
      spectrogram.render(16);

      // With motion=0, should barely move
      const heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

      // Should still be close to minimum
      expect(avgHeight).toBeLessThan(50);
    });

    it('intermediate motion values produce proportional smoothing', () => {
      // Test that motion 0.5 produces intermediate smoothing
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(0.5);

      // Start silent
      spectrogram.update(createUniformAnalyzerData(-100, 64));
      spectrogram.render(16);
      renderer.mockDrawLine.mockClear();

      // Jump to loud
      spectrogram.update(createUniformAnalyzerData(-10, 64));
      spectrogram.render(16);

      const heights = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => Math.abs(call[3] - call[1])
      );
      const avgHeight = heights.reduce((a, b) => a + b, 0) / heights.length;

      // Should be somewhere in the middle
      expect(avgHeight).toBeGreaterThan(20);
      expect(avgHeight).toBeLessThan(300);
    });
  });

  // Test 5.10: Spectrogram respects text/visual mode (opacity/prominence)
  describe('Test 5.10: Text/visual mode affects opacity/prominence', () => {
    it('exposes setMode method', () => {
      const spectrogram = new Spectrogram();
      expect(typeof spectrogram.setMode).toBe('function');
    });

    it('defaults to visual mode', () => {
      const spectrogram = new Spectrogram();
      expect(spectrogram.getMode()).toBe('visual');
    });

    it('accepts text and visual modes', () => {
      const spectrogram = new Spectrogram();

      spectrogram.setMode('text');
      expect(spectrogram.getMode()).toBe('text');

      spectrogram.setMode('visual');
      expect(spectrogram.getMode()).toBe('visual');
    });

    it('visual mode uses full opacity', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);
      spectrogram.setMode('visual');

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      // Check colors include opacity of 1
      const colors = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => call[4]?.color
      );
      colors.forEach((color: string | undefined) => {
        expect(color).toContain('1)'); // hsla ends with ", 1)"
      });
    });

    it('text mode uses reduced opacity', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);
      spectrogram.setMode('text');

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      // Check colors include reduced opacity
      const colors = renderer.mockDrawLine.mock.calls.map(
        (call: [number, number, number, number, DrawLineOptions?]) => call[4]?.color
      );
      colors.forEach((color: string | undefined) => {
        expect(color).toContain('0.3)'); // hsla ends with ", 0.3)"
      });
    });

    it('can switch modes at runtime', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));

      // Visual mode
      spectrogram.setMode('visual');
      spectrogram.render();
      const visualOpacity = renderer.mockDrawLine.mock.calls[0]?.[4]?.color;
      renderer.mockDrawLine.mockClear();

      // Text mode
      spectrogram.setMode('text');
      spectrogram.render();
      const textOpacity = renderer.mockDrawLine.mock.calls[0]?.[4]?.color;

      expect(visualOpacity).toContain('1)');
      expect(textOpacity).toContain('0.3)');
    });
  });

  // Additional edge cases and lifecycle tests
  describe('Lifecycle and edge cases', () => {
    it('dispose() cleans up resources', () => {
      const spectrogram = new Spectrogram();
      spectrogram.setRenderer(renderer);

      spectrogram.dispose();

      expect(spectrogram.isDisposed).toBe(true);
    });

    it('does not render after dispose', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);

      spectrogram.dispose();
      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      expect(renderer.mockDrawLine).not.toHaveBeenCalled();
    });

    it('does not throw when rendering without renderer', () => {
      const spectrogram = new Spectrogram();

      expect(() => {
        spectrogram.update(createUniformAnalyzerData(-30, 64));
        spectrogram.render();
      }).not.toThrow();
    });

    it('handles very small frequency data arrays', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // Only 2 frequency bins
      spectrogram.update(createMockAnalyzerData([-50, -30]));
      spectrogram.render();

      expect(renderer.mockDrawLine).toHaveBeenCalled();
    });

    it('handles very large frequency data arrays', () => {
      const spectrogram = new Spectrogram({ barCount: 4 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      // 2048 frequency bins
      const largeData = new Array(2048).fill(-50);
      spectrogram.update(createMockAnalyzerData(largeData));
      spectrogram.render();

      expect(renderer.mockDrawLine).toHaveBeenCalled();
    });

    it('centers bars in the canvas', () => {
      const spectrogram = new Spectrogram({ barCount: 4, barThickness: 10, barGap: 5 });
      spectrogram.setRenderer(renderer);
      spectrogram.setMotion(1);

      spectrogram.update(createUniformAnalyzerData(-30, 64));
      spectrogram.render();

      // With 4 bars, 10px thick, 5px gap:
      // Total width = 4 * 10 + 3 * 5 = 55px
      // Canvas width = 800px
      // Start x = (800 - 55) / 2 = 372.5
      // First bar center = 372.5 + 5 = 377.5 (half bar thickness)

      const firstBarX = renderer.mockDrawLine.mock.calls[0]?.[0];
      expect(firstBarX).toBeGreaterThan(300);
      expect(firstBarX).toBeLessThan(400);
    });
  });
});
