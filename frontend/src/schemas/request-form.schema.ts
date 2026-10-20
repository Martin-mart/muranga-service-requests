import { z } from 'zod';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const newRequestFormSchema = z.object({
  categoryId: z.string().min(1, 'Choose a category'),
  subCountyId: z.string().min(1, 'Choose your sub-county'),
  locationText: z
    .string()
    .trim()
    .min(3, 'Describe the location (at least 3 characters)')
    .max(200, 'Keep the location under 200 characters'),
  description: z
    .string()
    .trim()
    .min(10, 'Describe the problem in at least 10 characters')
    .max(2000, 'Keep the description under 2000 characters'),
});

export type NewRequestFormValues = z.infer<typeof newRequestFormSchema>;

/** Validates a picked image before any upload is attempted. */
export function validateImage(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose a JPEG, PNG or WebP image.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'The image must be 5 MB or smaller.';
  }
  return null;
}
