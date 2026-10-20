export const ALLOWED_IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const;

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES;

/** Mirrors the bucket's file_size_limit; Storage enforces it server-side too. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ImageUploadTicket {
  uploadUrl: string;
  path: string;
  contentType: AllowedImageType;
  maxBytes: number;
}
