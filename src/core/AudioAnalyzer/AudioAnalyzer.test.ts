/**
 * AudioAnalyzer Tests
 *
 * Tests for the AudioAnalyzer class that processes audio data
 * and extracts frequency spectrum and amplitude values.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioAnalyzer } from './AudioAnalyzer';
import type { AnalyzerData } from '@/types/audio';

// Mock AudioBuffer class
class MockAudioBuffer {
  readonly numberOfChannels: number;
  readonly length: number;
  readonly sampleRate: number;
  readonly duration: number;
  private _channelData: Float32Array[];

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.numberOfChannels = options.numberOfChannels;
    this.length = options.length;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this._channelData = [];

    for (let i = 0; i < options.numberOfChannels; i++) {
      this._channelData.push(new Float32Array(options.length));
    }
  }

  getChannelData(channel: number): Float32Array {
    if (channel < 0 || channel >= this.numberOfChannels) {
      throw new Error(`Channel index ${channel} out of bounds`);
    }
    return this._channelData[channel];
  }
}

// Mock AnalyserNode class
class MockAnalyserNode {
  fftSize: number = 2048;
  smoothingTimeConstant: number = 0.8;
  readonly frequencyBinCount: number;

  // Simulated data for testing
  private _mockFrequencyData: Float32Array;
  private _mockTimeDomainData: Uint8Array;

  constructor() {
    this.frequencyBinCount = this.fftSize / 2;
    this._mockFrequencyData = new Float32Array(this.frequencyBinCount);
    this._mockTimeDomainData = new Uint8Array(this.fftSize);

    // Initialize with some default values
    this._initMockData();
  }

  private _initMockData(): void {
    // Fill frequency data with typical FFT values (dB scale, -100 to 0)
    for (let i = 0; i < this._mockFrequencyData.length; i++) {
      this._mockFrequencyData[i] = -50 + Math.sin(i * 0.1) * 30;
    }

    // Fill time domain with centered audio samples (128 = silence)
    for (let i = 0; i < this._mockTimeDomainData.length; i++) {
      this._mockTimeDomainData[i] = 128 + Math.sin(i * 0.1) * 50;
    }
  }

  getFloatFrequencyData(array: Float32Array): void {
    // Ensure array matches expected size
    const copyLength = Math.min(array.length, this._mockFrequencyData.length);
    for (let i = 0; i < copyLength; i++) {
      array[i] = this._mockFrequencyData[i];
    }
  }

  getByteTimeDomainData(array: Uint8Array): void {
    const copyLength = Math.min(array.length, this._mockTimeDomainData.length);
    for (let i = 0; i < copyLength; i++) {
      array[i] = this._mockTimeDomainData[i];
    }
  }

  // Simulate silence (for test 2.7)
  setZeroData(): void {
    this._mockFrequencyData.fill(-Infinity);
    this._mockTimeDomainData.fill(128); // 128 = center = silence
  }

  // Simulate audio (restore mock data)
  setActiveData(): void {
    this._initMockData();
  }

  connect(): void {
    // Mock connection
  }

  disconnect(): void {
    // Mock disconnection
  }
}

// Mock AudioBufferSourceNode class
class MockAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  private _stopped: boolean = false;

  connect(): void {
    // Mock connection
  }

  disconnect(): void {
    // Mock disconnection
  }

  start(): void {
    // Simulate buffer end after a short delay
    setTimeout(() => {
      if (!this._stopped && this.onended) {
        this.onended();
      }
    }, 10);
  }

  stop(): void {
    this._stopped = true;
  }
}

// Mock AudioContext class
class MockAudioContext {
  readonly sampleRate: number;
  state: AudioContextState = 'running';
  private _analyserNode: MockAnalyserNode | null = null;
  private _sourceNodes: MockAudioBufferSourceNode[] = [];

  constructor(options?: AudioContextOptions) {
    this.sampleRate = options?.sampleRate ?? 44100;
  }

  createAnalyser(): AnalyserNode {
    this._analyserNode = new MockAnalyserNode();
    return this._analyserNode as unknown as AnalyserNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const sourceNode = new MockAudioBufferSourceNode();
    this._sourceNodes.push(sourceNode);
    return sourceNode as unknown as AudioBufferSourceNode;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate }) as unknown as AudioBuffer;
  }

  async close(): Promise<void> {
    this.state = 'closed';
    return Promise.resolve();
  }

  // Test helper to access the analyser node
  getAnalyserNode(): MockAnalyserNode | null {
    return this._analyserNode;
  }
}

// Store original globals
const originalAudioContext = globalThis.AudioContext;
const originalAudioBuffer = globalThis.AudioBuffer;
const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
const originalPerformance = globalThis.performance;

// Mock requestAnimationFrame for controlled testing
let rafCallbacks: ((time: number) => void)[] = [];
let rafId = 0;

const mockRequestAnimationFrame = (callback: (time: number) => void): number => {
  rafCallbacks.push(callback);
  return ++rafId;
};

const mockCancelAnimationFrame = (id: number): void => {
  // Just clear all callbacks for simplicity
  if (id > 0) {
    rafCallbacks = [];
  }
};

// Trigger one frame of animation
const triggerAnimationFrame = (time: number = 16): void => {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach(cb => cb(time));
};

beforeEach(() => {
  (globalThis as any).AudioContext = MockAudioContext;
  (globalThis as any).AudioBuffer = MockAudioBuffer;
  (globalThis as any).requestAnimationFrame = mockRequestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = mockCancelAnimationFrame;

  // Reset RAF state
  rafCallbacks = [];
  rafId = 0;
});

afterEach(() => {
  globalThis.AudioContext = originalAudioContext;
  globalThis.AudioBuffer = originalAudioBuffer;
  globalThis.requestAnimationFrame = originalRequestAnimationFrame;
  globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
  globalThis.performance = originalPerformance;
});

/**
 * Helper function to create a mock AudioBuffer
 */
