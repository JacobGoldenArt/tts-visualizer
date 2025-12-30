# Elyse Speech Visualizer

## Overview

A React component library that creates semantically-aware, audio-reactive visualizations for AI speech. Combines lightweight text analysis (mood, keywords, sentiment) with real-time audio processing (frequency, amplitude) to generate lo-fi, hand-drawn style visuals that reflect the emotional tone of human-AI conversations.

**Primary use case:** Visual accompaniment for personal longform conversations between a human and AI (Elyse). Like a film score, but visual - reflecting vibe and emotional tone rather than simulating a face or avatar.

## Tech Stack

- **React** - Component library
- **Canvas 2D** - Rendering (chosen for lo-fi aesthetic, easier hand-drawn feel)
- **Web Audio API** - Real-time frequency and amplitude analysis
- **AI SDK** - Audio source (streaming bytes from TTS providers)
- **TypeScript** - Type safety
- **localStorage** - Simple state persistence

## Architecture

### Two-Layer System

**Semantic Layer (slow, affordable)**
- Analyzes conversation text before/during TTS
- Lightweight: keyword dictionaries, basic sentiment analysis
- Outputs: mood, color palette, which visual components to activate
- Modular design - analyzers are swappable like a modular synth

**Reactive Layer (real-time)**
- Web Audio API processing streaming audio bytes
- Drives animation based on frequency + amplitude
- Operates within mood parameters from semantic layer

### Integration Model

Runs **parallel** to existing chat UI (not as replacement):
- Visualizer is a companion/accompaniment
- Existing chat handles text rendering
- Receives text + audio as props
- Text/Visual mode toggle adjusts opacity/z-index for prominence

## Visual Direction

- **Lo-fi, warm, a little weird** - roughness is a feature
- Hand-drawn/sketchy quality (pencil over Pixar)
- Subtle glitch, chromatic aberration
- Not screensaver territory - intentional, semantically grounded
- Inspired by: Apple TV's "Calls", organic blobs, layered typography

## Project Structure

```
src/
  components/
    Visualizer/          # Main component
    Controls/            # Sliders, toggle
  primitives/
    Spectrogram/         # Frequency visualization
    Typography/          # Keyword display
  core/
    AudioAdapter/        # Normalizes TTS streams
    AudioAnalyzer/       # Web Audio API processing
    SemanticPipeline/    # Text analysis
    MoodMapper/          # Mood to visual params
    CanvasRenderer/      # 2D rendering utilities
  themes/
    dark.ts
    light.ts
  fixtures/              # Mock threads for testing
  types/
```

## Key Decisions

1. **Canvas 2D over WebGL** - Easier to achieve hand-drawn aesthetic
2. **Parallel mode over takeover** - Visualizer accompanies chat, doesn't replace it
3. **Modular semantic analysis** - Start simple, swap in LLM later
4. **Macro controls only** - 3 sliders + 1 toggle, not a full mixer
5. **Text/Visual toggle = opacity/z-index** - Not rendering responsibility

## Development Workflow

1. Check `docs/features.md` for current feature status
2. Work on features in dependency order
3. Check off tests as you complete them
4. Update feature status (🔴 → 🟡 → 🟢)
5. Use `/app-creator:revise` if features need updating

## Development Requirements: to be performed on initial setup.

- [ ] React/TypeScript project created (Vite)
- [ ] Package.json created with dependencies.
- [ ] Folder structure per CLAUDE.md
- [ ] Dependencies installed
- [ ] .env.local configured (Eleven Labs API)
- [ ] Created .sprint/ directory
- [ ] Generated init.sh

### Development Dependencies:
- [ ] React/TypeScript project created (Vite)
- [ ] Test framework installed (Jest)
- [ ] Linting installed (ESLint)
- [ ] Formatting installed (Prettier)
- [ ] Type checking installed (TypeScript)
- [ ] Testing library installed (React Testing Library)
- [ ] Mocking library installed (Jest)
- [ ] Coverage library installed (Jest)
- [ ] Code coverage library installed (Jest)

## Commands

```bash
# Development
npm run dev

# Tests
npm run test

# Build
npm run build
```

## Notes

- Audio format TBD - building adapter layer to handle various TTS providers
- Start with one format, expand as we test (Eleven Labs, etc.)
- Mock fixtures use real conversation threads for realistic testing
