# Sprint 011 Context: Main Visualizer Component

## Tech Stack
- React + TypeScript
- Canvas 2D
- Web Audio API
- Vitest + React Testing Library

## Project Structure
```
src/
  components/
    Visualizer/      # ← You are implementing this
      Visualizer.tsx
      Visualizer.test.tsx
      index.ts
    Controls/        # Already implemented
  primitives/
    Spectrogram/     # Already implemented
    Typography/      # Already implemented
  core/
    AudioAdapter/    # Already implemented
    AudioAnalyzer/   # Already implemented
    SemanticPipeline/ # Already implemented
    CanvasRenderer/  # Already implemented
    MoodMapper/      # Already implemented
  themes/
    ThemeManager     # Already implemented
```

## Data Flow

```
text prop → SemanticPipeline → MoodMapper → ColorPalette
                                   ↓
audioStream → AudioAdapter → AudioAnalyzer → frequency data
                                   ↓
                            CanvasRenderer
                                   ↓
                      Spectrogram + Typography
```

## Key Interfaces

### Visualizer Props (to be created)
```typescript
interface VisualizerProps {
  text?: string;
  audioStream?: ReadableStream<Uint8Array> | ArrayBuffer;
  config?: Partial<VisualizerConfig>;
  showControls?: boolean;
  onMoodChange?: (mood: MoodObject) => void;
  className?: string;
  style?: React.CSSProperties;
}

interface VisualizerConfig {
  width?: number;
  height?: number;
  theme?: 'dark' | 'light' | 'system';
  initialControlState?: Partial<ControlState>;
}

interface VisualizerRef {
  pause(): void;
  resume(): void;
  getState(): VisualizerState;
}
```

### From existing modules
- `AudioAdapter`: Accepts audio stream, emits 'data' events with AudioBuffer
- `AudioAnalyzer`: Receives AudioBuffer, outputs frequency data
- `SemanticPipeline`: analyze(text) → MoodObject
- `MoodMapper`: updateMood(mood) → ColorPalette
- `CanvasRenderer`: Drawing utilities + animation loop
- `Spectrogram`: setPalette(), setIntensity(), setMotion(), setMode(), update(), render()
- `Typography`: Same methods as Spectrogram + addKeywords()
- `Controls`: React component with onChange callback

## Implementation Notes

1. **Location**: `src/components/Visualizer/`
   - `Visualizer.tsx` - Main React component with forwardRef
   - `Visualizer.test.tsx` - Test suite
   - `index.ts` - Exports

2. **Component structure**:
   - Use useRef for canvas element
   - Use useEffect for setup/cleanup
   - Use useImperativeHandle for ref methods
   - Initialize all modules in useEffect

3. **SSR safety**:
   - Check for `typeof window !== 'undefined'` before accessing browser APIs
   - Lazy initialize AudioContext and other browser-only features
   - Return null or placeholder during SSR

4. **Resource cleanup**:
   - Stop AudioAdapter on unmount
   - Destroy AudioAnalyzer on unmount
   - Stop CanvasRenderer animation loop on unmount
   - Remove event listeners

5. **Graceful degradation**:
   - No audio: Still show Typography with semantic analysis
   - No text: Still show Spectrogram with audio
   - Neither: Show minimal/idle visualization

6. **Controls integration**:
   - Optionally render Controls component
   - Pass onChange to update primitives
   - Apply control state to Spectrogram/Typography

## Existing Patterns

From Controls:
```typescript
const handleChange = (state: ControlState) => {
  spectrogram.setIntensity(state.intensity / 100);
  spectrogram.setMotion(state.motion / 100);
  spectrogram.setMode(state.mode);
  // Same for typography
};
```

From modules:
```typescript
// SemanticPipeline
const mood = await pipeline.analyze(text);

// MoodMapper
moodMapper.updateMood(mood);
const palette = moodMapper.getCurrentPalette();

// Primitives
spectrogram.setPalette(palette);
typography.addKeywords(mood.keywords, 'assistant');
```

## Test Conventions
- Use Vitest with jsdom environment
- Mock all core modules (AudioAdapter, etc.)
- Test prop handling
- Test ref methods
- Test cleanup on unmount
- Test SSR safety
