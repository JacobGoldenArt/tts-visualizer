/**
 * DefaultAnalyzer - Keyword-based semantic analyzer
 *
 * Uses keyword dictionaries for sentiment, energy detection,
 * and basic emotion classification. No external API calls required.
 */

import type { Analyzer, MoodObject, Emotion } from '@/types/semantic';

/**
 * Word lists for sentiment analysis
 */
const POSITIVE_WORDS = new Set([
  'happy', 'love', 'great', 'wonderful', 'amazing', 'beautiful', 'excited',
  'fantastic', 'excellent', 'brilliant', 'awesome', 'joyful', 'delighted',
  'pleased', 'grateful', 'thankful', 'cheerful', 'glad', 'optimistic',
  'hopeful', 'content', 'satisfied', 'thrilled', 'ecstatic', 'blissful',
  'good', 'nice', 'perfect', 'lovely', 'superb', 'magnificent', 'marvelous',
  'terrific', 'splendid', 'outstanding', 'remarkable', 'incredible', 'fabulous',
  'positive', 'success', 'successful', 'win', 'winner', 'victory', 'triumph',
  'achieve', 'accomplished', 'proud', 'blessed', 'fortunate', 'lucky',
]);

const NEGATIVE_WORDS = new Set([
  'sad', 'hate', 'terrible', 'awful', 'angry', 'frustrated', 'worried',
  'depressed', 'miserable', 'unhappy', 'disappointed', 'upset', 'annoyed',
  'irritated', 'furious', 'enraged', 'hostile', 'resentful', 'bitter',
  'gloomy', 'hopeless', 'pessimistic', 'despairing', 'heartbroken', 'devastated',
  'bad', 'worse', 'worst', 'horrible', 'dreadful', 'atrocious', 'appalling',
  'disgusting', 'repulsive', 'offensive', 'unpleasant', 'disagreeable',
  'negative', 'fail', 'failure', 'failed', 'lose', 'loser', 'loss', 'defeat',
  'regret', 'sorry', 'ashamed', 'guilty', 'embarrassed', 'humiliated',
  'anxious', 'nervous', 'afraid', 'scared', 'terrified', 'frightened', 'fearful',
]);

/**
 * Word lists for energy detection
 */
const HIGH_ENERGY_WORDS = new Set([
  'excited', 'running', 'shouting', 'urgent', 'amazing', 'incredible',
  'rush', 'hurry', 'fast', 'quick', 'rapid', 'sprint', 'dash', 'race',
  'jump', 'leap', 'burst', 'explode', 'boom', 'crash', 'bang', 'thunder',
  'roar', 'scream', 'yell', 'shout', 'cry', 'exclaim', 'demand', 'insist',
  'must', 'now', 'immediately', 'asap', 'emergency', 'critical', 'vital',
  'intense', 'powerful', 'strong', 'fierce', 'wild', 'crazy', 'insane',
  'thrilling', 'exhilarating', 'electrifying', 'dynamic', 'energetic',
  'enthusiastic', 'passionate', 'zealous', 'fervent', 'ardent', 'eager',
  'action', 'fight', 'battle', 'attack', 'charge', 'strike', 'force',
]);

const LOW_ENERGY_WORDS = new Set([
  'calm', 'peaceful', 'quiet', 'slow', 'relaxed', 'tired',
  'gentle', 'soft', 'mild', 'serene', 'tranquil', 'placid', 'still',
  'rest', 'sleep', 'nap', 'dream', 'drift', 'float', 'glide', 'ease',
  'whisper', 'murmur', 'sigh', 'breathe', 'meditate', 'contemplate',
  'wait', 'pause', 'stop', 'halt', 'stay', 'remain', 'linger',
  'lazy', 'drowsy', 'sleepy', 'weary', 'exhausted', 'fatigued',
  'soothing', 'comforting', 'cozy', 'warm', 'snug', 'comfortable',
  'patient', 'steady', 'measured', 'gradual', 'leisurely', 'unhurried',
]);

/**
 * Emotion-specific word lists
 */
const JOY_WORDS = new Set([
  'happy', 'joy', 'joyful', 'delighted', 'ecstatic', 'elated', 'cheerful',
  'glad', 'pleased', 'content', 'satisfied', 'thrilled', 'blissful',
  'merry', 'jolly', 'festive', 'celebrate', 'celebration', 'party',
  'laugh', 'laughing', 'smile', 'smiling', 'grin', 'giggle', 'chuckle',
]);

const SADNESS_WORDS = new Set([
  'sad', 'sadness', 'unhappy', 'depressed', 'melancholy', 'gloomy',
  'sorrowful', 'mournful', 'grief', 'grieving', 'heartbroken', 'devastated',
  'miserable', 'despairing', 'hopeless', 'dejected', 'downcast', 'forlorn',
  'cry', 'crying', 'tears', 'weep', 'weeping', 'sob', 'sobbing', 'mourn',
  'lonely', 'alone', 'isolated', 'abandoned', 'rejected', 'lost',
]);

const ANGER_WORDS = new Set([
  'angry', 'anger', 'furious', 'enraged', 'livid', 'irate', 'outraged',
  'mad', 'infuriated', 'incensed', 'seething', 'fuming', 'raging',
  'hostile', 'aggressive', 'violent', 'hate', 'hatred', 'loathe', 'despise',
  'resentful', 'bitter', 'indignant', 'annoyed', 'irritated', 'frustrated',
  'yell', 'scream', 'shout', 'rage', 'explode', 'fight', 'attack',
]);

