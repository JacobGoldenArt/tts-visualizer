/**
 * Visualizer Component
 *
 * Top-level React component that orchestrates all modules and exposes
 * a clean API for integration. Combines semantic analysis with audio-reactive
 * visualization to create lo-fi, hand-drawn style visuals.
 */

import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import type { MoodObject } from '@/types/semantic';
import type { ControlState, ColorPalette } from '@/types/visual';
import type { AnalyzerData } from '@/types/audio';
import { Controls, DEFAULT_CONTROL_STATE, getModeStyles } from '@/components/Controls/Controls';
import { AudioAdapter } from '@/core/AudioAdapter/AudioAdapter';
import { AudioAnalyzer } from '@/core/AudioAnalyzer/AudioAnalyzer';
import { SemanticPipeline } from '@/core/SemanticPipeline/SemanticPipeline';
import { MoodMapper } from '@/core/MoodMapper/MoodMapper';
import { CanvasRenderer } from '@/core/CanvasRenderer/CanvasRenderer';
import { Spectrogram } from '@/primitives/Spectrogram/Spectrogram';
import { Typography } from '@/primitives/Typography/Typography';

/**
 * Configuration for the Visualizer component
 */
export interface VisualizerConfig {
  /** Canvas width in pixels (default: 800) */
  width?: number;
  /** Canvas height in pixels (default: 600) */
  height?: number;
  /** Theme mode (default: 'dark') */
  theme?: 'dark' | 'light' | 'system';
  /** Initial control state for sliders and mode */
  initialControlState?: Partial<ControlState>;
}

/**
 * Props for the Visualizer component
 */
export interface VisualizerProps {
  /** Current conversation text for semantic analysis */
  text?: string;
  /** Audio stream from TTS provider */
  audioStream?: ReadableStream<Uint8Array> | ArrayBuffer;
  /** Configuration options */
  config?: VisualizerConfig;
  /** Whether to show the control interface (default: true) */
  showControls?: boolean;
  /** Callback when mood changes from semantic analysis */
  onMoodChange?: (mood: MoodObject) => void;
  /** Additional CSS class name */
  className?: string;
  /** Inline styles */
  style?: React.CSSProperties;
}

/**
 * Internal state of the visualizer
 */
export interface VisualizerState {
  /** Whether the visualizer is paused */
  isPaused: boolean;
  /** Whether audio is currently processing */
  isProcessingAudio: boolean;
  /** Current mood from semantic analysis */
  currentMood: MoodObject | null;
  /** Current control state */
  controlState: ControlState;
}

/**
 * Imperative handle for the Visualizer ref
 */
export interface VisualizerRef {
  /** Pause the visualization */
  pause(): void;
  /** Resume the visualization */
  resume(): void;
  /** Get the current visualizer state */
  getState(): VisualizerState;
}

/**
 * Check if running in browser environment (SSR safety)
 */
const isBrowser = typeof window !== 'undefined';

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<VisualizerConfig> = {
  width: 800,
  height: 600,
  theme: 'dark',
  initialControlState: {},
};

/**
 * Main Visualizer Component
 */
