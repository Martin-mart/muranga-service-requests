import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '../schemas/request-form.schema';

/** Longest edge after shrinking: sharp on any screen, ~1-3 MB as JPEG. */
const MAX_EDGE_PX = 2560;
/** Tried in order until the result fits under the upload limit. */
const ATTEMPTS = [
  { edge: MAX_EDGE_PX, quality: 0.85 },
  { edge: MAX_EDGE_PX, quality: 0.7 },
  { edge: 1920, quality: 0.7 },
] as const;

/** Scales width/height down (never up) so the longest edge fits `maxEdge`. */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function encodeJpeg(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob | null> {
  const size = fitWithin(bitmap.width, bitmap.height, edge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  // JPEG has no alpha: paint white first so transparent PNGs don't turn black.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return new Promise((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality);
  });
}

/**
 * Returns a file that fits the upload limit. Photos already within the limit
 * are returned untouched; larger ones (typical phone photos are 5-15 MB) are
 * re-encoded as JPEG in the browser, so citizens on mobile data upload ~2 MB
 * instead of the original. Returns null if the image cannot be decoded.
 */
export async function shrinkImage(file: File): Promise<File | null> {
  const allowed = (ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type);
  if (allowed && file.size <= MAX_IMAGE_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    // from-image applies the EXIF rotation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return null;
  }
  try {
    for (const { edge, quality } of ATTEMPTS) {
      const blob = await encodeJpeg(bitmap, edge, quality);
      if (blob && blob.size <= MAX_IMAGE_BYTES) {
        const name = file.name.replace(/\.[^.]*$/, '') || 'photo';
        return new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
      }
    }
    return null;
  } finally {
    bitmap.close();
  }
}
