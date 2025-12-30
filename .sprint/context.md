# Sprint 006 Context: Mock Thread Fixtures

## Tech Stack
- React + TypeScript
- Vitest for testing
- Node.js fs for file loading (in tests/dev)

## Project Structure
```
src/
  fixtures/              # NEW - Create this directory
    TranscriptParser.ts  # Main parser
    MockAudio.ts         # Synthetic audio generator
    FixtureLoader.ts     # Combines parsing + audio
    index.ts             # Exports
resources/
  chat_transcripts/      # 5 .md files with real conversations
    Elise and Jacob Dialogue.md
    chat-thread1.md
    coffee-chat.md
    existential-gaps-and-consciousness.md
    onanism.md
```

## Transcript Format
The .md files follow this pattern:
```
Speaker:

"Dialogue text goes here. May contain multiple sentences."


NextSpeaker:

"Their response..."
```

- Speakers: `Jacob` = user role, `Elyse` = assistant role
- Some files use `Elise` (with i) - treat same as Elyse
- Dialogue is always in quotes
- Blank lines separate exchanges

## Required Types
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    speaker: string;  // Original name (Jacob, Elyse)
    index: number;    // Message order
  };
}

interface MoodAnnotation {
  messageIndex: number;
  mood: MoodObject;  // From src/types/semantic.ts
}

interface Fixture {
  name: string;
  messages: Message[];
  moodAnnotations?: MoodAnnotation[];
}
```

## Existing Code to Use
- `src/types/semantic.ts` - MoodObject type
- `src/core/SemanticPipeline/` - For generating mood annotations

## Mock Audio Requirements
Create a synthetic waveform generator for testing:
- Returns AudioBuffer-like data
- Should generate sine wave patterns
- Duration configurable
- Sample rate: 44100Hz default
- Used for testing visualizer without real TTS

## Testing Notes
- Use Vitest (already configured)
- Test file: `src/fixtures/TranscriptParser.test.ts`
- Import transcripts at test time using fs.readFileSync
- All tests should pass independently
