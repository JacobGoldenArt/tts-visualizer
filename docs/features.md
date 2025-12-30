# Elyse Speech Visualizer - Features

> 11 features | 111 tests | Last updated: 2025-12-30

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

**Status:** 🟢 Complete

**Description:** Parse real conversation transcripts into structured fixtures for testing and development.

**Dependencies:** None

**Tests:**
- [x] Transcript parser converts .md files to Message[] JSON format
- [x] Parser correctly identifies speaker (Jacob → user, Elyse → assistant)
- [x] Parser preserves message order and content
- [x] Fixtures load from resources/chat_transcripts/*.md
- [x] Loaded fixtures include varied emotional tones (joy, tension, calm, existential)
- [x] Audio mock generates synthetic waveform for testing
- [x] Fixture loader exposes getMessages() and getMoodAnnotations() methods

**Notes:**
- Real transcripts in resources/chat_transcripts/ (5 files)
- Markdown format: `Speaker: "dialogue"` → JSON Message objects
- Speaker mapping: Jacob = user, Elyse = assistant
- Transcripts cover: casual chat, existential discussion, humor, emotional depth
- Eleven Labs integration testing: use voice ID `10ANszRcPh013aYVQ43R`

---

## Phase 2: Processing

### 2. Audio Analyzer

**Status:** 🟢 Complete

**Description:** Processes normalized audio data and extracts frequency spectrum and amplitude values in real-time.

**Dependencies:** 1 (Audio Adapter)

**Tests:**
- [x] Analyzer receives AudioBuffer from Audio Adapter
- [x] Analyzer outputs frequency data as Float32Array (FFT)
- [x] Analyzer outputs current amplitude as normalized 0-1 value
- [x] Analyzer emits data at consistent frame rate (~60fps or requestAnimationFrame)
- [x] Frequency data contains at least 64 bands
- [x] Analyzer exposes configurable FFT size (256, 512, 1024, 2048)
- [x] Analyzer continues outputting zero values when no audio is playing
- [x] Analyzer can be paused and resumed
- [x] Analyzer properly disconnects and cleans up on destroy()
- [x] Amplitude smoothing is configurable (attack/release time)

**Notes:**
- Use Web Audio API AnalyserNode
- Smoothing prevents jittery visuals
- May want separate "peak" and "RMS" amplitude outputs

---

### 7. Mood-to-Visual Mapper

**Status:** 🟢 Complete

**Description:** Translates semantic analysis output into visual parameters (colors, intensity multipliers).

**Dependencies:** 3 (Semantic Pipeline)

**Tests:**
- [x] Mapper accepts mood object from semantic pipeline
- [x] Mapper outputs color palette (primary, secondary, accent colors)
- [x] Mapper outputs intensity modifier (0.5 to 1.5 multiplier)
- [x] Positive sentiment maps to warm/bright colors
- [x] Negative sentiment maps to cool/muted colors
- [x] High energy maps to increased intensity modifier
- [x] Mapper supports custom mood-to-palette configurations
- [x] Mapper interpolates smoothly between mood changes (no jarring shifts)
- [x] Mapper provides suggested primitive weights (which to emphasize)
- [x] Mapper exposes current state for external access

**Notes:**
- Interpolation timing should be configurable
- Consider HSL color space for easier mood mapping

---

## Phase 3: Visuals

### 5. Spectrogram

**Status:** 🟢 Complete

**Description:** Frequency-reactive visualization that displays audio spectrum data with sketchy aesthetic.

**Dependencies:** 2 (Audio Analyzer), 4 (Canvas Renderer)

**Tests:**
- [x] Spectrogram renders frequency bands as vertical bars/lines
- [x] Bar heights correspond to frequency magnitude
- [x] Spectrogram reacts in real-time as audio plays (<50ms latency feel)
- [x] Spectrogram accepts color palette from mood mapper
- [x] Spectrogram intensity is controllable (affects bar count/thickness)
- [x] Spectrogram has "sketchy" rendering (wobble on edges)
- [x] Spectrogram gracefully handles no audio (flat or minimal state)
- [x] Spectrogram supports horizontal and vertical orientations
- [x] Motion control affects animation smoothness/speed
- [x] Spectrogram respects text/visual mode (opacity/prominence)

**Notes:**
- Could experiment with circular/radial spectrogram layout later
- Consider mirroring (symmetric) option

---

### 6. Typography

**Status:** 🟢 Complete

**Description:** Keyword/fragment display that emphasizes semantic content from the conversation. Floats, fades, responds to mood.

**Dependencies:** 3 (Semantic Pipeline), 4 (Canvas Renderer)

**Tests:**
- [x] Typography renders keywords from semantic pipeline
- [x] Keywords are visually emphasized (size, color, glow)
- [x] In text mode: typography is subtle, ambient
- [x] In visual mode: typography is prominent, expressive
- [x] Typography accepts font family and base size config
- [x] Text fades out over time (configurable fade duration)
- [x] Typography handles positioning within canvas bounds
- [x] Motion control affects text drift/float behavior
- [x] Intensity control affects keyword emphasis strength
- [x] Typography can differentiate user vs AI content (subtle)
- [x] Keywords "pop" or float independently based on mood

**Notes:**
- This displays keywords/fragments, not full conversation text
- Full text stays in the existing chat UI

---

### 9. Theme Support

**Status:** 🟢 Complete

**Description:** Dark and light theme variants that adapt all visual elements.

**Dependencies:** 4 (Canvas Renderer)

**Tests:**
- [x] Dark theme applies dark background, light accents
- [x] Light theme applies light background, dark accents
- [x] Theme is configurable via prop
- [x] Theme respects system preference by default (prefers-color-scheme)
- [x] Theme can be overridden regardless of system preference
- [x] Theme change transitions smoothly (no flash)
- [x] All primitives (spectrogram, typography) adapt to current theme
- [x] Mood colors work well in both themes

**Notes:**
- Ensure mood palettes are legible in both themes

---

## Phase 4: Integration

### 8. Control Interface

**Status:** 🟢 Complete

**Description:** User-facing controls for adjusting visualization parameters.

**Dependencies:** 7 (Mood-to-Visual Mapper)

**Tests:**
- [x] Saturation slider adjusts color vibrancy (0-100 range)
- [x] Intensity slider adjusts visual density (0-100 range)
- [x] Motion slider adjusts animation speed/amount (0-100 range)
- [x] Text/Visual mode toggle switches between modes
- [x] Text mode: low opacity, blurred, ambient background
- [x] Visual mode: prominent, higher z-index, immersive
- [x] Control changes apply in real-time (no lag)
- [x] Controls expose onChange callback for external state management
- [x] Controls can be hidden (headless mode for embedding)
- [x] Control state persists via localStorage

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
