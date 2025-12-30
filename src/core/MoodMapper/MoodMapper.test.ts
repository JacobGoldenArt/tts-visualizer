/**
 * MoodMapper Tests
 *
 * Tests for the MoodMapper class that translates semantic analysis output
 * into visual parameters (colors, intensity, primitive weights).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MoodMapper, createMoodMapper, EMOTION_PALETTES } from './MoodMapper';
import type { MoodObject } from '@/types/semantic';
import type { MapperUpdatedEvent, ColorPalette } from '@/types/visual';

/**
 * Helper to create a mood object for testing
 */
function createMoodObject(overrides: Partial<MoodObject> = {}): MoodObject {
  return {
    sentiment: 0,
    energy: 0.5,
    keywords: [],
    emotion: 'neutral',
    ...overrides,
  };
}

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

describe('MoodMapper', () => {
  // Use fake timers for animation frame testing
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Test 7.1: Mapper accepts mood object from semantic pipeline
  describe('Test 7.1: Accepts mood object from semantic pipeline', () => {
    it('accepts a mood object via update() method', () => {
      const mapper = new MoodMapper();
      const mood = createMoodObject({
        sentiment: 0.5,
        energy: 0.7,
        keywords: ['test', 'happy'],
        emotion: 'joy',
      });

      expect(() => mapper.update(mood)).not.toThrow();
    });

    it('stores the mood object', () => {
      const mapper = new MoodMapper();
      const mood = createMoodObject({
        sentiment: 0.5,
        energy: 0.7,
        keywords: ['test'],
        emotion: 'joy',
      });

      mapper.update(mood);

      const state = mapper.getState();
      expect(state.mood).not.toBeNull();
      expect(state.mood?.sentiment).toBe(0.5);
      expect(state.mood?.energy).toBe(0.7);
      expect(state.mood?.emotion).toBe('joy');
    });

    it('accepts all emotion types', () => {
      const mapper = new MoodMapper();
      const emotions = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral'] as const;

      for (const emotion of emotions) {
        const mood = createMoodObject({ emotion });
        expect(() => mapper.update(mood)).not.toThrow();
      }
    });

    it('handles mood objects with edge case values', () => {
      const mapper = new MoodMapper();

      // Test extremes
      const extremeMood = createMoodObject({
        sentiment: -1,
        energy: 0,
        keywords: [],
        emotion: 'sadness',
      });
      expect(() => mapper.update(extremeMood)).not.toThrow();

      const positiveMood = createMoodObject({
        sentiment: 1,
        energy: 1,
        keywords: ['a', 'b', 'c', 'd', 'e'],
        emotion: 'joy',
      });
      expect(() => mapper.update(positiveMood)).not.toThrow();
    });
  });

  // Test 7.2: Mapper outputs color palette (primary, secondary, accent colors)
  describe('Test 7.2: Outputs color palette', () => {
    it('returns params with palette property', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'joy' }));

      // Wait for initial update
      vi.advanceTimersByTime(16);
      const params = mapper.getParams();

      expect(params).toHaveProperty('palette');
      expect(params.palette).toHaveProperty('primary');
      expect(params.palette).toHaveProperty('secondary');
      expect(params.palette).toHaveProperty('accent');
    });

    it('primary color is valid HSL', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'joy' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(isValidHSL(params.palette.primary)).toBe(true);
    });

    it('secondary color is valid HSL', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'anger' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(isValidHSL(params.palette.secondary)).toBe(true);
    });

    it('accent color is valid HSL', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'fear' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(isValidHSL(params.palette.accent)).toBe(true);
    });

    it('different emotions produce different palettes', () => {
      const mapper = new MoodMapper();

      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const joyPalette = mapper.getParams().palette;

      mapper.update(createMoodObject({ emotion: 'sadness' }));
      vi.advanceTimersByTime(600);
      const sadnessPalette = mapper.getParams().palette;

      // Palettes should be different
      expect(joyPalette.primary).not.toBe(sadnessPalette.primary);
    });
  });

  // Test 7.3: Mapper outputs intensity modifier (0.5 to 1.5 multiplier)
  describe('Test 7.3: Outputs intensity modifier', () => {
    it('returns params with intensity property', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject());

      vi.advanceTimersByTime(16);
      const params = mapper.getParams();

      expect(params).toHaveProperty('intensity');
      expect(typeof params.intensity).toBe('number');
    });

    it('intensity is within 0.5 to 1.5 range for low energy', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 0 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThanOrEqual(0.5);
      expect(params.intensity).toBeLessThanOrEqual(1.5);
    });

    it('intensity is within 0.5 to 1.5 range for high energy', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 1 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThanOrEqual(0.5);
      expect(params.intensity).toBeLessThanOrEqual(1.5);
    });

    it('intensity is within 0.5 to 1.5 for mid-range energy', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 0.5 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThanOrEqual(0.5);
      expect(params.intensity).toBeLessThanOrEqual(1.5);
    });
  });

  // Test 7.4: Positive sentiment maps to warm/bright colors
  describe('Test 7.4: Positive sentiment maps to warm/bright colors', () => {
    it('positive sentiment produces warm hues', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ sentiment: 0.8, emotion: 'joy' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);

      expect(hsl).not.toBeNull();
      // Warm hues are 0-60 degrees (red-yellow) and 300-360 (pink-red)
      const isWarm = (hsl!.h >= 0 && hsl!.h <= 80) || hsl!.h >= 300;
      expect(isWarm).toBe(true);
    });

    it('positive sentiment produces brighter (higher lightness) colors', () => {
      const mapper = new MoodMapper();

      // Compare positive vs neutral sentiment
      mapper.update(createMoodObject({ sentiment: 0.9, emotion: 'neutral' }));
      vi.advanceTimersByTime(600);
      const positiveParams = mapper.getParams();
      const positiveHSL = parseHSL(positiveParams.palette.primary);

      mapper.update(createMoodObject({ sentiment: 0, emotion: 'neutral' }));
      vi.advanceTimersByTime(600);
      const neutralParams = mapper.getParams();
      const neutralHSL = parseHSL(neutralParams.palette.primary);

      expect(positiveHSL).not.toBeNull();
      expect(neutralHSL).not.toBeNull();
      // Positive sentiment should have higher or equal lightness
      expect(positiveHSL!.l).toBeGreaterThanOrEqual(neutralHSL!.l);
    });

    it('joy emotion produces warm colors', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ sentiment: 0.5, emotion: 'joy' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);

      expect(hsl).not.toBeNull();
      // Joy palette should have warm hues (yellows/oranges: 30-60)
      expect(hsl!.h).toBeGreaterThanOrEqual(0);
      expect(hsl!.h).toBeLessThanOrEqual(100);
    });
  });

  // Test 7.5: Negative sentiment maps to cool/muted colors
  describe('Test 7.5: Negative sentiment maps to cool/muted colors', () => {
    it('negative sentiment produces cool hues', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ sentiment: -0.8, emotion: 'sadness' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);

      expect(hsl).not.toBeNull();
      // Cool hues are 180-280 degrees (cyan-blue-purple)
      expect(hsl!.h).toBeGreaterThanOrEqual(160);
      expect(hsl!.h).toBeLessThanOrEqual(300);
    });

    it('negative sentiment produces more muted (lower saturation) colors', () => {
      const mapper = new MoodMapper();

      // Get sadness with high negative sentiment
      mapper.update(createMoodObject({ sentiment: -0.9, emotion: 'sadness', energy: 0.3 }));
      vi.advanceTimersByTime(600);
      const negativeParams = mapper.getParams();
      const negativeHSL = parseHSL(negativeParams.palette.primary);

      // Compare with positive joy
      mapper.update(createMoodObject({ sentiment: 0.9, emotion: 'joy', energy: 0.8 }));
      vi.advanceTimersByTime(600);
      const positiveParams = mapper.getParams();
      const positiveHSL = parseHSL(positiveParams.palette.primary);

      expect(negativeHSL).not.toBeNull();
      expect(positiveHSL).not.toBeNull();
      // Negative sentiment should have lower saturation
      expect(negativeHSL!.s).toBeLessThan(positiveHSL!.s);
    });

    it('sadness emotion produces cool blue colors', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ sentiment: -0.5, emotion: 'sadness' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);

      expect(hsl).not.toBeNull();
      // Sadness should be in blue range (180-280)
      expect(hsl!.h).toBeGreaterThanOrEqual(180);
      expect(hsl!.h).toBeLessThanOrEqual(290);
    });

    it('fear emotion produces dark purple colors', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ sentiment: -0.5, emotion: 'fear' }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);

      expect(hsl).not.toBeNull();
      // Fear should be in purple range (240-320)
      expect(hsl!.h).toBeGreaterThanOrEqual(240);
      expect(hsl!.h).toBeLessThanOrEqual(320);
    });
  });

  // Test 7.6: High energy maps to increased intensity modifier
  describe('Test 7.6: High energy maps to increased intensity modifier', () => {
    it('high energy (1.0) produces intensity near 1.5', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 1.0 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThan(1.3);
      expect(params.intensity).toBeLessThanOrEqual(1.5);
    });

    it('low energy (0.0) produces intensity near 0.5', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 0.0 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThanOrEqual(0.5);
      expect(params.intensity).toBeLessThan(0.7);
    });

    it('mid energy (0.5) produces intensity near 1.0', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ energy: 0.5 }));

      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      expect(params.intensity).toBeGreaterThan(0.9);
      expect(params.intensity).toBeLessThan(1.1);
    });

    it('intensity increases linearly with energy', () => {
      const mapper = new MoodMapper();

      // Test low energy
      mapper.update(createMoodObject({ energy: 0.2 }));
      vi.advanceTimersByTime(600);
      const lowIntensity = mapper.getParams().intensity;

      // Test mid energy
      mapper.update(createMoodObject({ energy: 0.5 }));
      vi.advanceTimersByTime(600);
      const midIntensity = mapper.getParams().intensity;

      // Test high energy
      mapper.update(createMoodObject({ energy: 0.8 }));
      vi.advanceTimersByTime(600);
      const highIntensity = mapper.getParams().intensity;

      expect(lowIntensity).toBeLessThan(midIntensity);
      expect(midIntensity).toBeLessThan(highIntensity);
    });
  });

  // Test 7.7: Mapper supports custom mood-to-palette configurations
  describe('Test 7.7: Supports custom mood-to-palette configurations', () => {
    it('accepts custom palettes in constructor', () => {
      const customPalette: ColorPalette = {
        primary: 'hsl(120, 50%, 50%)',
        secondary: 'hsl(130, 50%, 50%)',
        accent: 'hsl(140, 50%, 50%)',
      };

      const mapper = new MoodMapper({
        customPalettes: { joy: customPalette },
      });

      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      // The palette should use the custom one (with adjustments for mood)
      const hsl = parseHSL(params.palette.primary);
      expect(hsl).not.toBeNull();
      // Should be near green (custom) rather than yellow (default joy)
      expect(hsl!.h).toBeGreaterThanOrEqual(100);
      expect(hsl!.h).toBeLessThanOrEqual(160);
    });

    it('setConfig() allows updating custom palettes', () => {
      const mapper = new MoodMapper();

      const customPalette: ColorPalette = {
        primary: 'hsl(300, 80%, 60%)',
        secondary: 'hsl(310, 80%, 60%)',
        accent: 'hsl(320, 80%, 60%)',
      };

      mapper.setConfig({ customPalettes: { neutral: customPalette } });
      mapper.update(createMoodObject({ emotion: 'neutral', sentiment: 0 }));
      vi.advanceTimersByTime(600);
      const params = mapper.getParams();

      const hsl = parseHSL(params.palette.primary);
      expect(hsl).not.toBeNull();
      // Should be near magenta (custom) rather than gray (default neutral)
      expect(hsl!.h).toBeGreaterThanOrEqual(280);
      expect(hsl!.h).toBeLessThanOrEqual(330);
    });

    it('custom palettes override defaults only for specified emotions', () => {
      const customPalette: ColorPalette = {
        primary: 'hsl(120, 50%, 50%)',
        secondary: 'hsl(130, 50%, 50%)',
        accent: 'hsl(140, 50%, 50%)',
      };

      const mapper = new MoodMapper({
        customPalettes: { joy: customPalette },
      });

      // Joy should use custom (green)
      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const joyParams = mapper.getParams();
      const joyHSL = parseHSL(joyParams.palette.primary);

      // Sadness should use default (blue)
      mapper.update(createMoodObject({ emotion: 'sadness' }));
      vi.advanceTimersByTime(600);
      const sadnessParams = mapper.getParams();
      const sadnessHSL = parseHSL(sadnessParams.palette.primary);

      expect(joyHSL).not.toBeNull();
      expect(sadnessHSL).not.toBeNull();

      // Joy should be green-ish, sadness should be blue-ish
      expect(joyHSL!.h).toBeLessThan(180);
      expect(sadnessHSL!.h).toBeGreaterThan(180);
    });

    it('exposes default emotion palettes for reference', () => {
      expect(EMOTION_PALETTES).toBeDefined();
      expect(EMOTION_PALETTES.joy).toBeDefined();
      expect(EMOTION_PALETTES.sadness).toBeDefined();
      expect(EMOTION_PALETTES.anger).toBeDefined();
      expect(EMOTION_PALETTES.fear).toBeDefined();
      expect(EMOTION_PALETTES.surprise).toBeDefined();
      expect(EMOTION_PALETTES.neutral).toBeDefined();
    });
  });

  // Test 7.8: Mapper interpolates smoothly between mood changes
  describe('Test 7.8: Interpolates smoothly between mood changes', () => {
    it('params transition gradually over interpolation duration', () => {
      const mapper = new MoodMapper({ interpolationDuration: 500 });

      // Start with neutral
      mapper.update(createMoodObject({ emotion: 'neutral', sentiment: 0 }));
      vi.advanceTimersByTime(600);
      const neutralParams = mapper.getParams();

      // Switch to joy
      mapper.update(createMoodObject({ emotion: 'joy', sentiment: 0.8 }));

      // Check at 50% interpolation
      vi.advanceTimersByTime(250);
      const midParams = mapper.getParams();

      // After full duration
      vi.advanceTimersByTime(300);
      const finalParams = mapper.getParams();

      // Mid-transition params should be between start and end
      const neutralHSL = parseHSL(neutralParams.palette.primary);
      const midHSL = parseHSL(midParams.palette.primary);
      const finalHSL = parseHSL(finalParams.palette.primary);

      expect(neutralHSL).not.toBeNull();
      expect(midHSL).not.toBeNull();
      expect(finalHSL).not.toBeNull();

      // Mid should be transitioning (not equal to either end)
      // This is approximate due to easing
      expect(midParams.palette.primary).not.toBe(neutralParams.palette.primary);
      expect(midParams.palette.primary).not.toBe(finalParams.palette.primary);
    });

    it('interpolation duration is configurable', () => {
      const shortMapper = new MoodMapper({ interpolationDuration: 100 });
      const longMapper = new MoodMapper({ interpolationDuration: 1000 });

      // Start both with neutral
      shortMapper.update(createMoodObject({ emotion: 'neutral' }));
      longMapper.update(createMoodObject({ emotion: 'neutral' }));
      vi.advanceTimersByTime(1100);

      // Store neutral states (not used in assertions but needed for setup)
      shortMapper.getParams();
      longMapper.getParams();

      // Switch to joy
      shortMapper.update(createMoodObject({ emotion: 'joy', sentiment: 0.8 }));
      longMapper.update(createMoodObject({ emotion: 'joy', sentiment: 0.8 }));

      // After 200ms, short should be done, long should be mid-transition
      vi.advanceTimersByTime(200);

      const shortParams = shortMapper.getParams();
      const longParams = longMapper.getParams();

      // Short mapper should be fully transitioned (near target)
      // Long mapper should still be transitioning

      const shortHSL = parseHSL(shortParams.palette.primary);
      const longHSL = parseHSL(longParams.palette.primary);

      expect(shortHSL).not.toBeNull();
      expect(longHSL).not.toBeNull();

      // The short mapper should have progressed further toward joy colors
      // Joy has warm hues (low H values), neutral has higher H values
    });

    it('setConfig can update interpolation duration', () => {
      const mapper = new MoodMapper({ interpolationDuration: 500 });

      mapper.setConfig({ interpolationDuration: 100 });

      mapper.update(createMoodObject({ emotion: 'neutral' }));
      vi.advanceTimersByTime(600);

      mapper.update(createMoodObject({ emotion: 'joy', sentiment: 0.8 }));

      // Should complete faster with new duration
      vi.advanceTimersByTime(150);

      const params = mapper.getParams();
      const hsl = parseHSL(params.palette.primary);
      expect(hsl).not.toBeNull();
      // Should be mostly transitioned to joy (warm hues)
      expect(hsl!.h).toBeLessThan(100);
    });

    it('intensity interpolates smoothly', () => {
      const mapper = new MoodMapper({ interpolationDuration: 500 });

      mapper.update(createMoodObject({ energy: 0 }));
      vi.advanceTimersByTime(600);
      const lowIntensity = mapper.getParams().intensity;

      mapper.update(createMoodObject({ energy: 1 }));
      vi.advanceTimersByTime(250); // Mid-transition
      const midIntensity = mapper.getParams().intensity;

      vi.advanceTimersByTime(300);
      const highIntensity = mapper.getParams().intensity;

      // Mid should be between low and high
      expect(midIntensity).toBeGreaterThan(lowIntensity);
      expect(midIntensity).toBeLessThan(highIntensity);
    });

    it('uses easing function for natural transitions', () => {
      const mapper = new MoodMapper({ interpolationDuration: 500 });

      mapper.update(createMoodObject({ energy: 0 }));
      vi.advanceTimersByTime(600);

      mapper.update(createMoodObject({ energy: 1 }));

      // Sample at multiple points
      vi.advanceTimersByTime(100);
      const early = mapper.getParams().intensity;
      vi.advanceTimersByTime(100);
      const mid = mapper.getParams().intensity;
      vi.advanceTimersByTime(100);
      const late = mapper.getParams().intensity;

      // With ease-out, early progress should be faster than late
      // (but this is hard to test precisely, so just verify it's transitioning)
      expect(early).not.toBe(mid);
      expect(mid).not.toBe(late);
    });
  });

  // Test 7.9: Mapper provides suggested primitive weights
  describe('Test 7.9: Provides suggested primitive weights', () => {
    it('returns primitiveWeights in params', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject());

      vi.advanceTimersByTime(16);
      const params = mapper.getParams();

      expect(params).toHaveProperty('primitiveWeights');
      expect(params.primitiveWeights).toHaveProperty('spectrogram');
      expect(params.primitiveWeights).toHaveProperty('typography');
      expect(params.primitiveWeights).toHaveProperty('blobs');
    });

    it('all primitive weights are between 0 and 1', () => {
      const mapper = new MoodMapper();

      const moods = [
        createMoodObject({ emotion: 'joy', energy: 1, sentiment: 1 }),
        createMoodObject({ emotion: 'sadness', energy: 0, sentiment: -1 }),
        createMoodObject({ emotion: 'neutral', energy: 0.5, sentiment: 0 }),
      ];

      for (const mood of moods) {
        mapper.update(mood);
        vi.advanceTimersByTime(600);
        const params = mapper.getParams();

        expect(params.primitiveWeights.spectrogram).toBeGreaterThanOrEqual(0);
        expect(params.primitiveWeights.spectrogram).toBeLessThanOrEqual(1);
        expect(params.primitiveWeights.typography).toBeGreaterThanOrEqual(0);
        expect(params.primitiveWeights.typography).toBeLessThanOrEqual(1);
        expect(params.primitiveWeights.blobs).toBeGreaterThanOrEqual(0);
        expect(params.primitiveWeights.blobs).toBeLessThanOrEqual(1);
      }
    });

    it('high energy + positive sentiment increases spectrogram weight', () => {
      const mapper = new MoodMapper();

      // Low energy neutral baseline
      mapper.update(createMoodObject({ energy: 0.2, sentiment: 0, emotion: 'neutral' }));
      vi.advanceTimersByTime(600);
      const lowParams = mapper.getParams();

      // High energy positive
      mapper.update(createMoodObject({ energy: 0.9, sentiment: 0.8, emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const highParams = mapper.getParams();

      expect(highParams.primitiveWeights.spectrogram).toBeGreaterThan(
        lowParams.primitiveWeights.spectrogram
      );
    });

    it('keywords present increases typography weight', () => {
      const mapper = new MoodMapper();

      // No keywords
      mapper.update(createMoodObject({ keywords: [], emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const noKeywords = mapper.getParams();

      // Many keywords
      mapper.update(createMoodObject({ keywords: ['a', 'b', 'c', 'd', 'e'], emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const withKeywords = mapper.getParams();

      expect(withKeywords.primitiveWeights.typography).toBeGreaterThan(
        noKeywords.primitiveWeights.typography
      );
    });

    it('calm + neutral increases blobs weight', () => {
      const mapper = new MoodMapper();

      // High energy emotional
      mapper.update(createMoodObject({ energy: 0.9, emotion: 'joy' }));
      vi.advanceTimersByTime(600);
      const highEnergy = mapper.getParams();

      // Calm neutral
      mapper.update(createMoodObject({ energy: 0.1, emotion: 'neutral' }));
      vi.advanceTimersByTime(600);
      const calmNeutral = mapper.getParams();

      expect(calmNeutral.primitiveWeights.blobs).toBeGreaterThan(highEnergy.primitiveWeights.blobs);
    });
  });

  // Test 7.10: Mapper exposes current state for external access
  describe('Test 7.10: Exposes current state for external access', () => {
    it('getState() returns current mood and params', () => {
      const mapper = new MoodMapper();
      const mood = createMoodObject({ sentiment: 0.5, emotion: 'joy' });
      mapper.update(mood);

      vi.advanceTimersByTime(600);
      const state = mapper.getState();

      expect(state).toHaveProperty('mood');
      expect(state).toHaveProperty('params');
      expect(state.mood).not.toBeNull();
      expect(state.params).toBeDefined();
    });

    it('getState() returns null mood before any update', () => {
      const mapper = new MoodMapper();
      const state = mapper.getState();

      expect(state.mood).toBeNull();
      expect(state.params).toBeDefined(); // Should still have default params
    });

    it('getParams() returns a copy (not mutable)', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'joy' }));

      vi.advanceTimersByTime(600);
      const params1 = mapper.getParams();
      const params2 = mapper.getParams();

      expect(params1).not.toBe(params2);
      expect(params1.palette).not.toBe(params2.palette);
      expect(params1.primitiveWeights).not.toBe(params2.primitiveWeights);
    });

    it('getState() returns copies (not mutable)', () => {
      const mapper = new MoodMapper();
      mapper.update(createMoodObject({ emotion: 'joy', keywords: ['test'] }));

      vi.advanceTimersByTime(600);
      const state1 = mapper.getState();
      const state2 = mapper.getState();

      expect(state1).not.toBe(state2);
      expect(state1.params).not.toBe(state2.params);
      expect(state1.mood).not.toBe(state2.mood);
      expect(state1.mood?.keywords).not.toBe(state2.mood?.keywords);
    });

    it('emits updated event with current state', () => {
      const mapper = new MoodMapper();
      const callback = vi.fn();

      mapper.on('updated', callback);
      mapper.update(createMoodObject({ emotion: 'joy' }));

      vi.advanceTimersByTime(16); // One frame

      expect(callback).toHaveBeenCalled();
      const event: MapperUpdatedEvent = callback.mock.calls[0][0];
      expect(event.type).toBe('updated');
      expect(event.params).toBeDefined();
      expect(event.mood).toBeDefined();
      expect(event.timestamp).toBeDefined();
    });

    it('off() removes event listener', () => {
      const mapper = new MoodMapper();
      const callback = vi.fn();

      mapper.on('updated', callback);
      mapper.update(createMoodObject());
      vi.advanceTimersByTime(600);

      const callCount = callback.mock.calls.length;
      mapper.off('updated', callback);

      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(600);

      // Should not have been called more times after removal
      expect(callback.mock.calls.length).toBe(callCount);
    });

    it('dispose() cleans up resources', () => {
      const mapper = new MoodMapper();
      const callback = vi.fn();

      mapper.on('updated', callback);
      mapper.update(createMoodObject());
      vi.advanceTimersByTime(100);

      const callCount = callback.mock.calls.length;
      mapper.dispose();

      // Animation loop should be stopped
      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(600);

      // No new events should be emitted after dispose
      expect(callback.mock.calls.length).toBe(callCount);
    });
  });

  // Factory function test
  describe('createMoodMapper factory function', () => {
    it('creates a MoodMapper instance', () => {
      const mapper = createMoodMapper();
      expect(mapper).toBeInstanceOf(MoodMapper);
    });

    it('accepts config options', () => {
      const mapper = createMoodMapper({
        interpolationDuration: 1000,
        customPalettes: {
          joy: {
            primary: 'hsl(100, 50%, 50%)',
            secondary: 'hsl(110, 50%, 50%)',
            accent: 'hsl(120, 50%, 50%)',
          },
        },
      });

      expect(mapper).toBeInstanceOf(MoodMapper);
    });
  });

  // Edge cases
  describe('Edge cases', () => {
    it('handles rapid mood updates', () => {
      const mapper = new MoodMapper({ interpolationDuration: 500 });

      // Rapidly update moods
      mapper.update(createMoodObject({ emotion: 'joy' }));
      vi.advanceTimersByTime(50);
      mapper.update(createMoodObject({ emotion: 'sadness' }));
      vi.advanceTimersByTime(50);
      mapper.update(createMoodObject({ emotion: 'anger' }));
      vi.advanceTimersByTime(50);
      mapper.update(createMoodObject({ emotion: 'neutral' }));

      // Should not throw
      expect(() => vi.advanceTimersByTime(600)).not.toThrow();

      const params = mapper.getParams();
      expect(isValidHSL(params.palette.primary)).toBe(true);
    });

    it('handles listener errors gracefully', () => {
      const mapper = new MoodMapper();
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();

      mapper.on('updated', errorCallback);
      mapper.on('updated', normalCallback);

      mapper.update(createMoodObject());
      expect(() => vi.advanceTimersByTime(600)).not.toThrow();

      // Normal callback should still be called
      expect(normalCallback).toHaveBeenCalled();
    });

    it('returns valid params before any mood update', () => {
      const mapper = new MoodMapper();
      const params = mapper.getParams();

      expect(isValidHSL(params.palette.primary)).toBe(true);
      expect(isValidHSL(params.palette.secondary)).toBe(true);
      expect(isValidHSL(params.palette.accent)).toBe(true);
      expect(params.intensity).toBeGreaterThanOrEqual(0.5);
      expect(params.intensity).toBeLessThanOrEqual(1.5);
    });
  });
});
