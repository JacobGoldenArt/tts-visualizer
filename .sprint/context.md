# Sprint Context: Canvas Renderer

## Tech Stack
- React 18 + TypeScript
- Canvas 2D API (NOT WebGL)
- Vitest for testing
- jsdom environment (mock canvas context in tests)

## Project Structure
```
src/
  core/
    CanvasRenderer/    <- Your implementation goes here
  types/
    audio.ts           <- Existing types
    semantic.ts        <- Existing types
```

## Implementation Guidelines

### Visual Direction
- **Lo-fi, warm, a little weird** - roughness is a feature
- Hand-drawn/sketchy quality (pencil over Pixar)
- Subtle glitch, chromatic aberration
- Not screensaver territory - intentional, semantically grounded

### Core Interface
```typescript
interface CanvasRendererConfig {
  width?: number;
  height?: number;
  responsive?: boolean;      // Fill container if true
  pixelRatio?: number;       // Auto-detect devicePixelRatio if not set
}

interface DrawLineOptions {
  wobble?: number;           // 0 = straight, 1 = maximum wobble
  color?: string;
  lineWidth?: number;
}

interface DrawBlobOptions {
  irregularity?: number;     // How organic/wobbly the shape is
  color?: string;
  fill?: boolean;
}

interface DrawTextOptions {
  distortion?: number;       // 0 = clean, 1 = maximum distortion
  font?: string;
  color?: string;
}

interface GlobalEffects {
  grain?: number;            // 0 = none, 1 = heavy grain
  chromaticAberration?: number;
}

type Layer = 'background' | 'midground' | 'foreground';

interface CanvasRenderer {
  // Lifecycle
  mount(container: HTMLElement): void;
  unmount(): void;

  // Drawing primitives
  clear(layer?: Layer): void;
  drawLine(x1: number, y1: number, x2: number, y2: number, options?: DrawLineOptions): void;
  drawBlob(x: number, y: number, radius: number, options?: DrawBlobOptions): void;
  drawText(text: string, x: number, y: number, options?: DrawTextOptions): void;

  // Layer management
  setLayer(layer: Layer): void;

  // Animation
  onFrame(callback: (deltaTime: number) => void): void;
  offFrame(callback: (deltaTime: number) => void): void;

  // Effects
  setEffects(effects: GlobalEffects): void;

  // Dimensions
  readonly width: number;
  readonly height: number;
}
```

### Wobble/Sketchiness Algorithm
For sketchy lines, add small random offsets to line vertices:
```typescript
function wobbleLine(x1, y1, x2, y2, wobbleAmount) {
  const segments = 5; // Break line into segments
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * wobbleAmount;
    const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * wobbleAmount;
    points.push({ x, y });
  }
  return points;
}
```

### Layer Compositing
Use multiple canvas elements or offscreen canvases stacked:
- Background: static/slow-moving elements
- Midground: main visualization
- Foreground: overlays, effects

### High-DPI Support
```typescript
const dpr = window.devicePixelRatio || 1;
canvas.width = width * dpr;
canvas.height = height * dpr;
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
ctx.scale(dpr, dpr);
```

### Grain Effect
Apply a semi-transparent noise overlay using imageData or a pre-generated noise pattern:
```typescript
function applyGrain(ctx, intensity) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * intensity * 50;
    data[i] += noise;     // R
    data[i + 1] += noise; // G
    data[i + 2] += noise; // B
  }
  ctx.putImageData(imageData, 0, 0);
}
```

### Chromatic Aberration
Offset RGB channels slightly:
```typescript
function applyChromaticAberration(ctx, amount) {
  // Render scene 3 times with slight offsets
  // Red channel: offset left
  // Blue channel: offset right
  // Or use channel separation techniques
}
```

### Testing Approach
- Mock canvas context in jsdom (canvas doesn't render but methods are callable)
- Test that methods exist and are callable
- Test dimensions and responsive behavior
- Test animation loop starts/stops correctly
- Test cleanup on unmount

## Files to Create
- `src/core/CanvasRenderer/index.ts` - Module exports
- `src/core/CanvasRenderer/CanvasRenderer.ts` - Main class
- `src/core/CanvasRenderer/effects.ts` - Grain, chromatic aberration
- `src/core/CanvasRenderer/CanvasRenderer.test.ts` - Tests
- `src/types/canvas.ts` - Type definitions (optional, can inline)
