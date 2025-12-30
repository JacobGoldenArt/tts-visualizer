/**
 * Types for Mock Thread Fixtures
 *
 * Types for parsing conversation transcripts and generating test fixtures.
 */

import type { MoodObject } from './semantic';

/**
 * Role of a message sender
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Message metadata
 */
export interface MessageMetadata {
  /** Original speaker name (Jacob, Elyse, Elise) */
  speaker: string;
  /** Message order in conversation (0-indexed) */
  index: number;
}

/**
 * A single message in a conversation
 */
export interface Message {
  /** Role of the speaker */
  role: MessageRole;
  /** Message content (dialogue text) */
  content: string;
  /** Optional metadata */
  metadata?: MessageMetadata;
}

/**
 * Mood annotation for a message
 */
export interface MoodAnnotation {
  /** Index of the message this annotation applies to */
  messageIndex: number;
  /** Mood analysis result */
  mood: MoodObject;
}

/**
 * A complete fixture containing messages and optional mood annotations
 */
export interface Fixture {
  /** Name of the fixture (usually filename without extension) */
  name: string;
  /** Array of messages in the conversation */
  messages: Message[];
  /** Optional mood annotations for messages */
  moodAnnotations?: MoodAnnotation[];
}

/**
 * Configuration for mock audio generation
 */
export interface MockAudioConfig {
  /** Duration in seconds (default: 1) */
  duration?: number;
  /** Sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** Frequency of the sine wave in Hz (default: 440) */
  frequency?: number;
  /** Amplitude of the waveform (0-1, default: 0.5) */
  amplitude?: number;
}

/**
 * Mock audio data structure
 */
export interface MockAudioData {
  /** Audio samples (Float32Array) */
  samples: Float32Array;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
  /** Number of channels (always 1 for mono) */
  numberOfChannels: number;
  /** Total number of samples */
  length: number;
}
