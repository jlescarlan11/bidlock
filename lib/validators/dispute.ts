import { z } from 'zod'

export const disputeSchema = z.object({
  listing_id: z.string().uuid(),
  reported_user_id: z.string().uuid(),
  reason: z.string().min(20).max(1000),
})

export type DisputeInput = z.infer<typeof disputeSchema>
