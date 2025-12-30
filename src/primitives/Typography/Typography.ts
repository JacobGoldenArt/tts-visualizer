/**
 * Typography
 *
 * Keyword/fragment display primitive that emphasizes semantic content
 * from conversations. Keywords float, fade, and respond to mood.
 * Renders with a lo-fi, hand-drawn aesthetic.
 */

import type { ColorPalette } from '@/types/visual';
import type { ICanvasRenderer, DrawTextOptions } from '@/types/canvas';
import type { Emotion } from '@/types/semantic';

/**
 * Display mode for the visualizer
 */
export type DisplayMode = 'text' | 'visual';

/**
 * Source of the keyword content
 */
export type ContentSource = 'user' | 'ai';

/**
 * Configuration options for Typography
 */
export interface TypographyConfig {
  /** Font family for keywords. Default: 'Inter, sans-serif' */
  fontFamily?: string;
  /** Base font size in pixels. Default: 24 */
  baseSize?: number;
  /** Fade duration in milliseconds. Default: 3000 */
  fadeDuration?: number;
  /** Maximum number of visible keywords. Default: 10 */
  maxKeywords?: number;
  /** Distortion amount for sketchy effect (0-1). Default: 0.2 */
  distortion?: number;
}

/**
 * Full required config with defaults applied
 */
export type RequiredTypographyConfig = Required<TypographyConfig>;

/**
 * Internal representation of a floating keyword particle
 */
interface KeywordParticle {
  /** Unique identifier */
  id: string;
  /** The keyword text */
  text: string;
  /** Current x position (CSS pixels) */
  x: number;
  /** Current y position (CSS pixels) */
  y: number;
  /** Velocity x (pixels per second) */
  vx: number;
  /** Velocity y (pixels per second) */
  vy: number;
  /** Size multiplier based on emphasis (0.5-2.0) */
  sizeMultiplier: number;
  /** Current opacity (0-1) */
  opacity: number;
  /** Time when particle was created */
  spawnTime: number;
  /** Source of the content (user or AI) */
  source: ContentSource;
  /** Whether this keyword should "pop" (burst effect) */
  shouldPop: boolean;
  /** Pop animation progress (0-1) */
  popProgress: number;
  /** Glow intensity (0-1) */
  glowIntensity: number;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: RequiredTypographyConfig = {
  fontFamily: 'Inter, sans-serif',
  baseSize: 24,
  fadeDuration: 3000,
  maxKeywords: 10,
  distortion: 0.2,
};

/**
 * Generate a unique ID for particles
 */
let particleIdCounter = 0;
function generateParticleId(): string {
  return `particle-${++particleIdCounter}-${Date.now()}`;
}

/**
 * Typography class
 *
 * Renders keywords from semantic analysis as floating, fading text particles.
 */
export class Typography {
  private config: RequiredTypographyConfig;
  private renderer: ICanvasRenderer | null = null;
  private palette: ColorPalette;
  private intensity: number = 1.0;
  private motion: number = 0.5;
  private mode: DisplayMode = 'visual';
  private particles: KeywordParticle[] = [];
  private currentEmotion: Emotion = 'neutral';
  private disposed: boolean = false;

  /**
   * Create a new Typography instance
   */
  constructor(config?: TypographyConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize default neutral palette
    this.palette = {
      primary: 'hsl(220, 15%, 50%)',
      secondary: 'hsl(200, 10%, 55%)',
      accent: 'hsl(240, 12%, 60%)',
    };
  }

  /**
   * Get the current configuration (returns a copy)
   */
  getConfig(): RequiredTypographyConfig {
    return { ...this.config };
  }

  /**
   * Set the canvas renderer to use for drawing
   */
  setRenderer(renderer: ICanvasRenderer): void {
    this.renderer = renderer;
  }

  /**
   * Set the color palette from mood mapper
   */
  setPalette(palette: ColorPalette): void {
    this.palette = { ...palette };
  }

  /**
   * Get the current palette
   */
  getPalette(): ColorPalette {
    return { ...this.palette };
  }

  /**
   * Set the intensity level (0-1)
   * Affects keyword size and glow strength
   */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Get the current intensity
   */
  getIntensity(): number {
    return this.intensity;
  }

  /**
   * Set the motion level (0-1)
   * Affects drift speed
   */
  setMotion(motion: number): void {
    this.motion = Math.max(0, Math.min(1, motion));
  }

  /**
   * Get the current motion level
   */
  getMotion(): number {
    return this.motion;
  }

  /**
   * Set the display mode (text/visual)
   * Affects opacity and prominence
   */
  setMode(mode: DisplayMode): void {
    this.mode = mode;
  }

  /**
   * Get the current display mode
   */
  getMode(): DisplayMode {
    return this.mode;
  }

  /**
   * Set the current emotion (affects behavior)
   */
  setEmotion(emotion: Emotion): void {
    this.currentEmotion = emotion;
  }

  /**
   * Get the current emotion
   */
  getEmotion(): Emotion {
    return this.currentEmotion;
  }

  /**
   * Set the font family
   */
  setFontFamily(fontFamily: string): void {
    this.config.fontFamily = fontFamily;
  }

