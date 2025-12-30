/**
 * AudioAnalyzer - Processes audio data and extracts frequency spectrum and amplitude
 *
 * Uses Web Audio API AnalyserNode to perform FFT analysis and amplitude measurement.
 * Implements AudioBufferReceiver interface to integrate with AudioAdapter.
 */

import type {
  AudioAnalyzerConfig,
  AudioAnalyzerEventType,
  AudioAnalyzerCallback,
  AnalyzerData,
  IAudioAnalyzer,
  FFTSize,
} from '@/types/audio';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<AudioAnalyzerConfig> = {
  fftSize: 2048,
  smoothingTimeConstant: 0.8,
  attackTime: 10,
  releaseTime: 100,
};

/**
 * Valid FFT sizes
 */
const VALID_FFT_SIZES: FFTSize[] = [256, 512, 1024, 2048];

/**
 * AudioAnalyzer class for real-time audio analysis
 */
export class AudioAnalyzer implements IAudioAnalyzer {
  private _config: Required<AudioAnalyzerConfig>;
  private _audioContext: AudioContext | null = null;
  private _analyserNode: AnalyserNode | null = null;
  private _sourceNode: AudioBufferSourceNode | null = null;
  private _isPaused: boolean = false;
  private _isDestroyed: boolean = false;
  private _animationFrameId: number | null = null;

  // Event listeners
  private _listeners: Set<AudioAnalyzerCallback> = new Set();

  // Cached data arrays
  private _frequencyData: Float32Array;
  private _timeDomainData: Uint8Array;

  // Amplitude smoothing state
  private _currentAmplitude: number = 0;
  private _lastFrameTime: number = 0;

  // Buffer queue for continuous playback
  private _bufferQueue: AudioBuffer[] = [];
  private _isPlaying: boolean = false;

  constructor(config?: Partial<AudioAnalyzerConfig>) {
    // Validate FFT size if provided
    if (config?.fftSize && !VALID_FFT_SIZES.includes(config.fftSize)) {
      throw new Error(`Invalid FFT size: ${config.fftSize}. Must be one of: ${VALID_FFT_SIZES.join(', ')}`);
    }

    this._config = { ...DEFAULT_CONFIG, ...config };

    // Initialize data arrays based on FFT size
    const frequencyBinCount = this._config.fftSize / 2;
    this._frequencyData = new Float32Array(frequencyBinCount);
    this._timeDomainData = new Uint8Array(this._config.fftSize);
  }

  /**
   * Get the current configuration (returns a copy)
   */
  get config(): Required<AudioAnalyzerConfig> {
    return { ...this._config };
  }

  /**
   * Get the number of frequency bins
   */
  get frequencyBinCount(): number {
    return this._config.fftSize / 2;
  }

  /**
   * Check if the analyzer is paused
   */
  get isPaused(): boolean {
    return this._isPaused;
  }

  /**
   * Check if the analyzer has been destroyed
   */
  get isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Get or create the AudioContext (lazy initialization)
   */
  private _getAudioContext(): AudioContext {
    if (this._isDestroyed) {
      throw new Error('Cannot use destroyed AudioAnalyzer');
    }

    if (!this._audioContext) {
      this._audioContext = new AudioContext();
      this._setupAnalyserNode();
    }

    return this._audioContext;
  }

  /**
   * Set up the AnalyserNode with configuration
   */
  private _setupAnalyserNode(): void {
    if (!this._audioContext) return;

    this._analyserNode = this._audioContext.createAnalyser();
    this._analyserNode.fftSize = this._config.fftSize;
    this._analyserNode.smoothingTimeConstant = this._config.smoothingTimeConstant;
  }

  /**
   * Receive an AudioBuffer from the AudioAdapter
   */
  receiveBuffer(buffer: AudioBuffer): void {
    if (this._isDestroyed) return;

    // Queue the buffer for processing
    this._bufferQueue.push(buffer);

    // Start processing if not already running
    if (!this._isPlaying && !this._isPaused) {
      this._playNextBuffer();
    }
  }

  /**
   * Play the next buffer from the queue
   */
  private _playNextBuffer(): void {
    if (this._bufferQueue.length === 0 || this._isPaused || this._isDestroyed) {
      this._isPlaying = false;
      return;
    }

    this._isPlaying = true;
    const buffer = this._bufferQueue.shift()!;
    const audioContext = this._getAudioContext();

    // Create source node for this buffer
    this._sourceNode = audioContext.createBufferSource();
    this._sourceNode.buffer = buffer;

    // Connect source -> analyser -> destination (muted by default for analysis-only)
    if (this._analyserNode) {
      this._sourceNode.connect(this._analyserNode);
      // Note: Not connecting to destination since we're doing analysis only
    }

    // Handle when buffer finishes playing
    this._sourceNode.onended = () => {
      this._playNextBuffer();
    };

    this._sourceNode.start();

    // Start the animation frame loop if not already running
    if (this._animationFrameId === null && !this._isPaused) {
      this._startAnimationLoop();
    }
  }

  /**
   * Start the animation frame loop for data emission
   */
  private _startAnimationLoop(): void {
    if (this._isPaused || this._isDestroyed) return;

    const loop = () => {
      if (this._isPaused || this._isDestroyed) {
        this._animationFrameId = null;
        return;
      }

      this._processFrame();
      this._animationFrameId = requestAnimationFrame(loop);
    };

    this._lastFrameTime = performance.now();
    this._animationFrameId = requestAnimationFrame(loop);
  }

