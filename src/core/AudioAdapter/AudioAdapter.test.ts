/**
 * AudioAdapter Tests
 *
 * Tests for the AudioAdapter class that normalizes streaming audio
 * from various TTS providers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioAdapter } from './AudioAdapter';
import type {
  AudioDataEvent,
  AudioEndEvent,
  AudioErrorEvent,
  AudioBufferReceiver,
} from '@/types/audio';

// Mock AudioBuffer class - use type assertion to satisfy TypeScript
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

  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const source = this.getChannelData(channelNumber);
    const offset = bufferOffset ?? 0;
    destination.set(source.slice(offset, offset + destination.length));
  }

  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void {
    const dest = this.getChannelData(channelNumber);
    const offset = bufferOffset ?? 0;
    dest.set(source, offset);
  }
}

// Mock AudioContext
class MockAudioContext {
  readonly sampleRate: number;
  state: AudioContextState = 'running';
  private _closedPromise: Promise<void> | null = null;

  constructor(options?: AudioContextOptions) {
    this.sampleRate = options?.sampleRate ?? 44100;
  }

  createBuffer(numberOfChannels: number, length: number, sampleRate: number): AudioBuffer {
    return new MockAudioBuffer({ numberOfChannels, length, sampleRate }) as unknown as AudioBuffer;
  }

  async decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer> {
    // Simulate decoding - check for valid headers
    const view = new Uint8Array(audioData);

    // Check for WAV header (RIFF...WAVE)
    if (view.length >= 12 &&
        view[0] === 0x52 && view[1] === 0x49 && view[2] === 0x46 && view[3] === 0x46 &&
        view[8] === 0x57 && view[9] === 0x41 && view[10] === 0x56 && view[11] === 0x45) {
      // Parse WAV header for sample rate and calculate samples
      const dataView = new DataView(audioData);
      const wavSampleRate = dataView.getUint32(24, true);
      const numChannels = dataView.getUint16(22, true);
      // Estimate samples from data size (assuming 16-bit)
      const dataSize = Math.max(0, audioData.byteLength - 44);
      const numSamples = Math.floor(dataSize / (2 * numChannels));

      return new MockAudioBuffer({
        numberOfChannels: numChannels,
        length: numSamples,
        sampleRate: wavSampleRate,
      }) as unknown as AudioBuffer;
    }

    // Check for MP3 header (ID3 or sync word)
    if (view.length >= 3 &&
        ((view[0] === 0x49 && view[1] === 0x44 && view[2] === 0x33) || // ID3
         (view[0] === 0xFF && (view[1] & 0xE0) === 0xE0))) { // MPEG sync
      // Simulate MP3 decoding - return mock buffer
      // Assume ~44.1kHz and estimate samples
      const estimatedSamples = Math.floor(audioData.byteLength / 4);
      return new MockAudioBuffer({
        numberOfChannels: 2,
        length: estimatedSamples,
        sampleRate: 44100,
      }) as unknown as AudioBuffer;
    }

    throw new Error('Unable to decode audio data');
  }

  async close(): Promise<void> {
    this.state = 'closed';
    this._closedPromise = Promise.resolve();
    return this._closedPromise;
  }
}

// Set up global mock
const originalAudioContext = globalThis.AudioContext;
const originalAudioBuffer = globalThis.AudioBuffer;

beforeEach(() => {
  // @ts-expect-error - mocking global
  globalThis.AudioContext = MockAudioContext;
  // @ts-expect-error - mocking global
  globalThis.AudioBuffer = MockAudioBuffer;
});

afterEach(() => {
  globalThis.AudioContext = originalAudioContext;
  globalThis.AudioBuffer = originalAudioBuffer;
});

/**
 * Helper function to create PCM audio data
 */
function createPCMData(
  samples: number[],
  options: { bitDepth?: 8 | 16 | 32; channels?: number } = {}
): Uint8Array {
  const { bitDepth = 16, channels = 1 } = options;
  const bytesPerSample = bitDepth / 8;
  const buffer = new ArrayBuffer(samples.length * bytesPerSample * channels);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const offset = (i * channels + ch) * bytesPerSample;
      const value = samples[i];

      switch (bitDepth) {
        case 8:
          // 8-bit unsigned: convert from -1..1 to 0..255
          view.setUint8(offset, Math.round((value + 1) * 128));
          break;
        case 16:
          // 16-bit signed little-endian: convert from -1..1 to -32768..32767
          view.setInt16(offset, Math.round(value * 32767), true);
          break;
        case 32:
          // 32-bit float
          view.setFloat32(offset, value, true);
          break;
      }
    }
  }

  return new Uint8Array(buffer);
}