  /**
   * Get the current font family
   */
  getFontFamily(): string {
    return this.config.fontFamily;
  }

  /**
   * Set the base font size
   */
  setBaseSize(baseSize: number): void {
    this.config.baseSize = Math.max(8, baseSize);
  }

  /**
   * Get the current base font size
   */
  getBaseSize(): number {
    return this.config.baseSize;
  }

  /**
   * Set the fade duration in milliseconds
   */
  setFadeDuration(duration: number): void {
    this.config.fadeDuration = Math.max(100, duration);
  }

  /**
   * Get the current fade duration
   */
  getFadeDuration(): number {
    return this.config.fadeDuration;
  }

  /**
   * Add keywords to the display
   * @param keywords Array of keyword strings to add
   * @param source Source of the keywords (user or ai)
   */
  addKeywords(keywords: string[], source: ContentSource = 'ai'): void {
    if (this.disposed) return;

    const canvasWidth = this.renderer?.width || 800;
    const canvasHeight = this.renderer?.height || 600;

    // Add each keyword as a particle
    for (const keyword of keywords) {
      if (!keyword || keyword.trim().length === 0) continue;

      // Remove oldest particles if we exceed max
      while (this.particles.length >= this.config.maxKeywords) {
        this.particles.shift();
      }

      // Calculate initial position - spread across canvas with some randomness
      const margin = 100;
      const x = margin + Math.random() * (canvasWidth - margin * 2);
      const y = margin + Math.random() * (canvasHeight - margin * 2);

      // Calculate initial velocity based on motion setting
      const baseSpeed = 10 + this.motion * 40; // 10-50 pixels per second
      const angle = Math.random() * Math.PI * 2;
      const vx = Math.cos(angle) * baseSpeed;
      const vy = Math.sin(angle) * baseSpeed;

      // Determine size multiplier based on intensity and keyword "importance"
      // First keyword is more important
      const index = keywords.indexOf(keyword);
      const importanceMultiplier = 1 + (1 - index / keywords.length) * 0.5;
      const sizeMultiplier = (0.7 + this.intensity * 0.6) * importanceMultiplier;

      // Determine if keyword should "pop" based on mood
      const shouldPop = this.shouldKeywordPop();

      // Determine glow intensity based on intensity setting
      const glowIntensity = 0.3 + this.intensity * 0.7;

      const particle: KeywordParticle = {
        id: generateParticleId(),
        text: keyword.trim(),
        x,
        y,
        vx,
        vy,
        sizeMultiplier,
        opacity: 1.0,
        spawnTime: Date.now(),
        source,
        shouldPop,
        popProgress: 0,
        glowIntensity,
      };

      this.particles.push(particle);
    }
  }

  /**
   * Get all current particles (for testing)
   */
  getParticles(): KeywordParticle[] {
    return [...this.particles];
  }

  /**
   * Update particle positions and states
   * Should be called each frame with deltaTime in milliseconds
   */
  update(deltaTime: number = 16): void {
    if (this.disposed) return;

    const now = Date.now();
    const canvasWidth = this.renderer?.width || 800;
    const canvasHeight = this.renderer?.height || 600;
    const margin = 50;

    // Update each particle
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];

      // Calculate age and fade
      const age = now - particle.spawnTime;
      const fadeProgress = age / this.config.fadeDuration;

      if (fadeProgress >= 1) {
        // Particle has fully faded, remove it
        this.particles.splice(i, 1);
        continue;
      }

      // Update opacity based on fade progress
      // Use ease-out curve: start visible, fade out near end
      if (fadeProgress < 0.1) {
        // Quick fade in during first 10% (with minimum of 0.5 for visibility)
        particle.opacity = 0.5 + (fadeProgress / 0.1) * 0.5;
      } else if (fadeProgress > 0.7) {
        // Fade out during last 30%
        particle.opacity = 1 - (fadeProgress - 0.7) / 0.3;
      } else {
        particle.opacity = 1;
      }

      // Update pop animation
      if (particle.shouldPop && particle.popProgress < 1) {
        particle.popProgress = Math.min(1, particle.popProgress + deltaTime / 500);
      }

      // Update position based on motion
      const deltaSeconds = deltaTime / 1000;
      const motionMultiplier = 0.2 + this.motion * 0.8; // motion affects speed

      particle.x += particle.vx * deltaSeconds * motionMultiplier;
      particle.y += particle.vy * deltaSeconds * motionMultiplier;

      // Bounce off edges with dampening
      if (particle.x < margin) {
        particle.x = margin;
        particle.vx = Math.abs(particle.vx) * 0.8;
      } else if (particle.x > canvasWidth - margin) {
        particle.x = canvasWidth - margin;
        particle.vx = -Math.abs(particle.vx) * 0.8;
      }

      if (particle.y < margin) {
        particle.y = margin;
        particle.vy = Math.abs(particle.vy) * 0.8;
      } else if (particle.y > canvasHeight - margin) {
        particle.y = canvasHeight - margin;
        particle.vy = -Math.abs(particle.vy) * 0.8;
      }