const FEAR_WORDS = new Set([
  'afraid', 'fear', 'fearful', 'scared', 'terrified', 'frightened',
  'horrified', 'petrified', 'panicked', 'alarmed', 'startled', 'shocked',
  'anxious', 'nervous', 'worried', 'uneasy', 'apprehensive', 'dread',
  'terror', 'horror', 'nightmare', 'danger', 'dangerous', 'threat',
  'threatening', 'menacing', 'ominous', 'creepy', 'eerie', 'spooky',
  'hide', 'run', 'escape', 'flee', 'tremble', 'shiver', 'shake',
]);

const SURPRISE_WORDS = new Set([
  'surprised', 'surprise', 'astonished', 'amazed', 'astounded', 'stunned',
  'shocked', 'startled', 'dumbfounded', 'flabbergasted', 'bewildered',
  'unexpected', 'sudden', 'suddenly', 'abrupt', 'wow', 'whoa', 'oh',
  'unbelievable', 'incredible', 'extraordinary', 'remarkable', 'unusual',
  'strange', 'weird', 'odd', 'bizarre', 'curious', 'peculiar',
  'gasp', 'jaw-drop', 'eyes-wide', 'speechless', 'taken-aback',
]);

/**
 * Common stop words to filter from keywords
 */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'it', 'its', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
  'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he',
  'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'they',
  'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom',
  'this', 'that', 'these', 'those', 'am', 'being', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
  'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don',
  'now', 'also', 'into', 'up', 'down', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'if', 'because', 'about', 'after',
  'before', 'while', 'during', 'above', 'below', 'between', 'through',
]);

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1)
    // Filter out words that only contain dashes, apostrophes or non-letters
    .filter(word => /[a-z]/.test(word));
}

/**
 * Calculate sentiment score from -1 to 1
 */
function calculateSentiment(words: string[]): number {
  if (words.length === 0) return 0;

  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positiveCount++;
    if (NEGATIVE_WORDS.has(word)) negativeCount++;
  }

  const total = positiveCount + negativeCount;
  if (total === 0) return 0;

  // Score from -1 to 1
  return (positiveCount - negativeCount) / total;
}

/**
 * Calculate energy level from 0 to 1
 */
function calculateEnergy(text: string, words: string[]): number {
  if (words.length === 0) return 0.5;

  let highEnergyCount = 0;
  let lowEnergyCount = 0;

  for (const word of words) {
    if (HIGH_ENERGY_WORDS.has(word)) highEnergyCount++;
    if (LOW_ENERGY_WORDS.has(word)) lowEnergyCount++;
  }

  // Count exclamation marks and caps as high energy indicators
  const exclamationCount = (text.match(/!/g) || []).length;
  const capsWords = text.split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase()).length;

  highEnergyCount += exclamationCount * 0.5;
  highEnergyCount += capsWords * 0.3;

  const total = highEnergyCount + lowEnergyCount;
  if (total === 0) return 0.5;

  // Score from 0 to 1, centered at 0.5
  const ratio = highEnergyCount / total;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Detect primary emotion
 */
function detectEmotion(words: string[], sentiment: number, energy: number): Emotion {
  // Count emotion-specific words
  const emotionCounts: Record<Emotion, number> = {
    joy: 0,
    sadness: 0,
    anger: 0,
    fear: 0,
    surprise: 0,
    neutral: 0,
  };

  for (const word of words) {
    if (JOY_WORDS.has(word)) emotionCounts.joy++;
    if (SADNESS_WORDS.has(word)) emotionCounts.sadness++;
    if (ANGER_WORDS.has(word)) emotionCounts.anger++;
    if (FEAR_WORDS.has(word)) emotionCounts.fear++;
    if (SURPRISE_WORDS.has(word)) emotionCounts.surprise++;
  }

  // Find emotion with highest count
  let maxEmotion: Emotion = 'neutral';
  let maxCount = 0;

  for (const [emotion, count] of Object.entries(emotionCounts)) {
    if (count > maxCount && emotion !== 'neutral') {
      maxCount = count;
      maxEmotion = emotion as Emotion;
    }
  }

  // If no specific emotion detected, infer from sentiment and energy
  if (maxCount === 0) {
    if (sentiment > 0.3) {
      return 'joy';
    } else if (sentiment < -0.3) {
      if (energy > 0.6) {
        return 'anger';
      } else {
        return 'sadness';
      }
    }
    return 'neutral';
  }

  return maxEmotion;
}

/**
 * Extract top keywords (significant words, excluding stop words)
 */
function extractKeywords(words: string[], limit: number = 5): string[] {
  // Count word frequencies, excluding stop words
  const wordCounts = new Map<string, number>();

  for (const word of words) {
    if (!STOP_WORDS.has(word) && word.length > 2) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Sort by frequency, then alphabetically for consistency
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // Higher frequency first
      return a[0].localeCompare(b[0]); // Alphabetical for ties
    })
    .map(([word]) => word);

  // Return top N keywords
  return sortedWords.slice(0, limit);
}

/**
 * DefaultAnalyzer class implementing the Analyzer interface
 */
export class DefaultAnalyzer implements Analyzer {
  /**
   * Analyze text and return a mood object
   * This is a synchronous implementation using keyword dictionaries
   */
  analyze(text: string): MoodObject {
    // Handle empty input
    if (!text || text.trim().length === 0) {
      return {
        sentiment: 0,
        energy: 0.5,
        keywords: [],
        emotion: 'neutral',
      };
    }

    // Tokenize text
    const words = tokenize(text);

    // Calculate mood components
    const sentiment = calculateSentiment(words);
    const energy = calculateEnergy(text, words);
    const emotion = detectEmotion(words, sentiment, energy);
    const keywords = extractKeywords(words, 5);

    return {
      sentiment,
      energy,
      keywords,
      emotion,
    };
  }
}

/**
 * Create a new DefaultAnalyzer instance
 */
export function createDefaultAnalyzer(): Analyzer {
  return new DefaultAnalyzer();
}
