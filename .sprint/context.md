# Sprint 007 Context: Spectrogram

## Tech Stack
- React + TypeScript
- Canvas 2D (chosen for lo-fi aesthetic)
- Web Audio API for frequency analysis
- Vitest for testing (jsdom environment)

## Project Structure
```
src/
  primitives/
    Spectrogram/     # ← You are implementing this
  core/
    AudioAnalyzer/   # Provides frequency data (Float32Array)
    CanvasRenderer/  # Drawing utilities with sketchy aesthetic
    MoodMapper/      # Provides ColorPalette
  types/
    audio.ts         # AnalyzerData interface
    canvas.ts        # Drawing types
    visual.ts        # ColorPalette, VisualParams
```

## Key Interfaces

### From AudioAnalyzer (src/types/audio.ts)
```typescript
interface AnalyzerData {
  frequencyData: Float32Array;  // FFT frequency bands (64+ values, 0-255 range)
  amplitude: number;            // Normalized 0-1
  timestamp: number;
}
```

### From CanvasRenderer (src/core/CanvasRenderer)
- `drawLine(ctx, x1, y1, x2, y2, options)` - Sketchy line with wobble
- `drawBlob(ctx, x, y, radius, options)` - Organic shapes
- Uses layer system (background, midground, foreground)

### From MoodMapper (src/types/visual.ts)
```typescript
interface ColorPalette {
  primary: string;    // Main color (HSL string)
  secondary: string;  // Supporting color
  accent: string;     // Highlight color
  background: string; // Background color
}
```

## Visual Direction
- **Lo-fi, warm, a little weird** - roughness is a feature
- Hand-drawn/sketchy quality (not clean digital lines)
- Use CanvasRenderer's wobble parameter for sketchy edges
- Consider subtle imperfections in bar heights

## Implementation Notes

1. **Location**: `src/primitives/Spectrogram/`
   - `Spectrogram.ts` - Main class
   - `Spectrogram.test.ts` - Test suite
   - `index.ts` - Exports

2. **Rendering approach**:
   - Draw frequency bars using CanvasRenderer utilities
   - Each bar height = frequency magnitude at that band
   - Apply wobble/sketchiness to bar edges
   - Use ColorPalette for bar fill/stroke

3. **Controls**:
   - `intensity` (0-1): Affects bar count and/or thickness
   - `motion` (0-1): Affects animation smoothness (interpolation)
   - `mode` ('text' | 'visual'): Affects opacity/prominence
   - `orientation` ('horizontal' | 'vertical'): Bar direction

4. **No audio state**: When no frequency data, show flat/minimal visualization (not blank)

5. **Performance**: Real-time reactive (<50ms feel), use requestAnimationFrame timing

## Existing Patterns

From AudioAnalyzer test setup:
```typescript
// Mock frequency data for testing
const mockFrequencyData = new Float32Array(64).fill(128);
```

From CanvasRenderer usage:
```typescript
// Sketchy line example
renderer.drawLine(ctx, x1, y1, x2, y2, {
  wobble: 0.3,  // Sketchiness amount
  color: palette.primary
});
```

## Test Conventions
- Use Vitest with jsdom environment
- Mock canvas context for rendering tests
- Test with mock frequency data arrays
- Verify drawing calls are made correctly
