import { z } from 'zod'

export const bidSchema = z.object({
  amount: z.coerce.number().positive(),
  listing_id: z.string().uuid(),
})

export type BidInput = z.infer<typeof bidSchema>

export function minBidAmount(currentBid: number): number {
  return currentBid + Math.max(currentBid * 0.05, 10)
}
