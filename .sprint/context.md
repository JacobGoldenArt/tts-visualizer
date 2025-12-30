# Sprint Context: Semantic Pipeline

## Tech Stack
- React 18 + TypeScript
- Vite for bundling
- Vitest for testing
- No external dependencies for default analyzer

## Project Structure
```
src/
  core/
    SemanticPipeline/    <- Your implementation goes here
  types/
    audio.ts             <- Existing types (reference for patterns)
```

## Implementation Guidelines

### Mood Object Structure
```typescript
interface MoodObject {
  sentiment: number;    // -1 (negative) to 1 (positive)
  energy: number;       // 0 (calm) to 1 (high energy)
  keywords: string[];   // Top 5 most relevant words
  emotion?: string;     // joy | sadness | anger | fear | surprise | neutral
}
```

### Analyzer Interface
The pipeline should be modular - analyzers can be swapped:

```typescript
interface Analyzer {
  analyze(text: string): MoodObject | Promise<MoodObject>;
}

interface SemanticPipeline {
  analyze(text: string): Promise<MoodObject>;
  setAnalyzer(analyzer: Analyzer): void;
  on(event: 'analyzed', callback: (mood: MoodObject) => void): void;
  off(event: 'analyzed', callback: (mood: MoodObject) => void): void;
}
```

### Default Analyzer Approach
For the default analyzer (no API calls):
1. **Sentiment**: Use a keyword dictionary with positive/negative word lists
2. **Energy**: Detect exclamation marks, caps, action words
3. **Keywords**: Extract nouns/significant words, filter stopwords, return top 5
4. **Emotion**: Map sentiment + energy to basic emotions

Example word lists:
- Positive: happy, love, great, wonderful, amazing, beautiful, excited...
- Negative: sad, hate, terrible, awful, angry, frustrated, worried...
- High energy: excited, running, shouting, urgent, amazing, incredible...
- Low energy: calm, peaceful, quiet, slow, relaxed, tired...

### Event Emitter Pattern
Use the same pattern established in AudioAdapter:
- Extend EventTarget or create typed event system
- Emit 'analyzed' event with MoodObject after analysis

### Testing Approach
- Test with various text samples
- Verify sentiment scores are in valid range
- Verify keywords are limited to 5
- Test empty string returns neutral mood
- Test long text doesn't timeout (use a 1000+ word sample)
- Test analyzer swapping works

## Key Decisions
1. Default analyzer uses keyword dictionaries (no API)
2. Interface supports async for future LLM analyzers
3. Keywords limited to top 5 most relevant
4. Basic emotions: joy, sadness, anger, fear, surprise, neutral

## Files to Create
- `src/core/SemanticPipeline/index.ts` - Module exports
- `src/core/SemanticPipeline/SemanticPipeline.ts` - Main class
- `src/core/SemanticPipeline/DefaultAnalyzer.ts` - Keyword-based analyzer
- `src/core/SemanticPipeline/SemanticPipeline.test.ts` - Tests
- `src/types/semantic.ts` - Type definitions
