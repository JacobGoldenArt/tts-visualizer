/**
 * Audio types for the Elyse Speech Visualizer
 */

/**
 * Supported audio formats for the adapter
 */
export type AudioFormat = 'pcm' | 'mp3' | 'wav';

/**
 * Configuration for the AudioAdapter
 */
export interface AudioAdapterConfig {
  /** Audio format to expect */
  format: AudioFormat;
  /** Expected sample rate in Hz (default: 44100) */
  sampleRate?: number;
  /** Number of channels: 1 = mono, 2 = stereo (default: 1) */
  channels?: number;
  /** Bit depth for PCM format (default: 16) */
  bitDepth?: 8 | 16 | 32;
}

/**
 * Event types emitted by the AudioAdapter
 */
export type AudioAdapterEventType = 'data' | 'end' | 'error';

/**
 * Event data for 'data' events
 */
export interface AudioDataEvent {
  type: 'data';
  buffer: AudioBuffer;
  timestamp: number;
}

/**
 * Event data for 'end' events
 */
export interface AudioEndEvent {
  type: 'end';
  totalSamples: number;
  duration: number;
}

/**
 * Event data for 'error' events
 */
export interface AudioErrorEvent {
  type: 'error';
  error: Error;
  recoverable: boolean;
}

/**
 * Union of all audio adapter events
 */
export type AudioAdapterEvent = AudioDataEvent | AudioEndEvent | AudioErrorEvent;

/**
 * Callback type for audio events
 */
export type AudioAdapterCallback<T extends AudioAdapterEventType> =
  T extends 'data' ? (event: AudioDataEvent) => void :
  T extends 'end' ? (event: AudioEndEvent) => void :
  T extends 'error' ? (event: AudioErrorEvent) => void :
  never;

/**
 * Target that can receive audio buffers from the adapter
 */
export interface AudioBufferReceiver {
  receiveBuffer(buffer: AudioBuffer): void;
}

/**
 * Interface for the AudioAdapter
 */
export interface IAudioAdapter {
  /** Current configuration */
  readonly config: AudioAdapterConfig;

  /** Whether the adapter is currently processing */
  readonly isProcessing: boolean;

  /** Feed audio data to the adapter */
  feed(chunk: ArrayBuffer | Uint8Array): void;

  /** Signal that the stream is complete */
  end(): void;

  /** Stop processing immediately */
  stop(): void;

  /** Connect to a downstream processor */
  connect(target: AudioNode | AudioBufferReceiver): void;

  /** Disconnect from all targets */
  disconnect(): void;

  /** Register an event listener */
  on<T extends AudioAdapterEventType>(event: T, callback: AudioAdapterCallback<T>): void;

  /** Remove an event listener */
  off<T extends AudioAdapterEventType>(event: T, callback: AudioAdapterCallback<T>): void;
}

// ============================================================
// Audio Analyzer Types
// ============================================================

/**
 * Valid FFT sizes for the AudioAnalyzer
 */
export type FFTSize = 256 | 512 | 1024 | 2048;

/**
 * Configuration for the AudioAnalyzer
 */
export interface AudioAnalyzerConfig {
  /** FFT size (256, 512, 1024, 2048). Default: 2048 */
  fftSize?: FFTSize;
  /** Web Audio smoothing time constant (0-1). Default: 0.8 */
  smoothingTimeConstant?: number;
  /** Amplitude attack time in ms. Default: 10 */
  attackTime?: number;
  /** Amplitude release time in ms. Default: 100 */
  releaseTime?: number;
}

/**
 * Data emitted by the AudioAnalyzer on each frame
 */
export interface AnalyzerData {
  /** FFT frequency data as Float32Array */
  frequencyData: Float32Array;
  /** Normalized amplitude value (0-1) */
  amplitude: number;
  /** Timestamp when this data was captured */
  timestamp: number;
}

/**
 * Event types emitted by the AudioAnalyzer
 */
export type AudioAnalyzerEventType = 'data';

/**
 * Callback type for analyzer events
 */
export type AudioAnalyzerCallback = (data: AnalyzerData) => void;

/**
 * Interface for the AudioAnalyzer
 */
export interface IAudioAnalyzer extends AudioBufferReceiver {
  /** Current configuration (read-only copy) */
  readonly config: Required<AudioAnalyzerConfig>;

  /** Number of frequency bins (fftSize / 2) */
  readonly frequencyBinCount: number;

  /** Whether the analyzer is paused */
  readonly isPaused: boolean;

  /** Whether the analyzer has been destroyed */
  readonly isDestroyed: boolean;

  /** Receive an AudioBuffer from the AudioAdapter */
  receiveBuffer(buffer: AudioBuffer): void;

  /** Pause the analyzer (stops emitting data) */
  pause(): void;

  /** Resume the analyzer (starts emitting data) */
  resume(): void;

  /** Destroy the analyzer and clean up resources */
  destroy(): void;

  /** Get the current frequency data (returns a copy) */
  getFrequencyData(): Float32Array;

  /** Get the current normalized amplitude (0-1) */
  getAmplitude(): number;

  /** Register an event listener */
  on(event: AudioAnalyzerEventType, callback: AudioAnalyzerCallback): void;

  /** Remove an event listener */
  off(event: AudioAnalyzerEventType, callback: AudioAnalyzerCallback): void;
}
