/**
 * Controls Component
 *
 * User-facing controls for adjusting visualization parameters.
 * Provides three sliders (saturation, intensity, motion) and a mode toggle.
 * Supports headless mode for embedding and localStorage persistence.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ControlState, ControlsProps, DisplayMode } from '@/types/visual';

/**
 * Default control state values
 */
export const DEFAULT_CONTROL_STATE: ControlState = {
  saturation: 50,
  intensity: 50,
  motion: 50,
  mode: 'visual',
};

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Load state from localStorage
 */
function loadState(storageKey: string): Partial<ControlState> | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the parsed data
      if (typeof parsed === 'object' && parsed !== null) {
        const result: Partial<ControlState> = {};
        if (typeof parsed.saturation === 'number') {
          result.saturation = clamp(parsed.saturation, 0, 100);
        }
        if (typeof parsed.intensity === 'number') {
          result.intensity = clamp(parsed.intensity, 0, 100);
        }
        if (typeof parsed.motion === 'number') {
          result.motion = clamp(parsed.motion, 0, 100);
        }
        if (parsed.mode === 'text' || parsed.mode === 'visual') {
          result.mode = parsed.mode;
        }
        return result;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return null;
}

/**
 * Save state to localStorage
 */
function saveState(storageKey: string, state: ControlState): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Controls component for adjusting visualization parameters
 */
export function Controls({
  initialState,
  onChange,
  hidden = false,
  storageKey,
}: ControlsProps): React.ReactElement | null {
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Initialize state from: localStorage (if storageKey) > initialState > defaults
  const [state, setState] = useState<ControlState>(() => {
    let baseState = { ...DEFAULT_CONTROL_STATE };

    // Apply initialState first
    if (initialState) {
      if (typeof initialState.saturation === 'number') {
        baseState.saturation = clamp(initialState.saturation, 0, 100);
      }
      if (typeof initialState.intensity === 'number') {
        baseState.intensity = clamp(initialState.intensity, 0, 100);
      }
      if (typeof initialState.motion === 'number') {
        baseState.motion = clamp(initialState.motion, 0, 100);
      }
      if (initialState.mode === 'text' || initialState.mode === 'visual') {
        baseState.mode = initialState.mode;
      }
    }

    // Then try to load from localStorage (takes priority)
    if (storageKey) {
      const stored = loadState(storageKey);
      if (stored) {
        baseState = { ...baseState, ...stored };
      }
    }

    return baseState;
  });

  // Save to localStorage when state changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (storageKey) {
      saveState(storageKey, state);
    }
  }, [state, storageKey]);

  // Update handler that calls onChange immediately
  const updateState = useCallback(
    (updates: Partial<ControlState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        // Call onChange synchronously for real-time updates
        if (onChange) {
          onChange(newState);
        }
        return newState;
      });
    },
    [onChange]
  );

  // Individual update handlers
  const handleSaturationChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = clamp(parseInt(e.target.value, 10), 0, 100);
      updateState({ saturation: value });
    },
    [updateState]
  );

  const handleIntensityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = clamp(parseInt(e.target.value, 10), 0, 100);
      updateState({ intensity: value });
    },
    [updateState]
  );

  const handleMotionChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = clamp(parseInt(e.target.value, 10), 0, 100);
      updateState({ motion: value });
    },
    [updateState]
  );

  const handleModeToggle = useCallback(() => {
    updateState({ mode: state.mode === 'visual' ? 'text' : 'visual' });
  }, [state.mode, updateState]);

  // Headless mode - render nothing but still manage state
  if (hidden) {
    return null;
  }

  return (
    <div
      className="visualizer-controls"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: '8px',
        minWidth: '200px',
      }}
      data-testid="visualizer-controls"
    >
      {/* Saturation Slider */}
      <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="saturation-slider"
          style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}
        >
          Saturation: {state.saturation}
        </label>
        <input
          id="saturation-slider"
          type="range"
          min="0"
          max="100"
          value={state.saturation}
          onChange={handleSaturationChange}
          aria-label="Saturation"
          data-testid="saturation-slider"
          style={{ width: '100%' }}
        />
      </div>

      {/* Intensity Slider */}
      <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label
          htmlFor="intensity-slider"
          style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}
        >
          Intensity: {state.intensity}
        </label>
        <input
          id="intensity-slider"
          type="range"
          min="0"
          max="100"
          value={state.intensity}
          onChange={handleIntensityChange}
          aria-label="Intensity"
          data-testid="intensity-slider"
          style={{ width: '100%' }}
        />
      </div>

      {/* Motion Slider */}
      <div className="control-group" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <label htmlFor="motion-slider" style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>
          Motion: {state.motion}
        </label>
        <input
          id="motion-slider"
          type="range"
          min="0"
          max="100"
          value={state.motion}
          onChange={handleMotionChange}
          aria-label="Motion"
          data-testid="motion-slider"
          style={{ width: '100%' }}
        />
      </div>

      {/* Mode Toggle */}
      <div
        className="control-group"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>Mode</span>
        <button
          type="button"
          onClick={handleModeToggle}
          aria-label={`Switch to ${state.mode === 'visual' ? 'text' : 'visual'} mode`}
          data-testid="mode-toggle"
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: state.mode === 'visual' ? 'rgba(100, 100, 255, 0.3)' : 'rgba(100, 255, 100, 0.3)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            textTransform: 'capitalize',
          }}
        >
          {state.mode}
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to get current control state (for external use)
 * This is a convenience wrapper around the Controls component state
 */
export function useControlState(
  initialState?: Partial<ControlState>,
  storageKey?: string
): [ControlState, (updates: Partial<ControlState>) => void] {
  const [state, setState] = useState<ControlState>(() => {
    let baseState = { ...DEFAULT_CONTROL_STATE };

    if (initialState) {
      baseState = { ...baseState, ...initialState };
    }

    if (storageKey) {
      const stored = loadState(storageKey);
      if (stored) {
        baseState = { ...baseState, ...stored };
      }
    }

    return baseState;
  });

  const updateState = useCallback(
    (updates: Partial<ControlState>) => {
      setState((prev) => {
        const newState = { ...prev, ...updates };
        if (storageKey) {
          saveState(storageKey, newState);
        }
        return newState;
      });
    },
    [storageKey]
  );

  return [state, updateState];
}

/**
 * Get visual mode styles based on display mode
 * Text mode: low opacity, blurred, ambient background
 * Visual mode: prominent, higher z-index, immersive
 */
export function getModeStyles(mode: DisplayMode): React.CSSProperties {
  if (mode === 'text') {
    return {
      opacity: 0.3,
      filter: 'blur(2px)',
      zIndex: 0,
      pointerEvents: 'none' as const,
    };
  }

  return {
    opacity: 1,
    filter: 'none',
    zIndex: 10,
    pointerEvents: 'auto' as const,
  };
}

export default Controls;
