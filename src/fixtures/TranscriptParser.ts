/**
 * TranscriptParser - Parses conversation transcripts from .md files to Message[] format
 *
 * Handles the specific format used in resources/chat_transcripts/:
 * - Speaker names followed by colon (Jacob:, Elyse:, Elise:)
 * - Dialogue in quotes
 * - Blank lines between exchanges
 */

import type { Message, MessageRole, MessageMetadata } from '@/types/fixtures';

/**
 * Map speaker names to roles
 * Jacob = user, Elyse/Elise = assistant
 */
const SPEAKER_ROLE_MAP: Record<string, MessageRole> = {
  jacob: 'user',
  elyse: 'assistant',
  elise: 'assistant', // Alternate spelling
  human: 'user', // Sometimes used as alias
};

/**
 * Parse a transcript string into an array of messages
 *
 * @param transcript - Raw transcript text from .md file
 * @returns Array of parsed messages with roles and content
 */
export function parseTranscript(transcript: string): Message[] {
  const messages: Message[] = [];

  // Handle empty input
  if (!transcript || !transcript.trim()) {
    return messages;
  }

  // Regex to match speaker patterns:
  // - "Speaker:" at line start (possibly after newline)
  // - Handles multi-paragraph quotes by capturing until next speaker or end
  const speakerPattern = /^([A-Za-z]+):\s*\n?/gm;

  // Split by speaker markers, keeping the speaker names
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Find all speaker positions
  const speakers: { name: string; index: number }[] = [];
  while ((match = speakerPattern.exec(transcript)) !== null) {
    speakers.push({ name: match[1], index: match.index + match[0].length });
    if (lastIndex < match.index && lastIndex === 0) {
      // Content before first speaker (usually empty)
      parts.push(transcript.slice(lastIndex, match.index));
    }
    lastIndex = match.index;
  }

  // Extract each speaker's content
  for (let i = 0; i < speakers.length; i++) {
    const speaker = speakers[i];
    const nextSpeaker = speakers[i + 1];
    const endIndex = nextSpeaker ? nextSpeaker.index - nextSpeaker.name.length - 1 : transcript.length;

    // Find the actual start of content (after "Speaker:" and any whitespace)
    const contentStart = speaker.index;
    const contentEnd = endIndex;

    // Extract content and find quoted text
    let content = transcript.slice(contentStart, contentEnd).trim();

    // Find all quoted sections and join them
    const quotedContent = extractQuotedContent(content);

    if (quotedContent) {
      const speakerLower = speaker.name.toLowerCase();
      const role = SPEAKER_ROLE_MAP[speakerLower] || 'user';

      const metadata: MessageMetadata = {
        speaker: speaker.name,
        index: messages.length,
      };

      messages.push({
        role,
        content: quotedContent,
        metadata,
      });
    }
  }

  return messages;
}

/**
 * Extract quoted content from a string
 * Handles multiple quote blocks and joins them
 *
 * @param text - Text containing quoted dialogue
 * @returns Extracted dialogue without quotes
 */
function extractQuotedContent(text: string): string {
  // Match content within quotes (handles multiline quotes)
  const quotePattern = /"([^"]+)"/g;
  const quotes: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = quotePattern.exec(text)) !== null) {
    quotes.push(match[1].trim());
  }

  // Join multiple quote blocks with a space
  return quotes.join(' ').trim();
}

/**
 * Get the role for a given speaker name
 *
 * @param speaker - Speaker name from transcript
 * @returns Message role ('user' or 'assistant')
 */
export function getSpeakerRole(speaker: string): MessageRole {
  const speakerLower = speaker.toLowerCase();
  return SPEAKER_ROLE_MAP[speakerLower] || 'user';
}

/**
 * Validate that a message array preserves order
 *
 * @param messages - Array of messages to validate
 * @returns True if message indices are sequential
 */
export function validateMessageOrder(messages: Message[]): boolean {
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].metadata?.index !== i) {
      return false;
    }
  }
  return true;
}

/**
 * Create the TranscriptParser class for more complex operations
 */
export class TranscriptParser {
  /**
   * Parse transcript text to messages
   */
  parse(transcript: string): Message[] {
    return parseTranscript(transcript);
  }

  /**
   * Get role for a speaker name
   */
  getRoleForSpeaker(speaker: string): MessageRole {
    return getSpeakerRole(speaker);
  }

  /**
   * Validate message order
   */
  validateOrder(messages: Message[]): boolean {
    return validateMessageOrder(messages);
  }
}

/**
 * Create a new TranscriptParser instance
 */
export function createTranscriptParser(): TranscriptParser {
  return new TranscriptParser();
}
