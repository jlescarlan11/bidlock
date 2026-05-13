import { z } from 'zod'

export const listingDetailsSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  starting_bid: z.coerce
    .number()
    .positive('Starting bid must be positive')
    .max(1_000_000, 'Starting bid cannot exceed ₱1,000,000'),
  retail_price: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : v),
    z.coerce
      .number()
      .positive('Retail price must be positive')
      .max(10_000_000, 'Retail price cannot exceed ₱10,000,000')
      .optional()
  ),
  duration_days: z.coerce.number().refine((v) => [1, 3, 7].includes(v), {
    message: 'Duration must be 1, 3, or 7 days',
  }),
})

export type ListingDetailsInput = z.infer<typeof listingDetailsSchema>