function createMockAudioBuffer(
  options: { numSamples?: number; sampleRate?: number; channels?: number } = {}
): AudioBuffer {
  const { numSamples = 1024, sampleRate = 44100, channels = 1 } = options;
  return new MockAudioBuffer({
    numberOfChannels: channels,
    length: numSamples,
    sampleRate,
  }) as unknown as AudioBuffer;
}

describe('AudioAnalyzer', () => {
  // Test 2.1: Analyzer receives AudioBuffer from Audio Adapter
  describe('Test 2.1: Analyzer receives AudioBuffer from Audio Adapter', () => {
    it('implements AudioBufferReceiver interface with receiveBuffer method', () => {
      const analyzer = new AudioAnalyzer();
      expect(typeof analyzer.receiveBuffer).toBe('function');
    });

    it('accepts AudioBuffer via receiveBuffer method without throwing', () => {
      const analyzer = new AudioAnalyzer();
      const buffer = createMockAudioBuffer();

      expect(() => analyzer.receiveBuffer(buffer)).not.toThrow();

      analyzer.destroy();
    });

    it('can be connected to AudioAdapter.connect() pattern', () => {
      const analyzer = new AudioAnalyzer();

      // Simulate AudioAdapter.connect() behavior
      const mockAdapter = {
        connect: (receiver: { receiveBuffer: (buffer: AudioBuffer) => void }) => {
          receiver.receiveBuffer(createMockAudioBuffer());
        },
      };

      expect(() => mockAdapter.connect(analyzer)).not.toThrow();

      analyzer.destroy();
    });
  });

  // Test 2.2: Analyzer outputs frequency data as Float32Array (FFT)
  describe('Test 2.2: Analyzer outputs frequency data as Float32Array (FFT)', () => {
    it('getFrequencyData returns Float32Array', () => {
      const analyzer = new AudioAnalyzer();
      const frequencyData = analyzer.getFrequencyData();

      expect(frequencyData).toBeInstanceOf(Float32Array);

      analyzer.destroy();
    });

    it('frequency data is included in data events', async () => {
      const analyzer = new AudioAnalyzer({ fftSize: 512 });
      let receivedData: AnalyzerData | null = null;

      analyzer.on('data', (data: AnalyzerData) => {
        receivedData = data;
      });

      analyzer.receiveBuffer(createMockAudioBuffer());

      // Trigger animation frame to process data
      await new Promise(resolve => setTimeout(resolve, 20));
      triggerAnimationFrame(16);

      expect(receivedData).not.toBeNull();
      expect(receivedData!.frequencyData).toBeInstanceOf(Float32Array);

      analyzer.destroy();
    });

    it('frequency data in events is a copy (not reference to internal array)', async () => {
      const analyzer = new AudioAnalyzer({ fftSize: 256 });
      const receivedArrays: Float32Array[] = [];

      analyzer.on('data', (data: AnalyzerData) => {
        receivedArrays.push(data.frequencyData);
      });

      analyzer.receiveBuffer(createMockAudioBuffer());
      await new Promise(resolve => setTimeout(resolve, 20));
      triggerAnimationFrame(16);

      // Get internal array
      const internalArray = analyzer.getFrequencyData();

      // Modify received array
      if (receivedArrays.length > 0) {
        receivedArrays[0][0] = 999;
      }

      // Internal array should not be affected
      expect(internalArray[0]).not.toBe(999);

      analyzer.destroy();
    });
  });

  // Test 2.3: Analyzer outputs current amplitude as normalized 0-1 value
  describe('Test 2.3: Analyzer outputs current amplitude as normalized 0-1 value', () => {
    it('getAmplitude returns a number', () => {
      const analyzer = new AudioAnalyzer();
      const amplitude = analyzer.getAmplitude();

      expect(typeof amplitude).toBe('number');

      analyzer.destroy();
    });

    it('amplitude is initially 0', () => {
      const analyzer = new AudioAnalyzer();
      const amplitude = analyzer.getAmplitude();

      expect(amplitude).toBe(0);

      analyzer.destroy();
    });

    it('amplitude is included in data events', async () => {
      const analyzer = new AudioAnalyzer();
      let receivedData: AnalyzerData | null = null;

      analyzer.on('data', (data: AnalyzerData) => {
        receivedData = data;
      });

      analyzer.receiveBuffer(createMockAudioBuffer());
      await new Promise(resolve => setTimeout(resolve, 20));
      triggerAnimationFrame(16);

      expect(receivedData).not.toBeNull();
      expect(typeof receivedData!.amplitude).toBe('number');

      analyzer.destroy();
    });

    it('amplitude is normalized between 0 and 1', async () => {
      const analyzer = new AudioAnalyzer();
      let receivedData: AnalyzerData | null = null;

      analyzer.on('data', (data: AnalyzerData) => {
        receivedData = data;
      });

      analyzer.receiveBuffer(createMockAudioBuffer());
      await new Promise(resolve => setTimeout(resolve, 20));
      triggerAnimationFrame(16);

      if (receivedData !== null) {
        expect((receivedData as AnalyzerData).amplitude).toBeGreaterThanOrEqual(0);
        expect((receivedData as AnalyzerData).amplitude).toBeLessThanOrEqual(1);
      }

      analyzer.destroy();
    });
  });

  // Test 2.4: Analyzer emits data at consistent frame rate (~60fps or requestAnimationFrame)
  describe('Test 2.4: Analyzer emits data at consistent frame rate', () => {
    it('uses requestAnimationFrame for data emission', () => {
      const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
      const analyzer = new AudioAnalyzer();

      analyzer.receiveBuffer(createMockAudioBuffer());

      // Should have called requestAnimationFrame
      expect(rafSpy).toHaveBeenCalled();

      analyzer.destroy();
      rafSpy.mockRestore();
    });

    it('emits data events at each animation frame', async () => {
      const analyzer = new AudioAnalyzer();
      const dataCallback = vi.fn();

      analyzer.on('data', dataCallback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));

      // Trigger multiple frames
      triggerAnimationFrame(16);
      triggerAnimationFrame(32);
      triggerAnimationFrame(48);

      expect(dataCallback).toHaveBeenCalled();

      analyzer.destroy();
    });

    it('data events include timestamp', async () => {
      const analyzer = new AudioAnalyzer();
      let receivedData: AnalyzerData | null = null;

      analyzer.on('data', (data: AnalyzerData) => {
        receivedData = data;
      });

      analyzer.receiveBuffer(createMockAudioBuffer());
      await new Promise(resolve => setTimeout(resolve, 20));
      triggerAnimationFrame(16);

      expect(receivedData).not.toBeNull();
      expect(typeof receivedData!.timestamp).toBe('number');

      analyzer.destroy();
    });
  });

  // Test 2.5: Frequency data contains at least 64 bands
  describe('Test 2.5: Frequency data contains at least 64 bands', () => {
    it('default FFT size produces at least 64 frequency bands', () => {
      const analyzer = new AudioAnalyzer(); // Default FFT size is 2048
      const frequencyData = analyzer.getFrequencyData();

      expect(frequencyData.length).toBeGreaterThanOrEqual(64);

      analyzer.destroy();
    });

    it('frequencyBinCount property returns correct value', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 512 });

      // FFT size 512 = 256 bins
      expect(analyzer.frequencyBinCount).toBe(256);
      expect(analyzer.frequencyBinCount).toBeGreaterThanOrEqual(64);

      analyzer.destroy();
    });

    it('minimum supported FFT size (256) still produces at least 64 bands', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 256 });
      const frequencyData = analyzer.getFrequencyData();

      // FFT size 256 = 128 bins
      expect(frequencyData.length).toBe(128);
      expect(frequencyData.length).toBeGreaterThanOrEqual(64);

      analyzer.destroy();
    });
  });

  // Test 2.6: Analyzer exposes configurable FFT size (256, 512, 1024, 2048)
  describe('Test 2.6: Analyzer exposes configurable FFT size', () => {
    it('accepts FFT size 256', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 256 });
      expect(analyzer.config.fftSize).toBe(256);
      expect(analyzer.frequencyBinCount).toBe(128);
      analyzer.destroy();
    });

    it('accepts FFT size 512', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 512 });
      expect(analyzer.config.fftSize).toBe(512);
      expect(analyzer.frequencyBinCount).toBe(256);
      analyzer.destroy();
    });

    it('accepts FFT size 1024', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 1024 });
      expect(analyzer.config.fftSize).toBe(1024);
      expect(analyzer.frequencyBinCount).toBe(512);
      analyzer.destroy();
    });

    it('accepts FFT size 2048', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 2048 });
      expect(analyzer.config.fftSize).toBe(2048);
      expect(analyzer.frequencyBinCount).toBe(1024);
      analyzer.destroy();
    });

    it('defaults to FFT size 2048 when not specified', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.config.fftSize).toBe(2048);
      analyzer.destroy();
    });

    it('throws error for invalid FFT size', () => {
      expect(() => new AudioAnalyzer({ fftSize: 128 as any })).toThrow();
      expect(() => new AudioAnalyzer({ fftSize: 4096 as any })).toThrow();
      expect(() => new AudioAnalyzer({ fftSize: 100 as any })).toThrow();
    });

    it('static factory method withFFTSize works correctly', () => {
      const analyzer = AudioAnalyzer.withFFTSize(512);
      expect(analyzer.config.fftSize).toBe(512);
      expect(analyzer.frequencyBinCount).toBe(256);
      analyzer.destroy();
    });
  });

  // Test 2.7: Analyzer continues outputting zero values when no audio is playing
  describe('Test 2.7: Analyzer continues outputting zero values when no audio is playing', () => {
    it('outputs zero amplitude when no audio is playing', () => {
      const analyzer = new AudioAnalyzer();

      // Without receiving any buffer, amplitude should be 0
      expect(analyzer.getAmplitude()).toBe(0);

      analyzer.destroy();
    });

    it('frequency data array is initialized to valid values', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 256 });
      const frequencyData = analyzer.getFrequencyData();

      // Array should exist and have correct length
      expect(frequencyData.length).toBe(128);

      // Should be initialized (not NaN or undefined)
      expect(frequencyData[0]).not.toBeNaN();

      analyzer.destroy();
    });

    it('continues emitting data events even when audio stops', async () => {
      const analyzer = new AudioAnalyzer();
      const dataCallback = vi.fn();

      analyzer.on('data', dataCallback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 30));

      // Trigger multiple frames
      triggerAnimationFrame(16);
      triggerAnimationFrame(32);

      // Should continue calling even without new audio
      expect(dataCallback.mock.calls.length).toBeGreaterThanOrEqual(1);

      analyzer.destroy();
    });
  });

  // Test 2.8: Analyzer can be paused and resumed
  describe('Test 2.8: Analyzer can be paused and resumed', () => {
    it('exposes pause() method', () => {
      const analyzer = new AudioAnalyzer();
      expect(typeof analyzer.pause).toBe('function');
      analyzer.destroy();
    });

    it('exposes resume() method', () => {
      const analyzer = new AudioAnalyzer();
      expect(typeof analyzer.resume).toBe('function');
      analyzer.destroy();
    });

    it('isPaused is false by default', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.isPaused).toBe(false);
      analyzer.destroy();
    });

    it('isPaused becomes true after pause()', () => {
      const analyzer = new AudioAnalyzer();
      analyzer.pause();
      expect(analyzer.isPaused).toBe(true);
      analyzer.destroy();
    });

    it('isPaused becomes false after resume()', () => {
      const analyzer = new AudioAnalyzer();
      analyzer.pause();
      expect(analyzer.isPaused).toBe(true);
      analyzer.resume();
      expect(analyzer.isPaused).toBe(false);
      analyzer.destroy();
    });

    it('pause() stops data emission', async () => {
      const analyzer = new AudioAnalyzer();
      const dataCallback = vi.fn();

      analyzer.on('data', dataCallback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(16);

      const callCountBeforePause = dataCallback.mock.calls.length;
      analyzer.pause();

      // Trigger more frames
      triggerAnimationFrame(32);
      triggerAnimationFrame(48);

      // Should not have more calls after pause
      expect(dataCallback.mock.calls.length).toBe(callCountBeforePause);

      analyzer.destroy();
    });

    it('resume() restarts data emission', async () => {
      const analyzer = new AudioAnalyzer();
      const dataCallback = vi.fn();

      analyzer.on('data', dataCallback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(16);

      analyzer.pause();
      const callCountAfterPause = dataCallback.mock.calls.length;

      analyzer.resume();
      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(64);

      // Should have more calls after resume
      expect(dataCallback.mock.calls.length).toBeGreaterThan(callCountAfterPause);

      analyzer.destroy();
    });
  });

  // Test 2.9: Analyzer properly disconnects and cleans up on destroy()
  describe('Test 2.9: Analyzer properly disconnects and cleans up on destroy()', () => {
    it('exposes destroy() method', () => {
      const analyzer = new AudioAnalyzer();
      expect(typeof analyzer.destroy).toBe('function');
      analyzer.destroy();
    });

    it('isDestroyed is false by default', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.isDestroyed).toBe(false);
      analyzer.destroy();
    });

    it('isDestroyed becomes true after destroy()', () => {
      const analyzer = new AudioAnalyzer();
      analyzer.destroy();
      expect(analyzer.isDestroyed).toBe(true);
    });

    it('destroy() stops animation frame loop', () => {
      const cancelRAFSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
      const analyzer = new AudioAnalyzer();

      analyzer.receiveBuffer(createMockAudioBuffer());
      analyzer.destroy();

      expect(cancelRAFSpy).toHaveBeenCalled();
      cancelRAFSpy.mockRestore();
    });

    it('destroy() clears event listeners', () => {
      const analyzer = new AudioAnalyzer();
      const dataCallback = vi.fn();

      analyzer.on('data', dataCallback);
      analyzer.destroy();

      // Attempting to receive buffer after destroy should not trigger callback
      try {
        analyzer.receiveBuffer(createMockAudioBuffer());
      } catch {
        // Expected - may throw since destroyed
      }

      // Animation frame won't trigger since destroyed
      triggerAnimationFrame(16);

      // Callback should not have been called
      expect(dataCallback).not.toHaveBeenCalled();
    });

    it('destroy() can be called multiple times without error', () => {
      const analyzer = new AudioAnalyzer();

      expect(() => {
        analyzer.destroy();
        analyzer.destroy();
        analyzer.destroy();
      }).not.toThrow();
    });

    it('receiveBuffer is ignored after destroy()', () => {
      const analyzer = new AudioAnalyzer();
      analyzer.destroy();

      // Should not throw, just ignore
      expect(() => analyzer.receiveBuffer(createMockAudioBuffer())).not.toThrow();
    });

    it('pause() and resume() are ignored after destroy()', () => {
      const analyzer = new AudioAnalyzer();
      analyzer.destroy();

      expect(() => {
        analyzer.pause();
        analyzer.resume();
      }).not.toThrow();
    });
  });

  // Test 2.10: Amplitude smoothing is configurable (attack/release time)
  describe('Test 2.10: Amplitude smoothing is configurable', () => {
    it('accepts attackTime configuration', () => {
      const analyzer = new AudioAnalyzer({ attackTime: 20 });
      expect(analyzer.config.attackTime).toBe(20);
      analyzer.destroy();
    });

    it('accepts releaseTime configuration', () => {
      const analyzer = new AudioAnalyzer({ releaseTime: 200 });
      expect(analyzer.config.releaseTime).toBe(200);
      analyzer.destroy();
    });

    it('defaults attackTime to 10ms', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.config.attackTime).toBe(10);
      analyzer.destroy();
    });

    it('defaults releaseTime to 100ms', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.config.releaseTime).toBe(100);
      analyzer.destroy();
    });

    it('accepts smoothingTimeConstant for Web Audio API', () => {
      const analyzer = new AudioAnalyzer({ smoothingTimeConstant: 0.5 });
      expect(analyzer.config.smoothingTimeConstant).toBe(0.5);
      analyzer.destroy();
    });

    it('defaults smoothingTimeConstant to 0.8', () => {
      const analyzer = new AudioAnalyzer();
      expect(analyzer.config.smoothingTimeConstant).toBe(0.8);
      analyzer.destroy();
    });

    it('config getter returns a copy (immutable)', () => {
      const analyzer = new AudioAnalyzer({ attackTime: 50, releaseTime: 150 });
      const config1 = analyzer.config;
      const config2 = analyzer.config;

      // Should be different objects
      expect(config1).not.toBe(config2);

      // But with same values
      expect(config1).toEqual(config2);

      analyzer.destroy();
    });

    it('accepts all config options together', () => {
      const analyzer = new AudioAnalyzer({
        fftSize: 512,
        smoothingTimeConstant: 0.6,
        attackTime: 5,
        releaseTime: 50,
      });

      expect(analyzer.config.fftSize).toBe(512);
      expect(analyzer.config.smoothingTimeConstant).toBe(0.6);
      expect(analyzer.config.attackTime).toBe(5);
      expect(analyzer.config.releaseTime).toBe(50);

      analyzer.destroy();
    });
  });

  // Additional edge case tests
  describe('Edge cases', () => {
    it('handles multiple buffers in sequence', () => {
      const analyzer = new AudioAnalyzer();

      expect(() => {
        analyzer.receiveBuffer(createMockAudioBuffer());
        analyzer.receiveBuffer(createMockAudioBuffer());
        analyzer.receiveBuffer(createMockAudioBuffer());
      }).not.toThrow();

      analyzer.destroy();
    });

    it('off() removes event listener', async () => {
      const analyzer = new AudioAnalyzer();
      const callback = vi.fn();

      analyzer.on('data', callback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(16);

      const callCount = callback.mock.calls.length;

      analyzer.off('data', callback);

      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(32);

      // Should not have additional calls
      expect(callback.mock.calls.length).toBe(callCount);

      analyzer.destroy();
    });

    it('multiple listeners can be registered', async () => {
      const analyzer = new AudioAnalyzer();
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      analyzer.on('data', callback1);
      analyzer.on('data', callback2);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));
      triggerAnimationFrame(16);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();

      analyzer.destroy();
    });

    it('listener errors do not crash the analyzer', async () => {
      const analyzer = new AudioAnalyzer();
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodCallback = vi.fn();

      analyzer.on('data', errorCallback);
      analyzer.on('data', goodCallback);
      analyzer.receiveBuffer(createMockAudioBuffer());

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should not throw
      expect(() => triggerAnimationFrame(16)).not.toThrow();

      // Good callback should still be called
      expect(goodCallback).toHaveBeenCalled();

      analyzer.destroy();
    });

    it('getFrequencyData returns copy, not internal array', () => {
      const analyzer = new AudioAnalyzer({ fftSize: 256 });
      const data1 = analyzer.getFrequencyData();
      const data2 = analyzer.getFrequencyData();

      // Should be different array instances
      expect(data1).not.toBe(data2);

      // But with same content
      expect(data1).toEqual(data2);

      // Modifying one should not affect the other
      data1[0] = 999;
      expect(data2[0]).not.toBe(999);

      analyzer.destroy();
    });
  });
});
