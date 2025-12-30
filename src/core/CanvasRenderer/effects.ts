/**
 * Canvas Effects
 *
 * Global effects for the CanvasRenderer: grain and chromatic aberration.
 * These provide the lo-fi, warm aesthetic described in the design spec.
 */

/**
 * Apply a film grain effect to the canvas
 *
 * Adds semi-transparent noise overlay to create a textured, lo-fi look.
 *
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width in CSS pixels
 * @param height - Canvas height in CSS pixels
 * @param intensity - Grain intensity (0 = none, 1 = heavy grain)
 */
export function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number
): void {
  if (intensity <= 0) return;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const grainStrength = intensity * 50;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * grainStrength;
      data[i] = clamp(data[i] + noise, 0, 255);     // R
      data[i + 1] = clamp(data[i + 1] + noise, 0, 255); // G
      data[i + 2] = clamp(data[i + 2] + noise, 0, 255); // B
      // Alpha channel (data[i + 3]) is left unchanged
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (error) {
    // getImageData can fail in some security contexts
    console.warn('Unable to apply grain effect:', error);
  }
}

/**
 * Apply chromatic aberration effect to the canvas
 *
 * Creates a subtle RGB channel separation for a glitchy, lo-fi look.
 * Red channel is offset left, blue channel is offset right.
 *
 * @param ctx - Canvas 2D rendering context
 * @param width - Canvas width in CSS pixels
 * @param height - Canvas height in CSS pixels
 * @param amount - Aberration amount in pixels
 */
export function applyChromaticAberration(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number
): void {
  if (amount <= 0) return;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const offset = Math.round(amount);

    // Create a copy to read from while modifying original
    const originalData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;

        // Red channel: sample from right (offset left in output)
        const redX = Math.min(x + offset, width - 1);
        const redI = (y * width + redX) * 4;
        data[i] = originalData[redI];

        // Green channel: keep in place
        data[i + 1] = originalData[i + 1];

        // Blue channel: sample from left (offset right in output)
        const blueX = Math.max(x - offset, 0);
        const blueI = (y * width + blueX) * 4;
        data[i + 2] = originalData[blueI + 2];

        // Alpha: keep original
        data[i + 3] = originalData[i + 3];
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (error) {
    // getImageData can fail in some security contexts
    console.warn('Unable to apply chromatic aberration effect:', error);
  }
}

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
