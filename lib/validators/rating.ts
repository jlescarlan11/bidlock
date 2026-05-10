import { z } from 'zod'

export const ratingSchema = z.object({
  listing_id: z.string().uuid(),
  ratee_id: z.string().uuid(),
  verdict: z.enum(['up', 'down']),
  comment: z.string().max(500).optional(),
})

export type RatingInput = z.infer<typeof ratingSchema>
