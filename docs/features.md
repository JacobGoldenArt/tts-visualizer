# Elyse Speech Visualizer - Features

> 11 features | 110 tests | Last updated: 2025-12-28

## How to Use This File

- Work through features in order (dependencies are listed)
- Check off tests as you complete them
- Update status emoji as you progress:
  - 🔴 Not Started
  - 🟡 In Progress
  - 🟢 Complete
- Run `/app-creator:revise` if features need updating during development

---

## Phase 1: Foundations

### 1. Audio Adapter

**Status:** 🟢 Complete

**Description:** Accepts streaming audio from various TTS providers and normalizes it into a consistent format for analysis.

**Dependencies:** None

**Tests:**
- [x] Adapter accepts raw PCM audio bytes and outputs AudioBuffer
- [x] Adapter accepts MP3 chunks and decodes to AudioBuffer
- [x] Adapter accepts WAV chunks and decodes to AudioBuffer
- [x] Adapter handles different sample rates (22050Hz, 44100Hz, 48000Hz)
- [x] Adapter emits 'data' events as audio chunks arrive
- [x] Adapter emits 'end' event when stream completes
- [x] Adapter handles empty/null input without crashing
- [x] Adapter can be instantiated with a config object specifying expected format
- [x] Adapter exposes `connect()` method to pipe to Audio Analyzer
- [x] Adapter can be stopped mid-stream via `stop()` method
- [x] Adapter handles connection interruption gracefully (emits error event)

**Notes:**
- Start with one format (likely PCM), add others as we test providers
- Consider using AudioContext.decodeAudioData for encoded formats
- Keep the interface stable even as internals change

---

### 3. Semantic Pipeline

**Status:** 🟢 Complete

**Description:** Analyzes conversation text and outputs mood/sentiment data that influences visual parameters. Modular design allows swapping analysis approaches.

**Dependencies:** None

**Tests:**
- [x] Pipeline accepts text string input via `analyze(text)` method
- [x] Pipeline returns mood object with `sentiment` (-1 to 1 scale)
- [x] Pipeline returns mood object with `energy` (0 to 1 scale)
- [x] Pipeline returns mood object with `keywords` (array of strings)
- [x] Pipeline identifies basic emotions: joy, sadness, anger, fear, surprise
- [x] Pipeline handles empty string input (returns neutral mood)
- [x] Pipeline handles very long text (1000+ words) without timeout
- [x] Analyzer module is swappable via `setAnalyzer(analyzerModule)` method
- [x] Default analyzer works without external API calls
- [x] Pipeline emits 'analyzed' event with mood object
- [x] Keywords array is limited to top 5 most relevant words

**Notes:**
- Start with simple keyword dictionary + basic sentiment
- Interface should support async analyzers (for future LLM integration)
- Consider caching recent analysis results
- Keep modular like a modular synth - easy to patch different approaches

---

### 4. Canvas Renderer

**Status:** 🟢 Complete

**Description:** Core 2D canvas rendering system with utilities for lo-fi, sketchy aesthetic.

**Dependencies:** None

**Tests:**
- [x] Renderer initializes canvas at specified dimensions
- [x] Renderer supports responsive sizing (fills container)
- [x] Renderer exposes `clear()` method to wipe canvas
- [x] Renderer provides `drawLine()` with configurable wobble/sketchiness
- [x] Renderer provides `drawBlob()` for organic shapes
- [x] Renderer provides `drawText()` with optional distortion
- [x] Renderer supports layer compositing (background, midground, foreground)
- [x] Renderer handles high-DPI displays (devicePixelRatio)
- [x] Renderer exposes animation loop via `onFrame(callback)`
- [x] Renderer can apply global effects (grain, chromatic aberration)
- [x] Renderer properly cleans up on unmount (cancels animation frame)

**Notes:**
- Sketchiness = small random offsets on line vertices
- Grain can be a semi-transparent noise overlay
- Keep primitives simple, expressiveness comes from composition
- Lo-fi, warm, a little weird - roughness is a feature