export const Visualizer = forwardRef<VisualizerRef, VisualizerProps>(
  function Visualizer(
    {
      text,
      audioStream,
      config,
      showControls = true,
      onMoodChange,
      className,
      style,
    },
    ref
  ) {
    // Merge config with defaults
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const { width, height, initialControlState } = mergedConfig;

    // DOM refs
    const containerRef = useRef<HTMLDivElement>(null);

    // Module refs (persist across renders)
    const rendererRef = useRef<CanvasRenderer | null>(null);
    const spectrogramRef = useRef<Spectrogram | null>(null);
    const typographyRef = useRef<Typography | null>(null);
    const audioAdapterRef = useRef<AudioAdapter | null>(null);
    const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
    const semanticPipelineRef = useRef<SemanticPipeline | null>(null);
    const moodMapperRef = useRef<MoodMapper | null>(null);

    // State
    const [isPaused, setIsPaused] = useState(false);
    const [isProcessingAudio, setIsProcessingAudio] = useState(false);
    const [currentMood, setCurrentMood] = useState<MoodObject | null>(null);
    const [controlState, setControlState] = useState<ControlState>({
      ...DEFAULT_CONTROL_STATE,
      ...initialControlState,
    });
    const [isInitialized, setIsInitialized] = useState(false);

    // Previous text ref for change detection
    const prevTextRef = useRef<string | undefined>(undefined);

    /**
     * Initialize all modules (only in browser)
     */
    useEffect(() => {
      if (!isBrowser || !containerRef.current) {
        return;
      }

      // Create modules
      const renderer = new CanvasRenderer({
        width,
        height,
        responsive: false,
      });

      const spectrogram = new Spectrogram();
      const typography = new Typography();
      const semanticPipeline = new SemanticPipeline();
      const moodMapper = new MoodMapper();

      // Store refs
      rendererRef.current = renderer;
      spectrogramRef.current = spectrogram;
      typographyRef.current = typography;
      semanticPipelineRef.current = semanticPipeline;
      moodMapperRef.current = moodMapper;

      // Mount renderer
      renderer.mount(containerRef.current);

      // Connect primitives to renderer
      spectrogram.setRenderer(renderer);
      typography.setRenderer(renderer);

      // Register frame callback for rendering
      const frameCallback = (deltaTime: number) => {
        if (isPaused) return;

        // Clear canvas each frame
        renderer.clear();

        // Render primitives
        spectrogram.render(deltaTime);
        typography.render(deltaTime);
      };

      renderer.onFrame(frameCallback);

      // Listen for mood mapper updates
      const handleMoodUpdate = () => {
        const params = moodMapper.getParams();
        spectrogram.setPalette(params.palette);
        typography.setPalette(params.palette);
      };

      moodMapper.on('updated', handleMoodUpdate);

      setIsInitialized(true);

      // Cleanup
      return () => {
        renderer.offFrame(frameCallback);
        moodMapper.off('updated', handleMoodUpdate);

        // Dispose modules
        renderer.unmount();
        spectrogram.dispose();
        typography.dispose();
        moodMapper.dispose();

        // Clean up audio modules if they exist
        if (audioAdapterRef.current) {
          audioAdapterRef.current.stop();
          audioAdapterRef.current = null;
        }
        if (audioAnalyzerRef.current) {
          audioAnalyzerRef.current.destroy();
          audioAnalyzerRef.current = null;
        }

        // Clear refs
        rendererRef.current = null;
        spectrogramRef.current = null;
        typographyRef.current = null;
        semanticPipelineRef.current = null;
        moodMapperRef.current = null;
      };
    }, [width, height, isPaused]);

    /**
     * Handle text prop changes - run semantic analysis
     */
    useEffect(() => {
      if (!isInitialized || !semanticPipelineRef.current || !moodMapperRef.current) {
        return;
      }

      // Only analyze if text changed
      if (text === prevTextRef.current) {
        return;
      }
      prevTextRef.current = text;

      if (!text) {
        // No text - use neutral mood
        return;
      }

      // Run semantic analysis
      const analyze = async () => {
        try {
          const mood = await semanticPipelineRef.current!.analyze(text);
          setCurrentMood(mood);

          // Update mood mapper
          moodMapperRef.current!.update(mood);

          // Add keywords to typography
          if (typographyRef.current && mood.keywords.length > 0) {
            typographyRef.current.addKeywords(mood.keywords, 'ai');
            typographyRef.current.setEmotion(mood.emotion);
          }

          // Emit callback
          if (onMoodChange) {
            onMoodChange(mood);
          }
        } catch (error) {
          console.error('Semantic analysis error:', error);
        }
      };

      analyze();
    }, [text, isInitialized, onMoodChange]);

    /**
     * Handle audioStream prop changes
     */
    useEffect(() => {
      if (!isBrowser || !isInitialized) {
        return;
      }

      if (!audioStream) {
        // No audio stream - clean up existing adapter/analyzer
        if (audioAdapterRef.current) {
          audioAdapterRef.current.stop();
          audioAdapterRef.current = null;
        }
        if (audioAnalyzerRef.current) {
          audioAnalyzerRef.current.destroy();
          audioAnalyzerRef.current = null;
        }
        setIsProcessingAudio(false);
        return;
      }

      // Create audio adapter and analyzer
      const adapter = new AudioAdapter({ format: 'pcm' });
      const analyzer = new AudioAnalyzer();

      audioAdapterRef.current = adapter;
      audioAnalyzerRef.current = analyzer;

      // Connect adapter to analyzer
      adapter.connect(analyzer);

      // Handle analyzer data
      const handleAnalyzerData = (data: AnalyzerData) => {
        if (spectrogramRef.current && !isPaused) {
          spectrogramRef.current.update(data);
        }
      };

      analyzer.on('data', handleAnalyzerData);

      // Process the audio stream
      setIsProcessingAudio(true);

      if (audioStream instanceof ArrayBuffer) {
        // ArrayBuffer - feed directly
        adapter.feed(audioStream);
        adapter.end();
        setIsProcessingAudio(false);
      } else {
        // ReadableStream - read chunks
        const reader = audioStream.getReader();

        const readChunk = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                adapter.end();
                setIsProcessingAudio(false);
                break;
              }
              if (value) {
                adapter.feed(value);
              }
            }
          } catch (error) {
            console.error('Audio stream error:', error);
            adapter.end();
            setIsProcessingAudio(false);
          }
        };

        readChunk();
      }

      // Cleanup
      return () => {
        analyzer.off('data', handleAnalyzerData);
        adapter.stop();
        analyzer.destroy();
        audioAdapterRef.current = null;
        audioAnalyzerRef.current = null;
      };
    }, [audioStream, isInitialized, isPaused]);

    /**
     * Apply control state to primitives
     */
    const applyControlState = useCallback((state: ControlState) => {
      if (!spectrogramRef.current || !typographyRef.current) {
        return;
      }

      // Apply to spectrogram
      spectrogramRef.current.setIntensity(state.intensity / 100);
      spectrogramRef.current.setMotion(state.motion / 100);
      spectrogramRef.current.setMode(state.mode);

      // Apply to typography
      typographyRef.current.setIntensity(state.intensity / 100);
      typographyRef.current.setMotion(state.motion / 100);
      typographyRef.current.setMode(state.mode);
    }, []);

    /**
     * Handle control changes
     */
    const handleControlChange = useCallback(
      (newState: ControlState) => {
        setControlState(newState);
        applyControlState(newState);
      },
      [applyControlState]
    );

    /**
     * Apply initial control state when initialized
     */
    useEffect(() => {
      if (isInitialized) {
        applyControlState(controlState);
      }
    }, [isInitialized, controlState, applyControlState]);

    /**
     * Pause function
     */
    const pause = useCallback(() => {
      setIsPaused(true);
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.pause();
      }
    }, []);

    /**
     * Resume function
     */
    const resume = useCallback(() => {
      setIsPaused(false);
      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.resume();
      }
    }, []);

    /**
     * Get current state
     */
    const getState = useCallback((): VisualizerState => {
      return {
        isPaused,
        isProcessingAudio,
        currentMood,
        controlState,
      };
    }, [isPaused, isProcessingAudio, currentMood, controlState]);

    /**
     * Expose imperative methods via ref
     */
    useImperativeHandle(
      ref,
      () => ({
        pause,
        resume,
        getState,
      }),
      [pause, resume, getState]
    );

    // SSR: Return placeholder during server-side rendering
    if (!isBrowser) {
      return (
        <div
          className={className}
          style={{
            width,
            height,
            backgroundColor: 'transparent',
            ...style,
          }}
          data-testid="visualizer-container"
          data-ssr="true"
        />
      );
    }

    // Get mode styles for container
    const modeStyles = getModeStyles(controlState.mode);

    return (
      <div
        className={className}
        style={{
          position: 'relative',
          width,
          height,
          ...modeStyles,
          ...style,
        }}
        data-testid="visualizer-container"
      >
        {/* Canvas container */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
          data-testid="visualizer-canvas"
        />

        {/* Controls (optional) */}
        {showControls && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              zIndex: 100,
            }}
          >
            <Controls
              initialState={controlState}
              onChange={handleControlChange}
            />
          </div>
        )}
      </div>
    );
  }
);

/**
 * Export default and named exports
 */
export default Visualizer;