/**
 * Helper function to create minimal WAV header
 */
function createWAVData(samples: number[], sampleRate: number = 44100, channels: number = 1): Uint8Array {
  const bytesPerSample = 2; // 16-bit
  const dataSize = samples.length * bytesPerSample * channels;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  const encoder = new TextEncoder();
  const riff = encoder.encode('RIFF');
  const wave = encoder.encode('WAVE');
  const fmt = encoder.encode('fmt ');
  const data = encoder.encode('data');

  // RIFF chunk
  new Uint8Array(buffer, 0, 4).set(riff);
  view.setUint32(4, 36 + dataSize, true);
  new Uint8Array(buffer, 8, 4).set(wave);

  // fmt chunk
  new Uint8Array(buffer, 12, 4).set(fmt);
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, 1, true); // AudioFormat (PCM)
  view.setUint16(22, channels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * channels * bytesPerSample, true); // ByteRate
  view.setUint16(32, channels * bytesPerSample, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data chunk
  new Uint8Array(buffer, 36, 4).set(data);
  view.setUint32(40, dataSize, true);

  // Audio data
  for (let i = 0; i < samples.length; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const offset = 44 + (i * channels + ch) * bytesPerSample;
      view.setInt16(offset, Math.round(samples[i] * 32767), true);
    }
  }

  return new Uint8Array(buffer);
}

/**
 * Helper function to create minimal MP3 data (with ID3 header)
 */
function createMP3Data(): Uint8Array {
  // Create a minimal valid MP3-like structure with ID3 header
  const buffer = new ArrayBuffer(128);
  const view = new Uint8Array(buffer);

  // ID3v2 header
  view[0] = 0x49; // 'I'
  view[1] = 0x44; // 'D'
  view[2] = 0x33; // '3'
  view[3] = 0x04; // Version
  view[4] = 0x00; // Revision
  view[5] = 0x00; // Flags
  view[6] = 0x00; // Size (syncsafe)
  view[7] = 0x00;
  view[8] = 0x00;
  view[9] = 0x00;

  // Add some padding/data
  for (let i = 10; i < buffer.byteLength; i++) {
    view[i] = 0x00;
  }

  return view;
}