---

### 10. Mock Thread Fixtures

**Status:** 🔴 Not Started

**Description:** Realistic conversation fixtures for testing and development.

**Dependencies:** None

**Tests:**
- [ ] Fixtures include realistic conversation length (50+ messages)
- [ ] Fixtures include varied emotional tones (joy, tension, calm, humor)
- [ ] Fixtures include both user and AI messages
- [ ] Fixtures can be loaded in test/demo environment
- [ ] Audio mock generates synthetic waveform for testing
- [ ] Fixtures documented with expected mood outputs

**Notes:**
- Use real conversations from existing threads
- Include variety of moods and conversational dynamics

---

## Phase 2: Processing

### 2. Audio Analyzer

**Status:** 🔴 Not Started

**Description:** Processes normalized audio data and extracts frequency spectrum and amplitude values in real-time.

**Dependencies:** 1 (Audio Adapter)

**Tests:**
- [ ] Analyzer receives AudioBuffer from Audio Adapter
- [ ] Analyzer outputs frequency data as Float32Array (FFT)
- [ ] Analyzer outputs current amplitude as normalized 0-1 value
- [ ] Analyzer emits data at consistent frame rate (~60fps or requestAnimationFrame)
- [ ] Frequency data contains at least 64 bands
- [ ] Analyzer exposes configurable FFT size (256, 512, 1024, 2048)
- [ ] Analyzer continues outputting zero values when no audio is playing
- [ ] Analyzer can be paused and resumed
- [ ] Analyzer properly disconnects and cleans up on destroy()
- [ ] Amplitude smoothing is configurable (attack/release time)

**Notes:**
- Use Web Audio API AnalyserNode
- Smoothing prevents jittery visuals
- May want separate "peak" and "RMS" amplitude outputs

---

### 7. Mood-to-Visual Mapper

**Status:** 🔴 Not Started

**Description:** Translates semantic analysis output into visual parameters (colors, intensity multipliers).

**Dependencies:** 3 (Semantic Pipeline)

**Tests:**
- [ ] Mapper accepts mood object from semantic pipeline
- [ ] Mapper outputs color palette (primary, secondary, accent colors)
- [ ] Mapper outputs intensity modifier (0.5 to 1.5 multiplier)
- [ ] Positive sentiment maps to warm/bright colors
- [ ] Negative sentiment maps to cool/muted colors
- [ ] High energy maps to increased intensity modifier
- [ ] Mapper supports custom mood-to-palette configurations
- [ ] Mapper interpolates smoothly between mood changes (no jarring shifts)
- [ ] Mapper provides suggested primitive weights (which to emphasize)
- [ ] Mapper exposes current state for external access

**Notes:**
- Interpolation timing should be configurable
- Consider HSL color space for easier mood mapping

---

## Phase 3: Visuals

### 5. Spectrogram

**Status:** 🔴 Not Started

**Description:** Frequency-reactive visualization that displays audio spectrum data with sketchy aesthetic.

**Dependencies:** 2 (Audio Analyzer), 4 (Canvas Renderer)

**Tests:**
- [ ] Spectrogram renders frequency bands as vertical bars/lines
- [ ] Bar heights correspond to frequency magnitude
- [ ] Spectrogram reacts in real-time as audio plays (<50ms latency feel)
- [ ] Spectrogram accepts color palette from mood mapper
- [ ] Spectrogram intensity is controllable (affects bar count/thickness)
- [ ] Spectrogram has "sketchy" rendering (wobble on edges)
- [ ] Spectrogram gracefully handles no audio (flat or minimal state)
- [ ] Spectrogram supports horizontal and vertical orientations
- [ ] Motion control affects animation smoothness/speed
- [ ] Spectrogram respects text/visual mode (opacity/prominence)

**Notes:**
- Could experiment with circular/radial spectrogram layout later
- Consider mirroring (symmetric) option

---

### 6. Typography

