# Sprint 010 Context: Control Interface

## Tech Stack
- React + TypeScript
- Vitest for testing (jsdom environment)
- React Testing Library for component tests

## Project Structure
```
src/
  components/
    Controls/        # ← You are implementing this
      Controls.tsx   # Main React component
      Controls.test.tsx
      index.ts
  primitives/
    Spectrogram/     # Has setIntensity(), setMotion(), setMode()
    Typography/      # Has setIntensity(), setMotion(), setMode()
  core/
    MoodMapper/      # Can adjust saturation
  types/
    visual.ts        # ControlState type to be added
```

## Key Interfaces

### Control State (to be created in src/types/visual.ts)
```typescript
interface ControlState {
  saturation: number;  // 0-100
  intensity: number;   // 0-100
  motion: number;      // 0-100
  mode: 'text' | 'visual';
}

interface ControlsProps {
  initialState?: Partial<ControlState>;
  onChange?: (state: ControlState) => void;
  hidden?: boolean;  // Headless mode
  storageKey?: string;  // localStorage key
}
```

### From Primitives
```typescript
// Spectrogram and Typography have these methods:
setIntensity(value: number): void;  // 0-1 internally
setMotion(value: number): void;     // 0-1 internally
setMode(mode: 'text' | 'visual'): void;
```

## Visual Direction
- Minimal UI - macro controls, not a full mixer
- 3 sliders (saturation, intensity, motion) + 1 toggle (text/visual)
- Should look clean and unobtrusive
- Can be completely hidden for embedding

## Implementation Notes

1. **Location**: `src/components/Controls/`
   - `Controls.tsx` - React component
   - `Controls.test.tsx` - Test suite
   - `index.ts` - Exports

2. **Slider behavior**:
   - Range 0-100 for all sliders
   - Convert to 0-1 when passing to primitives
   - Real-time updates (no submit button)

3. **Mode toggle**:
   - Text mode: primitives render subtle/ambient
   - Visual mode: primitives render prominent/expressive
   - Toggle switch or button

4. **localStorage persistence**:
   - Save state on change
   - Load state on mount
   - Configurable storage key

5. **Headless mode**:
   - When `hidden={true}`, render nothing but still manage state
   - Allows imperative control without UI

6. **onChange callback**:
   - Called whenever any control changes
   - Provides full ControlState object

## Existing Patterns

From Spectrogram/Typography:
```typescript
// 0-1 range internally
spectrogram.setIntensity(0.5);  // 50%
spectrogram.setMotion(0.7);     // 70%
spectrogram.setMode('visual');
```

## Test Conventions
- Use Vitest with jsdom environment
- Use @testing-library/react for component tests
- Mock localStorage
- Test slider changes trigger onChange
- Test mode toggle
- Test persistence