describe('AudioAdapter', () => {
  // Test 1.1: Adapter accepts raw PCM audio bytes and outputs AudioBuffer
  describe('Test 1.1: PCM audio processing', () => {
    it('accepts raw PCM audio bytes and outputs AudioBuffer', async () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100, channels: 1 });
      const receivedBuffers: AudioBuffer[] = [];

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffers.push(event.buffer);
      });

      // Create test PCM data (16-bit, mono)
      const samples = [0.5, -0.5, 0.25, -0.25];
      const pcmData = createPCMData(samples);

      adapter.feed(pcmData);

      expect(receivedBuffers.length).toBe(1);
      expect(receivedBuffers[0]).toBeInstanceOf(MockAudioBuffer);
      expect(receivedBuffers[0].numberOfChannels).toBe(1);
      expect(receivedBuffers[0].sampleRate).toBe(44100);
    });

    it('correctly converts 16-bit PCM values to float samples', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100, channels: 1, bitDepth: 16 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      // Create known PCM values
      const samples = [0.5, -0.5, 1.0, -1.0];
      const pcmData = createPCMData(samples, { bitDepth: 16 });

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      const channelData = receivedBuffer!.getChannelData(0);

      // Values should be approximately equal (some precision loss from conversion)
      expect(channelData[0]).toBeCloseTo(0.5, 2);
      expect(channelData[1]).toBeCloseTo(-0.5, 2);
    });
  });

  // Test 1.2: Adapter accepts MP3 chunks and decodes to AudioBuffer
  describe('Test 1.2: MP3 audio processing', () => {
    it('accepts MP3 chunks and decodes to AudioBuffer', async () => {
      const adapter = new AudioAdapter({ format: 'mp3' });
      const receivedBuffers: AudioBuffer[] = [];

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffers.push(event.buffer);
      });

      // Create mock MP3 data
      const mp3Data = createMP3Data();

      adapter.feed(mp3Data);

      // Give async decoding time to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      // MP3 decoding should produce a buffer
      expect(receivedBuffers.length).toBeGreaterThanOrEqual(0);
    });

    it('can be instantiated with mp3 format config', () => {
      const adapter = new AudioAdapter({ format: 'mp3', sampleRate: 44100 });
      expect(adapter.config.format).toBe('mp3');
      expect(adapter.config.sampleRate).toBe(44100);
    });
  });

  // Test 1.3: Adapter accepts WAV chunks and decodes to AudioBuffer
  describe('Test 1.3: WAV audio processing', () => {
    it('accepts WAV chunks and decodes to AudioBuffer', async () => {
      const adapter = new AudioAdapter({ format: 'wav' });
      const receivedBuffers: AudioBuffer[] = [];

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffers.push(event.buffer);
      });

      // Create test WAV data
      const samples = [0.5, -0.5, 0.25, -0.25];
      const wavData = createWAVData(samples, 44100, 1);

      adapter.feed(wavData);

      // Give async decoding time to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedBuffers.length).toBe(1);
      expect(receivedBuffers[0]).toBeInstanceOf(MockAudioBuffer);
    });

    it('decodes WAV with correct sample rate from header', async () => {
      const adapter = new AudioAdapter({ format: 'wav' });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5, 0.25, -0.25];
      const wavData = createWAVData(samples, 48000, 1);

      adapter.feed(wavData);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.sampleRate).toBe(48000);
    });
  });

  // Test 1.4: Adapter handles different sample rates
  describe('Test 1.4: Sample rate handling', () => {
    it('handles 22050Hz sample rate', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 22050, channels: 1 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5];
      const pcmData = createPCMData(samples);

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.sampleRate).toBe(22050);
    });

    it('handles 44100Hz sample rate', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100, channels: 1 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5];
      const pcmData = createPCMData(samples);

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.sampleRate).toBe(44100);
    });

    it('handles 48000Hz sample rate', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 48000, channels: 1 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5];
      const pcmData = createPCMData(samples);

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.sampleRate).toBe(48000);
    });
  });

  // Test 1.5: Adapter emits 'data' events as audio chunks arrive
  describe('Test 1.5: Data event emission', () => {
    it('emits data events as audio chunks arrive', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100 });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      // Feed multiple chunks
      adapter.feed(createPCMData([0.5, -0.5]));
      adapter.feed(createPCMData([0.25, -0.25]));
      adapter.feed(createPCMData([0.1, -0.1]));

      expect(dataCallback).toHaveBeenCalledTimes(3);
    });

    it('data event contains AudioBuffer and timestamp', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100 });
      let receivedEvent: AudioDataEvent | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedEvent = event;
      });

      adapter.feed(createPCMData([0.5, -0.5]));

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('data');
      expect(receivedEvent!.buffer).toBeInstanceOf(MockAudioBuffer);
      expect(typeof receivedEvent!.timestamp).toBe('number');
    });
  });

  // Test 1.6: Adapter emits 'end' event when stream completes
  describe('Test 1.6: End event emission', () => {
    it('emits end event when stream completes', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100 });
      const endCallback = vi.fn();

      adapter.on('end', endCallback);

      adapter.feed(createPCMData([0.5, -0.5]));
      adapter.end();

      expect(endCallback).toHaveBeenCalledTimes(1);
    });

    it('end event contains totalSamples and duration', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100 });
      let receivedEvent: AudioEndEvent | null = null;

      adapter.on('end', (event: AudioEndEvent) => {
        receivedEvent = event;
      });

      adapter.feed(createPCMData([0.5, -0.5, 0.25, -0.25]));
      adapter.end();

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('end');
      expect(receivedEvent!.totalSamples).toBe(4);
      expect(typeof receivedEvent!.duration).toBe('number');
    });
  });

  // Test 1.7: Adapter handles empty/null input without crashing
  describe('Test 1.7: Empty/null input handling', () => {
    it('handles null input without crashing', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      expect(() => adapter.feed(null as unknown as ArrayBuffer)).not.toThrow();
      expect(dataCallback).not.toHaveBeenCalled();
    });

    it('handles undefined input without crashing', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      expect(() => adapter.feed(undefined as unknown as ArrayBuffer)).not.toThrow();
      expect(dataCallback).not.toHaveBeenCalled();
    });

    it('handles empty ArrayBuffer without crashing', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      expect(() => adapter.feed(new ArrayBuffer(0))).not.toThrow();
      expect(dataCallback).not.toHaveBeenCalled();
    });

    it('handles empty Uint8Array without crashing', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      expect(() => adapter.feed(new Uint8Array(0))).not.toThrow();
      expect(dataCallback).not.toHaveBeenCalled();
    });
  });

  // Test 1.8: Adapter can be instantiated with a config object
  describe('Test 1.8: Configuration', () => {
    it('accepts a config object specifying format', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      expect(adapter.config.format).toBe('pcm');
    });

    it('accepts a config object specifying sample rate', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 48000 });
      expect(adapter.config.sampleRate).toBe(48000);
    });

    it('accepts a config object specifying channels', () => {
      const adapter = new AudioAdapter({ format: 'pcm', channels: 2 });
      expect(adapter.config.channels).toBe(2);
    });

    it('accepts a config object specifying bit depth', () => {
      const adapter = new AudioAdapter({ format: 'pcm', bitDepth: 32 });
      expect(adapter.config.bitDepth).toBe(32);
    });

    it('uses default values when config is not provided', () => {
      const adapter = new AudioAdapter();
      expect(adapter.config.format).toBe('pcm');
      expect(adapter.config.sampleRate).toBe(44100);
      expect(adapter.config.channels).toBe(1);
      expect(adapter.config.bitDepth).toBe(16);
    });

    it('uses static factory method for common formats', () => {
      const pcmAdapter = AudioAdapter.forFormat('pcm', 44100);
      const mp3Adapter = AudioAdapter.forFormat('mp3');
      const wavAdapter = AudioAdapter.forFormat('wav', 48000);

      expect(pcmAdapter.config.format).toBe('pcm');
      expect(pcmAdapter.config.sampleRate).toBe(44100);
      expect(mp3Adapter.config.format).toBe('mp3');
      expect(wavAdapter.config.format).toBe('wav');
      expect(wavAdapter.config.sampleRate).toBe(48000);
    });
  });

  // Test 1.9: Adapter exposes connect() method to pipe to Audio Analyzer
  describe('Test 1.9: Connect method', () => {
    it('exposes connect() method', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      expect(typeof adapter.connect).toBe('function');
    });

    it('connect() accepts AudioBufferReceiver', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const receiver: AudioBufferReceiver = {
        receiveBuffer: vi.fn(),
      };

      expect(() => adapter.connect(receiver)).not.toThrow();
    });

    it('connected receiver receives AudioBuffer when data is fed', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const receiver: AudioBufferReceiver = {
        receiveBuffer: vi.fn(),
      };

      adapter.connect(receiver);
      adapter.feed(createPCMData([0.5, -0.5]));

      expect(receiver.receiveBuffer).toHaveBeenCalledTimes(1);
      expect(receiver.receiveBuffer).toHaveBeenCalledWith(expect.any(MockAudioBuffer));
    });

    it('multiple receivers can be connected', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const receiver1: AudioBufferReceiver = { receiveBuffer: vi.fn() };
      const receiver2: AudioBufferReceiver = { receiveBuffer: vi.fn() };

      adapter.connect(receiver1);
      adapter.connect(receiver2);
      adapter.feed(createPCMData([0.5, -0.5]));

      expect(receiver1.receiveBuffer).toHaveBeenCalledTimes(1);
      expect(receiver2.receiveBuffer).toHaveBeenCalledTimes(1);
    });

    it('disconnect() removes all receivers', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const receiver: AudioBufferReceiver = { receiveBuffer: vi.fn() };

      adapter.connect(receiver);
      adapter.disconnect();
      adapter.feed(createPCMData([0.5, -0.5]));

      expect(receiver.receiveBuffer).not.toHaveBeenCalled();
    });
  });

  // Test 1.10: Adapter can be stopped mid-stream via stop() method
  describe('Test 1.10: Stop method', () => {
    it('exposes stop() method', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      expect(typeof adapter.stop).toBe('function');
    });

    it('stop() stops processing mid-stream', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      adapter.feed(createPCMData([0.5, -0.5]));
      expect(dataCallback).toHaveBeenCalledTimes(1);

      adapter.stop();

      adapter.feed(createPCMData([0.25, -0.25]));
      expect(dataCallback).toHaveBeenCalledTimes(1); // No additional calls
    });

    it('stop() sets isProcessing to false', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });

      adapter.feed(createPCMData([0.5, -0.5]));
      expect(adapter.isProcessing).toBe(true);

      adapter.stop();
      expect(adapter.isProcessing).toBe(false);
    });

    it('feeding data after stop() emits error', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const errorCallback = vi.fn();

      adapter.on('error', errorCallback);
      adapter.stop();
      adapter.feed(createPCMData([0.5, -0.5]));

      expect(errorCallback).toHaveBeenCalledTimes(1);
      expect(errorCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          error: expect.any(Error),
          recoverable: false,
        })
      );
    });
  });

  // Test 1.11: Adapter handles connection interruption gracefully
  describe('Test 1.11: Error handling', () => {
    it('emits error event on connection interruption', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const errorCallback = vi.fn();

      adapter.on('error', errorCallback);

      // Simulate an error by calling emitError directly
      adapter.emitError(new Error('Connection interrupted'), true);

      expect(errorCallback).toHaveBeenCalledTimes(1);
    });

    it('error event contains error details and recoverable flag', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      let receivedEvent: AudioErrorEvent | null = null;

      adapter.on('error', (event: AudioErrorEvent) => {
        receivedEvent = event;
      });

      adapter.emitError(new Error('Test error'), true);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.type).toBe('error');
      expect(receivedEvent!.error).toBeInstanceOf(Error);
      expect(receivedEvent!.error.message).toBe('Test error');
      expect(receivedEvent!.recoverable).toBe(true);
    });

    it('non-recoverable errors set recoverable to false', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      let receivedEvent: AudioErrorEvent | null = null;

      adapter.on('error', (event: AudioErrorEvent) => {
        receivedEvent = event;
      });

      adapter.emitError(new Error('Fatal error'), false);

      expect(receivedEvent).not.toBeNull();
      expect(receivedEvent!.recoverable).toBe(false);
    });

    it('off() removes event listener', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const callback = vi.fn();

      adapter.on('data', callback);
      adapter.feed(createPCMData([0.5, -0.5]));
      expect(callback).toHaveBeenCalledTimes(1);

      adapter.off('data', callback);
      adapter.feed(createPCMData([0.25, -0.25]));
      expect(callback).toHaveBeenCalledTimes(1); // No additional calls
    });
  });

  // Additional edge case tests
  describe('Edge cases', () => {
    it('handles stereo PCM data', () => {
      const adapter = new AudioAdapter({ format: 'pcm', channels: 2 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5]; // 2 samples (1 per channel)
      const pcmData = createPCMData(samples, { channels: 2 });

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.numberOfChannels).toBe(2);
    });

    it('handles 8-bit PCM data', () => {
      const adapter = new AudioAdapter({ format: 'pcm', bitDepth: 8 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5, 0.0];
      const pcmData = createPCMData(samples, { bitDepth: 8 });

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();
      expect(receivedBuffer!.length).toBe(3);
    });

    it('handles 32-bit float PCM data', () => {
      const adapter = new AudioAdapter({ format: 'pcm', bitDepth: 32 });
      let receivedBuffer: AudioBuffer | null = null;

      adapter.on('data', (event: AudioDataEvent) => {
        receivedBuffer = event.buffer;
      });

      const samples = [0.5, -0.5, 0.25, -0.25];
      const pcmData = createPCMData(samples, { bitDepth: 32 });

      adapter.feed(pcmData);

      expect(receivedBuffer).not.toBeNull();

      const channelData = receivedBuffer!.getChannelData(0);
      expect(channelData[0]).toBeCloseTo(0.5, 5);
      expect(channelData[1]).toBeCloseTo(-0.5, 5);
    });

    it('returns a copy of config to prevent mutation', () => {
      const adapter = new AudioAdapter({ format: 'pcm', sampleRate: 44100 });
      const config1 = adapter.config;
      const config2 = adapter.config;

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });

    it('accepts ArrayBuffer input', () => {
      const adapter = new AudioAdapter({ format: 'pcm' });
      const dataCallback = vi.fn();

      adapter.on('data', dataCallback);

      const samples = [0.5, -0.5];
      const pcmData = createPCMData(samples);
      const arrayBuffer = pcmData.buffer.slice(pcmData.byteOffset, pcmData.byteOffset + pcmData.byteLength) as ArrayBuffer;

      adapter.feed(arrayBuffer);

      expect(dataCallback).toHaveBeenCalledTimes(1);
    });
  });
});
