# Sprint Context: Feature 2 - Audio Analyzer

## Tech Stack
- React + TypeScript
- Web Audio API (AnalyserNode for FFT/amplitude)
- Vite for dev/build
- Vitest for testing with jsdom environment

## Project Structure
```
src/
  core/
    AudioAdapter/     # Already implemented - provides AudioBuffer via connect()
    AudioAnalyzer/    # YOUR TARGET - implement here
    CanvasRenderer/   # Already implemented
    SemanticPipeline/ # Already implemented
    MoodMapper/       # Not yet implemented
  types/
    audio.ts          # Audio-related types including AudioBufferReceiver
```

## Key Integration Point

The AudioAdapter (Feature 1) uses an event/connection pattern:
- It emits AudioBuffer via `receiveBuffer()` method
- AudioAnalyzer should implement `AudioBufferReceiver` interface:

```typescript
export interface AudioBufferReceiver {
  receiveBuffer(buffer: AudioBuffer): void;
}
```

Then AudioAdapter.connect(analyzer) will pipe buffers to the analyzer.

## Implementation Requirements

1. **Use Web Audio API AnalyserNode** for FFT and amplitude analysis
2. **Follow event emitter pattern** similar to AudioAdapter (on/off methods)
3. **Implement AudioBufferReceiver** to integrate with AudioAdapter.connect()
4. **Use requestAnimationFrame** for consistent ~60fps data emission
5. **Support configurable FFT sizes**: 256, 512, 1024, 2048
6. **Amplitude smoothing**: attack/release time for smooth transitions

## Testing Notes

- Use jsdom environment (already configured in vitest.config.ts)
- Mock Web Audio API components as needed
- Test file should be: `src/core/AudioAnalyzer/AudioAnalyzer.test.ts`

## Conventions from Existing Code

- Types go in `src/types/` (add analyzer types to audio.ts or new file)
- Use index.ts for module exports
- Prefix private methods with underscore
- Use lazy initialization pattern for AudioContext
- Return copies from getters to prevent external mutation

## FFT Size Reference

- FFT size 256 = 128 frequency bins
- FFT size 512 = 256 frequency bins
- FFT size 1024 = 512 frequency bins
- FFT size 2048 = 1024 frequency bins

Minimum requirement: 64 bands (so FFT size 128 minimum, but 256+ recommended)

## Suggested Interface

```typescript
interface AudioAnalyzerConfig {
  fftSize?: 256 | 512 | 1024 | 2048;
  smoothingTimeConstant?: number;  // Web Audio smoothing (0-1)
  attackTime?: number;             // Amplitude attack in ms
  releaseTime?: number;            // Amplitude release in ms
}

interface AnalyzerData {
  frequencyData: Float32Array;     // FFT data
  amplitude: number;               // Normalized 0-1
  timestamp: number;
}

interface AudioAnalyzer extends AudioBufferReceiver {
  readonly config: AudioAnalyzerConfig;
  readonly frequencyBinCount: number;
  readonly isPaused: boolean;

  // From AudioBufferReceiver
  receiveBuffer(buffer: AudioBuffer): void;

  // Control
  pause(): void;
  resume(): void;
  destroy(): void;

  // Data access
  getFrequencyData(): Float32Array;
  getAmplitude(): number;

  // Events
  on(event: 'data', callback: (data: AnalyzerData) => void): void;
  off(event: 'data', callback: (data: AnalyzerData) => void): void;
}
```

## Files to Create
- `src/core/AudioAnalyzer/index.ts` - Module exports
- `src/core/AudioAnalyzer/AudioAnalyzer.ts` - Main class
- `src/core/AudioAnalyzer/AudioAnalyzer.test.ts` - Tests
- Add types to `src/types/audio.ts` or create `src/types/analyzer.ts`
