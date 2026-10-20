import { z } from 'zod';

export const statusUpdateFormSchema = z.object({
  status: z.enum(['in_progress', 'resolved']),
  note: z.string().trim().max(1000, 'Keep the note under 1000 characters'),
});

export type StatusUpdateFormValues = z.infer<typeof statusUpdateFormSchema>;

export const commentFormSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(2000, 'Keep it under 2000 characters'),
  isPublic: z.boolean(),
});

export type CommentFormValues = z.infer<typeof commentFormSchema>;
