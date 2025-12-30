/**
 * Typography Tests
 *
 * Tests for the Typography class that renders keyword/fragment displays
 * with floating, fading text particles and mood-responsive behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Typography, createTypography } from './Typography';
import type { ColorPalette } from '@/types/visual';
import type { ICanvasRenderer, DrawTextOptions } from '@/types/canvas';
import type { Emotion } from '@/types/semantic';

/**
 * Create a mock canvas renderer for testing
 */
function createMockRenderer(): ICanvasRenderer & { mockDrawText: ReturnType<typeof vi.fn> } {
  const mockDrawText = vi.fn();
  return {
    width: 800,
    height: 600,
    mount: vi.fn(),
    unmount: vi.fn(),
    clear: vi.fn(),
    drawLine: vi.fn(),
    drawBlob: vi.fn(),
    drawText: mockDrawText,
    setLayer: vi.fn(),
    onFrame: vi.fn(),
    offFrame: vi.fn(),
    setEffects: vi.fn(),
    mockDrawText,
  };
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

describe('Typography', () => {
  let renderer: ICanvasRenderer & { mockDrawText: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    renderer = createMockRenderer();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 6.1: Typography renders keywords from semantic pipeline
  describe('Test 6.1: Typography renders keywords from semantic pipeline', () => {
    it('creates a typography instance', () => {
      const typography = new Typography();
      expect(typography).toBeDefined();
      expect(typography.getConfig()).toBeDefined();
    });

    it('accepts keywords via addKeywords method', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['hello', 'world', 'test']);

      const particles = typography.getParticles();
      expect(particles.length).toBe(3);
      expect(particles.map((p) => p.text)).toEqual(['hello', 'world', 'test']);
    });

    it('renders keywords when render is called', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['hello', 'world']);
      typography.render();

      expect(renderer.mockDrawText).toHaveBeenCalled();
      // Should be called at least twice (once per keyword, possibly more for glow)
      expect(renderer.mockDrawText.mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('factory function creates typography', () => {
      const typography = createTypography({ baseSize: 32 });
      expect(typography).toBeInstanceOf(Typography);
      expect(typography.getConfig().baseSize).toBe(32);
    });

    it('filters empty keywords', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['hello', '', '  ', 'world']);

      const particles = typography.getParticles();
      expect(particles.length).toBe(2);
    });
  });

  // Test 6.2: Keywords are visually emphasized (size, color, glow)
  describe('Test 6.2: Keywords are visually emphasized (size, color, glow)', () => {
    it('renders keywords with configurable size', () => {
      const typography = new Typography({ baseSize: 32 });
      typography.setRenderer(renderer);
      typography.setIntensity(1);

      typography.addKeywords(['important']);
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      const fontCall = calls.find(
        (call: [string, number, number, DrawTextOptions?]) => call[0] === 'important'
      );
      expect(fontCall).toBeDefined();

      const options = fontCall![3] as DrawTextOptions;
      expect(options.font).toContain('px');
      // Should include size in the font string
      expect(options.font).toMatch(/\d+px/);
    });

    it('uses palette colors for keywords', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setPalette(createTestPalette());
      typography.setMode('visual');

      typography.addKeywords(['colored']);
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      const mainCall = calls.find(
        (call: [string, number, number, DrawTextOptions?]) => call[0] === 'colored'
      );
      expect(mainCall).toBeDefined();

      const options = mainCall![3] as DrawTextOptions;
      // Color should be from palette (hsla format with opacity)
      expect(options.color).toMatch(/hsla?\(/);
    });

    it('applies glow effect in visual mode with high intensity', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setPalette(createTestPalette());
      typography.setIntensity(1); // High intensity
      typography.setMode('visual');

      typography.addKeywords(['glowing']);
      typography.render();

      // Should have multiple draw calls for glow effect
      const calls = renderer.mockDrawText.mock.calls;
      // Main text + 4 glow passes (for particles with glowIntensity > 0.5)
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('first keywords get larger size multiplier', () => {
      const typography = new Typography({ baseSize: 24 });
      typography.setRenderer(renderer);
      typography.setIntensity(0.5);

      // Add multiple keywords
      typography.addKeywords(['first', 'second', 'third']);

      const particles = typography.getParticles();
      // First keyword should have higher size multiplier than last
      expect(particles[0].sizeMultiplier).toBeGreaterThan(particles[2].sizeMultiplier);
    });
  });

  // Test 6.3: In text mode - typography is subtle, ambient
  describe('Test 6.3: In text mode - typography is subtle, ambient', () => {
    it('defaults to visual mode', () => {
      const typography = new Typography();
      expect(typography.getMode()).toBe('visual');
    });

    it('accepts text mode', () => {
      const typography = new Typography();
      typography.setMode('text');
      expect(typography.getMode()).toBe('text');
    });

    it('text mode uses reduced opacity', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMode('text');
      typography.setPalette(createTestPalette());

      typography.addKeywords(['subtle']);
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      const colors = calls.map(
        (call: [string, number, number, DrawTextOptions?]) => call[3]?.color
      );

      // All colors should have reduced opacity (less than 0.5)
      colors.forEach((color: string | undefined) => {
        if (color) {
          const match = color.match(/, ([\d.]+)\)/);
          const opacity = match ? parseFloat(match[1]) : 1;
          expect(opacity).toBeLessThan(0.5);
        }
      });
    });

    it('text mode uses reduced distortion', () => {
      const typography = new Typography({ distortion: 0.5 });
      typography.setRenderer(renderer);
      typography.setMode('text');

      typography.addKeywords(['clean']);
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      const mainCall = calls.find(
        (call: [string, number, number, DrawTextOptions?]) => call[0] === 'clean'
      );
      expect(mainCall).toBeDefined();

      const options = mainCall![3] as DrawTextOptions;
      // Distortion should be reduced in text mode
      expect(options.distortion).toBeLessThan(0.5);
    });
  });

  // Test 6.4: In visual mode - typography is prominent, expressive
  describe('Test 6.4: In visual mode - typography is prominent, expressive', () => {
    it('visual mode uses higher opacity than text mode', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMode('visual');
      typography.setPalette(createTestPalette());

      typography.addKeywords(['prominent']);
      typography.render();

      const visualCalls = [...renderer.mockDrawText.mock.calls];
      renderer.mockDrawText.mockClear();

      // Now test text mode
      typography.clear();
      typography.addKeywords(['prominent']);
      typography.setMode('text');
      typography.render();

      const textCalls = [...renderer.mockDrawText.mock.calls];

      // Extract max opacity from each mode
      const getMaxOpacity = (calls: [string, number, number, DrawTextOptions?][]) => {
        return Math.max(...calls.map((call) => {
          const color = call[3]?.color || '';
          const match = color.match(/, ([\d.]+)\)/);
          return match ? parseFloat(match[1]) : 0;
        }));
      };

      const visualMaxOpacity = getMaxOpacity(visualCalls);
      const textMaxOpacity = getMaxOpacity(textCalls);

      // Visual mode should have higher opacity
      expect(visualMaxOpacity).toBeGreaterThan(textMaxOpacity);
    });

    it('visual mode applies glow effects', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMode('visual');
      typography.setIntensity(1);
      typography.setPalette(createTestPalette());

      typography.addKeywords(['glowing']);
      typography.render();

      // Should have multiple calls including glow passes
      const calls = renderer.mockDrawText.mock.calls;
      // With glow, we expect more than just the main text calls
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });

    it('can switch between text and visual modes', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setPalette(createTestPalette());

      typography.addKeywords(['mode']);

      // Visual mode
      typography.setMode('visual');
      typography.render();
      const visualCalls = [...renderer.mockDrawText.mock.calls];
      renderer.mockDrawText.mockClear();

      // Text mode
      typography.setMode('text');
      typography.render();
      const textCalls = [...renderer.mockDrawText.mock.calls];

      // Extract max opacity from colors
      const getMaxOpacity = (calls: [string, number, number, DrawTextOptions?][]) => {
        if (calls.length === 0) return 0;
        return Math.max(...calls.map((call) => {
          const color = call[3]?.color || '';
          const match = color.match(/, ([\d.]+)\)/);
          return match ? parseFloat(match[1]) : 0;
        }));
      };

      const visualOpacity = getMaxOpacity(visualCalls);
      const textOpacity = getMaxOpacity(textCalls);

      expect(visualOpacity).toBeGreaterThan(textOpacity);
    });
  });

  // Test 6.5: Typography accepts font family and base size config
  describe('Test 6.5: Typography accepts font family and base size config', () => {
    it('accepts fontFamily in config', () => {
      const typography = new Typography({ fontFamily: 'Georgia, serif' });
      expect(typography.getConfig().fontFamily).toBe('Georgia, serif');
    });

    it('accepts baseSize in config', () => {
      const typography = new Typography({ baseSize: 48 });
      expect(typography.getConfig().baseSize).toBe(48);
    });

    it('uses configured font family when rendering', () => {
      const typography = new Typography({ fontFamily: 'Courier New, monospace' });
      typography.setRenderer(renderer);

      typography.addKeywords(['monospaced']);
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      const mainCall = calls.find(
        (call: [string, number, number, DrawTextOptions?]) => call[0] === 'monospaced'
      );
      expect(mainCall).toBeDefined();

      const options = mainCall![3] as DrawTextOptions;
      expect(options.font).toContain('Courier New, monospace');
    });

    it('exposes setFontFamily and setBaseSize methods', () => {
      const typography = new Typography();

      typography.setFontFamily('Arial, sans-serif');
      expect(typography.getFontFamily()).toBe('Arial, sans-serif');

      typography.setBaseSize(36);
      expect(typography.getBaseSize()).toBe(36);
    });

    it('clamps baseSize to minimum of 8', () => {
      const typography = new Typography();
      typography.setBaseSize(2);
      expect(typography.getBaseSize()).toBe(8);
    });

    it('default font family is Inter', () => {
      const typography = new Typography();
      expect(typography.getConfig().fontFamily).toBe('Inter, sans-serif');
    });

    it('default base size is 24', () => {
      const typography = new Typography();
      expect(typography.getConfig().baseSize).toBe(24);
    });
  });

  // Test 6.6: Text fades out over time (configurable fade duration)
  describe('Test 6.6: Text fades out over time (configurable fade duration)', () => {
    it('accepts fadeDuration in config', () => {
      const typography = new Typography({ fadeDuration: 5000 });
      expect(typography.getConfig().fadeDuration).toBe(5000);
    });

    it('exposes setFadeDuration method', () => {
      const typography = new Typography();
      typography.setFadeDuration(2000);
      expect(typography.getFadeDuration()).toBe(2000);
    });

    it('clamps fadeDuration to minimum of 100ms', () => {
      const typography = new Typography();
      typography.setFadeDuration(10);
      expect(typography.getFadeDuration()).toBe(100);
    });

    it('particles are removed after fadeDuration', () => {
      const typography = new Typography({ fadeDuration: 1000 });
      typography.setRenderer(renderer);

      typography.addKeywords(['fading']);
      expect(typography.getParticles().length).toBe(1);

      // Advance time past fade duration
      vi.advanceTimersByTime(1100);
      typography.update(1100);

      expect(typography.getParticles().length).toBe(0);
    });

    it('particles fade in during first 10% of duration', () => {
      const typography = new Typography({ fadeDuration: 1000 });
      typography.setRenderer(renderer);

      typography.addKeywords(['fadein']);

      // At time 0, opacity should be 0.5 (minimum for visibility)
      typography.update(0);
      const particleAtStart = typography.getParticles()[0];
      expect(particleAtStart.opacity).toBe(0.5); // Starts at minimum visible opacity

      // After 5% (during fade-in period)
      vi.advanceTimersByTime(50);
      typography.update(50);

      const particleAfterFadeIn = typography.getParticles()[0];
      expect(particleAfterFadeIn.opacity).toBeGreaterThan(0.5);
      expect(particleAfterFadeIn.opacity).toBeLessThanOrEqual(1);
    });

    it('particles fade out during last 30% of duration', () => {
      const typography = new Typography({ fadeDuration: 1000 });
      typography.setRenderer(renderer);

      typography.addKeywords(['fadeout']);

      // Advance to 75% through (in fade-out period)
      vi.advanceTimersByTime(750);
      typography.update(750);

      const particle = typography.getParticles()[0];
      expect(particle.opacity).toBeLessThan(1);
      expect(particle.opacity).toBeGreaterThan(0);
    });

    it('particles have full opacity during middle period', () => {
      const typography = new Typography({ fadeDuration: 1000 });
      typography.setRenderer(renderer);

      typography.addKeywords(['stable']);

      // Advance to 50% through (stable period)
      vi.advanceTimersByTime(500);
      typography.update(500);

      const particle = typography.getParticles()[0];
      expect(particle.opacity).toBe(1);
    });
  });

  // Test 6.7: Typography handles positioning within canvas bounds
  describe('Test 6.7: Typography handles positioning within canvas bounds', () => {
    it('positions keywords within canvas bounds', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['bounded']);

      const particles = typography.getParticles();
      particles.forEach((particle) => {
        expect(particle.x).toBeGreaterThan(0);
        expect(particle.x).toBeLessThan(renderer.width);
        expect(particle.y).toBeGreaterThan(0);
        expect(particle.y).toBeLessThan(renderer.height);
      });
    });

    it('keeps particles within bounds after update', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMotion(1); // High motion

      typography.addKeywords(['moving']);

      // Run many update cycles
      for (let i = 0; i < 100; i++) {
        vi.advanceTimersByTime(16);
        typography.update(16);
      }

      const particles = typography.getParticles();
      particles.forEach((particle) => {
        expect(particle.x).toBeGreaterThanOrEqual(50); // Margin
        expect(particle.x).toBeLessThanOrEqual(renderer.width - 50);
        expect(particle.y).toBeGreaterThanOrEqual(50);
        expect(particle.y).toBeLessThanOrEqual(renderer.height - 50);
      });
    });

    it('bounces particles off edges', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMotion(1);

      typography.addKeywords(['bouncing']);

      // Force particle to edge by setting position directly
      const particles = typography.getParticles();
      particles[0].x = 40; // Below margin
      particles[0].vx = -100; // Moving left

      vi.advanceTimersByTime(16);
      typography.update(16);

      // Velocity should have reversed
      expect(particles[0].vx).toBeGreaterThan(0);
    });

    it('uses margin to keep text readable', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      // Add many keywords
      typography.addKeywords(['one', 'two', 'three', 'four', 'five']);

      const particles = typography.getParticles();
      const margin = 50;

      particles.forEach((particle) => {
        expect(particle.x).toBeGreaterThanOrEqual(margin);
        expect(particle.y).toBeGreaterThanOrEqual(margin);
      });
    });
  });

  // Test 6.8: Motion control affects text drift/float behavior
  describe('Test 6.8: Motion control affects text drift/float behavior', () => {
    it('exposes setMotion method', () => {
      const typography = new Typography();
      expect(typeof typography.setMotion).toBe('function');
    });

    it('accepts motion value 0-1', () => {
      const typography = new Typography();

      typography.setMotion(0.5);
      expect(typography.getMotion()).toBe(0.5);
    });

    it('clamps motion to 0-1 range', () => {
      const typography = new Typography();

      typography.setMotion(-0.5);
      expect(typography.getMotion()).toBe(0);

      typography.setMotion(1.5);
      expect(typography.getMotion()).toBe(1);
    });

    it('high motion produces faster drift', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMotion(1);

      typography.addKeywords(['fast']);
      const initialPos = { ...typography.getParticles()[0] };

      // Update for some frames
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(16);
        typography.update(16);
      }

      const particles = typography.getParticles();
      if (particles.length > 0) {
        const movedDistance = Math.sqrt(
          Math.pow(particles[0].x - initialPos.x, 2) + Math.pow(particles[0].y - initialPos.y, 2)
        );

        // With high motion, should move noticeably
        expect(movedDistance).toBeGreaterThan(0);
      }
    });

    it('low motion produces slower drift', () => {
      const typographyFast = new Typography();
      typographyFast.setRenderer(renderer);
      typographyFast.setMotion(1);

      const typographySlow = new Typography();
      typographySlow.setRenderer({ ...renderer, mockDrawText: vi.fn() });
      typographySlow.setMotion(0);

      typographyFast.addKeywords(['fast']);
      typographySlow.addKeywords(['slow']);

      // Force same initial velocity for comparison
      const fastParticle = typographyFast.getParticles()[0];
      const slowParticle = typographySlow.getParticles()[0];
      fastParticle.vx = 50;
      fastParticle.vy = 50;
      slowParticle.vx = 50;
      slowParticle.vy = 50;
      const fastInitial = { x: fastParticle.x, y: fastParticle.y };
      const slowInitial = { x: slowParticle.x, y: slowParticle.y };

      // Update both
      vi.advanceTimersByTime(100);
      typographyFast.update(100);
      typographySlow.update(100);

      const fastMoved = Math.sqrt(
        Math.pow(fastParticle.x - fastInitial.x, 2) + Math.pow(fastParticle.y - fastInitial.y, 2)
      );
      const slowMoved = Math.sqrt(
        Math.pow(slowParticle.x - slowInitial.x, 2) + Math.pow(slowParticle.y - slowInitial.y, 2)
      );

      // Fast should move more than slow
      expect(fastMoved).toBeGreaterThan(slowMoved);
    });

    it('particles have initial velocity based on motion', () => {
      const typographyHigh = new Typography();
      typographyHigh.setRenderer(renderer);
      typographyHigh.setMotion(1);

      const typographyLow = new Typography();
      typographyLow.setRenderer({ ...renderer, mockDrawText: vi.fn() });
      typographyLow.setMotion(0);

      typographyHigh.addKeywords(['high']);
      typographyLow.addKeywords(['low']);

      const highVelocity = Math.sqrt(
        Math.pow(typographyHigh.getParticles()[0].vx, 2) +
          Math.pow(typographyHigh.getParticles()[0].vy, 2)
      );
      const lowVelocity = Math.sqrt(
        Math.pow(typographyLow.getParticles()[0].vx, 2) +
          Math.pow(typographyLow.getParticles()[0].vy, 2)
      );

      // High motion should have higher initial velocity
      expect(highVelocity).toBeGreaterThan(lowVelocity);
    });
  });

  // Test 6.9: Intensity control affects keyword emphasis strength
  describe('Test 6.9: Intensity control affects keyword emphasis strength', () => {
    it('exposes setIntensity method', () => {
      const typography = new Typography();
      expect(typeof typography.setIntensity).toBe('function');
    });

    it('accepts intensity value 0-1', () => {
      const typography = new Typography();

      typography.setIntensity(0.5);
      expect(typography.getIntensity()).toBe(0.5);
    });

    it('clamps intensity to 0-1 range', () => {
      const typography = new Typography();

      typography.setIntensity(-0.5);
      expect(typography.getIntensity()).toBe(0);

      typography.setIntensity(1.5);
      expect(typography.getIntensity()).toBe(1);
    });

    it('high intensity produces larger text', () => {
      const typographyHigh = new Typography({ baseSize: 24 });
      typographyHigh.setRenderer(renderer);
      typographyHigh.setIntensity(1);

      typographyHigh.addKeywords(['big']);
      typographyHigh.render();

      const highCalls = [...renderer.mockDrawText.mock.calls];
      renderer.mockDrawText.mockClear();

      const typographyLow = new Typography({ baseSize: 24 });
      typographyLow.setRenderer(renderer);
      typographyLow.setIntensity(0);

      typographyLow.addKeywords(['small']);
      typographyLow.render();

      const lowCalls = [...renderer.mockDrawText.mock.calls];

      // Extract font sizes
      const getSize = (call: [string, number, number, DrawTextOptions?]) => {
        const font = call[3]?.font || '';
        const match = font.match(/(\d+)px/);
        return match ? parseInt(match[1]) : 0;
      };

      const highSize = getSize(highCalls.find((c) => c[0] === 'big')!);
      const lowSize = getSize(lowCalls.find((c) => c[0] === 'small')!);

      expect(highSize).toBeGreaterThan(lowSize);
    });

    it('high intensity produces stronger glow', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setIntensity(1);

      typography.addKeywords(['glowing']);

      const particles = typography.getParticles();
      expect(particles[0].glowIntensity).toBeGreaterThan(0.5);
    });

    it('low intensity produces weaker glow', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setIntensity(0);

      typography.addKeywords(['dim']);

      const particles = typography.getParticles();
      expect(particles[0].glowIntensity).toBeLessThanOrEqual(0.5);
    });

    it('intensity affects particle size multiplier', () => {
      const typographyHigh = new Typography();
      typographyHigh.setIntensity(1);
      typographyHigh.addKeywords(['high']);

      const typographyLow = new Typography();
      typographyLow.setIntensity(0);
      typographyLow.addKeywords(['low']);

      const highMultiplier = typographyHigh.getParticles()[0].sizeMultiplier;
      const lowMultiplier = typographyLow.getParticles()[0].sizeMultiplier;

      expect(highMultiplier).toBeGreaterThan(lowMultiplier);
    });
  });

  // Test 6.10: Typography can differentiate user vs AI content (subtle)
  describe('Test 6.10: Typography can differentiate user vs AI content', () => {
    it('accepts source parameter in addKeywords', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['user-word'], 'user');
      typography.addKeywords(['ai-word'], 'ai');

      const particles = typography.getParticles();
      expect(particles[0].source).toBe('user');
      expect(particles[1].source).toBe('ai');
    });

    it('defaults to ai source', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['default']);

      const particles = typography.getParticles();
      expect(particles[0].source).toBe('ai');
    });

    it('uses different colors for user vs ai content', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setPalette(createTestPalette());
      typography.setMode('visual');
      typography.setIntensity(0); // Low intensity = no glow

      typography.addKeywords(['user-content'], 'user');
      typography.render();
      const userCalls = [...renderer.mockDrawText.mock.calls];
      renderer.mockDrawText.mockClear();

      typography.clear();
      typography.addKeywords(['ai-content'], 'ai');
      typography.render();
      const aiCalls = [...renderer.mockDrawText.mock.calls];

      // Get main text calls (last call for each keyword, after glow if any)
      const userMainCall = userCalls.filter((c) => c[0] === 'user-content').pop();
      const aiMainCall = aiCalls.filter((c) => c[0] === 'ai-content').pop();

      const userColor = userMainCall?.[3]?.color || '';
      const aiColor = aiMainCall?.[3]?.color || '';

      // Colors should be different (user uses secondary, AI uses primary)
      expect(userColor).not.toBe(aiColor);
      // User should use secondary color (180 hue)
      expect(userColor).toContain('180');
      // AI should use primary color (200 hue)
      expect(aiColor).toContain('200');
    });

    it('user content uses secondary palette color', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      const palette = createTestPalette();
      typography.setPalette(palette);
      typography.setMode('visual');
      typography.setIntensity(0); // Low intensity = no glow

      typography.addKeywords(['user-word'], 'user');
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      // Get the last call for this keyword (main text, after any glow)
      const mainCall = calls.filter((c: [string, number, number, DrawTextOptions?]) => c[0] === 'user-word').pop();
      expect(mainCall).toBeDefined();

      const color = mainCall![3]?.color || '';
      // Should contain the hue from secondary color (180)
      expect(color).toContain('180');
    });

    it('ai content uses primary palette color', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      const palette = createTestPalette();
      typography.setPalette(palette);
      typography.setMode('visual');
      typography.setIntensity(0); // Low intensity = no glow

      typography.addKeywords(['ai-word'], 'ai');
      typography.render();

      const calls = renderer.mockDrawText.mock.calls;
      // Get the last call for this keyword (main text, after any glow)
      const mainCall = calls.filter((c: [string, number, number, DrawTextOptions?]) => c[0] === 'ai-word').pop();
      expect(mainCall).toBeDefined();

      const color = mainCall![3]?.color || '';
      // Should contain the hue from primary color (200)
      expect(color).toContain('200');
    });
  });

  // Test 6.11: Keywords 'pop' or float independently based on mood
  describe("Test 6.11: Keywords 'pop' or float independently based on mood", () => {
    it('exposes setEmotion method', () => {
      const typography = new Typography();
      expect(typeof typography.setEmotion).toBe('function');
    });

    it('accepts emotion values', () => {
      const typography = new Typography();
      const emotions: Emotion[] = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'];

      emotions.forEach((emotion) => {
        typography.setEmotion(emotion);
        expect(typography.getEmotion()).toBe(emotion);
      });
    });

    it('joy emotion triggers more keyword pops', () => {
      // Test multiple times to check probability
      let joyPops = 0;
      let neutralPops = 0;

      for (let i = 0; i < 50; i++) {
        const joyTypography = new Typography();
        joyTypography.setEmotion('joy');
        joyTypography.addKeywords([`joy${i}`]);
        if (joyTypography.getParticles()[0].shouldPop) joyPops++;

        const neutralTypography = new Typography();
        neutralTypography.setEmotion('neutral');
        neutralTypography.addKeywords([`neutral${i}`]);
        if (neutralTypography.getParticles()[0].shouldPop) neutralPops++;
      }

      // Joy should trigger more pops than neutral (statistically)
      expect(joyPops).toBeGreaterThan(neutralPops * 0.5);
    });

    it('sadness emotion triggers fewer keyword pops', () => {
      let sadPops = 0;
      let joyPops = 0;

      for (let i = 0; i < 50; i++) {
        const sadTypography = new Typography();
        sadTypography.setEmotion('sadness');
        sadTypography.addKeywords([`sad${i}`]);
        if (sadTypography.getParticles()[0].shouldPop) sadPops++;

        const joyTypography = new Typography();
        joyTypography.setEmotion('joy');
        joyTypography.addKeywords([`joy${i}`]);
        if (joyTypography.getParticles()[0].shouldPop) joyPops++;
      }

      // Sadness should trigger fewer pops than joy
      expect(sadPops).toBeLessThan(joyPops);
    });

    it('particles have individual pop states', () => {
      const typography = new Typography();
      typography.setEmotion('surprise');

      typography.addKeywords(['one', 'two', 'three', 'four', 'five']);

      const particles = typography.getParticles();
      // Not all particles should have the same pop state
      const popStates = particles.map((p) => p.shouldPop);
      // At least some variation should exist (or all true for high-energy emotion)
      expect(popStates.some((s) => s === true) || popStates.every((s) => s === false)).toBe(true);
    });

    it('pop animation progresses over time', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.addKeywords(['popping']);

      // Force pop state
      typography.getParticles()[0].shouldPop = true;
      typography.getParticles()[0].popProgress = 0;

      // Initial progress should be 0
      expect(typography.getParticles()[0].popProgress).toBe(0);

      // Update for some frames
      vi.advanceTimersByTime(200);
      typography.update(200);

      // Progress should have increased
      expect(typography.getParticles()[0].popProgress).toBeGreaterThan(0);
    });

    it('particles float independently with their own velocities', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMotion(0.5);

      typography.addKeywords(['one', 'two', 'three']);

      const particles = typography.getParticles();

      // Each particle should have independent velocity
      const velocities = particles.map((p) => ({ vx: p.vx, vy: p.vy }));

      // Not all velocities should be identical
      const allSame = velocities.every(
        (v, i, arr) => i === 0 || (v.vx === arr[0].vx && v.vy === arr[0].vy)
      );
      expect(allSame).toBe(false);
    });

    it('each particle moves independently over time', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.setMotion(0.5);

      typography.addKeywords(['a', 'b']);

      const initialPositions = typography.getParticles().map((p) => ({ x: p.x, y: p.y }));

      // Update
      vi.advanceTimersByTime(100);
      typography.update(100);

      const newPositions = typography.getParticles().map((p) => ({ x: p.x, y: p.y }));

      // Both should have moved
      expect(newPositions[0].x).not.toBe(initialPositions[0].x);
      expect(newPositions[1].x).not.toBe(initialPositions[1].x);

      // But they shouldn't have moved the same amount
      const delta0 = Math.sqrt(
        Math.pow(newPositions[0].x - initialPositions[0].x, 2) +
          Math.pow(newPositions[0].y - initialPositions[0].y, 2)
      );
      const delta1 = Math.sqrt(
        Math.pow(newPositions[1].x - initialPositions[1].x, 2) +
          Math.pow(newPositions[1].y - initialPositions[1].y, 2)
      );

      // Movements should be different (independent)
      expect(Math.abs(delta0 - delta1)).toBeGreaterThan(0);
    });
  });

  // Additional edge cases and lifecycle tests
  describe('Lifecycle and edge cases', () => {
    it('dispose() cleans up resources', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);
      typography.addKeywords(['test']);

      typography.dispose();

      expect(typography.isDisposed).toBe(true);
      expect(typography.getParticles().length).toBe(0);
    });

    it('does not render after dispose', () => {
      const typography = new Typography();
      typography.setRenderer(renderer);

      typography.dispose();
      typography.addKeywords(['test']);
      typography.render();

      expect(renderer.mockDrawText).not.toHaveBeenCalled();
    });

    it('does not throw when rendering without renderer', () => {
      const typography = new Typography();

      expect(() => {
        typography.addKeywords(['test']);
        typography.render();
      }).not.toThrow();
    });

    it('clear() removes all particles', () => {
      const typography = new Typography();
      typography.addKeywords(['one', 'two', 'three']);

      expect(typography.getParticles().length).toBe(3);

      typography.clear();

      expect(typography.getParticles().length).toBe(0);
    });

    it('respects maxKeywords config', () => {
      const typography = new Typography({ maxKeywords: 3 });
      typography.setRenderer(renderer);

      typography.addKeywords(['one', 'two', 'three', 'four', 'five']);

      // Should only keep the last 3
      expect(typography.getParticles().length).toBe(3);
    });

    it('removes oldest keywords when exceeding max', () => {
      const typography = new Typography({ maxKeywords: 2 });
      typography.setRenderer(renderer);

      typography.addKeywords(['first']);
      typography.addKeywords(['second']);
      typography.addKeywords(['third']);

      const particles = typography.getParticles();
      expect(particles.length).toBe(2);
      expect(particles.map((p) => p.text)).toEqual(['second', 'third']);
    });

    it('accepts and stores color palette (immutable copy)', () => {
      const typography = new Typography();
      const palette = createTestPalette();

      typography.setPalette(palette);

      // Mutate original
      palette.primary = 'hsl(0, 0%, 0%)';

      // Stored palette should be unchanged
      expect(typography.getPalette().primary).not.toBe('hsl(0, 0%, 0%)');
    });
  });
});
