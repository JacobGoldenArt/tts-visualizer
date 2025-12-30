/**
 * Semantic types for the Elyse Speech Visualizer
 *
 * Types for mood analysis, semantic pipeline, and analyzers.
 */

/**
 * Basic emotions that can be detected
 */
export type Emotion = 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral';

/**
 * Mood object representing the semantic analysis of text
 */
export interface MoodObject {
  /** Sentiment score from -1 (negative) to 1 (positive) */
  sentiment: number;
  /** Energy level from 0 (calm) to 1 (high energy) */
  energy: number;
  /** Top 5 most relevant keywords */
  keywords: string[];
  /** Detected emotion */
  emotion: Emotion;
}

/**
 * Event types emitted by the SemanticPipeline
 */
export type SemanticEventType = 'analyzed';

/**
 * Event data for 'analyzed' events
 */
export interface SemanticAnalyzedEvent {
  type: 'analyzed';
  mood: MoodObject;
  text: string;
  timestamp: number;
}

/**
 * Callback type for semantic events
 */
export type SemanticEventCallback = (event: SemanticAnalyzedEvent) => void;

/**
 * Interface for analyzer modules (swappable)
 */
export interface Analyzer {
  /**
   * Analyze text and return a mood object
   * Can be sync or async to support both keyword-based and LLM-based analyzers
   */
  analyze(text: string): MoodObject | Promise<MoodObject>;
}

/**
 * Interface for the SemanticPipeline
 */
export interface ISemanticPipeline {
  /**
   * Analyze text and return a mood object
   */
  analyze(text: string): Promise<MoodObject>;

  /**
   * Set a new analyzer module
   */
  setAnalyzer(analyzer: Analyzer): void;

  /**
   * Get the current analyzer
   */
  getAnalyzer(): Analyzer;

  /**
   * Register an event listener
   */
  on(event: 'analyzed', callback: SemanticEventCallback): void;

  /**
   * Remove an event listener
   */
  off(event: 'analyzed', callback: SemanticEventCallback): void;
}
