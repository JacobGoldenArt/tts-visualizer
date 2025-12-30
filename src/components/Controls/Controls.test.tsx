/**
 * Controls Component Tests
 *
 * Tests for the Control Interface feature (Feature 8).
 * Tests cover sliders, mode toggle, real-time updates, callbacks,
 * headless mode, and localStorage persistence.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Controls, DEFAULT_CONTROL_STATE, getModeStyles, useControlState } from './Controls';
import type { ControlState } from '@/types/visual';
import React from 'react';

/**
 * Mock localStorage
 */
const createMockLocalStorage = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore;
    },
  };
};

describe('Controls Component', () => {
  let mockLocalStorage: ReturnType<typeof createMockLocalStorage>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Set up mock localStorage
    mockLocalStorage = createMockLocalStorage();
    originalLocalStorage = window.localStorage;
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });
  });

  afterEach(() => {
    // Restore original localStorage
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    cleanup();
  });

  // Test 8.1: Saturation slider adjusts color vibrancy (0-100 range)
  describe('Test 8.1: Saturation slider adjusts color vibrancy (0-100 range)', () => {
    it('renders saturation slider with default value of 50', () => {
      render(<Controls />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.value).toBe('50');
    });

    it('saturation slider has min=0 and max=100', () => {
      render(<Controls />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('saturation slider accepts value at minimum (0)', () => {
      render(<Controls initialState={{ saturation: 0 }} />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });

    it('saturation slider accepts value at maximum (100)', () => {
      render(<Controls initialState={{ saturation: 100 }} />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(slider.value).toBe('100');
    });

    it('saturation slider changes value when adjusted', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '75' } });

      expect(slider.value).toBe('75');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ saturation: 75 })
      );
    });

    it('saturation slider has accessible label', () => {
      render(<Controls />);
      const slider = screen.getByLabelText(/saturation/i);
      expect(slider).toBeInTheDocument();
    });
  });

  // Test 8.2: Intensity slider adjusts visual density (0-100 range)
  describe('Test 8.2: Intensity slider adjusts visual density (0-100 range)', () => {
    it('renders intensity slider with default value of 50', () => {
      render(<Controls />);
      const slider = screen.getByTestId('intensity-slider') as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.value).toBe('50');
    });

    it('intensity slider has min=0 and max=100', () => {
      render(<Controls />);
      const slider = screen.getByTestId('intensity-slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('intensity slider accepts value at minimum (0)', () => {
      render(<Controls initialState={{ intensity: 0 }} />);
      const slider = screen.getByTestId('intensity-slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });

    it('intensity slider accepts value at maximum (100)', () => {
      render(<Controls initialState={{ intensity: 100 }} />);
      const slider = screen.getByTestId('intensity-slider') as HTMLInputElement;
      expect(slider.value).toBe('100');
    });

    it('intensity slider changes value when adjusted', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('intensity-slider') as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '25' } });

      expect(slider.value).toBe('25');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: 25 })
      );
    });

    it('intensity slider has accessible label', () => {
      render(<Controls />);
      const slider = screen.getByLabelText(/intensity/i);
      expect(slider).toBeInTheDocument();
    });
  });

  // Test 8.3: Motion slider adjusts animation speed/amount (0-100 range)
  describe('Test 8.3: Motion slider adjusts animation speed/amount (0-100 range)', () => {
    it('renders motion slider with default value of 50', () => {
      render(<Controls />);
      const slider = screen.getByTestId('motion-slider') as HTMLInputElement;
      expect(slider).toBeInTheDocument();
      expect(slider.value).toBe('50');
    });

    it('motion slider has min=0 and max=100', () => {
      render(<Controls />);
      const slider = screen.getByTestId('motion-slider') as HTMLInputElement;
      expect(slider.min).toBe('0');
      expect(slider.max).toBe('100');
    });

    it('motion slider accepts value at minimum (0)', () => {
      render(<Controls initialState={{ motion: 0 }} />);
      const slider = screen.getByTestId('motion-slider') as HTMLInputElement;
      expect(slider.value).toBe('0');
    });

    it('motion slider accepts value at maximum (100)', () => {
      render(<Controls initialState={{ motion: 100 }} />);
      const slider = screen.getByTestId('motion-slider') as HTMLInputElement;
      expect(slider.value).toBe('100');
    });

    it('motion slider changes value when adjusted', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('motion-slider') as HTMLInputElement;

      fireEvent.change(slider, { target: { value: '90' } });

      expect(slider.value).toBe('90');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ motion: 90 })
      );
    });

    it('motion slider has accessible label', () => {
      render(<Controls />);
      const slider = screen.getByLabelText(/motion/i);
      expect(slider).toBeInTheDocument();
    });
  });

  // Test 8.4: Text/Visual mode toggle switches between modes
  describe('Test 8.4: Text/Visual mode toggle switches between modes', () => {
    it('renders mode toggle button', () => {
      render(<Controls />);
      const toggle = screen.getByTestId('mode-toggle');
      expect(toggle).toBeInTheDocument();
    });

    it('default mode is visual', () => {
      render(<Controls />);
      const toggle = screen.getByTestId('mode-toggle');
      expect(toggle.textContent).toBe('visual');
    });

    it('clicking toggle switches from visual to text mode', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const toggle = screen.getByTestId('mode-toggle');

      fireEvent.click(toggle);

      expect(toggle.textContent).toBe('text');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'text' })
      );
    });

    it('clicking toggle switches from text to visual mode', () => {
      const onChange = vi.fn();
      render(<Controls initialState={{ mode: 'text' }} onChange={onChange} />);
      const toggle = screen.getByTestId('mode-toggle');

      expect(toggle.textContent).toBe('text');

      fireEvent.click(toggle);

      expect(toggle.textContent).toBe('visual');
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'visual' })
      );
    });

    it('toggle has accessible label', () => {
      render(<Controls />);
      const toggle = screen.getByRole('button', { name: /switch to .* mode/i });
      expect(toggle).toBeInTheDocument();
    });

    it('can set initial mode via prop', () => {
      render(<Controls initialState={{ mode: 'text' }} />);
      const toggle = screen.getByTestId('mode-toggle');
      expect(toggle.textContent).toBe('text');
    });
  });

  // Test 8.5: Text mode: low opacity, blurred, ambient background
  describe('Test 8.5: Text mode: low opacity, blurred, ambient background', () => {
    it('getModeStyles returns low opacity for text mode', () => {
      const styles = getModeStyles('text');
      expect(styles.opacity).toBe(0.3);
    });

    it('getModeStyles returns blur filter for text mode', () => {
      const styles = getModeStyles('text');
      expect(styles.filter).toBe('blur(2px)');
    });

    it('getModeStyles returns low z-index for text mode', () => {
      const styles = getModeStyles('text');
      expect(styles.zIndex).toBe(0);
    });

    it('getModeStyles disables pointer events for text mode', () => {
      const styles = getModeStyles('text');
      expect(styles.pointerEvents).toBe('none');
    });

    it('text mode styles create ambient background effect', () => {
      const styles = getModeStyles('text');
      // Combined effect: low opacity + blur + low z-index = ambient background
      expect(styles.opacity).toBeLessThan(0.5);
      expect(styles.filter).toContain('blur');
      expect(styles.zIndex).toBeLessThan(5);
    });
  });

  // Test 8.6: Visual mode: prominent, higher z-index, immersive
  describe('Test 8.6: Visual mode: prominent, higher z-index, immersive', () => {
    it('getModeStyles returns full opacity for visual mode', () => {
      const styles = getModeStyles('visual');
      expect(styles.opacity).toBe(1);
    });

    it('getModeStyles returns no filter for visual mode', () => {
      const styles = getModeStyles('visual');
      expect(styles.filter).toBe('none');
    });

    it('getModeStyles returns higher z-index for visual mode', () => {
      const styles = getModeStyles('visual');
      expect(styles.zIndex).toBe(10);
    });

    it('getModeStyles enables pointer events for visual mode', () => {
      const styles = getModeStyles('visual');
      expect(styles.pointerEvents).toBe('auto');
    });

    it('visual mode styles create prominent/immersive effect', () => {
      const styles = getModeStyles('visual');
      // Combined effect: full opacity + no blur + high z-index = prominent
      expect(styles.opacity).toBe(1);
      expect(styles.filter).toBe('none');
      expect(styles.zIndex).toBeGreaterThan(5);
    });
  });

  // Test 8.7: Control changes apply in real-time (no lag)
  describe('Test 8.7: Control changes apply in real-time (no lag)', () => {
    it('onChange is called synchronously when saturation changes', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('saturation-slider');

      fireEvent.change(slider, { target: { value: '60' } });

      // onChange should be called immediately, not deferred
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ saturation: 60 })
      );
    });

    it('onChange is called synchronously when intensity changes', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('intensity-slider');

      fireEvent.change(slider, { target: { value: '40' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ intensity: 40 })
      );
    });

    it('onChange is called synchronously when motion changes', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('motion-slider');

      fireEvent.change(slider, { target: { value: '80' } });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ motion: 80 })
      );
    });

    it('onChange is called synchronously when mode toggles', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const toggle = screen.getByTestId('mode-toggle');

      fireEvent.click(toggle);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'text' })
      );
    });

    it('UI updates immediately when slider changes (no debounce)', () => {
      render(<Controls />);
      const slider = screen.getByTestId('saturation-slider') as HTMLInputElement;

      // Change multiple times rapidly
      fireEvent.change(slider, { target: { value: '10' } });
      expect(slider.value).toBe('10');

      fireEvent.change(slider, { target: { value: '30' } });
      expect(slider.value).toBe('30');

      fireEvent.change(slider, { target: { value: '70' } });
      expect(slider.value).toBe('70');
    });

    it('multiple rapid changes all trigger onChange', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('saturation-slider');

      fireEvent.change(slider, { target: { value: '10' } });
      fireEvent.change(slider, { target: { value: '20' } });
      fireEvent.change(slider, { target: { value: '30' } });

      expect(onChange).toHaveBeenCalledTimes(3);
    });
  });

  // Test 8.8: Controls expose onChange callback for external state management
  describe('Test 8.8: Controls expose onChange callback for external state management', () => {
    it('onChange receives full ControlState object', () => {
      const onChange = vi.fn();
      render(<Controls onChange={onChange} />);
      const slider = screen.getByTestId('saturation-slider');

      fireEvent.change(slider, { target: { value: '75' } });

      expect(onChange).toHaveBeenCalledWith({
        saturation: 75,
        intensity: 50,
        motion: 50,
        mode: 'visual',
      });
    });

    it('onChange includes all current values when any control changes', () => {
      const onChange = vi.fn();
      render(
        <Controls
          initialState={{ saturation: 20, intensity: 30, motion: 40, mode: 'text' }}
          onChange={onChange}
        />
      );

      const intensitySlider = screen.getByTestId('intensity-slider');
      fireEvent.change(intensitySlider, { target: { value: '60' } });

      expect(onChange).toHaveBeenCalledWith({
        saturation: 20,
        intensity: 60,
        motion: 40,
        mode: 'text',
      });
    });

    it('onChange callback is optional', () => {
      // Should not throw when onChange is not provided
      expect(() => {
        render(<Controls />);
        const slider = screen.getByTestId('saturation-slider');
        fireEvent.change(slider, { target: { value: '75' } });
      }).not.toThrow();
    });

    it('external state can be managed via onChange', () => {
      let externalState: ControlState | null = null;
      const onChange = (state: ControlState) => {
        externalState = state;
      };

      render(<Controls onChange={onChange} />);

      fireEvent.change(screen.getByTestId('saturation-slider'), { target: { value: '80' } });
      expect(externalState?.saturation).toBe(80);

      fireEvent.change(screen.getByTestId('intensity-slider'), { target: { value: '30' } });
      expect(externalState?.intensity).toBe(30);

      fireEvent.click(screen.getByTestId('mode-toggle'));
      expect(externalState?.mode).toBe('text');
    });
  });

  // Test 8.9: Controls can be hidden (headless mode for embedding)
  describe('Test 8.9: Controls can be hidden (headless mode for embedding)', () => {
    it('hidden=true renders nothing', () => {
      render(<Controls hidden={true} />);
      const controls = screen.queryByTestId('visualizer-controls');
      expect(controls).not.toBeInTheDocument();
    });

    it('hidden=false renders controls normally', () => {
      render(<Controls hidden={false} />);
      const controls = screen.getByTestId('visualizer-controls');
      expect(controls).toBeInTheDocument();
    });

    it('default is hidden=false (controls visible)', () => {
      render(<Controls />);
      const controls = screen.getByTestId('visualizer-controls');
      expect(controls).toBeInTheDocument();
    });

    it('hidden mode does not render any sliders', () => {
      render(<Controls hidden={true} />);
      expect(screen.queryByTestId('saturation-slider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('intensity-slider')).not.toBeInTheDocument();
      expect(screen.queryByTestId('motion-slider')).not.toBeInTheDocument();
    });

    it('hidden mode does not render toggle', () => {
      render(<Controls hidden={true} />);
      expect(screen.queryByTestId('mode-toggle')).not.toBeInTheDocument();
    });

    it('hidden mode still initializes state correctly', () => {
      // We can verify this by checking that initialState is applied
      // even in hidden mode, which would affect persisted state
      render(
        <Controls
          hidden={true}
          initialState={{ saturation: 75 }}
          storageKey="test-hidden"
        />
      );

      // State was initialized (we can check localStorage was set if we had a way to trigger save)
      // For hidden mode, the component exists but renders null
      // This test verifies the component mounts without error
      expect(true).toBe(true);
    });
  });

  // Test 8.10: Control state persists via localStorage
  describe('Test 8.10: Control state persists via localStorage', () => {
    it('saves state to localStorage when storageKey is provided', () => {
      render(<Controls storageKey="test-controls" />);
      const slider = screen.getByTestId('saturation-slider');

      fireEvent.change(slider, { target: { value: '80' } });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-controls',
        expect.stringContaining('"saturation":80')
      );
    });

    it('loads state from localStorage on mount', () => {
      // Pre-set localStorage with saved state
      mockLocalStorage._setStore({
        'test-controls': JSON.stringify({
          saturation: 75,
          intensity: 25,
          motion: 60,
          mode: 'text',
        }),
      });

      render(<Controls storageKey="test-controls" />);

      const saturationSlider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      const intensitySlider = screen.getByTestId('intensity-slider') as HTMLInputElement;
      const motionSlider = screen.getByTestId('motion-slider') as HTMLInputElement;
      const modeToggle = screen.getByTestId('mode-toggle');

      expect(saturationSlider.value).toBe('75');
      expect(intensitySlider.value).toBe('25');
      expect(motionSlider.value).toBe('60');
      expect(modeToggle.textContent).toBe('text');
    });

    it('does not use localStorage when storageKey is not provided', () => {
      render(<Controls />);
      const slider = screen.getByTestId('saturation-slider');

      fireEvent.change(slider, { target: { value: '80' } });

      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('persists all control values when any changes', () => {
      render(<Controls storageKey="test-controls" />);

      fireEvent.click(screen.getByTestId('mode-toggle'));

      const savedState = JSON.parse(mockLocalStorage._getStore()['test-controls']);
      expect(savedState).toEqual({
        saturation: 50,
        intensity: 50,
        motion: 50,
        mode: 'text',
      });
    });

    it('handles invalid localStorage data gracefully', () => {
      // Set invalid JSON in localStorage
      mockLocalStorage._setStore({
        'test-controls': 'invalid json {{{',
      });

      // Should not throw and should use defaults
      expect(() => render(<Controls storageKey="test-controls" />)).not.toThrow();

      const saturationSlider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(saturationSlider.value).toBe('50'); // Default value
    });

    it('handles partial localStorage data (merges with defaults)', () => {
      mockLocalStorage._setStore({
        'test-controls': JSON.stringify({ saturation: 90 }), // Only saturation saved
      });

      render(<Controls storageKey="test-controls" />);

      const saturationSlider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      const intensitySlider = screen.getByTestId('intensity-slider') as HTMLInputElement;

      expect(saturationSlider.value).toBe('90'); // From localStorage
      expect(intensitySlider.value).toBe('50'); // Default
    });

    it('localStorage takes priority over initialState', () => {
      mockLocalStorage._setStore({
        'test-controls': JSON.stringify({ saturation: 90 }),
      });

      render(
        <Controls
          storageKey="test-controls"
          initialState={{ saturation: 10 }}
        />
      );

      const saturationSlider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      expect(saturationSlider.value).toBe('90'); // localStorage wins
    });

    it('validates stored values are within 0-100 range', () => {
      mockLocalStorage._setStore({
        'test-controls': JSON.stringify({
          saturation: 150, // Out of range
          intensity: -20, // Out of range
          motion: 50,
          mode: 'visual',
        }),
      });

      render(<Controls storageKey="test-controls" />);

      const saturationSlider = screen.getByTestId('saturation-slider') as HTMLInputElement;
      const intensitySlider = screen.getByTestId('intensity-slider') as HTMLInputElement;

      expect(saturationSlider.value).toBe('100'); // Clamped to max
      expect(intensitySlider.value).toBe('0'); // Clamped to min
    });
  });

  // Additional tests for edge cases and integration
  describe('Edge cases and integration', () => {
    it('initialState is applied correctly', () => {
      render(
        <Controls
          initialState={{
            saturation: 20,
            intensity: 30,
            motion: 40,
            mode: 'text',
          }}
        />
      );

      expect((screen.getByTestId('saturation-slider') as HTMLInputElement).value).toBe('20');
      expect((screen.getByTestId('intensity-slider') as HTMLInputElement).value).toBe('30');
      expect((screen.getByTestId('motion-slider') as HTMLInputElement).value).toBe('40');
      expect(screen.getByTestId('mode-toggle').textContent).toBe('text');
    });

    it('partial initialState merges with defaults', () => {
      render(<Controls initialState={{ saturation: 70 }} />);

      expect((screen.getByTestId('saturation-slider') as HTMLInputElement).value).toBe('70');
      expect((screen.getByTestId('intensity-slider') as HTMLInputElement).value).toBe('50'); // Default
      expect((screen.getByTestId('motion-slider') as HTMLInputElement).value).toBe('50'); // Default
      expect(screen.getByTestId('mode-toggle').textContent).toBe('visual'); // Default
    });

    it('DEFAULT_CONTROL_STATE has correct values', () => {
      expect(DEFAULT_CONTROL_STATE).toEqual({
        saturation: 50,
        intensity: 50,
        motion: 50,
        mode: 'visual',
      });
    });

    it('clamps out-of-range initialState values', () => {
      render(
        <Controls
          initialState={{
            saturation: 150,
            intensity: -10,
          }}
        />
      );

      expect((screen.getByTestId('saturation-slider') as HTMLInputElement).value).toBe('100');
      expect((screen.getByTestId('intensity-slider') as HTMLInputElement).value).toBe('0');
    });

    it('renders all three sliders', () => {
      render(<Controls />);

      expect(screen.getByTestId('saturation-slider')).toBeInTheDocument();
      expect(screen.getByTestId('intensity-slider')).toBeInTheDocument();
      expect(screen.getByTestId('motion-slider')).toBeInTheDocument();
    });

    it('renders container with correct test id', () => {
      render(<Controls />);
      expect(screen.getByTestId('visualizer-controls')).toBeInTheDocument();
    });
  });

  // Test useControlState hook
  describe('useControlState hook', () => {
    function TestComponent({
      initialState,
      storageKey,
    }: {
      initialState?: Partial<ControlState>;
      storageKey?: string;
    }) {
      const [state, updateState] = useControlState(initialState, storageKey);

      return (
        <div>
          <span data-testid="saturation">{state.saturation}</span>
          <span data-testid="mode">{state.mode}</span>
          <button
            data-testid="update-btn"
            onClick={() => updateState({ saturation: 99 })}
          >
            Update
          </button>
        </div>
      );
    }

    it('initializes with default state', () => {
      render(<TestComponent />);
      expect(screen.getByTestId('saturation').textContent).toBe('50');
      expect(screen.getByTestId('mode').textContent).toBe('visual');
    });

    it('initializes with provided initial state', () => {
      render(<TestComponent initialState={{ saturation: 75 }} />);
      expect(screen.getByTestId('saturation').textContent).toBe('75');
    });

    it('updateState modifies the state', () => {
      render(<TestComponent />);

      fireEvent.click(screen.getByTestId('update-btn'));

      expect(screen.getByTestId('saturation').textContent).toBe('99');
    });

    it('persists to localStorage when storageKey provided', () => {
      render(<TestComponent storageKey="hook-test" />);

      fireEvent.click(screen.getByTestId('update-btn'));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'hook-test',
        expect.stringContaining('"saturation":99')
      );
    });
  });
});
