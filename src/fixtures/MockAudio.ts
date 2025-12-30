/**
 * MockAudio - Generates synthetic audio waveforms for testing
 *
 * Creates AudioBuffer-like data structures without requiring the Web Audio API.
 * Used for testing the visualizer without real TTS audio.
 */

import type { MockAudioConfig, MockAudioData } from '@/types/fixtures';

/**
 * Default configuration for mock audio
 */
const DEFAULT_CONFIG: Required<MockAudioConfig> = {
  duration: 1,
  sampleRate: 44100,
  frequency: 440, // A4 note
  amplitude: 0.5,
};

/**
 * Generate a synthetic sine wave audio buffer
 *
 * @param config - Configuration for audio generation
 * @returns MockAudioData with samples and metadata
 */
export function generateSineWave(config: MockAudioConfig = {}): MockAudioData {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { duration, sampleRate, frequency, amplitude } = mergedConfig;

  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);

  // Generate sine wave samples
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
  }

  return {
    samples,
    sampleRate,
    duration,
    numberOfChannels: 1,
    length,
  };
}

/**
 * Generate white noise audio buffer
 *
 * @param config - Configuration for audio generation
 * @returns MockAudioData with random samples
 */
export function generateWhiteNoise(config: MockAudioConfig = {}): MockAudioData {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { duration, sampleRate, amplitude } = mergedConfig;

  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);

  // Generate random samples
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * (Math.random() * 2 - 1);
  }

  return {
    samples,
    sampleRate,
    duration,
    numberOfChannels: 1,
    length,
  };
}

/**
 * Generate a speech-like waveform (combination of frequencies)
 * More realistic for testing speech visualization
 *
 * @param config - Configuration for audio generation
 * @returns MockAudioData with speech-like samples
 */
export function generateSpeechLike(config: MockAudioConfig = {}): MockAudioData {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { duration, sampleRate, amplitude } = mergedConfig;

  const length = Math.floor(duration * sampleRate);
  const samples = new Float32Array(length);

  // Fundamental frequency (varies like speech)
  const baseFreq = 150; // Average human voice fundamental

  // Generate composite waveform with harmonics and amplitude variation
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // Slow amplitude envelope (simulates words/phrases)
    const envelopeFreq = 2; // ~2 Hz modulation
    const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * envelopeFreq * t);

    // Fundamental + harmonics (typical voice spectrum)
    let sample = 0;
    sample += 0.6 * Math.sin(2 * Math.PI * baseFreq * t); // Fundamental
    sample += 0.3 * Math.sin(2 * Math.PI * baseFreq * 2 * t); // 2nd harmonic
    sample += 0.15 * Math.sin(2 * Math.PI * baseFreq * 3 * t); // 3rd harmonic
    sample += 0.1 * Math.sin(2 * Math.PI * baseFreq * 4 * t); // 4th harmonic

    // Add slight noise for realism
    sample += 0.05 * (Math.random() * 2 - 1);

    // Apply envelope and amplitude
    samples[i] = amplitude * envelope * sample;
  }

  return {
    samples,
    sampleRate,
    duration,
    numberOfChannels: 1,
    length,
  };
}

/**
 * MockAudio class for generating various audio test data
 */
export class MockAudio {
  private config: Required<MockAudioConfig>;

  constructor(config: MockAudioConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate sine wave audio
   */
  generateSineWave(overrides?: Partial<MockAudioConfig>): MockAudioData {
    return generateSineWave({ ...this.config, ...overrides });
  }

  /**
   * Generate white noise audio
   */
  generateWhiteNoise(overrides?: Partial<MockAudioConfig>): MockAudioData {
    return generateWhiteNoise({ ...this.config, ...overrides });
  }

  /**
   * Generate speech-like audio
   */
  generateSpeechLike(overrides?: Partial<MockAudioConfig>): MockAudioData {
    return generateSpeechLike({ ...this.config, ...overrides });
  }

  /**
   * Get the current configuration
   */
  getConfig(): Required<MockAudioConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MockAudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get the default sample rate
   */
  static get DEFAULT_SAMPLE_RATE(): number {
    return DEFAULT_CONFIG.sampleRate;
  }

  /**
   * Get the default duration
   */
  static get DEFAULT_DURATION(): number {
    return DEFAULT_CONFIG.duration;
  }
}

/**
 * Create a new MockAudio instance
 */
export function createMockAudio(config?: MockAudioConfig): MockAudio {
  return new MockAudio(config);
}