      // Add slight random drift for organic feel
      particle.vx += (Math.random() - 0.5) * 2;
      particle.vy += (Math.random() - 0.5) * 2;

      // Dampen velocity over time
      particle.vx *= 0.99;
      particle.vy *= 0.99;
    }
  }

  /**
   * Render the typography to the canvas
   * Should be called from the animation loop
   */
  render(deltaTime: number = 16): void {
    if (this.disposed || !this.renderer) return;

    // Update particles first
    this.update(deltaTime);

    // Calculate base opacity based on mode
    const modeOpacity = this.mode === 'visual' ? 1.0 : 0.3;

    // Render each particle
    for (const particle of this.particles) {
      this.renderParticle(particle, modeOpacity);
    }
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.disposed = true;
    this.particles = [];
    this.renderer = null;
  }

  /**
   * Check if disposed
   */
  get isDisposed(): boolean {
    return this.disposed;
  }

  // Private methods

  /**
   * Determine if a new keyword should "pop" based on mood
   */
  private shouldKeywordPop(): boolean {
    // Higher energy emotions trigger more pops
    switch (this.currentEmotion) {
      case 'joy':
      case 'surprise':
        return Math.random() < 0.7;
      case 'anger':
        return Math.random() < 0.5;
      case 'fear':
      case 'sadness':
        return Math.random() < 0.2;
      case 'neutral':
      default:
        return Math.random() < 0.3;
    }
  }

  /**
   * Get position bias based on content source
   * AI content biased toward center, user content biased toward edges
   */
  private getSourcePositionBias(source: ContentSource): { x: number; y: number } {
    const canvasWidth = this.renderer?.width || 800;
    const canvasHeight = this.renderer?.height || 600;

    if (source === 'user') {
      // User content biased toward bottom-left
      return {
        x: canvasWidth * 0.3,
        y: canvasHeight * 0.7,
      };
    } else {
      // AI content biased toward center-right
      return {
        x: canvasWidth * 0.6,
        y: canvasHeight * 0.4,
      };
    }
  }

  /**
   * Get color based on source (subtle differentiation)
   */
  private getSourceColor(source: ContentSource): string {
    if (source === 'user') {
      // User content uses secondary color
      return this.palette.secondary;
    } else {
      // AI content uses primary color
      return this.palette.primary;
    }
  }

  /**
   * Render a single particle
   */
  private renderParticle(particle: KeywordParticle, modeOpacity: number): void {
    if (!this.renderer) return;

    // Calculate effective opacity
    const effectiveOpacity = particle.opacity * modeOpacity;
    if (effectiveOpacity <= 0) return;

    // Calculate font size based on base size, intensity, and particle's multiplier
    const intensityMultiplier = 0.7 + this.intensity * 0.6;
    const fontSize = Math.round(
      this.config.baseSize * particle.sizeMultiplier * intensityMultiplier
    );

    // Get color based on source
    const baseColor = this.getSourceColor(particle.source);

    // Apply opacity to color
    const color = this.applyOpacity(baseColor, effectiveOpacity);

    // Build font string
    const font = `${fontSize}px ${this.config.fontFamily}`;

    // Calculate pop effect (scale burst)
    let scale = 1;
    if (particle.shouldPop && particle.popProgress < 1) {
      // Ease-out elastic effect
      const t = particle.popProgress;
      scale = 1 + Math.sin(t * Math.PI) * 0.3 * (1 - t);
    }

    // Calculate effective distortion based on mode
    const distortion =
      this.mode === 'visual'
        ? this.config.distortion * (0.5 + this.intensity * 0.5)
        : this.config.distortion * 0.3;

    // Draw options
    const options: DrawTextOptions = {
      font,
      color,
      distortion,
    };

    // Draw glow effect for emphasized keywords in visual mode
    if (this.mode === 'visual' && particle.glowIntensity > 0.5) {
      const glowColor = this.applyOpacity(
        this.palette.accent,
        effectiveOpacity * particle.glowIntensity * 0.3
      );
      // Draw multiple offset passes for glow
      const glowOffset = 2 + this.intensity * 2;
      this.renderer.drawText(particle.text, particle.x - glowOffset, particle.y, {
        ...options,
        color: glowColor,
      });
      this.renderer.drawText(particle.text, particle.x + glowOffset, particle.y, {
        ...options,
        color: glowColor,
      });
      this.renderer.drawText(particle.text, particle.x, particle.y - glowOffset, {
        ...options,
        color: glowColor,
      });
      this.renderer.drawText(particle.text, particle.x, particle.y + glowOffset, {
        ...options,
        color: glowColor,
      });
    }

    // Draw main text
    this.renderer.drawText(particle.text, particle.x, particle.y, options);
  }

  /**
   * Apply opacity to an HSL color string
   */
  private applyOpacity(hslColor: string, opacity: number): string {
    // Convert hsl() to hsla()
    const match = hslColor.match(/hsl\(([^)]+)\)/);
    if (match) {
      return `hsla(${match[1]}, ${opacity})`;
    }
    return hslColor;
  }
}

/**
 * Create a new Typography instance
 */
export function createTypography(config?: TypographyConfig): Typography {
  return new Typography(config);
}
