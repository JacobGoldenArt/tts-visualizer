/**
 * AudioAdapter - Normalizes streaming audio from various TTS providers
 *
 * Accepts raw PCM, MP3, or WAV audio data and outputs consistent AudioBuffer
 * objects for downstream processing.
 */

import type {
  AudioAdapterConfig,
  AudioAdapterEventType,
  AudioAdapterCallback,
  AudioDataEvent,
  AudioEndEvent,
  AudioErrorEvent,
  AudioBufferReceiver,
  IAudioAdapter,
} from '@/types/audio';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AudioAdapterConfig> = {
  format: 'pcm',
  sampleRate: 44100,
  channels: 1,
  bitDepth: 16,
};

/**
 * AudioAdapter class for normalizing TTS audio streams
 */
export class AudioAdapter implements IAudioAdapter {
  private _config: Required<AudioAdapterConfig>;
  private _isProcessing: boolean = false;
  private _isStopped: boolean = false;
  private _audioContext: AudioContext | null = null;
  private _totalSamples: number = 0;
  private _startTime: number = 0;

  // Event listeners
  private _listeners: Map<AudioAdapterEventType, Set<AudioAdapterCallback<AudioAdapterEventType>>> = new Map();

  // Connected targets
  private _connectedTargets: Set<AudioNode | AudioBufferReceiver> = new Set();

  // Buffer for accumulating chunks (for encoded formats)
  private _pendingChunks: Uint8Array[] = [];

  constructor(config?: Partial<AudioAdapterConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };

    // Initialize listener sets
    this._listeners.set('data', new Set());
    this._listeners.set('end', new Set());
    this._listeners.set('error', new Set());
  }

  /**
   * Get the current configuration
   */
  get config(): AudioAdapterConfig {
    return { ...this._config };
  }

  /**
   * Check if the adapter is currently processing audio
   */
  get isProcessing(): boolean {
    return this._isProcessing;
  }

  /**
   * Get or create the AudioContext (lazy initialization)
   */
  private getAudioContext(): AudioContext {
    if (!this._audioContext) {
      this._audioContext = new AudioContext({
        sampleRate: this._config.sampleRate,
      });
    }
    return this._audioContext;
  }

  /**
   * Feed audio data to the adapter
   */
  feed(chunk: ArrayBuffer | Uint8Array | null | undefined): void {
    // Handle empty/null input gracefully (Test 1.7)
    if (!chunk || (chunk instanceof ArrayBuffer && chunk.byteLength === 0) ||
        (chunk instanceof Uint8Array && chunk.length === 0)) {
      return;
    }

    // Check if stopped
    if (this._isStopped) {
      this.emitError(new Error('Cannot feed data to stopped adapter'), false);
      return;
    }

    // Start processing
    if (!this._isProcessing) {
      this._isProcessing = true;
      this._startTime = Date.now();
    }

    // Convert to Uint8Array if needed
    const data = chunk instanceof ArrayBuffer ? new Uint8Array(chunk) : chunk;

    try {
      switch (this._config.format) {
        case 'pcm':
          this.processPCM(data);
          break;
        case 'mp3':
        case 'wav':
          this.processEncoded(data);
          break;
        default:
          throw new Error(`Unsupported format: ${this._config.format}`);
      }
    } catch (error) {
      this.emitError(error instanceof Error ? error : new Error(String(error)), true);
    }
  }

  /**
   * Process raw PCM audio data
   */
  private processPCM(data: Uint8Array): void {
    const audioContext = this.getAudioContext();
    const { sampleRate, channels, bitDepth } = this._config;

    // Calculate number of samples
    const bytesPerSample = bitDepth / 8;
    const numSamples = Math.floor(data.length / (bytesPerSample * channels));

    if (numSamples === 0) return;

    // Create AudioBuffer
    const audioBuffer = audioContext.createBuffer(channels, numSamples, sampleRate);

    // Convert bytes to float samples
    const dataView = new DataView(data.buffer, data.byteOffset, data.byteLength);

    for (let channel = 0; channel < channels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);

      for (let i = 0; i < numSamples; i++) {
        const byteOffset = (i * channels + channel) * bytesPerSample;

        let sample: number;

        switch (bitDepth) {
          case 8:
            // 8-bit PCM is unsigned, convert to -1 to 1
            sample = (dataView.getUint8(byteOffset) - 128) / 128;
            break;
          case 16:
            // 16-bit PCM is signed little-endian
            sample = dataView.getInt16(byteOffset, true) / 32768;
            break;
          case 32:
            // 32-bit float PCM
            sample = dataView.getFloat32(byteOffset, true);
            break;
          default:
            sample = 0;
        }

        channelData[i] = sample;
      }
    }

    this._totalSamples += numSamples;
    this.emitData(audioBuffer);
  }

  /**
   * Process encoded audio (MP3, WAV)
   */
  private processEncoded(data: Uint8Array): void {
    // Accumulate chunks for decoding
    this._pendingChunks.push(data);

    // For streaming, we try to decode as soon as we have enough data
    // WAV files have headers that indicate data size
    // MP3 can be decoded in frames

    // Attempt to decode accumulated data
    this.decodeAccumulatedData();
  }

  /**
   * Attempt to decode accumulated encoded audio data
   */
  private async decodeAccumulatedData(): Promise<void> {
    if (this._pendingChunks.length === 0) return;

    // Combine all chunks
    const totalLength = this._pendingChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedData = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of this._pendingChunks) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }

    try {
      const audioContext = this.getAudioContext();
      const audioBuffer = await audioContext.decodeAudioData(combinedData.buffer.slice(0));

      // Successfully decoded - clear pending chunks
      this._pendingChunks = [];
      this._totalSamples += audioBuffer.length;
      this.emitData(audioBuffer);
    } catch {
      // Decoding failed - might need more data for complete frames
      // Keep accumulating until end() is called
    }
  }

  /**
   * Signal that the audio stream is complete
   */
  end(): void {
    if (this._isStopped) return;

    // Try to decode any remaining accumulated data for encoded formats
    if (this._pendingChunks.length > 0) {
      this.finalDecode().then(() => {
        this.completeStream();
      }).catch((error) => {
        this.emitError(error instanceof Error ? error : new Error(String(error)), false);
        this.completeStream();
      });
    } else {
      this.completeStream();
    }
  }

  /**
   * Final decode attempt for accumulated data
   */
  private async finalDecode(): Promise<void> {
    if (this._pendingChunks.length === 0) return;

    const totalLength = this._pendingChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combinedData = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of this._pendingChunks) {
      combinedData.set(chunk, offset);
      offset += chunk.length;
    }

    const audioContext = this.getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(combinedData.buffer.slice(0));

    this._pendingChunks = [];
    this._totalSamples += audioBuffer.length;
    this.emitData(audioBuffer);
  }

  /**
   * Complete the stream and emit end event
   */
  private completeStream(): void {
    const duration = this._startTime ? (Date.now() - this._startTime) / 1000 : 0;
    this._isProcessing = false;

    this.emitEnd(this._totalSamples, duration);
  }

  /**
   * Stop processing immediately
   */
  stop(): void {
    this._isStopped = true;
    this._isProcessing = false;
    this._pendingChunks = [];

    // Close audio context if it exists
    if (this._audioContext && this._audioContext.state !== 'closed') {
      this._audioContext.close().catch(() => {
        // Ignore close errors
      });
    }
  }

  /**
   * Connect to a downstream processor
   */
  connect(target: AudioNode | AudioBufferReceiver): void {
    this._connectedTargets.add(target);
  }

  /**
   * Disconnect from all targets
   */
  disconnect(): void {
    this._connectedTargets.clear();
  }

  /**
   * Register an event listener
   */
  on<T extends AudioAdapterEventType>(event: T, callback: AudioAdapterCallback<T>): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.add(callback as AudioAdapterCallback<AudioAdapterEventType>);
    }
  }

  /**
   * Remove an event listener
   */
  off<T extends AudioAdapterEventType>(event: T, callback: AudioAdapterCallback<T>): void {
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.delete(callback as AudioAdapterCallback<AudioAdapterEventType>);
    }
  }

  /**
   * Emit a data event
   */
  private emitData(buffer: AudioBuffer): void {
    const event: AudioDataEvent = {
      type: 'data',
      buffer,
      timestamp: Date.now(),
    };

    // Emit to listeners
    const listeners = this._listeners.get('data');
    if (listeners) {
      for (const callback of listeners) {
        try {
          (callback as AudioAdapterCallback<'data'>)(event);
        } catch {
          // Ignore listener errors
        }
      }
    }

    // Send to connected targets
    for (const target of this._connectedTargets) {
      try {
        if ('receiveBuffer' in target && typeof target.receiveBuffer === 'function') {
          target.receiveBuffer(buffer);
        }
        // AudioNode targets would need different handling in a real implementation
      } catch {
        // Ignore target errors
      }
    }
  }

  /**
   * Emit an end event
   */
  private emitEnd(totalSamples: number, duration: number): void {
    const event: AudioEndEvent = {
      type: 'end',
      totalSamples,
      duration,
    };

    const listeners = this._listeners.get('end');
    if (listeners) {
      for (const callback of listeners) {
        try {
          (callback as AudioAdapterCallback<'end'>)(event);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  /**
   * Emit an error event
   */
  emitError(error: Error, recoverable: boolean): void {
    const event: AudioErrorEvent = {
      type: 'error',
      error,
      recoverable,
    };

    const listeners = this._listeners.get('error');
    if (listeners) {
      for (const callback of listeners) {
        try {
          (callback as AudioAdapterCallback<'error'>)(event);
        } catch {
          // Ignore listener errors
        }
      }
    }
  }

  /**
   * Static factory method for creating adapters with specific configurations
   */
  static forFormat(format: 'pcm' | 'mp3' | 'wav', sampleRate?: number): AudioAdapter {
    return new AudioAdapter({ format, sampleRate });
  }
}
