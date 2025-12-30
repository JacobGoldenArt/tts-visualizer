# Sprint Context: Audio Adapter

## Tech Stack
- React 18 + TypeScript
- Vite for bundling
- Vitest for testing
- Web Audio API for audio processing

## Project Structure
```
src/
  core/
    AudioAdapter/    <- Your implementation goes here
  types/             <- TypeScript interfaces
```

## Implementation Guidelines

### Event Emitter Pattern
Use a simple event emitter pattern for 'data', 'end', and 'error' events.
Consider extending EventTarget or creating a typed event system.

### Web Audio API Usage
- Use `AudioContext` for decoding audio
- `AudioContext.decodeAudioData()` handles MP3, WAV automatically
- For raw PCM, create AudioBuffer manually from the bytes

### Interface Expectations
```typescript
interface AudioAdapterConfig {
  format: 'pcm' | 'mp3' | 'wav';
  sampleRate?: number;  // Expected sample rate
  channels?: number;    // 1 = mono, 2 = stereo
}

interface AudioAdapter {
  constructor(config?: AudioAdapterConfig);

  // Feed audio data
  feed(chunk: ArrayBuffer | Uint8Array): void;

  // Signal stream complete
  end(): void;

  // Stop processing
  stop(): void;

  // Connect to downstream processor
  connect(target: AudioNode | { receiveBuffer: (buffer: AudioBuffer) => void }): void;

  // Events: 'data', 'end', 'error'
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}
```

### Testing Approach
- Tests should run in jsdom environment (Vitest default)
- Mock AudioContext if needed (jsdom doesn't have Web Audio)
- Focus on the adapter logic, not actual audio decoding
- Use synthetic test data (typed arrays with known values)

## Key Decisions
1. Start with PCM format first, it's simplest
2. Use AudioContext.decodeAudioData for encoded formats
3. Keep the public API stable even as internals evolve
4. Handle edge cases gracefully (empty input, interruptions)

## Files to Create
- `src/core/AudioAdapter/index.ts` - Main implementation
- `src/core/AudioAdapter/AudioAdapter.ts` - Class implementation
- `src/core/AudioAdapter/AudioAdapter.test.ts` - Tests
- `src/types/audio.ts` - Type definitions (if needed)
