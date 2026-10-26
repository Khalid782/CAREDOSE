/**
 * Prepares a photo before Tesseract sees it.
 *
 * Phone cameras produce very large, often low-contrast pictures. Resizing to a
 * sensible OCR size, removing colour and stretching the contrast makes the
 * letters easier to read without changing the prescription itself.
 */

/**
 * Tesseract reads prescription-sized print much more accurately when the
 * letters are large. 2400px on the long edge was noticeably better than 1500px
 * in testing, while still keeping the canvas small enough for a phone.
 */
const TARGET_LONG_EDGE = 2400;
const MAX_UPSCALE = 4;
const CONTRAST = 1.35;
const BRIGHTNESS = 6;

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  /** How much the original was scaled (1 means unchanged). */
  scale: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Decodes, resizes, grayscales and boosts contrast. Runs on the main thread
 * only for the canvas work; OCR itself stays in the Tesseract Web Worker.
 */
export async function preprocessImage(file: Blob): Promise<PreparedImage> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("This browser cannot prepare photos for reading.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("The photo could not be opened. Try a JPEG or PNG picture.");
  }

  try {
    const longestEdge = Math.max(bitmap.width, bitmap.height);
    if (longestEdge === 0) throw new Error("The photo is empty.");

    // Small photos are enlarged, large camera photos are scaled down to the
    // same target so OCR quality and memory use stay predictable.
    const scale = Math.min(MAX_UPSCALE, TARGET_LONG_EDGE / longestEdge);

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("This browser cannot prepare photos for reading.");

    // A white base keeps transparent PNGs readable instead of turning the
    // transparent pixels black after grayscaling.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    const image = context.getImageData(0, 0, width, height);
    const pixels = image.data;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;

      const gray = 0.299 * red + 0.587 * green + 0.114 * blue;
      const adjusted = clampByte((gray - 128) * CONTRAST + 128 + BRIGHTNESS);

      pixels[index] = adjusted;
      pixels[index + 1] = adjusted;
      pixels[index + 2] = adjusted;
      pixels[index + 3] = 255;
    }

    context.putImageData(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) throw new Error("The photo could not be prepared.");

    return { blob, width, height, scale };
  } finally {
    bitmap.close();
  }
}
