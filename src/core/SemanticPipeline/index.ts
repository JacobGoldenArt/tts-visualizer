/**
 * SemanticPipeline module exports
 */

export { SemanticPipeline, createSemanticPipeline } from './SemanticPipeline';
export { DefaultAnalyzer, createDefaultAnalyzer } from './DefaultAnalyzer';

// Re-export types
export type {
  Analyzer,
  MoodObject,
  Emotion,
  ISemanticPipeline,
  SemanticEventType,
  SemanticEventCallback,
  SemanticAnalyzedEvent,
} from '@/types/semantic';
