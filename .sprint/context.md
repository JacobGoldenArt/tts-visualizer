# Sprint 009 Context: Theme Support

## Tech Stack
- React + TypeScript
- Canvas 2D (chosen for lo-fi aesthetic)
- Vitest for testing (jsdom environment)
- CSS custom properties for non-canvas elements (optional)

## Project Structure
```
src/
  themes/            # ← You are implementing this
    dark.ts          # Dark theme definition
    light.ts         # Light theme definition
    ThemeManager.ts  # Theme state management
    index.ts         # Exports
  primitives/
    Spectrogram/     # Already implemented - needs theme integration
    Typography/      # Already implemented - needs theme integration
  core/
    CanvasRenderer/  # Drawing utilities
    MoodMapper/      # Provides ColorPalette based on mood
  types/
    visual.ts        # ColorPalette, VisualParams types
```

## Key Interfaces

### From MoodMapper (src/types/visual.ts)
```typescript
interface ColorPalette {
  primary: string;    // Main color (HSL string)
  secondary: string;  // Supporting color
  accent: string;     // Highlight color
  background: string; // Background color
}
```

### Theme Interface (to be created)
```typescript
type ThemeMode = 'dark' | 'light' | 'system';

interface Theme {
  name: 'dark' | 'light';
  background: string;
  foreground: string;  // Default text/accent color
  // Base palette that mood mapper can modify
  basePalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface ThemeManager {
  getTheme(): Theme;
  setTheme(mode: ThemeMode): void;
  onThemeChange(callback: (theme: Theme) => void): void;
}
```

## Visual Direction
- **Dark theme**: Dark background (near black), light accents
- **Light theme**: Light background (off-white), dark accents
- Mood colors should remain vibrant and legible in both themes
- Smooth transitions between themes (no jarring flash)
- Lo-fi aesthetic maintained in both themes

## Implementation Notes

1. **Location**: `src/themes/`
   - `dark.ts` - Dark theme definition
   - `light.ts` - Light theme definition
   - `ThemeManager.ts` - Manages theme state, system preference detection
   - `index.ts` - Exports

2. **Theme detection**:
   - Use `window.matchMedia('(prefers-color-scheme: dark)')` for system preference
   - Listen for changes with `matchMedia.addEventListener('change', ...)`
   - Default to system preference, but allow override

3. **Theme application**:
   - ThemeManager exposes current theme
   - Primitives (Spectrogram, Typography) should read theme for base colors
   - MoodMapper can still override/adjust colors based on mood

4. **Smooth transitions**:
   - Use interpolation when switching themes (similar to MoodMapper)
   - Transition duration ~300ms for smooth feel

5. **Integration with existing code**:
   - Primitives already accept ColorPalette - theme can provide base palette
   - MoodMapper already supports custom configurations - theme can influence defaults

## Existing Patterns

From MoodMapper (smooth transitions):
```typescript
// Interpolate between colors over time
private interpolateColor(from: string, to: string, t: number): string {
  // HSL interpolation logic
}
```

From Spectrogram/Typography (palette usage):
```typescript
// Primitives accept palette
spectrogram.setPalette(colorPalette);
typography.setPalette(colorPalette);
```

## Test Conventions
- Use Vitest with jsdom environment
- Mock window.matchMedia for system preference tests
- Test theme switching and transitions
- Verify palette colors are applied correctly
