/**
 * SemanticPipeline - Analyzes conversation text and outputs mood/sentiment data
 *
 * Modular design allows swapping analysis approaches. Uses event emitter pattern
 * for 'analyzed' events.
 */

import type {
  Analyzer,
  MoodObject,
  ISemanticPipeline,
  SemanticEventCallback,
  SemanticAnalyzedEvent,
} from '@/types/semantic';
import { DefaultAnalyzer } from './DefaultAnalyzer';

/**
 * SemanticPipeline class for text analysis
 */
export class SemanticPipeline implements ISemanticPipeline {
  private _analyzer: Analyzer;
  private _listeners: Set<SemanticEventCallback> = new Set();

  constructor(analyzer?: Analyzer) {
    // Use default analyzer if none provided
    this._analyzer = analyzer || new DefaultAnalyzer();
  }

  /**
   * Analyze text and return a mood object
   * Always returns a Promise to support both sync and async analyzers
   */
  async analyze(text: string): Promise<MoodObject> {
    // Call the analyzer (handles both sync and async)
    const result = await Promise.resolve(this._analyzer.analyze(text));

    // Emit the 'analyzed' event
    this.emit(result, text);

    return result;
  }

  /**
   * Set a new analyzer module
   * Allows swapping analysis approaches (e.g., keyword-based to LLM-based)
   */
  setAnalyzer(analyzer: Analyzer): void {
    this._analyzer = analyzer;
  }

  /**
   * Get the current analyzer
   */
  getAnalyzer(): Analyzer {
    return this._analyzer;
  }

  /**
   * Register an event listener for 'analyzed' events
   */
  on(event: 'analyzed', callback: SemanticEventCallback): void {
    if (event === 'analyzed') {
      this._listeners.add(callback);
    }
  }

  /**
   * Remove an event listener
   */
  off(event: 'analyzed', callback: SemanticEventCallback): void {
    if (event === 'analyzed') {
      this._listeners.delete(callback);
    }
  }

  /**
   * Emit an 'analyzed' event to all listeners
   */
  private emit(mood: MoodObject, text: string): void {
    const event: SemanticAnalyzedEvent = {
      type: 'analyzed',
      mood,
      text,
      timestamp: Date.now(),
    };

    for (const callback of this._listeners) {
      try {
        callback(event);
      } catch {
        // Ignore listener errors
      }
    }
  }
}

/**
 * Create a new SemanticPipeline instance with default analyzer
 */
export function createSemanticPipeline(analyzer?: Analyzer): SemanticPipeline {
  return new SemanticPipeline(analyzer);
}
