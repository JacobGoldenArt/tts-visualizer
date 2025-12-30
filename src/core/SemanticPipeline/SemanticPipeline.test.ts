/**
 * SemanticPipeline Tests
 *
 * Tests for the SemanticPipeline class that analyzes conversation text
 * and outputs mood/sentiment data.
 */

import { describe, it, expect, vi } from 'vitest';
import { SemanticPipeline } from './SemanticPipeline';
import { DefaultAnalyzer } from './DefaultAnalyzer';
import type { Analyzer, SemanticAnalyzedEvent } from '@/types/semantic';

describe('SemanticPipeline', () => {
  // Test 3.1: Pipeline accepts text string input via analyze(text) method
  describe('Test 3.1: Pipeline accepts text string input', () => {
    it('accepts text string input via analyze(text) method', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('Hello, this is a test.');

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('returns a promise from analyze()', () => {
      const pipeline = new SemanticPipeline();

      const result = pipeline.analyze('Hello world');

      expect(result).toBeInstanceOf(Promise);
    });

    it('analyze() can be awaited', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('Testing async behavior');

      expect(result).toBeDefined();
    });
  });

  // Test 3.2: Pipeline returns mood object with sentiment (-1 to 1 scale)
  describe('Test 3.2: Sentiment scoring', () => {
    it('returns mood object with sentiment property', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('This is a happy day.');

      expect(result).toHaveProperty('sentiment');
      expect(typeof result.sentiment).toBe('number');
    });

    it('sentiment is within -1 to 1 range for positive text', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I love this! It is wonderful and amazing!');

      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.sentiment).toBeGreaterThan(0); // Should be positive
    });

    it('sentiment is within -1 to 1 range for negative text', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I hate this. It is terrible and awful.');

      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.sentiment).toBeLessThan(0); // Should be negative
    });

    it('neutral text has sentiment near 0', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('The weather is cloudy today.');

      expect(result.sentiment).toBeGreaterThanOrEqual(-0.5);
      expect(result.sentiment).toBeLessThanOrEqual(0.5);
    });
  });

  // Test 3.3: Pipeline returns mood object with energy (0 to 1 scale)
  describe('Test 3.3: Energy scoring', () => {
    it('returns mood object with energy property', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('This is a calm day.');

      expect(result).toHaveProperty('energy');
      expect(typeof result.energy).toBe('number');
    });

    it('energy is within 0 to 1 range', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am running and shouting with excitement!');

      expect(result.energy).toBeGreaterThanOrEqual(0);
      expect(result.energy).toBeLessThanOrEqual(1);
    });

    it('high energy text has energy closer to 1', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('URGENT! WE MUST RUN NOW! THIS IS AMAZING!!! INCREDIBLE!!!');

      expect(result.energy).toBeGreaterThan(0.5);
    });

    it('low energy text has energy closer to 0', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am feeling calm and peaceful. Just relaxed and quiet.');

      expect(result.energy).toBeLessThan(0.5);
    });
  });

  // Test 3.4: Pipeline returns mood object with keywords (array of strings)
  describe('Test 3.4: Keywords extraction', () => {
    it('returns mood object with keywords property', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('The quick brown fox jumps over the lazy dog.');

      expect(result).toHaveProperty('keywords');
      expect(Array.isArray(result.keywords)).toBe(true);
    });

    it('keywords are strings', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('JavaScript programming is fun and exciting.');

      for (const keyword of result.keywords) {
        expect(typeof keyword).toBe('string');
      }
    });

    it('keywords exclude common stop words', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('The quick brown fox jumps over the lazy dog.');

      const stopWords = ['the', 'a', 'an', 'is', 'are', 'over'];
      for (const keyword of result.keywords) {
        expect(stopWords).not.toContain(keyword);
      }
    });
  });

  // Test 3.5: Pipeline identifies basic emotions
  describe('Test 3.5: Basic emotion detection', () => {
    it('identifies joy', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am so happy and joyful today! This is wonderful!');

      expect(result.emotion).toBe('joy');
    });

    it('identifies sadness', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I feel so sad and depressed. My heart is broken.');

      expect(result.emotion).toBe('sadness');
    });

    it('identifies anger', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am furious and angry! This makes me so mad!');

      expect(result.emotion).toBe('anger');
    });

    it('identifies fear', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am scared and afraid. This is terrifying and frightening.');

      expect(result.emotion).toBe('fear');
    });

    it('identifies surprise', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('Wow! I am so surprised and astonished! This is unexpected!');

      expect(result.emotion).toBe('surprise');
    });

    it('returns emotion property in result', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('Just a regular day.');

      expect(result).toHaveProperty('emotion');
      expect(['joy', 'sadness', 'anger', 'fear', 'surprise', 'neutral']).toContain(result.emotion);
    });
  });

  // Test 3.6: Pipeline handles empty string input
  describe('Test 3.6: Empty string handling', () => {
    it('returns neutral mood for empty string', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('');

      expect(result.sentiment).toBe(0);
      expect(result.energy).toBe(0.5);
      expect(result.keywords).toEqual([]);
      expect(result.emotion).toBe('neutral');
    });

    it('returns neutral mood for whitespace-only string', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('   \n\t  ');

      expect(result.sentiment).toBe(0);
      expect(result.emotion).toBe('neutral');
    });

    it('does not throw on empty input', async () => {
      const pipeline = new SemanticPipeline();

      await expect(pipeline.analyze('')).resolves.not.toThrow();
    });
  });

  // Test 3.7: Pipeline handles very long text without timeout
  describe('Test 3.7: Long text handling', () => {
    it('handles 1000+ word text without timeout', async () => {
      const pipeline = new SemanticPipeline();

      // Generate a 1000+ word text
      const words = [
        'happy', 'sad', 'amazing', 'wonderful', 'terrible', 'excited',
        'calm', 'peaceful', 'angry', 'joyful', 'surprised', 'afraid',
        'love', 'hate', 'great', 'awful', 'brilliant', 'horrible',
      ];

      const longText = Array(1200)
        .fill(null)
        .map(() => words[Math.floor(Math.random() * words.length)])
        .join(' ');

      const startTime = Date.now();
      const result = await pipeline.analyze(longText);
      const duration = Date.now() - startTime;

      // Should complete within 5 seconds (generous timeout)
      expect(duration).toBeLessThan(5000);
      expect(result).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });

    it('returns valid mood object for long text', async () => {
      const pipeline = new SemanticPipeline();

      const longText = 'This is a test. '.repeat(500);
      const result = await pipeline.analyze(longText);

      expect(result.sentiment).toBeGreaterThanOrEqual(-1);
      expect(result.sentiment).toBeLessThanOrEqual(1);
      expect(result.energy).toBeGreaterThanOrEqual(0);
      expect(result.energy).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.keywords)).toBe(true);
    });
  });

  // Test 3.8: Analyzer module is swappable via setAnalyzer()
  describe('Test 3.8: Swappable analyzer', () => {
    it('exposes setAnalyzer() method', () => {
      const pipeline = new SemanticPipeline();

      expect(typeof pipeline.setAnalyzer).toBe('function');
    });

    it('can swap to a custom analyzer', async () => {
      const pipeline = new SemanticPipeline();

      const customAnalyzer: Analyzer = {
        analyze: () => ({
          sentiment: 0.99,
          energy: 0.88,
          keywords: ['custom', 'test'],
          emotion: 'joy' as const,
        }),
      };

      pipeline.setAnalyzer(customAnalyzer);
      const result = await pipeline.analyze('Any text');

      expect(result.sentiment).toBe(0.99);
      expect(result.energy).toBe(0.88);
      expect(result.keywords).toEqual(['custom', 'test']);
    });

    it('can swap to an async analyzer', async () => {
      const pipeline = new SemanticPipeline();

      const asyncAnalyzer: Analyzer = {
        analyze: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            sentiment: -0.5,
            energy: 0.3,
            keywords: ['async', 'analyzer'],
            emotion: 'sadness' as const,
          };
        },
      };

      pipeline.setAnalyzer(asyncAnalyzer);
      const result = await pipeline.analyze('Any text');

      expect(result.sentiment).toBe(-0.5);
      expect(result.emotion).toBe('sadness');
    });

    it('getAnalyzer() returns the current analyzer', () => {
      const pipeline = new SemanticPipeline();
      const defaultAnalyzer = pipeline.getAnalyzer();

      expect(defaultAnalyzer).toBeInstanceOf(DefaultAnalyzer);

      const customAnalyzer: Analyzer = {
        analyze: () => ({
          sentiment: 0,
          energy: 0.5,
          keywords: [],
          emotion: 'neutral' as const,
        }),
      };

      pipeline.setAnalyzer(customAnalyzer);
      expect(pipeline.getAnalyzer()).toBe(customAnalyzer);
    });
  });

  // Test 3.9: Default analyzer works without external API calls
  describe('Test 3.9: Default analyzer (no API calls)', () => {
    it('default analyzer does not make network requests', async () => {
      const pipeline = new SemanticPipeline();

      // Mock fetch to detect any network calls
      const originalFetch = globalThis.fetch;
      const fetchSpy = vi.fn();
      globalThis.fetch = fetchSpy;

      try {
        await pipeline.analyze('This is a test of the default analyzer.');

        expect(fetchSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('default analyzer is synchronous (wrapped in promise)', async () => {
      const analyzer = new DefaultAnalyzer();

      const result = analyzer.analyze('Test text');

      // Should return MoodObject directly, not a Promise
      expect(result).not.toBeInstanceOf(Promise);
      expect(result).toHaveProperty('sentiment');
    });

    it('default analyzer uses keyword dictionaries', async () => {
      const pipeline = new SemanticPipeline();

      // Test positive keywords
      const positiveResult = await pipeline.analyze('happy love wonderful amazing');
      expect(positiveResult.sentiment).toBeGreaterThan(0);

      // Test negative keywords
      const negativeResult = await pipeline.analyze('sad hate terrible awful');
      expect(negativeResult.sentiment).toBeLessThan(0);
    });
  });

  // Test 3.10: Pipeline emits 'analyzed' event with mood object
  describe('Test 3.10: Event emission', () => {
    it('emits analyzed event after analysis', async () => {
      const pipeline = new SemanticPipeline();
      const eventCallback = vi.fn();

      pipeline.on('analyzed', eventCallback);
      await pipeline.analyze('Hello world');

      expect(eventCallback).toHaveBeenCalledTimes(1);
    });

    it('analyzed event contains mood object', async () => {
      const pipeline = new SemanticPipeline();
      let receivedEvent: SemanticAnalyzedEvent | null = null;

      pipeline.on('analyzed', (event: SemanticAnalyzedEvent) => {
        receivedEvent = event;
      });

      await pipeline.analyze('I am happy today!');

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('analyzed');
      expect(receivedEvent!.mood).toBeDefined();
      expect(receivedEvent!.mood.sentiment).toBeDefined();
      expect(receivedEvent!.mood.energy).toBeDefined();
      expect(receivedEvent!.mood.keywords).toBeDefined();
      expect(receivedEvent!.mood.emotion).toBeDefined();
    });

    it('analyzed event contains original text', async () => {
      const pipeline = new SemanticPipeline();
      let receivedEvent: SemanticAnalyzedEvent | null = null;

      pipeline.on('analyzed', (event: SemanticAnalyzedEvent) => {
        receivedEvent = event;
      });

      const testText = 'This is the original text.';
      await pipeline.analyze(testText);

      expect(receivedEvent!.text).toBe(testText);
    });

    it('analyzed event contains timestamp', async () => {
      const pipeline = new SemanticPipeline();
      let receivedEvent: SemanticAnalyzedEvent | null = null;

      const beforeTime = Date.now();
      pipeline.on('analyzed', (event: SemanticAnalyzedEvent) => {
        receivedEvent = event;
      });

      await pipeline.analyze('Test');
      const afterTime = Date.now();

      expect(receivedEvent!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(receivedEvent!.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('off() removes event listener', async () => {
      const pipeline = new SemanticPipeline();
      const callback = vi.fn();

      pipeline.on('analyzed', callback);
      await pipeline.analyze('First analysis');
      expect(callback).toHaveBeenCalledTimes(1);

      pipeline.off('analyzed', callback);
      await pipeline.analyze('Second analysis');
      expect(callback).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it('multiple listeners can be registered', async () => {
      const pipeline = new SemanticPipeline();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      pipeline.on('analyzed', callback1);
      pipeline.on('analyzed', callback2);
      await pipeline.analyze('Test');

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });
  });

  // Test 3.11: Keywords array is limited to top 5 most relevant words
  describe('Test 3.11: Keywords limited to top 5', () => {
    it('keywords array has at most 5 elements', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze(
        'JavaScript Python Ruby TypeScript Go Rust Swift Kotlin Java C++ Scala Haskell'
      );

      expect(result.keywords.length).toBeLessThanOrEqual(5);
    });

    it('keywords are sorted by relevance/frequency', async () => {
      const pipeline = new SemanticPipeline();

      // Repeat 'programming' more than other words
      const result = await pipeline.analyze(
        'programming is great. programming is fun. programming is amazing. coding is nice. development is good.'
      );

      // 'programming' appears 3 times, should be first
      expect(result.keywords[0]).toBe('programming');
    });

    it('returns fewer than 5 keywords if text has fewer significant words', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('Hello world');

      expect(result.keywords.length).toBeLessThanOrEqual(2);
    });

    it('empty text returns empty keywords array', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('');

      expect(result.keywords).toEqual([]);
    });
  });

  // Additional tests for edge cases and robustness
  describe('Edge cases', () => {
    it('handles text with only punctuation', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('!!! ??? ... ---');

      expect(result).toBeDefined();
      expect(result.keywords).toEqual([]);
    });

    it('handles text with numbers', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I have 100 reasons to be happy about 2024.');

      expect(result).toBeDefined();
      expect(result.sentiment).toBeGreaterThan(0); // 'happy' is positive
    });

    it('handles text with special characters', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze("It's amazing! @user #hashtag");

      expect(result).toBeDefined();
      expect(result.sentiment).toBeGreaterThan(0); // 'amazing' is positive
    });

    it('handles mixed case text', async () => {
      const pipeline = new SemanticPipeline();

      const result = await pipeline.analyze('I am HAPPY and Happy and happy!');

      expect(result.sentiment).toBeGreaterThan(0);
    });

    it('constructor accepts custom analyzer', () => {
      const customAnalyzer: Analyzer = {
        analyze: () => ({
          sentiment: 0.5,
          energy: 0.5,
          keywords: ['custom'],
          emotion: 'neutral' as const,
        }),
      };

      const pipeline = new SemanticPipeline(customAnalyzer);
      expect(pipeline.getAnalyzer()).toBe(customAnalyzer);
    });

    it('listener errors do not break pipeline', async () => {
      const pipeline = new SemanticPipeline();
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalCallback = vi.fn();

      pipeline.on('analyzed', errorCallback);
      pipeline.on('analyzed', normalCallback);

      await expect(pipeline.analyze('Test')).resolves.not.toThrow();
      expect(normalCallback).toHaveBeenCalled();
    });
  });
});

describe('DefaultAnalyzer', () => {
  describe('Sentiment detection', () => {
    it('detects strongly positive sentiment', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I love this! Amazing wonderful fantastic!');

      expect(result.sentiment).toBeGreaterThan(0.5);
    });

    it('detects strongly negative sentiment', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I hate this! Terrible awful horrible!');

      expect(result.sentiment).toBeLessThan(-0.5);
    });

    it('balanced text has neutral sentiment', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I love some things but hate others.');

      expect(result.sentiment).toBeGreaterThanOrEqual(-0.5);
      expect(result.sentiment).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Energy detection', () => {
    it('exclamation marks increase energy', () => {
      const analyzer = new DefaultAnalyzer();
      const withExclamation = analyzer.analyze('This is exciting!!!');
      const withoutExclamation = analyzer.analyze('This is exciting');

      expect(withExclamation.energy).toBeGreaterThanOrEqual(withoutExclamation.energy);
    });

    it('caps words increase energy', () => {
      const analyzer = new DefaultAnalyzer();
      const withCaps = analyzer.analyze('This is AMAZING and INCREDIBLE');
      const withoutCaps = analyzer.analyze('This is amazing and incredible');

      expect(withCaps.energy).toBeGreaterThanOrEqual(withoutCaps.energy);
    });
  });

  describe('Emotion mapping', () => {
    it('maps positive sentiment + high energy to joy', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I am so happy and joyful! Delighted!');

      expect(result.emotion).toBe('joy');
    });

    it('maps negative sentiment + low energy to sadness', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I feel sad and depressed, lonely and miserable');

      expect(result.emotion).toBe('sadness');
    });

    it('maps negative sentiment + high energy to anger', () => {
      const analyzer = new DefaultAnalyzer();
      const result = analyzer.analyze('I am furious and enraged! So angry!');

      expect(result.emotion).toBe('anger');
    });
  });
});
