# Sprint 008 Context: Typography

## Tech Stack
- React + TypeScript
- Canvas 2D (chosen for lo-fi aesthetic)
- Vitest for testing (jsdom environment)

## Project Structure
```
src/
  primitives/
    Typography/      # ← You are implementing this
    Spectrogram/     # Already implemented
  core/
    SemanticPipeline/  # Provides keywords array
    CanvasRenderer/    # Drawing utilities with sketchy aesthetic
    MoodMapper/        # Provides ColorPalette
  types/
    semantic.ts      # MoodObject interface
    canvas.ts        # Drawing types
    visual.ts        # ColorPalette, VisualParams
```

## Key Interfaces

### From SemanticPipeline (src/types/semantic.ts)
```typescript
interface MoodObject {
  sentiment: number;   // -1 to 1 scale
  energy: number;      // 0 to 1 scale
  keywords: string[];  // Top 5 most relevant words
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral';
}
```

### From CanvasRenderer (src/core/CanvasRenderer)
- `drawText(ctx, text, x, y, options)` - Text with optional distortion
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
- Keywords float/drift across canvas
- Fading in and out over time
- Size/emphasis based on mood energy
- Glow effect for highlighted keywords
- NOT full conversation text - just keywords/fragments

## Implementation Notes

1. **Location**: `src/primitives/Typography/`
   - `Typography.ts` - Main class
   - `Typography.test.ts` - Test suite
   - `index.ts` - Exports

2. **Keyword rendering**:
   - Each keyword is a floating "particle" with position, velocity, opacity
   - Keywords fade in, drift, then fade out
   - Size based on emphasis/intensity
   - Color from ColorPalette

3. **Controls**:
   - `intensity` (0-1): Affects keyword size/glow strength
   - `motion` (0-1): Affects drift speed
   - `mode` ('text' | 'visual'): Text mode = subtle/ambient, Visual mode = prominent/expressive
   - `fontFamily`: Configurable font
   - `baseSize`: Base font size
   - `fadeDuration`: How long keywords take to fade out

4. **User vs AI differentiation**: Subtle visual difference (color tint, position bias, etc.)

5. **Lifecycle**: Keywords should have spawn time, lifetime, and auto-cleanup

## Existing Patterns

From CanvasRenderer usage:
```typescript
// Text with distortion example
renderer.drawText(ctx, 'keyword', x, y, {
  font: '24px sans-serif',
  color: palette.primary,
  distortion: 0.2  // Slight shake/wobble
});
```

From Spectrogram pattern:
```typescript
// Mode affects opacity
const opacity = this.mode === 'visual' ? 1.0 : 0.3;
```

## Test Conventions
- Use Vitest with jsdom environment
- Mock canvas context for rendering tests
- Test keyword lifecycle (spawn, update, fade, cleanup)
- Verify positioning stays within bounds
