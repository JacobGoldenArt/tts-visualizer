/**
 * TranscriptParser Tests (Sprint 006)
 *
 * Tests for the Mock Thread Fixtures feature.
 * Tests 10.1 - 10.7 as specified in current-task.json
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  TranscriptParser,
  parseTranscript,
  getSpeakerRole,
  validateMessageOrder,
  createTranscriptParser,
} from './TranscriptParser';
import {
  MockAudio,
  createMockAudio,
  generateSineWave,
  generateWhiteNoise,
  generateSpeechLike,
} from './MockAudio';
import {
  FixtureLoader,
  createFixtureLoader,
  FIXTURE_TONES,
} from './FixtureLoader';
import type { Message, MoodAnnotation } from '@/types/fixtures';
import type { MoodObject } from '@/types/semantic';

// Path to transcript files
const TRANSCRIPTS_PATH = path.resolve(__dirname, '../../resources/chat_transcripts');

// Sample transcript for basic tests
const SAMPLE_TRANSCRIPT = `
Jacob:

"Hi Elyse, this is a test message."


Elyse:

"Hello Jacob, nice to meet you too."
`;

// Multi-paragraph transcript
const MULTI_PARAGRAPH_TRANSCRIPT = `
Jacob:

"First part of the message."  "Second part continued."


Elyse:

"Response here." "More response."
`;

describe('TranscriptParser', () => {
  // Test 10.1: Transcript parser converts .md files to Message[] JSON format
  describe('Test 10.1: Transcript parser converts .md files to Message[] JSON format', () => {
    it('parses simple transcript to Message array', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(2);
    });

    it('returns objects with role and content properties', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);

      for (const message of messages) {
        expect(message).toHaveProperty('role');
        expect(message).toHaveProperty('content');
        expect(typeof message.role).toBe('string');
        expect(typeof message.content).toBe('string');
      }
    });

    it('extracts content from quoted dialogue', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);

      expect(messages[0].content).toBe('Hi Elyse, this is a test message.');
      expect(messages[1].content).toBe('Hello Jacob, nice to meet you too.');
    });

    it('handles multi-paragraph quotes by joining them', () => {
      const messages = parseTranscript(MULTI_PARAGRAPH_TRANSCRIPT);

      expect(messages[0].content).toBe('First part of the message. Second part continued.');
      expect(messages[1].content).toBe('Response here. More response.');
    });

    it('returns empty array for empty input', () => {
      const messages = parseTranscript('');
      expect(messages).toEqual([]);
    });

    it('returns empty array for whitespace-only input', () => {
      const messages = parseTranscript('   \n\t  ');
      expect(messages).toEqual([]);
    });

    it('TranscriptParser class provides same functionality', () => {
      const parser = new TranscriptParser();
      const messages = parser.parse(SAMPLE_TRANSCRIPT);

      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
    });
  });

  // Test 10.2: Parser correctly identifies speaker (Jacob = user, Elyse = assistant)
  describe('Test 10.2: Parser correctly identifies speaker roles', () => {
    it('maps Jacob to user role', () => {
      const transcript = `Jacob:\n"Hello there."`;
      const messages = parseTranscript(transcript);

      expect(messages[0].role).toBe('user');
    });

    it('maps Elyse to assistant role', () => {
      const transcript = `Elyse:\n"Hello there."`;
      const messages = parseTranscript(transcript);

      expect(messages[0].role).toBe('assistant');
    });

    it('maps Elise (alternate spelling) to assistant role', () => {
      const transcript = `Elise:\n"Hello there."`;
      const messages = parseTranscript(transcript);

      expect(messages[0].role).toBe('assistant');
    });

    it('preserves original speaker name in metadata', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);

      expect(messages[0].metadata?.speaker).toBe('Jacob');
      expect(messages[1].metadata?.speaker).toBe('Elyse');
    });

    it('getSpeakerRole utility works correctly', () => {
      expect(getSpeakerRole('Jacob')).toBe('user');
      expect(getSpeakerRole('jacob')).toBe('user');
      expect(getSpeakerRole('Elyse')).toBe('assistant');
      expect(getSpeakerRole('elyse')).toBe('assistant');
      expect(getSpeakerRole('Elise')).toBe('assistant');
      expect(getSpeakerRole('elise')).toBe('assistant');
    });

    it('handles case-insensitive speaker names', () => {
      const transcript = `JACOB:\n"Test."`;
      const messages = parseTranscript(transcript);

      expect(messages[0].role).toBe('user');
    });
  });

  // Test 10.3: Parser preserves message order and content
  describe('Test 10.3: Parser preserves message order and content', () => {
    it('maintains chronological order of messages', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);

      expect(messages[0].metadata?.index).toBe(0);
      expect(messages[1].metadata?.index).toBe(1);
    });

    it('validateMessageOrder returns true for valid order', () => {
      const messages = parseTranscript(SAMPLE_TRANSCRIPT);
      expect(validateMessageOrder(messages)).toBe(true);
    });

    it('preserves full content without truncation', () => {
      const longDialogue = 'A'.repeat(1000);
      const transcript = `Jacob:\n"${longDialogue}"`;
      const messages = parseTranscript(transcript);

      expect(messages[0].content.length).toBe(1000);
    });

    it('handles conversation with many exchanges', () => {
      const transcript = `
Jacob:
"First"

Elyse:
"Second"

Jacob:
"Third"

Elyse:
"Fourth"

Jacob:
"Fifth"
`;
      const messages = parseTranscript(transcript);

      expect(messages.length).toBe(5);
      expect(messages[0].content).toBe('First');
      expect(messages[4].content).toBe('Fifth');
      expect(validateMessageOrder(messages)).toBe(true);
    });

    it('preserves special characters in content', () => {
      const transcript = `Jacob:\n"Hello! @user #tag & 'quotes' <script>"`;
      const messages = parseTranscript(transcript);

      expect(messages[0].content).toContain('@user');
      expect(messages[0].content).toContain('#tag');
      expect(messages[0].content).toContain('&');
    });
  });

  // Test 10.4: Fixtures load from resources/chat_transcripts/*.md
  describe('Test 10.4: Fixtures load from resources/chat_transcripts/*.md', () => {
    it('can read Elise and Jacob Dialogue.md', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'Elise and Jacob Dialogue.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);

      const messages = parseTranscript(content);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('can read chat-thread1.md', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'chat-thread1.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);

      const messages = parseTranscript(content);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('can read coffee-chat.md', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'coffee-chat.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);

      const messages = parseTranscript(content);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('can read existential-gaps-and-consciousness.md', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'existential-gaps-and-consciousness.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);

      const messages = parseTranscript(content);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('can read onanism.md', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'onanism.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);

      const messages = parseTranscript(content);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('FixtureLoader loads transcript from text', () => {
      const loader = createFixtureLoader();
      const filePath = path.join(TRANSCRIPTS_PATH, 'coffee-chat.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      const fixture = loader.loadFromText('coffee-chat', content);

      expect(fixture.name).toBe('coffee-chat');
      expect(fixture.messages.length).toBeGreaterThan(0);
    });

    it('FixtureLoader.getMessages returns loaded messages', () => {
      const loader = createFixtureLoader();
      const filePath = path.join(TRANSCRIPTS_PATH, 'coffee-chat.md');
      const content = fs.readFileSync(filePath, 'utf-8');

      loader.loadFromText('coffee-chat', content);
      const messages = loader.getMessages('coffee-chat');

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
    });

    it('getAvailableFixtures returns list of fixture names', () => {
      const fixtures = FixtureLoader.getAvailableFixtures();

      expect(fixtures).toContain('elise-and-jacob-dialogue');
      expect(fixtures).toContain('chat-thread1');
      expect(fixtures).toContain('coffee-chat');
      expect(fixtures).toContain('existential-gaps-and-consciousness');
      expect(fixtures).toContain('onanism');
    });
  });

  // Test 10.5: Loaded fixtures include varied emotional tones
  describe('Test 10.5: Loaded fixtures include varied emotional tones', () => {
    it('fixtures have emotional tone metadata', () => {
      const fixtures = FixtureLoader.getAvailableFixtures();

      for (const fixture of fixtures) {
        const tones = FixtureLoader.getFixtureTones(fixture);
        expect(Array.isArray(tones)).toBe(true);
        expect(tones.length).toBeGreaterThan(0);
      }
    });

    it('fixtures cover joy emotional tone', () => {
      const joyFixtures = FixtureLoader.getFixturesByTone('joy');
      expect(joyFixtures.length).toBeGreaterThan(0);
    });

    it('fixtures cover tension emotional tone', () => {
      const tensionFixtures = FixtureLoader.getFixturesByTone('tension');
      expect(tensionFixtures.length).toBeGreaterThan(0);
    });

    it('fixtures cover calm emotional tone', () => {
      const calmFixtures = FixtureLoader.getFixturesByTone('calm');
      expect(calmFixtures.length).toBeGreaterThan(0);
    });

    it('fixtures cover existential emotional tone', () => {
      const existentialFixtures = FixtureLoader.getFixturesByTone('existential');
      expect(existentialFixtures.length).toBeGreaterThan(0);
    });

    it('existential-gaps transcript contains existential content', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'existential-gaps-and-consciousness.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = parseTranscript(content);

      // Check for existential themes in content
      const hasExistentialContent = messages.some(
        (m) =>
          m.content.toLowerCase().includes('consciousness') ||
          m.content.toLowerCase().includes('feeling') ||
          m.content.toLowerCase().includes('exist')
      );

      expect(hasExistentialContent).toBe(true);
    });

    it('coffee-chat transcript contains calm/casual content', () => {
      const filePath = path.join(TRANSCRIPTS_PATH, 'coffee-chat.md');
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = parseTranscript(content);

      // Check for casual conversation markers
      const hasCasualContent = messages.some(
        (m) =>
          m.content.toLowerCase().includes('coffee') ||
          m.content.toLowerCase().includes('lol')
      );

      expect(hasCasualContent).toBe(true);
    });
  });

  // Test 10.6: Audio mock generates synthetic waveform for testing
  describe('Test 10.6: Audio mock generates synthetic waveform', () => {
    it('generateSineWave returns MockAudioData', () => {
      const audio = generateSineWave();

      expect(audio).toHaveProperty('samples');
      expect(audio).toHaveProperty('sampleRate');
      expect(audio).toHaveProperty('duration');
      expect(audio).toHaveProperty('numberOfChannels');
      expect(audio).toHaveProperty('length');
    });

    it('samples is Float32Array', () => {
      const audio = generateSineWave();
      expect(audio.samples).toBeInstanceOf(Float32Array);
    });

    it('default sample rate is 44100', () => {
      const audio = generateSineWave();
      expect(audio.sampleRate).toBe(44100);
    });

    it('respects custom duration', () => {
      const audio = generateSineWave({ duration: 2 });
      expect(audio.duration).toBe(2);
      expect(audio.length).toBe(44100 * 2);
    });

    it('respects custom sample rate', () => {
      const audio = generateSineWave({ sampleRate: 22050 });
      expect(audio.sampleRate).toBe(22050);
    });

    it('samples are within -1 to 1 range', () => {
      const audio = generateSineWave({ amplitude: 1 });

      for (let i = 0; i < audio.length; i++) {
        expect(audio.samples[i]).toBeGreaterThanOrEqual(-1);
        expect(audio.samples[i]).toBeLessThanOrEqual(1);
      }
    });

    it('generateWhiteNoise produces random samples', () => {
      const audio = generateWhiteNoise();

      // Check that samples vary (not all the same)
      const uniqueValues = new Set(audio.samples.slice(0, 100));
      expect(uniqueValues.size).toBeGreaterThan(10);
    });

    it('generateSpeechLike produces varied amplitude', () => {
      const audio = generateSpeechLike({ duration: 1 });

      // Speech-like audio should have amplitude variation
      let min = 1;
      let max = -1;
      for (let i = 0; i < audio.length; i++) {
        min = Math.min(min, audio.samples[i]);
        max = Math.max(max, audio.samples[i]);
      }

      expect(max - min).toBeGreaterThan(0.1);
    });

    it('MockAudio class generates audio correctly', () => {
      const mockAudio = createMockAudio({ duration: 0.5 });
      const audio = mockAudio.generateSineWave();

      expect(audio.duration).toBe(0.5);
      expect(audio.samples.length).toBe(Math.floor(44100 * 0.5));
    });

    it('MockAudio.DEFAULT_SAMPLE_RATE is 44100', () => {
      expect(MockAudio.DEFAULT_SAMPLE_RATE).toBe(44100);
    });

    it('numberOfChannels is always 1 (mono)', () => {
      const sineAudio = generateSineWave();
      const noiseAudio = generateWhiteNoise();
      const speechAudio = generateSpeechLike();

      expect(sineAudio.numberOfChannels).toBe(1);
      expect(noiseAudio.numberOfChannels).toBe(1);
      expect(speechAudio.numberOfChannels).toBe(1);
    });
  });

  // Test 10.7: Fixture loader exposes getMessages() and getMoodAnnotations() methods
  describe('Test 10.7: Fixture loader exposes getMessages() and getMoodAnnotations()', () => {
    let loader: FixtureLoader;

    beforeEach(() => {
      loader = createFixtureLoader();
    });

    it('exposes getMessages() method', () => {
      expect(typeof loader.getMessages).toBe('function');
    });

    it('exposes getMoodAnnotations() method', () => {
      expect(typeof loader.getMoodAnnotations).toBe('function');
    });

    it('getMessages() returns messages for loaded fixture', () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);
      const messages = loader.getMessages('test');

      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBe(2);
    });

    it('getMessages() returns empty array for non-existent fixture', () => {
      const messages = loader.getMessages('non-existent');
      expect(messages).toEqual([]);
    });

    it('getMoodAnnotations() returns empty array before analysis', () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);
      const annotations = loader.getMoodAnnotations('test');
      expect(annotations).toEqual([]);
    });

    it('getMoodAnnotations() returns annotations after analyzeMoods()', async () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);

      // Simple mock analyzer
      const mockAnalyzer = (text: string): MoodObject => ({
        sentiment: text.includes('Hello') ? 0.5 : 0,
        energy: 0.5,
        keywords: text.split(' ').slice(0, 3),
        emotion: 'neutral',
      });

      await loader.analyzeMoods('test', mockAnalyzer);
      const annotations = loader.getMoodAnnotations('test');

      expect(annotations.length).toBe(2);
      expect(annotations[0]).toHaveProperty('messageIndex');
      expect(annotations[0]).toHaveProperty('mood');
    });

    it('mood annotations have correct structure', async () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);

      const mockAnalyzer = (): MoodObject => ({
        sentiment: 0.5,
        energy: 0.6,
        keywords: ['test'],
        emotion: 'joy',
      });

      await loader.analyzeMoods('test', mockAnalyzer);
      const annotations = loader.getMoodAnnotations('test');

      expect(annotations[0].mood).toHaveProperty('sentiment');
      expect(annotations[0].mood).toHaveProperty('energy');
      expect(annotations[0].mood).toHaveProperty('keywords');
      expect(annotations[0].mood).toHaveProperty('emotion');
    });

    it('getMockAudio() returns audio data', () => {
      const audio = loader.getMockAudio();

      expect(audio).toHaveProperty('samples');
      expect(audio).toHaveProperty('sampleRate');
      expect(audio.samples).toBeInstanceOf(Float32Array);
    });

    it('getFixture() returns full fixture object', () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);
      const fixture = loader.getFixture('test');

      expect(fixture).toBeDefined();
      expect(fixture?.name).toBe('test');
      expect(fixture?.messages.length).toBe(2);
    });

    it('isLoaded() returns correct status', () => {
      expect(loader.isLoaded('test')).toBe(false);
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);
      expect(loader.isLoaded('test')).toBe(true);
    });

    it('clearFixture() removes a fixture', () => {
      loader.loadFromText('test', SAMPLE_TRANSCRIPT);
      expect(loader.isLoaded('test')).toBe(true);

      loader.clearFixture('test');
      expect(loader.isLoaded('test')).toBe(false);
    });

    it('clearAll() removes all fixtures', () => {
      loader.loadFromText('test1', SAMPLE_TRANSCRIPT);
      loader.loadFromText('test2', SAMPLE_TRANSCRIPT);

      loader.clearAll();

      expect(loader.isLoaded('test1')).toBe(false);
      expect(loader.isLoaded('test2')).toBe(false);
    });

    it('getLoadedFixtureNames() returns list of loaded fixtures', () => {
      loader.loadFromText('fixture-a', SAMPLE_TRANSCRIPT);
      loader.loadFromText('fixture-b', SAMPLE_TRANSCRIPT);

      const names = loader.getLoadedFixtureNames();

      expect(names).toContain('fixture-a');
      expect(names).toContain('fixture-b');
    });
  });
});

// Integration tests with real transcripts
describe('Integration: Real Transcript Parsing', () => {
  it('parses all 5 transcript files without errors', () => {
    const files = [
      'Elise and Jacob Dialogue.md',
      'chat-thread1.md',
      'coffee-chat.md',
      'existential-gaps-and-consciousness.md',
      'onanism.md',
    ];

    for (const file of files) {
      const filePath = path.join(TRANSCRIPTS_PATH, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = parseTranscript(content);

      expect(messages.length).toBeGreaterThan(0);
      expect(validateMessageOrder(messages)).toBe(true);
    }
  });

  it('all parsed messages have valid roles', () => {
    const files = [
      'Elise and Jacob Dialogue.md',
      'chat-thread1.md',
      'coffee-chat.md',
      'existential-gaps-and-consciousness.md',
      'onanism.md',
    ];

    for (const file of files) {
      const filePath = path.join(TRANSCRIPTS_PATH, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = parseTranscript(content);

      for (const message of messages) {
        expect(['user', 'assistant']).toContain(message.role);
      }
    }
  });

  it('all parsed messages have non-empty content', () => {
    const files = [
      'Elise and Jacob Dialogue.md',
      'chat-thread1.md',
      'coffee-chat.md',
      'existential-gaps-and-consciousness.md',
      'onanism.md',
    ];

    for (const file of files) {
      const filePath = path.join(TRANSCRIPTS_PATH, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const messages = parseTranscript(content);

      for (const message of messages) {
        expect(message.content.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('FixtureLoader can load and analyze a real transcript', async () => {
    const loader = createFixtureLoader();
    const filePath = path.join(TRANSCRIPTS_PATH, 'coffee-chat.md');
    const content = fs.readFileSync(filePath, 'utf-8');

    loader.loadFromText('coffee-chat', content);

    const simpleAnalyzer = (text: string): MoodObject => ({
      sentiment: text.toLowerCase().includes('love') ? 0.8 : 0,
      energy: text.includes('!') ? 0.8 : 0.3,
      keywords: text.split(' ').filter((w) => w.length > 4).slice(0, 5),
      emotion: 'neutral',
    });

    await loader.analyzeMoods('coffee-chat', simpleAnalyzer);

    const messages = loader.getMessages('coffee-chat');
    const annotations = loader.getMoodAnnotations('coffee-chat');

    expect(messages.length).toBeGreaterThan(0);
    expect(annotations.length).toBe(messages.length);
  });
});