**Status:** 🔴 Not Started

**Description:** Keyword/fragment display that emphasizes semantic content from the conversation. Floats, fades, responds to mood.

**Dependencies:** 3 (Semantic Pipeline), 4 (Canvas Renderer)

**Tests:**
- [ ] Typography renders keywords from semantic pipeline
- [ ] Keywords are visually emphasized (size, color, glow)
- [ ] In text mode: typography is subtle, ambient
- [ ] In visual mode: typography is prominent, expressive
- [ ] Typography accepts font family and base size config
- [ ] Text fades out over time (configurable fade duration)
- [ ] Typography handles positioning within canvas bounds
- [ ] Motion control affects text drift/float behavior
- [ ] Intensity control affects keyword emphasis strength
- [ ] Typography can differentiate user vs AI content (subtle)
- [ ] Keywords "pop" or float independently based on mood

**Notes:**
- This displays keywords/fragments, not full conversation text
- Full text stays in the existing chat UI

---

### 9. Theme Support

**Status:** 🔴 Not Started

**Description:** Dark and light theme variants that adapt all visual elements.

**Dependencies:** 4 (Canvas Renderer)

**Tests:**
- [ ] Dark theme applies dark background, light accents
- [ ] Light theme applies light background, dark accents
- [ ] Theme is configurable via prop
- [ ] Theme respects system preference by default (prefers-color-scheme)
- [ ] Theme can be overridden regardless of system preference
- [ ] Theme change transitions smoothly (no flash)
- [ ] All primitives (spectrogram, typography) adapt to current theme
- [ ] Mood colors work well in both themes

**Notes:**
- Ensure mood palettes are legible in both themes

---

## Phase 4: Integration

### 8. Control Interface

**Status:** 🔴 Not Started

**Description:** User-facing controls for adjusting visualization parameters.

**Dependencies:** 7 (Mood-to-Visual Mapper)

**Tests:**
- [ ] Saturation slider adjusts color vibrancy (0-100 range)
- [ ] Intensity slider adjusts visual density (0-100 range)
- [ ] Motion slider adjusts animation speed/amount (0-100 range)
- [ ] Text/Visual mode toggle switches between modes
- [ ] Text mode: low opacity, blurred, ambient background
- [ ] Visual mode: prominent, higher z-index, immersive
- [ ] Control changes apply in real-time (no lag)
- [ ] Controls expose onChange callback for external state management
- [ ] Controls can be hidden (headless mode for embedding)
- [ ] Control state persists via localStorage

**Notes:**
- Keep UI minimal - macro controls, not a full mixer
- Consider exposing controls as both UI component and imperative API
- Preset save/load deferred to v2

---

### 11. Main Visualizer Component

**Status:** 🔴 Not Started

**Description:** Top-level React component that orchestrates all modules and exposes a clean API for integration.

**Dependencies:** 1, 2, 3, 4, 5, 6, 7, 8, 9

**Tests:**
- [ ] Component accepts `text` prop (current conversation text)
- [ ] Component accepts `audioStream` prop (streaming audio source)
- [ ] Component renders visualization canvas
- [ ] Component optionally renders control interface
- [ ] Component accepts `config` prop for initial settings
- [ ] Component exposes `ref` with imperative methods (pause, resume)
- [ ] Component handles missing audioStream gracefully (text-only mode)
- [ ] Component handles missing text gracefully (audio-only mode)
- [ ] Component properly cleans up all resources on unmount
- [ ] Component supports custom className and style props
- [ ] Component emits onMoodChange callback when mood updates
- [ ] Component works in SSR environment (no window errors during build)

**Notes:**
- This is the public API surface - keep it simple
- Visualizer runs parallel to existing chat UI (Option A)
- Text/Visual toggle adjusts opacity/z-index, not rendering responsibility

---

## Deferred to v2

- Sketchy Lines primitive
- Blobs primitive
- Preset save/load
- Additional spectrogram layouts (radial, etc.)