  /**
   * Process a single frame of audio data
   */
  private _processFrame(): void {
    if (!this._analyserNode || this._isPaused || this._isDestroyed) return;

    const now = performance.now();
    const deltaTime = now - this._lastFrameTime;
    this._lastFrameTime = now;

    // Get frequency data from analyser
    this._analyserNode.getFloatFrequencyData(this._frequencyData as Float32Array<ArrayBuffer>);

    // Get time domain data for amplitude calculation
    this._analyserNode.getByteTimeDomainData(this._timeDomainData as Uint8Array<ArrayBuffer>);

    // Calculate instantaneous amplitude from time domain data
    const instantAmplitude = this._calculateInstantAmplitude();

    // Apply attack/release smoothing to amplitude
    this._currentAmplitude = this._smoothAmplitude(
      this._currentAmplitude,
      instantAmplitude,
      deltaTime
    );

    // Emit data to listeners
    this._emitData();
  }

  /**
   * Calculate instantaneous amplitude from time domain data
   */
  private _calculateInstantAmplitude(): number {
    let sum = 0;
    const data = this._timeDomainData;

    for (let i = 0; i < data.length; i++) {
      // Convert from 0-255 to -1 to 1 range
      const normalized = (data[i] - 128) / 128;
      sum += normalized * normalized;
    }

    // RMS (Root Mean Square) amplitude
    const rms = Math.sqrt(sum / data.length);

    // Clamp to 0-1 range
    return Math.min(1, Math.max(0, rms));
  }

  /**
   * Apply attack/release smoothing to amplitude
   */
  private _smoothAmplitude(current: number, target: number, deltaTime: number): number {
    const { attackTime, releaseTime } = this._config;

    // Use attack time when amplitude is increasing, release time when decreasing
    const smoothTime = target > current ? attackTime : releaseTime;

    // Exponential smoothing
    // smoothFactor approaches 1 for instant response, 0 for slow response
    const smoothFactor = 1 - Math.exp(-deltaTime / smoothTime);

    return current + (target - current) * smoothFactor;
  }

  /**
   * Emit data to all listeners
   */
  private _emitData(): void {
    if (this._listeners.size === 0) return;

    const data: AnalyzerData = {
      frequencyData: new Float32Array(this._frequencyData), // Copy to prevent mutation
      amplitude: this._currentAmplitude,
      timestamp: Date.now(),
    };

    for (const callback of this._listeners) {
      try {
        callback(data);
      } catch {
        // Ignore listener errors
      }
    }
  }

  /**
   * Pause the analyzer
   */
  pause(): void {
    if (this._isDestroyed) return;

    this._isPaused = true;

    // Cancel animation frame
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    // Stop current source node
    if (this._sourceNode) {
      try {
        this._sourceNode.stop();
      } catch {
        // Ignore if already stopped
      }
      this._sourceNode = null;
    }

    this._isPlaying = false;
  }

  /**
   * Resume the analyzer
   */
  resume(): void {
    if (this._isDestroyed) return;

    this._isPaused = false;

    // Restart animation loop
    if (this._animationFrameId === null) {
      this._startAnimationLoop();
    }

    // Resume buffer processing
    if (this._bufferQueue.length > 0 && !this._isPlaying) {
      this._playNextBuffer();
    }
  }

  /**
   * Destroy the analyzer and clean up resources
   */
  destroy(): void {
    if (this._isDestroyed) return;

    this._isDestroyed = true;
    this._isPaused = true;

    // Cancel animation frame
    if (this._animationFrameId !== null) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }

    // Stop source node
    if (this._sourceNode) {
      try {
        this._sourceNode.stop();
        this._sourceNode.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
      this._sourceNode = null;
    }

    // Disconnect analyser node
    if (this._analyserNode) {
      try {
        this._analyserNode.disconnect();
      } catch {
        // Ignore errors during cleanup
      }
      this._analyserNode = null;
    }

    // Close audio context
    if (this._audioContext && this._audioContext.state !== 'closed') {
      this._audioContext.close().catch(() => {
        // Ignore close errors
      });
    }
    this._audioContext = null;

    // Clear buffer queue
    this._bufferQueue = [];

    // Clear listeners
    this._listeners.clear();
  }

  /**
   * Get the current frequency data (returns a copy)
   */
  getFrequencyData(): Float32Array {
    return new Float32Array(this._frequencyData);
  }

  /**
   * Get the current normalized amplitude (0-1)
   */
  getAmplitude(): number {
    return this._currentAmplitude;
  }

  /**
   * Register an event listener
   */
  on(event: AudioAnalyzerEventType, callback: AudioAnalyzerCallback): void {
    if (event === 'data') {
      this._listeners.add(callback);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: AudioAnalyzerEventType, callback: AudioAnalyzerCallback): void {
    if (event === 'data') {
      this._listeners.delete(callback);
    }
  }

  /**
   * Static factory method for creating analyzers with specific FFT sizes
   */
  static withFFTSize(fftSize: FFTSize): AudioAnalyzer {
    return new AudioAnalyzer({ fftSize });
  }
}
