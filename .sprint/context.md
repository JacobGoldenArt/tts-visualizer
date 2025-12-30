# Sprint Context: Feature 7 - Mood-to-Visual Mapper

## Tech Stack
- React + TypeScript
- Vitest for testing with jsdom environment

## Project Structure
```
src/
  core/
    SemanticPipeline/  # Already implemented - provides MoodObject
    MoodMapper/        # YOUR TARGET - implement here
  types/
    semantic.ts        # Contains MoodObject, Emotion types
```

## Input: MoodObject (from Semantic Pipeline)

```typescript
type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral';

interface MoodObject {
  sentiment: number;  // -1 (negative) to 1 (positive)
  energy: number;     // 0 (calm) to 1 (high energy)
  keywords: string[]; // Top 5 relevant keywords
  emotion: Emotion;   // Detected emotion
}
```

## Output: Visual Parameters

The mapper should output:

```typescript
interface ColorPalette {
  primary: string;    // Main color (HSL or hex)
  secondary: string;  // Supporting color
  accent: string;     // Highlight color
}

interface VisualParams {
  palette: ColorPalette;
  intensity: number;           // 0.5 to 1.5 multiplier
  primitiveWeights: {          // Which primitives to emphasize
    spectrogram: number;       // 0 to 1
    typography: number;        // 0 to 1
    blobs: number;             // 0 to 1
  };
}
```

## Mood-to-Color Mapping Guidelines

Use HSL color space for intuitive mapping:

- **Positive sentiment (0 to 1)**: Warm hues (red, orange, yellow)
  - Hue: ~0-60 degrees
  - Higher saturation for more positive
  - Higher lightness for more positive

- **Negative sentiment (-1 to 0)**: Cool hues (blue, purple)
  - Hue: ~180-280 degrees
  - Lower saturation (muted)
  - Lower lightness

- **Energy affects saturation/brightness**:
  - High energy: More vibrant (higher saturation, contrast)
  - Low energy: More muted (lower saturation)

## Emotion-Specific Colors (suggestions)

- **Joy**: Warm yellows, oranges
- **Sadness**: Deep blues, muted purples
- **Anger**: Reds, dark oranges
- **Fear**: Dark purples, deep grays
- **Surprise**: Bright cyans, pinks
- **Neutral**: Soft grays, muted tones

## Interpolation

The mapper should smoothly transition between mood states:
- Track current visual params
- When new mood arrives, interpolate over configurable duration
- Use easing function for natural transitions

```typescript
// Example interpolation config
interface MapperConfig {
  interpolationDuration?: number;  // ms, default ~500
  customPalettes?: Record<Emotion, ColorPalette>;
}
```

## Primitive Weights

Suggest which visual primitives to emphasize:
- High energy + positive → more spectrogram activity
- Emotional + keywords present → more typography
- Calm + neutral → more blobs/ambient

## Testing Notes

- Use jsdom environment
- Test color output validity (valid HSL/hex)
- Test interpolation over time
- Test custom palette configuration

## Files to Create
- `src/core/MoodMapper/index.ts` - Module exports
- `src/core/MoodMapper/MoodMapper.ts` - Main class
- `src/core/MoodMapper/MoodMapper.test.ts` - Tests
- Add types to `src/types/` (visual.ts or mapper.ts)

## Conventions
- Follow existing event emitter pattern if needed
- Return copies from getters to prevent mutation
- Use requestAnimationFrame for interpolation updates
