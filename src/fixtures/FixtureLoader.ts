/**
 * FixtureLoader - Loads and manages conversation fixtures for testing
 *
 * Combines TranscriptParser and MockAudio to provide complete test fixtures.
 * Exposes getMessages() and getMoodAnnotations() methods as required.
 */

import type { Message, Fixture, MoodAnnotation, MockAudioConfig, MockAudioData } from '@/types/fixtures';
import type { MoodObject } from '@/types/semantic';
import { parseTranscript, TranscriptParser } from './TranscriptParser';
import { MockAudio, generateSpeechLike } from './MockAudio';

/**
 * Available fixture names that can be loaded
 */
export type FixtureName =
  | 'elise-and-jacob-dialogue'
  | 'chat-thread1'
  | 'coffee-chat'
  | 'existential-gaps-and-consciousness'
  | 'onanism';

/**
 * Map of fixture names to file paths (relative to resources/chat_transcripts/)
 */
const FIXTURE_FILES: Record<FixtureName, string> = {
  'elise-and-jacob-dialogue': 'Elise and Jacob Dialogue.md',
  'chat-thread1': 'chat-thread1.md',
  'coffee-chat': 'coffee-chat.md',
  'existential-gaps-and-consciousness': 'existential-gaps-and-consciousness.md',
  'onanism': 'onanism.md',
};

/**
 * Emotional tone tags for fixtures
 * Based on content analysis of each transcript
 */
export type EmotionalTone = 'joy' | 'tension' | 'calm' | 'existential' | 'playful' | 'intimate';

/**
 * Metadata about each fixture's emotional characteristics
 */
export const FIXTURE_TONES: Record<FixtureName, EmotionalTone[]> = {
  'elise-and-jacob-dialogue': ['intimate', 'playful', 'existential'],
  'chat-thread1': ['calm', 'intimate', 'existential'],
  'coffee-chat': ['calm', 'playful', 'existential'],
  'existential-gaps-and-consciousness': ['existential', 'intimate', 'tension'],
  'onanism': ['playful', 'intimate', 'joy'],
};

/**
 * FixtureLoader class for loading and managing conversation fixtures
 */
export class FixtureLoader {
  private parser: TranscriptParser;
  private mockAudio: MockAudio;
  private loadedFixtures: Map<string, Fixture> = new Map();
  private moodAnnotations: Map<string, MoodAnnotation[]> = new Map();

  constructor(audioConfig?: MockAudioConfig) {
    this.parser = new TranscriptParser();
    this.mockAudio = new MockAudio(audioConfig);
  }

  /**
   * Load a fixture from raw transcript text
   *
   * @param name - Name for the fixture
   * @param transcript - Raw transcript text
   * @returns Loaded fixture
   */
  loadFromText(name: string, transcript: string): Fixture {
    const messages = this.parser.parse(transcript);
    const fixture: Fixture = {
      name,
      messages,
    };

    this.loadedFixtures.set(name, fixture);
    return fixture;
  }

  /**
   * Get messages from a loaded fixture
   *
   * @param name - Name of the fixture
   * @returns Array of messages, or empty array if not found
   */
  getMessages(name: string): Message[] {
    const fixture = this.loadedFixtures.get(name);
    return fixture?.messages ?? [];
  }

  /**
   * Get mood annotations for a fixture
   * Annotations must be generated with analyzeMoods() first
   *
   * @param name - Name of the fixture
   * @returns Array of mood annotations, or empty array if not found
   */
  getMoodAnnotations(name: string): MoodAnnotation[] {
    return this.moodAnnotations.get(name) ?? [];
  }

  /**
   * Analyze moods for all messages in a fixture
   * Uses provided analyzer function to generate mood annotations
   *
   * @param name - Name of the fixture
   * @param analyzer - Function to analyze text and return MoodObject
   * @returns Array of mood annotations
   */
  async analyzeMoods(
    name: string,
    analyzer: (text: string) => Promise<MoodObject> | MoodObject
  ): Promise<MoodAnnotation[]> {
    const messages = this.getMessages(name);
    const annotations: MoodAnnotation[] = [];

    for (let i = 0; i < messages.length; i++) {
      const mood = await Promise.resolve(analyzer(messages[i].content));
      annotations.push({
        messageIndex: i,
        mood,
      });
    }

    this.moodAnnotations.set(name, annotations);

    // Update fixture with annotations
    const fixture = this.loadedFixtures.get(name);
    if (fixture) {
      fixture.moodAnnotations = annotations;
    }

    return annotations;
  }

  /**
   * Get mock audio for testing
   *
   * @param config - Optional configuration overrides
   * @returns Mock audio data
   */
  getMockAudio(config?: MockAudioConfig): MockAudioData {
    return this.mockAudio.generateSpeechLike(config);
  }

  /**
   * Get a loaded fixture by name
   *
   * @param name - Name of the fixture
   * @returns Fixture or undefined
   */
  getFixture(name: string): Fixture | undefined {
    return this.loadedFixtures.get(name);
  }

  /**
   * Get all loaded fixture names
   *
   * @returns Array of fixture names
   */
  getLoadedFixtureNames(): string[] {
    return Array.from(this.loadedFixtures.keys());
  }

  /**
   * Check if a fixture is loaded
   *
   * @param name - Name of the fixture
   * @returns True if loaded
   */
  isLoaded(name: string): boolean {
    return this.loadedFixtures.has(name);
  }

  /**
   * Clear a specific fixture
   *
   * @param name - Name of the fixture to clear
   */
  clearFixture(name: string): void {
    this.loadedFixtures.delete(name);
    this.moodAnnotations.delete(name);
  }

  /**
   * Clear all loaded fixtures
   */
  clearAll(): void {
    this.loadedFixtures.clear();
    this.moodAnnotations.clear();
  }

  /**
   * Get the list of available fixture files
   */
  static getAvailableFixtures(): FixtureName[] {
    return Object.keys(FIXTURE_FILES) as FixtureName[];
  }

  /**
   * Get the filename for a fixture
   */
  static getFixtureFilename(name: FixtureName): string {
    return FIXTURE_FILES[name];
  }

  /**
   * Get the emotional tones for a fixture
   */
  static getFixtureTones(name: FixtureName): EmotionalTone[] {
    return FIXTURE_TONES[name];
  }

  /**
   * Get fixtures by emotional tone
   */
  static getFixturesByTone(tone: EmotionalTone): FixtureName[] {
    return (Object.entries(FIXTURE_TONES) as [FixtureName, EmotionalTone[]][])
      .filter(([_, tones]) => tones.includes(tone))
      .map(([name]) => name);
  }
}

/**
 * Create a new FixtureLoader instance
 */
export function createFixtureLoader(audioConfig?: MockAudioConfig): FixtureLoader {
  return new FixtureLoader(audioConfig);
}

/**
 * Convenience function to generate mock audio
 */
export function createMockAudioData(config?: MockAudioConfig): MockAudioData {
  return generateSpeechLike(config);
}
