/**
 * Mock Thread Fixtures module exports
 *
 * Provides tools for parsing conversation transcripts, generating mock audio,
 * and loading fixtures for testing and development.
 */

// TranscriptParser exports
export {
  TranscriptParser,
  createTranscriptParser,
  parseTranscript,
  getSpeakerRole,
  validateMessageOrder,
} from './TranscriptParser';

// MockAudio exports
export {
  MockAudio,
  createMockAudio,
  generateSineWave,
  generateWhiteNoise,
  generateSpeechLike,
} from './MockAudio';

// FixtureLoader exports
export {
  FixtureLoader,
  createFixtureLoader,
  createMockAudioData,
  FIXTURE_TONES,
} from './FixtureLoader';

export type { FixtureName, EmotionalTone } from './FixtureLoader';

// Re-export types
export type {
  Message,
  MessageRole,
  MessageMetadata,
  Fixture,
  MoodAnnotation,
  MockAudioConfig,
  MockAudioData,
} from '@/types/fixtures';
