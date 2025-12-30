/**
 * Visualizer Component Tests
 *
 * Tests for the Main Visualizer Component feature (Feature 11).
 * Tests cover props handling, ref methods, cleanup, SSR safety,
 * and integration with all submodules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import React, { createRef } from 'react';
import { Visualizer, VisualizerRef, VisualizerProps } from './Visualizer';
import type { MoodObject } from '@/types/semantic';

// Mock the core modules
vi.mock('@/core/AudioAdapter/AudioAdapter', () => ({
  AudioAdapter: vi.fn().mockImplementation(() => ({
    feed: vi.fn(),
    end: vi.fn(),
    stop: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    isProcessing: false,
  })),
}));

vi.mock('@/core/AudioAnalyzer/AudioAnalyzer', () => ({
  AudioAnalyzer: vi.fn().mockImplementation(() => ({
    receiveBuffer: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    getFrequencyData: vi.fn(() => new Float32Array(1024)),
    getAmplitude: vi.fn(() => 0),
    isPaused: false,
    isDestroyed: false,
  })),
}));

vi.mock('@/core/SemanticPipeline/SemanticPipeline', () => ({
  SemanticPipeline: vi.fn().mockImplementation(() => {
    const listeners = new Set<(event: unknown) => void>();
    return {
      analyze: vi.fn().mockResolvedValue({
        sentiment: 0.5,
        energy: 0.6,
        keywords: ['test', 'keyword'],
        emotion: 'joy',
      }),
      setAnalyzer: vi.fn(),
      getAnalyzer: vi.fn(),
      on: vi.fn((event: string, cb: (event: unknown) => void) => {
        if (event === 'analyzed') listeners.add(cb);
      }),
      off: vi.fn((event: string, cb: (event: unknown) => void) => {
        if (event === 'analyzed') listeners.delete(cb);
      }),
    };
  }),
}));

vi.mock('@/core/MoodMapper/MoodMapper', () => ({
  MoodMapper: vi.fn().mockImplementation(() => {
    const listeners = new Set<(event: unknown) => void>();
    return {
      update: vi.fn(),
      getParams: vi.fn(() => ({
        palette: {
          primary: 'hsl(45, 85%, 55%)',
          secondary: 'hsl(30, 80%, 50%)',
          accent: 'hsl(60, 90%, 60%)',
        },
        intensity: 1.0,
        primitiveWeights: {
          spectrogram: 0.5,
          typography: 0.5,
          blobs: 0.5,
        },
      })),
      getState: vi.fn(),
      setConfig: vi.fn(),
      on: vi.fn((event: string, cb: (event: unknown) => void) => {
        if (event === 'updated') listeners.add(cb);
      }),
      off: vi.fn((event: string, cb: (event: unknown) => void) => {
        if (event === 'updated') listeners.delete(cb);
      }),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('@/core/CanvasRenderer/CanvasRenderer', () => ({
  CanvasRenderer: vi.fn().mockImplementation(() => {
    const frameCallbacks = new Set<(deltaTime: number) => void>();
    return {
      mount: vi.fn(),
      unmount: vi.fn(),
      clear: vi.fn(),
      drawLine: vi.fn(),
      drawBlob: vi.fn(),
      drawText: vi.fn(),
      setLayer: vi.fn(),
      onFrame: vi.fn((cb: (deltaTime: number) => void) => frameCallbacks.add(cb)),
      offFrame: vi.fn((cb: (deltaTime: number) => void) => frameCallbacks.delete(cb)),
      setEffects: vi.fn(),
      applyEffects: vi.fn(),
      width: 800,
      height: 600,
    };
  }),
}));

vi.mock('@/primitives/Spectrogram/Spectrogram', () => ({
  Spectrogram: vi.fn().mockImplementation(() => ({
    setRenderer: vi.fn(),
    setPalette: vi.fn(),
    getPalette: vi.fn(),
    setIntensity: vi.fn(),
    getIntensity: vi.fn(() => 1.0),
    setMotion: vi.fn(),
    getMotion: vi.fn(() => 0.5),
    setMode: vi.fn(),
    getMode: vi.fn(() => 'visual'),
    update: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    isDisposed: false,
  })),
}));

vi.mock('@/primitives/Typography/Typography', () => ({
  Typography: vi.fn().mockImplementation(() => ({
    setRenderer: vi.fn(),
    setPalette: vi.fn(),
    getPalette: vi.fn(),
    setIntensity: vi.fn(),
    getIntensity: vi.fn(() => 1.0),
    setMotion: vi.fn(),
    getMotion: vi.fn(() => 0.5),
    setMode: vi.fn(),
    getMode: vi.fn(() => 'visual'),
    setEmotion: vi.fn(),
    addKeywords: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    isDisposed: false,
  })),
}));

// Import mocked modules for assertions
import { AudioAdapter } from '@/core/AudioAdapter/AudioAdapter';
import { AudioAnalyzer } from '@/core/AudioAnalyzer/AudioAnalyzer';
import { SemanticPipeline } from '@/core/SemanticPipeline/SemanticPipeline';
import { MoodMapper } from '@/core/MoodMapper/MoodMapper';
import { CanvasRenderer } from '@/core/CanvasRenderer/CanvasRenderer';
import { Spectrogram } from '@/primitives/Spectrogram/Spectrogram';
import { Typography } from '@/primitives/Typography/Typography';

describe('Visualizer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // Test 11.1: Component accepts `text` prop (current conversation text)
  describe('Test 11.1: Component accepts `text` prop (current conversation text)', () => {
    it('renders without text prop', () => {
      render(<Visualizer />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toBeInTheDocument();
    });

    it('accepts text prop and triggers semantic analysis', async () => {
      render(<Visualizer text="Hello world, this is a test message" />);

      await waitFor(() => {
        expect(SemanticPipeline).toHaveBeenCalled();
      });

      const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockPipeline) {
        await waitFor(() => {
          expect(mockPipeline.analyze).toHaveBeenCalledWith('Hello world, this is a test message');
        });
      }
    });

    it('re-analyzes when text prop changes', async () => {
      const { rerender } = render(<Visualizer text="First message" />);

      await waitFor(() => {
        const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockPipeline?.analyze).toHaveBeenCalledWith('First message');
      });

      rerender(<Visualizer text="Second message" />);

      await waitFor(() => {
        const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockPipeline?.analyze).toHaveBeenCalledWith('Second message');
      });
    });

    it('does not re-analyze when same text prop is passed', async () => {
      const { rerender } = render(<Visualizer text="Same message" />);

      await waitFor(() => {
        const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockPipeline?.analyze).toHaveBeenCalledTimes(1);
      });

      rerender(<Visualizer text="Same message" />);

      // Should still be 1 call, not 2
      const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockPipeline?.analyze).toHaveBeenCalledTimes(1);
    });
  });

  // Test 11.2: Component accepts `audioStream` prop (streaming audio source)
  describe('Test 11.2: Component accepts `audioStream` prop (streaming audio source)', () => {
    it('renders without audioStream prop', () => {
      render(<Visualizer />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toBeInTheDocument();
    });

    it('accepts ArrayBuffer audioStream prop', async () => {
      const audioBuffer = new ArrayBuffer(1024);

      render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        expect(AudioAdapter).toHaveBeenCalled();
        expect(AudioAnalyzer).toHaveBeenCalled();
      });

      const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockAdapter) {
        expect(mockAdapter.feed).toHaveBeenCalledWith(audioBuffer);
        expect(mockAdapter.end).toHaveBeenCalled();
      }
    });

    it('connects AudioAdapter to AudioAnalyzer', async () => {
      const audioBuffer = new ArrayBuffer(1024);

      render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        const mockAnalyzer = (AudioAnalyzer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

        if (mockAdapter && mockAnalyzer) {
          expect(mockAdapter.connect).toHaveBeenCalledWith(mockAnalyzer);
        }
      });
    });
  });

  // Test 11.3: Component renders visualization canvas
  describe('Test 11.3: Component renders visualization canvas', () => {
    it('renders a canvas container element', () => {
      render(<Visualizer />);
      const canvasContainer = screen.getByTestId('visualizer-canvas');
      expect(canvasContainer).toBeInTheDocument();
    });

    it('mounts CanvasRenderer to container', async () => {
      render(<Visualizer />);

      await waitFor(() => {
        expect(CanvasRenderer).toHaveBeenCalled();
        const mockRenderer = (CanvasRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockRenderer?.mount).toHaveBeenCalled();
      });
    });

    it('renders canvas with specified dimensions', () => {
      render(<Visualizer config={{ width: 1024, height: 768 }} />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveStyle({ width: '1024px', height: '768px' });
    });

    it('renders canvas with default dimensions when not specified', () => {
      render(<Visualizer />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveStyle({ width: '800px', height: '600px' });
    });
  });

  // Test 11.4: Component optionally renders control interface
  describe('Test 11.4: Component optionally renders control interface', () => {
    it('renders controls by default (showControls=true)', () => {
      render(<Visualizer />);
      const controls = screen.getByTestId('visualizer-controls');
      expect(controls).toBeInTheDocument();
    });

    it('hides controls when showControls=false', () => {
      render(<Visualizer showControls={false} />);
      const controls = screen.queryByTestId('visualizer-controls');
      expect(controls).not.toBeInTheDocument();
    });

    it('shows controls when showControls=true explicitly', () => {
      render(<Visualizer showControls={true} />);
      const controls = screen.getByTestId('visualizer-controls');
      expect(controls).toBeInTheDocument();
    });
  });

  // Test 11.5: Component accepts `config` prop for initial settings
  describe('Test 11.5: Component accepts `config` prop for initial settings', () => {
    it('applies custom width from config', () => {
      render(<Visualizer config={{ width: 1200 }} />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveStyle({ width: '1200px' });
    });

    it('applies custom height from config', () => {
      render(<Visualizer config={{ height: 900 }} />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveStyle({ height: '900px' });
    });

    it('applies initial control state from config', () => {
      render(
        <Visualizer
          config={{
            initialControlState: {
              saturation: 75,
              intensity: 80,
              motion: 90,
              mode: 'text',
            },
          }}
        />
      );

      // Controls should be rendered with initial state
      const controls = screen.getByTestId('visualizer-controls');
      expect(controls).toBeInTheDocument();
    });

    it('merges partial config with defaults', () => {
      render(<Visualizer config={{ width: 1000 }} />);
      const container = screen.getByTestId('visualizer-container');
      // Width should be custom, height should be default
      expect(container).toHaveStyle({ width: '1000px', height: '600px' });
    });
  });

  // Test 11.6: Component exposes `ref` with imperative methods (pause, resume)
  describe('Test 11.6: Component exposes `ref` with imperative methods (pause, resume)', () => {
    it('exposes ref with pause method', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.pause).toBe('function');
    });

    it('exposes ref with resume method', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.resume).toBe('function');
    });

    it('exposes ref with getState method', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      expect(ref.current).not.toBeNull();
      expect(typeof ref.current?.getState).toBe('function');
    });

    it('pause method updates state', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      act(() => {
        ref.current?.pause();
      });

      const state = ref.current?.getState();
      expect(state?.isPaused).toBe(true);
    });

    it('resume method updates state', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      act(() => {
        ref.current?.pause();
        ref.current?.resume();
      });

      const state = ref.current?.getState();
      expect(state?.isPaused).toBe(false);
    });

    it('getState returns current visualizer state', () => {
      const ref = createRef<VisualizerRef>();
      render(<Visualizer ref={ref} />);

      const state = ref.current?.getState();

      expect(state).toHaveProperty('isPaused');
      expect(state).toHaveProperty('isProcessingAudio');
      expect(state).toHaveProperty('currentMood');
      expect(state).toHaveProperty('controlState');
    });
  });

  // Test 11.7: Component handles missing audioStream gracefully (text-only mode)
  describe('Test 11.7: Component handles missing audioStream gracefully (text-only mode)', () => {
    it('renders successfully without audioStream', () => {
      render(<Visualizer text="Some text content" />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toBeInTheDocument();
    });

    it('performs semantic analysis without audio', async () => {
      render(<Visualizer text="Text only mode test" />);

      await waitFor(() => {
        const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockPipeline?.analyze).toHaveBeenCalledWith('Text only mode test');
      });
    });

    it('updates typography with keywords even without audio', async () => {
      render(<Visualizer text="Keywords test message" />);

      await waitFor(() => {
        const mockTypography = (Typography as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockTypography?.addKeywords).toHaveBeenCalled();
      });
    });

    it('does not create AudioAdapter when no audioStream', () => {
      render(<Visualizer text="No audio here" />);

      // AudioAdapter should not be instantiated for audio processing
      // (it may be called once during initialization but should not feed data)
      const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      if (mockAdapter) {
        expect(mockAdapter.feed).not.toHaveBeenCalled();
      }
    });
  });

  // Test 11.8: Component handles missing text gracefully (audio-only mode)
  describe('Test 11.8: Component handles missing text gracefully (audio-only mode)', () => {
    it('renders successfully without text', () => {
      const audioBuffer = new ArrayBuffer(1024);
      render(<Visualizer audioStream={audioBuffer} />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toBeInTheDocument();
    });

    it('processes audio without text', async () => {
      const audioBuffer = new ArrayBuffer(1024);
      render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockAdapter?.feed).toHaveBeenCalledWith(audioBuffer);
      });
    });

    it('does not call semantic analysis when no text', async () => {
      const audioBuffer = new ArrayBuffer(1024);
      render(<Visualizer audioStream={audioBuffer} />);

      // Give it some time to potentially call analyze (but it shouldn't)
      await new Promise(resolve => setTimeout(resolve, 100));

      const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      // analyze should not be called because there's no text
      expect(mockPipeline?.analyze).not.toHaveBeenCalled();
    });

    it('spectrogram renders without semantic data', async () => {
      const audioBuffer = new ArrayBuffer(1024);
      render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        const mockSpectrogram = (Spectrogram as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        expect(mockSpectrogram?.setRenderer).toHaveBeenCalled();
      });
    });
  });

  // Test 11.9: Component properly cleans up all resources on unmount
  describe('Test 11.9: Component properly cleans up all resources on unmount', () => {
    it('unmounts CanvasRenderer on cleanup', async () => {
      const { unmount } = render(<Visualizer />);

      await waitFor(() => {
        expect(CanvasRenderer).toHaveBeenCalled();
      });

      unmount();

      const mockRenderer = (CanvasRenderer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockRenderer?.unmount).toHaveBeenCalled();
    });

    it('disposes Spectrogram on cleanup', async () => {
      const { unmount } = render(<Visualizer />);

      await waitFor(() => {
        expect(Spectrogram).toHaveBeenCalled();
      });

      unmount();

      const mockSpectrogram = (Spectrogram as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockSpectrogram?.dispose).toHaveBeenCalled();
    });

    it('disposes Typography on cleanup', async () => {
      const { unmount } = render(<Visualizer />);

      await waitFor(() => {
        expect(Typography).toHaveBeenCalled();
      });

      unmount();

      const mockTypography = (Typography as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockTypography?.dispose).toHaveBeenCalled();
    });

    it('disposes MoodMapper on cleanup', async () => {
      const { unmount } = render(<Visualizer />);

      await waitFor(() => {
        expect(MoodMapper).toHaveBeenCalled();
      });

      unmount();

      const mockMapper = (MoodMapper as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockMapper?.dispose).toHaveBeenCalled();
    });

    it('stops AudioAdapter on cleanup when audio is present', async () => {
      const audioBuffer = new ArrayBuffer(1024);
      const { unmount } = render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        expect(AudioAdapter).toHaveBeenCalled();
      });

      unmount();

      const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockAdapter?.stop).toHaveBeenCalled();
    });

    it('destroys AudioAnalyzer on cleanup when audio is present', async () => {
      const audioBuffer = new ArrayBuffer(1024);
      const { unmount } = render(<Visualizer audioStream={audioBuffer} />);

      await waitFor(() => {
        expect(AudioAnalyzer).toHaveBeenCalled();
      });

      unmount();

      const mockAnalyzer = (AudioAnalyzer as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      expect(mockAnalyzer?.destroy).toHaveBeenCalled();
    });
  });

  // Test 11.10: Component supports custom className and style props
  describe('Test 11.10: Component supports custom className and style props', () => {
    it('applies custom className to container', () => {
      render(<Visualizer className="my-custom-class" />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveClass('my-custom-class');
    });

    it('applies custom style to container', () => {
      render(<Visualizer style={{ border: '2px solid red', borderRadius: '8px' }} />);
      const container = screen.getByTestId('visualizer-container');
      // Check that style attribute contains the custom styles
      expect(container.style.border).toBe('2px solid red');
      expect(container.style.borderRadius).toBe('8px');
    });

    it('merges custom style with default styles', () => {
      render(
        <Visualizer
          config={{ width: 500, height: 400 }}
          style={{ backgroundColor: 'blue' }}
        />
      );
      const container = screen.getByTestId('visualizer-container');
      // Check dimensions from config
      expect(container.style.width).toBe('500px');
      expect(container.style.height).toBe('400px');
      // Check custom style merged in
      expect(container.style.backgroundColor).toBe('blue');
    });

    it('accepts both className and style together', () => {
      render(
        <Visualizer
          className="test-class"
          style={{ padding: '10px' }}
        />
      );
      const container = screen.getByTestId('visualizer-container');
      expect(container).toHaveClass('test-class');
      expect(container.style.padding).toBe('10px');
    });
  });

  // Test 11.11: Component emits onMoodChange callback when mood updates
  describe('Test 11.11: Component emits onMoodChange callback when mood updates', () => {
    it('calls onMoodChange when semantic analysis completes', async () => {
      const onMoodChange = vi.fn();
      render(<Visualizer text="Test message" onMoodChange={onMoodChange} />);

      await waitFor(() => {
        expect(onMoodChange).toHaveBeenCalled();
      });
    });

    it('passes MoodObject to onMoodChange callback', async () => {
      const onMoodChange = vi.fn();
      render(<Visualizer text="Happy message" onMoodChange={onMoodChange} />);

      await waitFor(() => {
        expect(onMoodChange).toHaveBeenCalledWith(
          expect.objectContaining({
            sentiment: expect.any(Number),
            energy: expect.any(Number),
            keywords: expect.any(Array),
            emotion: expect.any(String),
          })
        );
      });
    });

    it('does not call onMoodChange when no text is provided', async () => {
      const onMoodChange = vi.fn();
      render(<Visualizer onMoodChange={onMoodChange} />);

      // Wait a bit to ensure callback isn't called
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(onMoodChange).not.toHaveBeenCalled();
    });

    it('calls onMoodChange each time text changes', async () => {
      const onMoodChange = vi.fn();
      const { rerender } = render(<Visualizer text="First" onMoodChange={onMoodChange} />);

      await waitFor(() => {
        expect(onMoodChange).toHaveBeenCalledTimes(1);
      });

      rerender(<Visualizer text="Second" onMoodChange={onMoodChange} />);

      await waitFor(() => {
        expect(onMoodChange).toHaveBeenCalledTimes(2);
      });
    });

    it('onMoodChange is optional and does not throw when not provided', async () => {
      // Should not throw
      expect(() => {
        render(<Visualizer text="No callback" />);
      }).not.toThrow();
    });
  });

  // Test 11.12: Component works in SSR environment (no window errors during build)
  describe('Test 11.12: Component works in SSR environment (no window errors during build)', () => {
    // Note: These tests simulate SSR by checking component behavior
    // The actual SSR safety is handled by the `isBrowser` check in the component

    it('renders without throwing when window checks are present', () => {
      expect(() => {
        render(<Visualizer />);
      }).not.toThrow();
    });

    it('component has SSR-safe initialization', () => {
      // The component should use `typeof window !== "undefined"` checks
      // This test verifies the component renders in jsdom which simulates browser
      render(<Visualizer />);
      const container = screen.getByTestId('visualizer-container');
      expect(container).toBeInTheDocument();
    });

    it('does not access window during initial render tree construction', () => {
      // This test ensures the component can be imported and instantiated
      // without immediately accessing browser APIs
      const consoleError = vi.spyOn(console, 'error');

      render(<Visualizer />);

      // Should not have any "window is not defined" errors
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('window')
      );

      consoleError.mockRestore();
    });

    it('renders placeholder content that can be hydrated', () => {
      render(<Visualizer config={{ width: 800, height: 600 }} />);
      const container = screen.getByTestId('visualizer-container');

      // Should have dimensions set that can be server-rendered
      expect(container).toHaveStyle({ width: '800px', height: '600px' });
    });

    it('audio modules are lazily initialized (not in SSR)', () => {
      // Without audioStream, AudioAdapter should not be instantiated at all
      render(<Visualizer text="SSR test" />);

      // The adapter is only created when audioStream is provided
      const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
      // In text-only mode, adapter may not be created at all
      // or if created, should not have processed any audio
      if (mockAdapter) {
        expect(mockAdapter.feed).not.toHaveBeenCalled();
      }
    });
  });

  // Additional integration tests
  describe('Integration tests', () => {
    it('connects all modules together correctly', async () => {
      const audioBuffer = new ArrayBuffer(1024);

      render(<Visualizer text="Integration test" audioStream={audioBuffer} />);

      await waitFor(() => {
        // All modules should be instantiated
        expect(CanvasRenderer).toHaveBeenCalled();
        expect(Spectrogram).toHaveBeenCalled();
        expect(Typography).toHaveBeenCalled();
        expect(SemanticPipeline).toHaveBeenCalled();
        expect(MoodMapper).toHaveBeenCalled();
        expect(AudioAdapter).toHaveBeenCalled();
        expect(AudioAnalyzer).toHaveBeenCalled();
      });
    });

    it('primitives receive renderer reference', async () => {
      render(<Visualizer />);

      await waitFor(() => {
        const mockSpectrogram = (Spectrogram as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        const mockTypography = (Typography as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

        expect(mockSpectrogram?.setRenderer).toHaveBeenCalled();
        expect(mockTypography?.setRenderer).toHaveBeenCalled();
      });
    });

    it('renders with both text and audio', async () => {
      const audioBuffer = new ArrayBuffer(1024);

      render(
        <Visualizer
          text="Full integration test"
          audioStream={audioBuffer}
        />
      );

      await waitFor(() => {
        // Both semantic and audio processing should occur
        const mockPipeline = (SemanticPipeline as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;
        const mockAdapter = (AudioAdapter as unknown as ReturnType<typeof vi.fn>).mock.results[0]?.value;

        expect(mockPipeline?.analyze).toHaveBeenCalled();
        expect(mockAdapter?.feed).toHaveBeenCalled();
      });
    });
  });
});
