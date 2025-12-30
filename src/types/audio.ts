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
